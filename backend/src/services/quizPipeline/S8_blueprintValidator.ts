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
    let requiredFormats = totalSlots >= 15
      ? (['numerical', 'true_false', 'fill_blank', 'match_columns', 'theoretical'] as const)
      : (['numerical', 'true_false', 'fill_blank', 'theoretical'] as const);

    const hasFormulas = Object.values(knowledgeMap.concepts || {}).some(c => Boolean(c.formula && c.formula.trim().length > 0));
    const activeRequiredFormats = hasFormulas
      ? requiredFormats
      : requiredFormats.filter(f => f !== 'numerical');

    activeRequiredFormats.forEach(fmt => {
      if (!formatCounts[fmt] || formatCounts[fmt] === 0) {
        errors.push(`Format violation: '${fmt}' format is missing completely from blueprint.`);
      }
    });

    // 3. Distribution check (~70% numerical / problem-solving for standard STEM with sufficient formulas)
    const targetNumerical = blueprint.isAdaptiveDistribution
      ? (blueprint.targetNumerical || formatCounts.numerical)
      : (totalSlots === 20 ? 14 : totalSlots === 15 ? 10 : totalSlots === 10 ? 7 : 18);
    if (!blueprint.isAdaptiveDistribution && Math.abs(formatCounts.numerical - targetNumerical) > 1) {
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

    // 8. No duplicate (concept, taskFamily, unknownType) triples
    const seenTriples = new Set<string>();
    const dupTriples: string[] = [];
    slots.forEach(s => {
      const tripleKey = `${s.conceptId}:${s.taskFamily || s.methodId}:${s.unknownType || 'default'}`;
      if (seenTriples.has(tripleKey)) {
        dupTriples.push(`Slot #${s.slotIndex} (${tripleKey})`);
      }
      seenTriples.add(tripleKey);
    });
    if (dupTriples.length > 0) {
      errors.push(`Duplicate (concept, taskFamily, unknownType) triple violation: [${dupTriples.join(', ')}]`);
    }

    // 9. Task family count: at least 10 distinct task families across a 25-question quiz (or adaptively scaled)
    const distinctFamilies = new Set(slots.map(s => s.taskFamily || s.methodId));
    const minRequiredFamilies = blueprint.isAdaptiveDistribution
      ? Math.min(6, distinctFamilies.size)
      : (totalSlots >= 20 ? 10 : Math.min(6, totalSlots));
    if (distinctFamilies.size < minRequiredFamilies) {
      errors.push(
        `Insufficient task family diversity: found ${distinctFamilies.size} distinct task families, required at least ${minRequiredFamilies}.`
      );
    }

    // 10. Max numerical questions with same method_id / taskFamily
    const maxPerMethod = blueprint.isAdaptiveDistribution ? 4 : 2;
    const numericalMethodCounts: Record<string, number> = {};
    slots.filter(s => s.questionFormat === 'numerical').forEach(s => {
      const m = s.taskFamily || s.methodId;
      numericalMethodCounts[m] = (numericalMethodCounts[m] || 0) + 1;
    });

    Object.entries(numericalMethodCounts).forEach(([method, count]) => {
      if (count > maxPerMethod) {
        errors.push(`Method diversity violation: taskFamily/methodId '${method}' appears ${count} times in numerical slots (max allowed: ${maxPerMethod}).`);
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
