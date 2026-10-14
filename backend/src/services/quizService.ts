import { GeminiService } from './geminiService.js';
import { ConceptAnalysisEngine } from './conceptAnalysisEngine.js';
import { QuizData, QuizQuestion, TranscriptSegment } from '../types/index.js';

export interface GenerateQuizParams {
  videoId: string;
  videoUrl?: string;
  title: string;
  transcript: TranscriptSegment[];
  difficulty?: 'easy' | 'medium' | 'hard';
  count?: number;
  language?: string;
  apiKey?: string;
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
  static async generateQuiz(params: GenerateQuizParams): Promise<QuizData> {
    return GeminiService.generateQuiz(params);
  }

  static async generatePracticeQuestions(params: GeneratePracticeParams): Promise<QuizQuestion[]> {
    return GeminiService.generatePracticeQuestions(params);
  }
}
