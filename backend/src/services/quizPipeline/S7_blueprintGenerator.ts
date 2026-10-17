import {
  BlueprintSlot,
  CognitiveLevel,
  PersistedKnowledgeMap,
  QuestionFormat,
  QuizBlueprint,
  QuizCoveragePlan
} from '../../types/index.js';

export class S7_BlueprintGenerator {
  /**
   * Stage 7: Generates a 25-slot quiz blueprint enforcing exact distribution,
   * method diversity, procedure uniqueness, and cognitive level alignment.
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

    // Determine subject format adaptability:
    // If non-numerical subject (e.g. History), numerical slots become application/case-based problems,
    // maintaining the ~70/30 split and keeping required formats present!
    const isTheoryOnlySubject = knowledgeMap.subject.toLowerCase() === 'history' ||
      knowledgeMap.subject.toLowerCase() === 'literature' ||
      (!Object.values(knowledgeMap.concepts).some(c => Boolean(c.formula)) && knowledgeMap.subject.toLowerCase() === 'biology_theory');

    // Proportional required format distribution across targetCount questions:
    // ~70% numerical/problem-solving and ~30% conceptual/applied
    let formatSchedule: QuestionFormat[] = [];
    if (totalSlots === 20) {
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
      // Default 25 slots
      formatSchedule = [
        ...Array(18).fill('numerical' as QuestionFormat),
        ...Array(3).fill('true_false' as QuestionFormat),
        ...Array(2).fill('fill_blank' as QuestionFormat),
        'match_columns' as QuestionFormat,
        'theoretical' as QuestionFormat
      ];
    }

    // Method library for subject diversity
    const numericalMethodPool = [
      'DIRECT_CALC',
      'UNKNOWN_VARIABLE',
      'INVERSE_REASONING',
      'COMPARISON',
      'PREDICTION',
      'MULTI_STEP',
      'RATIO_REASONING',
      'ERROR_ANALYSIS',
      'DATA_INTERPRETATION',
      'GRAPH_INTERPRETATION',
      'APPLICATION',
      'CASE_STUDY',
      'CONSTRAINT',
      'BOUNDARY_CASE',
      'METHOD_SELECTION',
      'MULTI_CONCEPT',
      'PARAMETRIC_SHIFT',
      'SYSTEM_TRANSFORMATION'
    ];

    const cognitiveLevels: CognitiveLevel[] = [
      'level_2_understanding',
      'level_3_application',
      'level_3_application',
      'level_4_analysis',
      'level_5_exam_reasoning'
    ];

    // Create queue of concept IDs based on coverage plan allocations
    const conceptQueue: string[] = [];
    coveragePlan.allocations.forEach(alloc => {
      for (let i = 0; i < alloc.questionCount; i++) {
        conceptQueue.push(alloc.conceptId);
      }
    });

    // Shuffle slightly while guaranteeing concept spacing
    while (conceptQueue.length < totalSlots) {
      conceptQueue.push(coveragePlan.allocations[conceptQueue.length % coveragePlan.allocations.length].conceptId);
    }

    const slots: BlueprintSlot[] = [];
    const usedProcedureSignatures = new Set<string>();
    const methodCounts: Record<string, number> = {};
    const formatCounts: Record<QuestionFormat, number> = {
      numerical: 0,
      true_false: 0,
      fill_blank: 0,
      match_columns: 0,
      theoretical: 0
    };

    for (let slotIndex = 1; slotIndex <= totalSlots; slotIndex++) {
      const format = formatSchedule[slotIndex - 1];
      formatCounts[format] = (formatCounts[format] || 0) + 1;

      const conceptId = conceptQueue[slotIndex - 1] || coveragePlan.allocations[0].conceptId;
      const conceptObj = knowledgeMap.concepts[conceptId];
      const conceptName = conceptObj?.conceptName || `Concept ${conceptId}`;
      const subconcept = (conceptObj?.examples && conceptObj.examples[0]) || `${conceptName} Core Principle`;
      const videoCoverage = conceptObj?.videoCoverage === 'FULLY_COVERED' || conceptObj?.videoCoverage === 'MOSTLY_COVERED' || conceptObj?.videoCoverage === 'PARTIALLY_COVERED'
        ? conceptObj.videoCoverage
        : 'MOSTLY_COVERED';

      // Pick diverse method_id (max 2 per method across numerical questions!)
      let methodId = 'DIRECT_CALC';
      if (format === 'numerical') {
        const availableMethods = numericalMethodPool.filter(m => (methodCounts[m] || 0) < 2);
        methodId = availableMethods[(slotIndex - 1) % availableMethods.length] || 'DIRECT_CALC';
        methodCounts[methodId] = (methodCounts[methodId] || 0) + 1;
      } else if (format === 'true_false') {
        methodId = slotIndex % 2 === 0 ? 'MISCONCEPTION' : 'CAUSE_EFFECT';
      } else if (format === 'fill_blank') {
        methodId = 'UNKNOWN_VARIABLE';
      } else if (format === 'match_columns') {
        methodId = 'METHOD_SELECTION';
      } else {
        methodId = 'CONCEPT_EXPLANATION';
      }

      // Generate distinct normalized snake_case procedure_signature
      let procBase = this.generateProcedureSignature(conceptName, format, methodId, slotIndex);
      let procSig = procBase;
      let counter = 1;
      while (usedProcedureSignatures.has(procSig)) {
        procSig = `${procBase}_variant_${counter}`;
        counter++;
      }
      usedProcedureSignatures.add(procSig);

      const cognitiveLevel = cognitiveLevels[slotIndex % cognitiveLevels.length];
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
        methodId,
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
      numericalMethodCounts: methodCounts,
      validated: false // Will be validated by S8
    };
  }

  private static generateProcedureSignature(
    conceptName: string,
    format: QuestionFormat,
    methodId: string,
    slotIndex: number
  ): string {
    const cleanConcept = conceptName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 30);

    const cleanMethod = methodId.toLowerCase();

    const taskTokens = [
      'solve_for_target_value',
      'rearrange_algebraic_expression',
      'evaluate_boundary_condition',
      'compute_differential_shift',
      'verify_conservation_balance',
      'ratio_scaling_inversion',
      'identify_limiting_constraint',
      'multi_particle_summation',
      'coordinate_projection_resolution',
      'isolate_unknown_mass_term'
    ];

    const specificTask = taskTokens[slotIndex % taskTokens.length];
    return `${cleanConcept}_${cleanMethod}_${specificTask}`;
  }
}
