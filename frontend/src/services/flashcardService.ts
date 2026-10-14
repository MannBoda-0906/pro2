import { ApiService } from './api';
import { Flashcard, TranscriptSegment } from '../types';

export class FlashcardService {
  static async generateFlashcards(params: {
    videoId: string;
    title: string;
    transcript: TranscriptSegment[];
    count?: number;
  }): Promise<Flashcard[]> {
    return ApiService.generateFlashcards(params);
  }
}
