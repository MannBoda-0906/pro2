import { ApiService } from './api';
import { QuizData, QuizQuestion, TranscriptSegment } from '../types';

export class QuizService {
  static async generateQuiz(params: {
    videoId: string;
    videoUrl?: string;
    title: string;
    transcript: TranscriptSegment[];
    difficulty?: 'easy' | 'medium' | 'hard';
    count?: number;
    language?: string;
  }): Promise<QuizData> {
    return ApiService.generateQuiz(params);
  }

  static async generatePracticeQuestions(params: {
    videoId?: string;
    title: string;
    weakConcepts: string[];
    difficulty?: 'easy' | 'medium' | 'hard';
    language?: string;
  }): Promise<QuizQuestion[]> {
    return ApiService.generatePracticeQuestions(params);
  }
}
