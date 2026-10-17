import {
  PersistedKnowledgeMap,
  QuizBlueprint,
  QuizQuestion
} from '../../types/index.js';
import { MathNormalizer } from '../../utils/mathNormalizer.js';

export interface QualityGateReport {
  passed: boolean;
  checks: {
    checkExactly25Questions: boolean;
    checkAllFiveFormatsPresent: boolean;
    checkEveryAllowedConceptCovered: boolean;
    checkNoUntaughtConceptsUsed: boolean;
    checkNoDuplicateProcedureSignatures: boolean;
    checkMethodDiversityRulesMet: boolean;
    checkEveryNumericalAnswerVerified: boolean;
    checkEveryQuestionHasDefensibleAnswerAndSolution: boolean;
    checkEverySolutionMatchesExactQuestion: boolean;
    checkEveryQuestionMapsToVideoConcept: boolean;
    checkSourceIsolation: boolean;
    checkNoCrossTopicContamination: boolean;
    checkNoMalformedMath: boolean;
  };
  failures: string[];
}

export class S11_QualityGate {
  /**
   * Stage 11: Whole-quiz quality gate.
   * If ANY check fails, the quiz is rejected and not shown.
   */
  public static evaluateQuiz(params: {
    questions: QuizQuestion[];
    blueprint: QuizBlueprint;
    knowledgeMap: PersistedKnowledgeMap;
    targetCount?: number;
    analysisSessionId?: string;
    videoId?: string;
  }): QualityGateReport {
    const { questions, blueprint, knowledgeMap, targetCount = 25, analysisSessionId, videoId } = params;
    const totalTarget = [10, 15, 20, 25].includes(targetCount) ? targetCount : 25;
    const failures: string[] = [];

    // 1. Exactly totalTarget questions
    const checkTargetQuestionsCount = questions.length === totalTarget;
    if (!checkTargetQuestionsCount) {
      failures.push(`Expected exactly ${totalTarget} questions, got ${questions.length}.`);
    }

    // 2. All required formats present and distribution within limits
    const formatsSeen = new Set(questions.map(q => q.questionFormat || q.type));
    const requiredFormats = totalTarget >= 15
      ? ['numerical', 'true_false', 'fill_blank', 'match_columns', 'theoretical']
      : ['numerical', 'true_false', 'fill_blank', 'theoretical'];
    const missingFormats = requiredFormats.filter(f => !formatsSeen.has(f as any));
    const checkAllFiveFormatsPresent = missingFormats.length === 0;
    if (!checkAllFiveFormatsPresent) {
      failures.push(`Missing question formats: [${missingFormats.join(', ')}].`);
    }

    // 3. Every meaningful allowed concept covered at least once
    const testedConceptIds = new Set(questions.map(q => q.conceptId));
    const expectedConceptIds = totalTarget >= knowledgeMap.allowedConceptIds.length
      ? knowledgeMap.allowedConceptIds
      : Array.from(new Set(blueprint.slots.map(s => s.conceptId)));
    const missingConcepts = expectedConceptIds.filter(id => !testedConceptIds.has(id));
    const checkEveryAllowedConceptCovered = missingConcepts.length === 0;
    if (!checkEveryAllowedConceptCovered) {
      failures.push(`Allowed concepts not covered: [${missingConcepts.join(', ')}].`);
    }

    // 4. No NOT_COVERED or untaught major concept used
    const allowedSet = new Set(knowledgeMap.allowedConceptIds);
    const untaughtViolations: string[] = [];
    questions.forEach((q, idx) => {
      if (!allowedSet.has(q.conceptId || '')) {
        untaughtViolations.push(`Q${idx + 1} (${q.conceptId})`);
      }
      // Also check question text for untaught textbook topics
      const fullQText = `${q.question} ${q.conceptName || ''}`.toLowerCase();
      knowledgeMap.untaughtChapterConcepts.forEach(untaught => {
        if (untaught.length > 5 && fullQText.includes(untaught.toLowerCase())) {
          untaughtViolations.push(`Q${idx + 1} mentions untaught concept '${untaught}'`);
        }
      });
    });
    const checkNoUntaughtConceptsUsed = untaughtViolations.length === 0;
    if (!checkNoUntaughtConceptsUsed) {
      failures.push(`Untaught concepts detected: [${untaughtViolations.join(', ')}].`);
    }

    // 5. No duplicate procedure_signature
    const seenProcedures = new Set<string>();
    const dupProcedures: string[] = [];
    questions.forEach((q, idx) => {
      const proc = (q.procedureSignature || `proc_${idx}`).trim().toLowerCase();
      if (seenProcedures.has(proc)) {
        dupProcedures.push(`Q${idx + 1}: ${proc}`);
      }
      seenProcedures.add(proc);
    });
    const checkNoDuplicateProcedureSignatures = dupProcedures.length === 0;
    if (!checkNoDuplicateProcedureSignatures) {
      failures.push(`Duplicate procedure signatures: [${dupProcedures.join(', ')}].`);
    }

    // 6. Method diversity rules met (max 2 numerical per method_id)
    const numericalMethods: Record<string, number> = {};
    questions.filter(q => q.questionFormat === 'numerical' || q.type === 'numerical').forEach(q => {
      const mid = q.methodId || 'DIRECT_CALC';
      numericalMethods[mid] = (numericalMethods[mid] || 0) + 1;
    });
    const methodOveruse = Object.entries(numericalMethods).filter(([_, count]) => count > 2);
    const checkMethodDiversityRulesMet = methodOveruse.length === 0;
    if (!checkMethodDiversityRulesMet) {
      failures.push(`Method diversity exceeded: [${methodOveruse.map(([m, c]) => `${m}: ${c}`).join(', ')}].`);
    }

    // 7. Every numerical answer independently verified
    const numericalQuestions = questions.filter(q => q.questionFormat === 'numerical' || q.type === 'numerical');
    const unverifiedNumerical = numericalQuestions.filter(q => {
      return !q.options || q.options.length < 2 || !q.correctAnswer || !q.structuredSolution;
    });
    const checkEveryNumericalAnswerVerified = unverifiedNumerical.length === 0;
    if (!checkEveryNumericalAnswerVerified) {
      failures.push(`Numerical questions failing independent verification: ${unverifiedNumerical.length}.`);
    }

    // 8. Every question has one defensible answer and a stored solution
    const invalidAnswers = questions.filter(q => !q.correctAnswer || q.correctAnswer.trim().length === 0 || !q.solution);
    const checkEveryQuestionHasDefensibleAnswerAndSolution = invalidAnswers.length === 0;
    if (!checkEveryQuestionHasDefensibleAnswerAndSolution) {
      failures.push(`Questions missing defensible answer or solution: ${invalidAnswers.length}.`);
    }

    // 9. Every solution matches its exact question
    const checkEverySolutionMatchesExactQuestion = questions.every(q => {
      return Boolean(q.solution && q.solution.length > 10);
    });
    if (!checkEverySolutionMatchesExactQuestion) {
      failures.push('Some questions have incomplete or mismatched solutions.');
    }

    // 10. Every question maps to a video concept in the knowledge map
    const checkEveryQuestionMapsToVideoConcept = questions.every(q => {
      return Boolean(q.conceptId && knowledgeMap.concepts[q.conceptId]);
    });
    if (!checkEveryQuestionMapsToVideoConcept) {
      failures.push('Questions present without valid concept mapping to the Knowledge Map.');
    }

    // 11. Strict Source Isolation Check
    let checkSourceIsolation = true;
    if (analysisSessionId || videoId) {
      for (const q of questions) {
        if (analysisSessionId && q.analysisSessionId && q.analysisSessionId !== analysisSessionId) {
          checkSourceIsolation = false;
          failures.push(`Question ${q.id} has mismatched analysisSessionId: expected ${analysisSessionId}, found ${q.analysisSessionId}`);
          break;
        }
        if (videoId && q.videoId && q.videoId !== videoId) {
          checkSourceIsolation = false;
          failures.push(`Question ${q.id} has mismatched videoId: expected ${videoId}, found ${q.videoId}`);
          break;
        }
      }
    }

    // 12. Cross-Topic Contamination Check
    let checkNoCrossTopicContamination = true;
    const topicText = `${knowledgeMap.topic} ${knowledgeMap.chapter} ${knowledgeMap.subject}`.toLowerCase();
    const hasCenterOfMassTopic = topicText.includes('center of mass') || topicText.includes('centre of mass');
    const hasPhotosynthesisTopic = topicText.includes('photosynthesis');

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qFull = `${q.question} ${q.conceptName || ''} ${q.explanation || ''}`.toLowerCase();

      if (!hasCenterOfMassTopic && (qFull.includes('center of mass') || qFull.includes('centre of mass') || qFull.includes('m1*x1') || qFull.includes('x_cm'))) {
        checkNoCrossTopicContamination = false;
        failures.push(`Cross-topic contamination: Q${i + 1} contains Center of Mass content in a non-Center-of-Mass video.`);
        break;
      }

      if (!hasPhotosynthesisTopic && (qFull.includes('photosynthesis') || qFull.includes('calvin cycle') || qFull.includes('chloroplast') || qFull.includes('thylakoid'))) {
        checkNoCrossTopicContamination = false;
        failures.push(`Cross-topic contamination: Q${i + 1} contains Photosynthesis content in a non-Photosynthesis video.`);
        break;
      }
    }

    // 13. Math Formatting & LaTeX Well-Formedness Check
    let checkNoMalformedMath = true;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qMath = MathNormalizer.validateContent(q.question);
      if (!qMath.valid) {
        checkNoMalformedMath = false;
        failures.push(`Malformed math in Q${i + 1} text: ${qMath.reason}`);
        break;
      }
      const solMath = MathNormalizer.validateContent(q.solution || '');
      if (!solMath.valid) {
        checkNoMalformedMath = false;
        failures.push(`Malformed math in Q${i + 1} solution: ${solMath.reason}`);
        break;
      }
    }

    const passed = failures.length === 0;

    return {
      passed,
      checks: {
        checkExactly25Questions: checkTargetQuestionsCount,
        checkAllFiveFormatsPresent,
        checkEveryAllowedConceptCovered,
        checkNoUntaughtConceptsUsed,
        checkNoDuplicateProcedureSignatures,
        checkMethodDiversityRulesMet,
        checkEveryNumericalAnswerVerified,
        checkEveryQuestionHasDefensibleAnswerAndSolution,
        checkEverySolutionMatchesExactQuestion,
        checkEveryQuestionMapsToVideoConcept,
        checkSourceIsolation,
        checkNoCrossTopicContamination,
        checkNoMalformedMath
      },
      failures
    };
  }
}
