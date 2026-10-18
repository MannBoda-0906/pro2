import { QuizPipelineOrchestrator } from './quizPipeline/quizPipelineOrchestrator.js';
import { S13_EvaluationService } from './quizPipeline/S13_evaluationService.js';
import { QuizPersistenceService } from './quizPipeline/quizPersistenceService.js';
import { GeminiService } from './geminiService.js';
import { QuizData, QuizQuestion, QuizSubmissionResult, TranscriptSegment } from '../types/index.js';

export interface GenerateQuizParams {
  videoId: string;
  videoUrl?: string;
  title: string;
  transcript: TranscriptSegment[];
  difficulty?: 'easy' | 'medium' | 'hard';
  count?: number;
  language?: string;
  apiKey?: string;
  skipCache?: boolean;
  analysisSessionId?: string;
  generationAttemptId?: string;
  generationJobId?: string;
  transcriptHash?: string;
}

export interface GeneratePracticeParams {
  videoId?: string;
  title: string;
  weakConcepts: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  language?: string;
  apiKey?: string;
}

export class QuizService {
  /**
   * Generates a 25-question concept-first validated quiz using the 13-stage pipeline.
   */
  static async generateQuiz(params: GenerateQuizParams): Promise<QuizData> {
    return QuizPipelineOrchestrator.executePipeline(params);
  }

  /**
   * Evaluates student answers, returning question-by-question review,
   * concept coverage table, and revision recommendations.
   */
  static evaluateSubmission(params: {
    quiz: QuizData;
    userAnswers: Record<string, string>;
  }): QuizSubmissionResult {
    const result = S13_EvaluationService.evaluateSubmission(params);
    if (params.quiz.id || params.quiz.videoId) {
      QuizPersistenceService.saveAttempt({
        quizId: params.quiz.id || 'unknown',
        videoId: params.quiz.videoId || 'unknown',
        userAnswers: params.userAnswers,
        result
      });
    }
    return result;
  }

  static async generatePracticeQuestions(params: GeneratePracticeParams): Promise<QuizQuestion[]> {
    return GeminiService.generatePracticeQuestions(params);
  }
}
