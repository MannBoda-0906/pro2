import {
  QuestionResultItem,
  QuizData,
  QuizQuestion,
  QuizSubmissionResult
} from '../../types/index.js';

export class S13_EvaluationService {
  /**
   * Stage 13: Evaluates submitted student answers across all 25 questions.
   * Handles:
   * - Unanswered questions as incorrect with "Not answered" (localized).
   * - Question-by-question scoring and result localization (TRUE/FALSE).
   * - Concept-wise performance aggregation.
   * - Strong concepts (>= 75%), weak concepts (< 50%).
   * - Recommended revision linked to video timestamps where available.
   * - Concept coverage summary table.
   */
  public static evaluateSubmission(params: {
    quiz: QuizData;
    userAnswers: Record<string, string>;
  }): QuizSubmissionResult {
    const { quiz, userAnswers } = params;
    const questions = quiz.questions;
    const lang = (quiz.language || 'en').toLowerCase();

    const notAnsweredText =
      lang === 'hi' ? 'उत्तर नहीं दिया' :
      lang === 'gu' ? 'જવાબ આપ્યો નથી' :
      lang === 'es' ? 'No respondida' : 'Not answered';

    const trueText =
      lang === 'hi' ? 'सत्य' :
      lang === 'gu' ? 'સાચું' :
      lang === 'es' ? 'VERDADERO' : 'TRUE';

    const falseText =
      lang === 'hi' ? 'असत्य' :
      lang === 'gu' ? 'ખોટું' :
      lang === 'es' ? 'FALSO' : 'FALSE';

    let correctTotal = 0;
    const questionResults: QuestionResultItem[] = [];
    const conceptStats: Record<string, { conceptName: string; total: number; correct: number; timestamp?: string; timestampSeconds?: number }> = {};

    questions.forEach((q, idx) => {
      const rawUserAns = userAnswers[q.id];
      const hasAnswered = typeof rawUserAns === 'string' && rawUserAns.trim().length > 0;
      const displayUserAnswer = hasAnswered ? rawUserAns.trim() : notAnsweredText;

      const isCorrect = hasAnswered && this.checkAnswerCorrectness(q, rawUserAns);
      if (isCorrect) correctTotal++;

      const resultLocalized = isCorrect ? trueText : falseText;
      const conceptId = q.conceptId || `C_${idx + 1}`;
      const conceptName = q.conceptName || q.concept || `Concept ${conceptId}`;

      // Aggregate concept stats
      if (!conceptStats[conceptId]) {
        conceptStats[conceptId] = {
          conceptName,
          total: 0,
          correct: 0,
          timestamp: q.timestampFormatted,
          timestampSeconds: q.timestampSeconds
        };
      }
      conceptStats[conceptId].total += 1;
      if (isCorrect) conceptStats[conceptId].correct += 1;

      questionResults.push({
        questionId: q.id,
        slotIndex: q.slotIndex || idx + 1,
        question: q.question,
        format: q.questionFormat || 'numerical',
        userAnswer: displayUserAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        resultLocalized,
        solution: q.structuredSolution || {
          format: q.questionFormat || 'numerical',
          fullText: q.solution || q.explanation
        },
        explanation: q.explanation,
        conceptTested: conceptName,
        conceptId,
        timestampFormatted: q.timestampFormatted,
        timestampSeconds: q.timestampSeconds
      });
    });

    const total = questions.length;
    const incorrect = total - correctTotal;
    const percentage = total > 0 ? Math.round((correctTotal / total) * 100) : 0;

    // Build Concept Coverage Table & Identify Strong / Weak Concepts
    const conceptCoverageTable: QuizSubmissionResult['conceptCoverageTable'] = [];
    const strongConcepts: QuizSubmissionResult['strongConcepts'] = [];
    const weakConcepts: QuizSubmissionResult['weakConcepts'] = [];
    const recommendedRevision: QuizSubmissionResult['recommendedRevision'] = [];

    Object.entries(conceptStats).forEach(([cid, stats]) => {
      const cPercentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      const cIncorrect = stats.total - stats.correct;

      conceptCoverageTable.push({
        conceptId: cid,
        conceptName: stats.conceptName,
        questionsCount: stats.total,
        correctCount: stats.correct,
        incorrectCount: cIncorrect,
        percentage: cPercentage
      });

      if (cPercentage >= 75) {
        strongConcepts.push({
          conceptId: cid,
          conceptName: stats.conceptName,
          percentage: cPercentage
        });
      } else if (cPercentage < 50) {
        weakConcepts.push({
          conceptId: cid,
          conceptName: stats.conceptName,
          percentage: cPercentage
        });

        // Recommended revision for weak concepts
        const conceptUnderstanding = quiz.persistedKnowledgeMap?.concepts[cid];
        const summary = conceptUnderstanding
          ? `Review principle: ${conceptUnderstanding.meaning} Common mistake: ${conceptUnderstanding.commonMistakes[0] || 'recheck formula calculations'}`
          : `Review foundational equations and boundary conditions for ${stats.conceptName}.`;

        recommendedRevision.push({
          conceptId: cid,
          conceptName: stats.conceptName,
          summary,
          timestampFormatted: stats.timestamp || '00:10',
          timestampSeconds: stats.timestampSeconds || 10
        });
      }
    });

    return {
      total,
      correct: correctTotal,
      incorrect,
      percentage,
      questionResults,
      conceptCoverageTable,
      strongConcepts,
      weakConcepts,
      recommendedRevision
    };
  }

  private static checkAnswerCorrectness(q: QuizQuestion, userAns: string): boolean {
    const cleanUser = userAns.trim().toLowerCase();
    const cleanCorrect = q.correctAnswer.trim().toLowerCase();

    // Exact direct match
    if (cleanUser === cleanCorrect) return true;

    // Check accepted equivalents (for fill_blank)
    if (q.acceptedEquivalents && Array.isArray(q.acceptedEquivalents)) {
      if (q.acceptedEquivalents.some(eq => eq.trim().toLowerCase() === cleanUser)) {
        return true;
      }
    }

    // Number matching with tolerance (for numerical)
    const userNum = cleanUser.match(/-?\d+(?:\.\d+)?/);
    const correctNum = cleanCorrect.match(/-?\d+(?:\.\d+)?/);
    if (userNum && correctNum) {
      const u = parseFloat(userNum[0]);
      const c = parseFloat(correctNum[0]);
      if (Math.abs(u - c) < 0.05) {
        return true;
      }
    }

    return false;
  }
}
