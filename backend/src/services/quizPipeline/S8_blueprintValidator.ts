import {
  PersistedKnowledgeMap,
  QuizBlueprint,
  QuizCoveragePlan
} from '../../types/index.js';

export interface BlueprintValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class S8_BlueprintValidator {
  /**
   * Stage 8: Validates blueprint slots BEFORE any question text is written.
   * Enforces:
   * 1. Exactly 25 slots.
   * 2. All 5 question formats present.
   * 3. Distribution within limits (~18 numerical/application, ~3 T/F, ~2 fill blank, 1 match, 1 theoretical).
   * 4. Every allowed concept covered at least once.
   * 5. No single concept taking > 30% (max 7-8).
   * 6. No NOT_COVERED or untaught concepts used.
   * 7. Zero duplicate procedure_signatures.
   * 8. At most 2 numerical questions with the same method_id.
   */
  public static validateBlueprint(
    blueprint: QuizBlueprint,
    coveragePlan: QuizCoveragePlan,
    knowledgeMap: PersistedKnowledgeMap,
    targetCount: number = 25
  ): BlueprintValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const slots = blueprint.slots;
    const totalSlots = [10, 15, 20, 25].includes(targetCount) ? targetCount : 25;

    // 1. Exactly targetCount slots
    if (slots.length !== totalSlots) {
      errors.push(`Slot count violation: expected exactly ${totalSlots} slots, got ${slots.length}`);
    }

    // 2. Format appearance check
    const formatCounts = blueprint.formatCounts;
    const requiredFormats = totalSlots >= 15
      ? (['numerical', 'true_false', 'fill_blank', 'match_columns', 'theoretical'] as const)
      : (['numerical', 'true_false', 'fill_blank', 'theoretical'] as const);

    requiredFormats.forEach(fmt => {
      if (!formatCounts[fmt] || formatCounts[fmt] === 0) {
        errors.push(`Format violation: '${fmt}' format is missing completely from blueprint.`);
      }
    });

    // 3. Distribution check (~70% numerical / problem-solving)
    const targetNumerical = totalSlots === 20 ? 14 : totalSlots === 15 ? 10 : totalSlots === 10 ? 7 : 18;
    if (Math.abs(formatCounts.numerical - targetNumerical) > 1) {
      errors.push(`Distribution violation: numerical/application count is ${formatCounts.numerical} (target: ${targetNumerical})`);
    }

    // 4. Coverage check: Every allowed concept in coverage plan appears at least once
    const testedConceptIds = new Set(slots.map(s => s.conceptId));
    coveragePlan.allocations.forEach(alloc => {
      if (!testedConceptIds.has(alloc.conceptId)) {
        errors.push(`Coverage violation: Allowed concept '${alloc.conceptName}' (${alloc.conceptId}) is not assigned to any blueprint slot.`);
      }
    });

    // 5. 30% Max rule per concept
    const conceptSlotCounts: Record<string, number> = {};
    slots.forEach(s => {
      conceptSlotCounts[s.conceptId] = (conceptSlotCounts[s.conceptId] || 0) + 1;
    });

    const uniqueConcepts = Object.keys(conceptSlotCounts).length;
    const maxSlotsPerConcept = uniqueConcepts >= 4
      ? Math.ceil(totalSlots * 0.30)
      : Math.ceil(totalSlots / Math.max(1, uniqueConcepts)) + 1;

    Object.entries(conceptSlotCounts).forEach(([cid, count]) => {
      if (count > maxSlotsPerConcept) {
        errors.push(
          `Concept concentration violation: Concept ${cid} occupies ${count}/${totalSlots} slots (${Math.round((count / totalSlots) * 100)}%), exceeding the maximum allowed limit of ${maxSlotsPerConcept}.`
        );
      }
    });

    // 6. No untaught or NOT_COVERED concepts
    const allowedSet = new Set(knowledgeMap.allowedConceptIds);
    slots.forEach(s => {
      if (!allowedSet.has(s.conceptId)) {
        errors.push(`Untaught concept violation: Slot #${s.slotIndex} tests concept '${s.conceptId}' which is NOT an allowed video concept.`);
      }
    });

    // 7. Procedure signature uniqueness check
    const seenSignatures = new Set<string>();
    const dupSigs: string[] = [];
    slots.forEach(s => {
      if (seenSignatures.has(s.procedureSignature)) {
        dupSigs.push(`Slot #${s.slotIndex}: ${s.procedureSignature}`);
      }
      seenSignatures.add(s.procedureSignature);
    });
    if (dupSigs.length > 0) {
      errors.push(`Duplicate procedure signature violation: [${dupSigs.join(', ')}]`);
    }

    // 8. Max 2 numerical questions with same method_id
    const numericalMethodCounts: Record<string, number> = {};
    slots.filter(s => s.questionFormat === 'numerical').forEach(s => {
      numericalMethodCounts[s.methodId] = (numericalMethodCounts[s.methodId] || 0) + 1;
    });

    Object.entries(numericalMethodCounts).forEach(([method, count]) => {
      if (count > 2) {
        errors.push(`Method diversity violation: method_id '${method}' appears ${count} times in numerical slots (max allowed: 2).`);
      }
    });

    const isValid = errors.length === 0;
    blueprint.validated = isValid;

    return {
      valid: isValid,
      errors,
      warnings
    };
  }
}
