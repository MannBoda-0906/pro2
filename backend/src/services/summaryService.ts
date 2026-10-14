import { GeminiService } from './geminiService.js';
import { SummaryData, TranscriptSegment } from '../types/index.js';

export interface GenerateSummaryParams {
  videoId: string;
  videoUrl?: string;
  title: string;
  transcript: TranscriptSegment[];
  language?: string;
  apiKey?: string;
}

export class SummaryService {
  static async generateSummary(params: GenerateSummaryParams): Promise<SummaryData> {
    return GeminiService.generateSummary(params);
  }
}
