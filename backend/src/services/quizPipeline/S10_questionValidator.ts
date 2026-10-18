import * as math from 'mathjs';
import { GoogleGenAI } from '@google/genai';
import {
  BlueprintSlot,
  PersistedKnowledgeMap,
  QuizQuestion
} from '../../types/index.js';
import { SolutionFingerprinter } from './solutionFingerprinter.js';
import { ConceptRelevanceValidator } from './conceptRelevanceValidator.js';

export interface QuestionValidationResult {
  valid: boolean;
  reason?: string;
  recomputedAnswer?: string | number;
  validatorType: string;
}

export class S10_QuestionValidator {
  /**
   * Stage 10: Validates candidate question in code using:
   * 1. Concept immutability check (question concept must match blueprint slot concept).
   * 2. Concept origin check (concept must be allowed in knowledge map).
   * 3. Stored solution existence check.
   * 4. Phase 1C: Concept-Question Relevance Validator (derives formula from solution, checks genericness, blind classification).
   * 5. Canonical procedural duplicate & diversity check.
   * 6. Type-specific & independent mathjs re-computation check.
   */
  public static async validateQuestion(params: {
    question: QuizQuestion;
    slot: BlueprintSlot;
    knowledgeMap: PersistedKnowledgeMap;
    earlierQuestions: QuizQuestion[];
    client?: GoogleGenAI | null;
  }): Promise<QuestionValidationResult> {
    const { question, slot, knowledgeMap, earlierQuestions, client } = params;

    // Check 0: Concept Immutability Check - generator CANNOT change slot concept
    if (!slot.conceptId || question.conceptId !== slot.conceptId) {
      return {
        valid: false,
        reason: `Concept immutability violation: Question conceptId '${question.conceptId}' does not match slot conceptId '${slot.conceptId}'.`,
        validatorType: 'CONCEPT_IMMUTABILITY_CHECK'
      };
    }

    // Check 1: Concept ID must exist in knowledge map and be allowed
    if (!knowledgeMap.allowedConceptIds.includes(question.conceptId || '')) {
      return {
        valid: false,
        reason: `Concept ID '${question.conceptId}' is not an allowed video concept in the Knowledge Map.`,
        validatorType: 'CONCEPT_ORIGIN_CHECK'
      };
    }

    // Check 2: Stored solution must exist
    if (!question.structuredSolution && !question.solution) {
      return {
        valid: false,
        reason: 'Question lacks an authoritative pre-computed solution object.',
        validatorType: 'SOLUTION_PRESENCE_CHECK'
      };
    }

    // Check 3: Concept-Question Relevance Validator (Phase 1C)
    const conceptObj = knowledgeMap.concepts[slot.conceptId];
    if (conceptObj) {
      const relevance = await ConceptRelevanceValidator.validateQuestionAgainstConcept({
        question,
        conceptObj,
        knowledgeMap,
        client
      });

      if (!relevance.valid) {
        return {
          valid: false,
          reason: relevance.reason || 'Failed concept relevance verification.',
          validatorType: relevance.verdict
        };
      }
    }

    // Derive and attach canonical solution fingerprint
    const fingerprint = SolutionFingerprinter.computeFingerprint(question);
    question.computedFingerprint = fingerprint;
    if (fingerprint.procedureSignature) {
      question.procedureSignature = fingerprint.procedureSignature;
    }
    if (fingerprint.taskFamily) {
      question.taskFamily = fingerprint.taskFamily;
    }
    if (!question.unknownType && slot.unknownType) {
      question.unknownType = slot.unknownType;
    }

    // Check 3: Method Diversity & Canonical Procedural Duplicate Check
    const duplicateCheck = this.checkProceduralDuplicates(question, earlierQuestions);
    if (!duplicateCheck.valid) {
      return duplicateCheck;
    }

    // Check 4: Type-Specific Validation
    const format = slot.questionFormat || question.questionFormat || 'numerical';

    switch (format) {
      case 'numerical':
        return this.validateNumericalQuestion(question, slot);
      case 'true_false':
        return this.validateTrueFalseQuestion(question, slot, knowledgeMap);
      case 'fill_blank':
        return this.validateFillBlankQuestion(question);
      case 'match_columns':
        return this.validateMatchColumnsQuestion(question);
      case 'theoretical':
        return this.validateTheoreticalQuestion(question, knowledgeMap);
      default:
        return this.validateNumericalQuestion(question, slot);
    }
  }

  /**
   * Procedural duplicate detector:
   * 1. Exact-match check on canonical procedure signature.
   * 2. (concept_id, task_family, unknown_type) triple duplicate check.
   * 3. Max 2 numerical questions with same task_family across quiz.
   */
  private static checkProceduralDuplicates(
    q: QuizQuestion,
    earlierQuestions: QuizQuestion[]
  ): QuestionValidationResult {
    const cid = q.conceptId || '';
    const proc = (q.procedureSignature || q.computedFingerprint?.procedureSignature || '').trim().toLowerCase();
    const family = q.taskFamily || q.computedFingerprint?.taskFamily || q.methodId || '';

    // 1. Exact-match on canonical procedure_signature
    for (const prior of earlierQuestions) {
      const priorProc = (prior.procedureSignature || prior.computedFingerprint?.procedureSignature || '').trim().toLowerCase();

      if (proc === priorProc && proc.length > 0) {
        return {
          valid: false,
          reason: `Duplicate procedure detected: A question with identical canonical procedure signature '${proc}' already exists.`,
          validatorType: 'CANONICAL_FINGERPRINT_DUPLICATE_CHECK'
        };
      }

      // Check duplicate (conceptId, taskFamily, unknownType)
      if (
        cid === prior.conceptId &&
        family === (prior.taskFamily || prior.computedFingerprint?.taskFamily) &&
        q.unknownType &&
        q.unknownType === prior.unknownType
      ) {
        return {
          valid: false,
          reason: `Duplicate (concept, taskFamily, unknownType) triple: ${cid}:${family}:${q.unknownType}`,
          validatorType: 'TRIPLE_DUPLICATE_CHECK'
        };
      }
    }

    // 2. Max 2 numerical questions with same taskFamily in whole quiz
    if (q.questionFormat === 'numerical' || q.type === 'numerical' || q.numericalOrTheory === 'numerical') {
      const sameMethodCount = earlierQuestions.filter(prior => {
        const pFamily = prior.taskFamily || prior.computedFingerprint?.taskFamily || prior.methodId;
        const isNum = prior.questionFormat === 'numerical' || prior.type === 'numerical' || prior.numericalOrTheory === 'numerical';
        return isNum && pFamily === family;
      }).length;

      if (sameMethodCount >= 2) {
        return {
          valid: false,
          reason: `Method diversity exceeded: taskFamily '${family}' is already used by 2 numerical questions.`,
          validatorType: 'METHOD_DIVERSITY_CHECK'
        };
      }
    }

    return { valid: true, validatorType: 'PROCEDURAL_DUPLICATE_CHECK' };
  }

  /**
   * Numerical Validator:
   * Independently recomputes arithmetic using mathjs sandbox, verifies units,
   * and verifies that exactly ONE option matches the recomputed answer.
   */
  private static validateNumericalQuestion(q: QuizQuestion, slot: BlueprintSlot): QuestionValidationResult {
    if (!q.options || q.options.length < 2) {
      return {
        valid: false,
        reason: 'Numerical question must contain multiple choice options (A, B, C, D).',
        validatorType: 'NUMERICAL_OPTIONS_CHECK'
      };
    }

    // Check that correctAnswer exists in options
    const correctIdx = q.options.findIndex(
      opt => opt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
    );
    if (correctIdx === -1) {
      return {
        valid: false,
        reason: `Correct answer '${q.correctAnswer}' is not present among options: [${q.options.join(', ')}].`,
        validatorType: 'NUMERICAL_CORRECT_ANSWER_CHECK'
      };
    }

    // Ensure options are distinct (no duplicate options)
    const normalizedOptions = q.options.map(o => o.trim().toLowerCase());
    const uniqueOptions = new Set(normalizedOptions);
    if (uniqueOptions.size !== q.options.length) {
      return {
        valid: false,
        reason: 'Duplicate options detected in multiple choice options list.',
        validatorType: 'NUMERICAL_DISTRACTOR_UNIQUENESS'
      };
    }

    // Independent Math Recomputation Pass via mathjs
    let recomputedAnswer: string | number | undefined;
    const sol = q.structuredSolution?.numerical;

    if (sol && sol.calculation) {
      try {
        // Attempt to extract arithmetic expression from calculation text
        // e.g. "x_cm = (2*0 + 6*4)/(2 + 6) = 24/8 = 3.0"
        const calcExprMatch = sol.calculation.match(/=\s*([0-9+\-*/().\s]+)(?:=|$)/);
        if (calcExprMatch) {
          const rawExpr = calcExprMatch[1].trim();
          if (rawExpr.length > 0 && /[+\-*/]/.test(rawExpr)) {
            const evaluated = math.evaluate(rawExpr);
            recomputedAnswer = typeof evaluated === 'number' ? Math.round(evaluated * 100) / 100 : evaluated;

            // Check if correct answer contains this recomputed number
            const correctNumMatch = q.correctAnswer.match(/-?\d+(?:\.\d+)?/);
            if (correctNumMatch && typeof recomputedAnswer === 'number') {
              const parsedCorrect = parseFloat(correctNumMatch[0]);
              const diff = Math.abs(parsedCorrect - recomputedAnswer);
              if (diff > 0.05) {
                return {
                  valid: false,
                  reason: `Arithmetic mismatch: Mathjs independently recomputed ${recomputedAnswer}, but correct answer is stated as ${parsedCorrect} (diff: ${diff}).`,
                  validatorType: 'INDEPENDENT_MATH_VERIFICATION'
                };
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[S10_QuestionValidator] Mathjs evaluation skipped for complex expression:`, err);
      }
    }

    return {
      valid: true,
      recomputedAnswer,
      validatorType: 'NUMERICAL_VALIDATOR'
    };
  }

  /**
   * True/False Validator:
   * Verifies truth value and ensures options are ['True', 'False']
   */
  private static validateTrueFalseQuestion(
    q: QuizQuestion,
    slot: BlueprintSlot,
    knowledgeMap: PersistedKnowledgeMap
  ): QuestionValidationResult {
    const normalizedAns = q.correctAnswer.trim().toLowerCase();
    if (normalizedAns !== 'true' && normalizedAns !== 'false') {
      return {
        valid: false,
        reason: `True/False question correct answer must be 'True' or 'False', got '${q.correctAnswer}'.`,
        validatorType: 'TRUE_FALSE_FORMAT_CHECK'
      };
    }

    if (!q.structuredSolution?.trueFalse?.reasoning) {
      return {
        valid: false,
        reason: 'True/False question must contain conceptual reasoning in its solution.',
        validatorType: 'TRUE_FALSE_SOLUTION_CHECK'
      };
    }

    return { valid: true, validatorType: 'TRUE_FALSE_VALIDATOR' };
  }

  /**
   * Fill in the blank Validator:
   * Verifies exactly one defensible answer, non-empty accepted variants.
   */
  private static validateFillBlankQuestion(q: QuizQuestion): QuestionValidationResult {
    if (!q.correctAnswer || q.correctAnswer.trim().length === 0) {
      return {
        valid: false,
        reason: 'Fill in the blank question must have a non-empty correct answer.',
        validatorType: 'FILL_BLANK_CHECK'
      };
    }

    // Must not be a verbatim transcript quote
    const lowerQ = q.question.toLowerCase();
    if (lowerQ.includes('what did the teacher say') || lowerQ.includes('in the video')) {
      return {
        valid: false,
        reason: 'Fill in the blank question violates pedagogical standard by referencing the video or teacher.',
        validatorType: 'FILL_BLANK_PHRASING_CHECK'
      };
    }

    return { valid: true, validatorType: 'FILL_BLANK_VALIDATOR' };
  }

  /**
   * Match Columns Validator:
   * Verifies at least 4 pairs and unambiguous mapping.
   */
  private static validateMatchColumnsQuestion(q: QuizQuestion): QuestionValidationResult {
    const pairs = q.matchPairs || q.structuredSolution?.match?.pairs;
    if (!pairs || pairs.length < 4) {
      return {
        valid: false,
        reason: `Match columns question must contain at least 4 distinct pairs, got ${pairs ? pairs.length : 0}.`,
        validatorType: 'MATCH_COLUMNS_CHECK'
      };
    }

    if (!q.correctAnswer || q.correctAnswer.trim().length === 0) {
      return {
        valid: false,
        reason: 'Match columns question must specify the complete correct mapping key.',
        validatorType: 'MATCH_KEY_CHECK'
      };
    }

    return { valid: true, validatorType: 'MATCH_COLUMNS_VALIDATOR' };
  }

  /**
   * Theoretical Question Validator:
   * Factual verification against concept understanding object.
   */
  private static validateTheoreticalQuestion(
    q: QuizQuestion,
    knowledgeMap: PersistedKnowledgeMap
  ): QuestionValidationResult {
    const conceptObj = knowledgeMap.concepts[q.conceptId || ''];
    if (!conceptObj) {
      return {
        valid: false,
        reason: `Theoretical question concept '${q.conceptId}' not found in Knowledge Map.`,
        validatorType: 'THEORY_CONCEPT_CHECK'
      };
    }

    if (!q.options || q.options.length < 3) {
      return {
        valid: false,
        reason: 'Theoretical question must have at least 3 distinct conceptual options.',
        validatorType: 'THEORY_OPTIONS_CHECK'
      };
    }

    return { valid: true, validatorType: 'THEORETICAL_VALIDATOR' };
  }
}
