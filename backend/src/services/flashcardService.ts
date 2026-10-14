import { GeminiService } from './geminiService.js';
import { Flashcard, TranscriptSegment } from '../types/index.js';

export interface GenerateFlashcardsParams {
  videoId: string;
  title: string;
  transcript: TranscriptSegment[];
  count?: number;
  apiKey?: string;
}

export class FlashcardService {
  static async generateFlashcards(params: GenerateFlashcardsParams): Promise<Flashcard[]> {
    return GeminiService.generateFlashcards(params);
  }
}
