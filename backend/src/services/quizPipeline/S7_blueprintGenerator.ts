import {
  BlueprintSlot,
  CognitiveLevel,
  PersistedKnowledgeMap,
  QuestionFormat,
  QuizBlueprint,
  QuizCoveragePlan
} from '../../types/index.js';
import { TaskFamily, TaskFamilyTaxonomy } from './taskFamilyTaxonomy.js';

export class S7_BlueprintGenerator {
  /**
   * Stage 7: Generates a quiz blueprint enforcing deterministic two-pass concept allocation,
   * task-family taxonomy diversity, procedure uniqueness, and cognitive level alignment.
   *
   * 1. First pass: round-robin 1 slot per important concept.
   * 2. Second pass: assign remaining slots by importance and unused task families.
   * 3. Formats: 18 numerical/application, 3 T/F, 2 fill blank, 1 match, 1 theory (for 25 Qs).
   * 4. Enforce >= 10 distinct task families and zero duplicate (concept, taskFamily, unknownType) triples.
   */
  public static generateBlueprint(params: {
    coveragePlan: QuizCoveragePlan;
    knowledgeMap: PersistedKnowledgeMap;
    difficulty?: 'easy' | 'medium' | 'hard';
    targetCount?: number;
    analysisSessionId?: string;
    videoId?: string;
  }): QuizBlueprint {
    const { coveragePlan, knowledgeMap, difficulty = 'medium', targetCount = 25, analysisSessionId, videoId } = params;
    const totalSlots = [10, 15, 20, 25].includes(targetCount) ? targetCount : 25;

    const availableFormulasCount = Object.values(knowledgeMap.concepts).filter(c => Boolean(c.formula)).length;
    const isTheoryOnlySubject = knowledgeMap.subject.toLowerCase() === 'history' ||
      knowledgeMap.subject.toLowerCase() === 'literature' ||
      knowledgeMap.subject.toLowerCase() === 'humanities' ||
      availableFormulasCount === 0;

    let isAdaptiveDistribution = false;
    let targetNumerical = totalSlots === 20 ? 14 : totalSlots === 15 ? 10 : totalSlots === 10 ? 7 : 18;

    // Phase 3 Item 7: If the video cannot support 18 numerical questions, adaptively scale
    if (isTheoryOnlySubject || (availableFormulasCount > 0 && availableFormulasCount < 3)) {
      isAdaptiveDistribution = true;
      targetNumerical = availableFormulasCount === 0 ? 0 : Math.min(targetNumerical, Math.max(3, availableFormulasCount * 2));
    }

    // Required format distribution
    let formatSchedule: QuestionFormat[] = [];
    if (isAdaptiveDistribution) {
      // Build adaptive distribution honoring all formats
      const remainingSlots = totalSlots - targetNumerical;
      let tfCount = Math.max(1, Math.floor(remainingSlots * 0.35));
      let fbCount = Math.max(1, Math.floor(remainingSlots * 0.30));
      let matchCount = Math.max(1, Math.floor(remainingSlots * 0.15));
      let theoryCount = remainingSlots - tfCount - fbCount - matchCount;
      if (theoryCount < 1) {
        theoryCount = 1;
        if (tfCount > 1) tfCount--;
        else if (fbCount > 1) fbCount--;
      }

      formatSchedule = [
        ...Array(targetNumerical).fill('numerical' as QuestionFormat),
        ...Array(tfCount).fill('true_false' as QuestionFormat),
        ...Array(fbCount).fill('fill_blank' as QuestionFormat),
        ...Array(matchCount).fill('match_columns' as QuestionFormat),
        ...Array(theoryCount).fill('theoretical' as QuestionFormat)
      ];
      while (formatSchedule.length < totalSlots) {
        formatSchedule.push('theoretical');
      }
      if (formatSchedule.length > totalSlots) {
        formatSchedule = formatSchedule.slice(0, totalSlots);
      }
    } else if (totalSlots === 20) {
      formatSchedule = [
        ...Array(14).fill('numerical' as QuestionFormat),
        ...Array(2).fill('true_false' as QuestionFormat),
        ...Array(2).fill('fill_blank' as QuestionFormat),
        'match_columns' as QuestionFormat,
        'theoretical' as QuestionFormat
      ];
    } else if (totalSlots === 15) {
      formatSchedule = [
        ...Array(10).fill('numerical' as QuestionFormat),
        ...Array(2).fill('true_false' as QuestionFormat),
        'fill_blank' as QuestionFormat,
        'match_columns' as QuestionFormat,
        'theoretical' as QuestionFormat
      ];
    } else if (totalSlots === 10) {
      formatSchedule = [
        ...Array(7).fill('numerical' as QuestionFormat),
        'true_false' as QuestionFormat,
        'fill_blank' as QuestionFormat,
        'theoretical' as QuestionFormat
      ];
    } else {
      // Default 25 slots: exactly 18 numerical, 3 T/F, 2 fill blank, 1 match, 1 theoretical
      formatSchedule = [
        ...Array(18).fill('numerical' as QuestionFormat),
        ...Array(3).fill('true_false' as QuestionFormat),
        ...Array(2).fill('fill_blank' as QuestionFormat),
        'match_columns' as QuestionFormat,
        'theoretical' as QuestionFormat
      ];
    }

    // Two-pass concept allocation
    // First pass: 1 slot per allowed concept from coverage plan
    const conceptSlotQueue: string[] = [];
    const allocations = coveragePlan.allocations.filter(a => a.questionCount > 0);
    const sortedByImportance = [...allocations].sort((a, b) => {
      const weightMap: Record<string, number> = { essential: 4, high: 3, medium: 2, low: 1 };
      return (weightMap[b.importance] || 2) - (weightMap[a.importance] || 2);
    });

    // Pass 1: Round-robin 1 slot per concept
    sortedByImportance.forEach(alloc => {
      if (conceptSlotQueue.length < totalSlots) {
        conceptSlotQueue.push(alloc.conceptId);
      }
    });

    // Pass 2: Remaining slots assigned by importance up to allocated count
    const allocatedCounts: Record<string, number> = {};
    conceptSlotQueue.forEach(id => {
      allocatedCounts[id] = (allocatedCounts[id] || 0) + 1;
    });

    while (conceptSlotQueue.length < totalSlots) {
      let addedInRound = false;
      for (const alloc of sortedByImportance) {
        if (conceptSlotQueue.length >= totalSlots) break;
        const currentCount = allocatedCounts[alloc.conceptId] || 0;
        if (currentCount < alloc.questionCount) {
          conceptSlotQueue.push(alloc.conceptId);
          allocatedCounts[alloc.conceptId] = currentCount + 1;
          addedInRound = true;
        }
      }
      if (!addedInRound) {
        // If all reached allocation, distribute to top importance
        for (const alloc of sortedByImportance) {
          if (conceptSlotQueue.length >= totalSlots) break;
          conceptSlotQueue.push(alloc.conceptId);
          allocatedCounts[alloc.conceptId] = (allocatedCounts[alloc.conceptId] || 0) + 1;
        }
      }
    }

    // Get subject-adaptive allowed families
    const { allowedNumericalFamilies, allowedConceptualFamilies } = TaskFamilyTaxonomy.getAdaptiveFamiliesForSubject(
      knowledgeMap.subject,
      isTheoryOnlySubject
    );

    // Diverse pool of numerical task families (at least 12 distinct families available)
    const numericalPool: TaskFamily[] = allowedNumericalFamilies.length >= 10
      ? allowedNumericalFamilies
      : [
          'DIRECT_CALC',
          'INVERSE_FIND_UNKNOWN',
          'REARRANGE_RELATION',
          'COMPARE_CASES',
          'PREDICT_CHANGE',
          'RATIO_PROPORTION',
          'MULTI_STEP',
          'REAL_WORLD_APPLICATION',
          'CASE_STUDY',
          'DATA_TABLE_INTERPRETATION',
          'GRAPH_INTERPRETATION',
          'ERROR_ANALYSIS',
          'BOUNDARY_LIMITING_CASE',
          'CONSTRAINT_PROBLEM',
          'MULTI_CONCEPT_INTEGRATION'
        ];

    const unknownTypesPool = [
      'primary_target',
      'unknown_input_variable',
      'ratio_partition_factor',
      'differential_displacement',
      'boundary_limit_value',
      'equilibrium_condition',
      'intermediate_magnitude',
      'percentage_variation',
      'scaling_dimension',
      'time_dependent_response',
      'critical_threshold',
      'comparative_difference'
    ];

    const slots: BlueprintSlot[] = [];
    const usedTriples = new Set<string>(); // concept:taskFamily:unknownType
    const usedProcedureSignatures = new Set<string>();
    const familyCounts: Record<string, number> = {};
    const formatCounts: Record<QuestionFormat, number> = {
      numerical: 0,
      true_false: 0,
      fill_blank: 0,
      match_columns: 0,
      theoretical: 0
    };

    const cognitiveLevels: CognitiveLevel[] = [
      'level_2_understanding',
      'level_3_application',
      'level_3_application',
      'level_4_analysis',
      'level_5_exam_reasoning'
    ];

    let numFamilyPointer = 0;

    for (let slotIndex = 1; slotIndex <= totalSlots; slotIndex++) {
      const format = formatSchedule[slotIndex - 1];
      formatCounts[format] = (formatCounts[format] || 0) + 1;

      const conceptId = conceptSlotQueue[slotIndex - 1] || sortedByImportance[0].conceptId;
      const conceptObj = knowledgeMap.concepts[conceptId];
      const conceptName = conceptObj?.conceptName || `Concept ${conceptId}`;
      const subconcept = (conceptObj?.examples && conceptObj.examples[0]) || `${conceptName} Core Principle`;
      const videoCoverage = conceptObj?.videoCoverage === 'FULLY_COVERED' || conceptObj?.videoCoverage === 'MOSTLY_COVERED' || conceptObj?.videoCoverage === 'PARTIALLY_COVERED'
        ? conceptObj.videoCoverage
        : 'MOSTLY_COVERED';

      // Assign TaskFamily based on format
      let taskFamily: TaskFamily = 'DIRECT_CALC';
      if (format === 'numerical') {
        // Pick family with count < 2 to maximize diversity
        let candidate: TaskFamily = numericalPool[numFamilyPointer % numericalPool.length];
        let attempts = 0;
        while ((familyCounts[candidate] || 0) >= 2 && attempts < numericalPool.length * 2) {
          numFamilyPointer++;
          candidate = numericalPool[numFamilyPointer % numericalPool.length];
          attempts++;
        }
        taskFamily = candidate;
        familyCounts[taskFamily] = (familyCounts[taskFamily] || 0) + 1;
        numFamilyPointer++;
      } else if (format === 'true_false') {
        taskFamily = slotIndex % 2 === 0 ? 'TRUE_FALSE' : 'MISCONCEPTION_DETECTION';
        familyCounts[taskFamily] = (familyCounts[taskFamily] || 0) + 1;
      } else if (format === 'fill_blank') {
        taskFamily = 'FILL_BLANK';
        familyCounts[taskFamily] = (familyCounts[taskFamily] || 0) + 1;
      } else if (format === 'match_columns') {
        taskFamily = 'MATCHING';
        familyCounts[taskFamily] = (familyCounts[taskFamily] || 0) + 1;
      } else {
        taskFamily = 'THEORY_EXPLANATION';
        familyCounts[taskFamily] = (familyCounts[taskFamily] || 0) + 1;
      }

      // Find an unused unknownType for this (conceptId, taskFamily) pair
      let unknownType = unknownTypesPool[slotIndex % unknownTypesPool.length];
      let uIdx = 0;
      while (usedTriples.has(`${conceptId}:${taskFamily}:${unknownType}`) && uIdx < unknownTypesPool.length) {
        unknownType = unknownTypesPool[(slotIndex + uIdx) % unknownTypesPool.length];
        uIdx++;
      }
      if (usedTriples.has(`${conceptId}:${taskFamily}:${unknownType}`)) {
        unknownType = `${unknownType}_v${slotIndex}`;
      }
      usedTriples.add(`${conceptId}:${taskFamily}:${unknownType}`);

      // Generate canonical procedureSignature
      const cleanConcept = conceptName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 25);
      const cleanFamily = taskFamily.toLowerCase();
      let procSig = `${cleanConcept}_${cleanFamily}_${unknownType}`;
      if (usedProcedureSignatures.has(procSig)) {
        procSig = `${procSig}_s${slotIndex}`;
      }
      usedProcedureSignatures.add(procSig);

      // Cognitive level progression
      const cognitiveLevel = cognitiveLevels[Math.min(slotIndex - 1, cognitiveLevels.length - 1)] || 'level_3_application';

      const easyBound = Math.max(1, Math.round(totalSlots * 0.2));
      const hardBound = Math.max(1, Math.round(totalSlots * 0.2));
      const slotDifficulty: 'easy' | 'medium' | 'hard' =
        slotIndex <= easyBound
          ? (difficulty === 'hard' ? 'medium' : 'easy')
          : slotIndex > totalSlots - hardBound
          ? (difficulty === 'easy' ? 'medium' : 'hard')
          : difficulty;

      const expectedAnswerFormat =
        format === 'numerical'
          ? 'Four options (A, B, C, D) with single correct calculated answer & plausible error-based distractors'
          : format === 'true_false'
          ? 'Boolean truth value with conceptual verification'
          : format === 'fill_blank'
          ? 'Single defensible exact term or numeric value with accepted equivalents'
          : format === 'match_columns'
          ? 'Four distinct paired relationships between Column A and Column B'
          : 'Multiple choice conceptual reasoning question';

      slots.push({
        slotIndex,
        analysisSessionId,
        videoId,
        conceptId,
        subconcept,
        questionFormat: format,
        methodId: taskFamily,
        taskFamily,
        unknownType,
        procedureSignature: procSig,
        cognitiveLevel,
        difficulty: slotDifficulty,
        expectedAnswerFormat,
        videoCoverage
      });
    }

    return {
      slots,
      formatCounts,
      numericalMethodCounts: familyCounts,
      validated: false, // Will be validated by S8
      isAdaptiveDistribution,
      targetNumerical
    };
  }
}
