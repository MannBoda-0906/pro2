import { ApiService } from './api';
import { SummaryData, TranscriptSegment } from '../types';

export class SummaryService {
  static async generateSummary(params: {
    videoId: string;
    videoUrl?: string;
    title: string;
    transcript: TranscriptSegment[];
    language?: string;
  }): Promise<SummaryData> {
    return ApiService.generateSummary(params);
  }
}
