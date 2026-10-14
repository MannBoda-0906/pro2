import { ApiService } from './api';
import { DemoSample, TranscriptSegment, VideoMetadata } from '../types';

export class VideoService {
  static async getDemos(): Promise<DemoSample[]> {
    return ApiService.getDemos();
  }

  static async processVideo(params: {
    url?: string;
    manualTranscript?: string;
    demoId?: string;
  }): Promise<{
    metadata: VideoMetadata;
    transcript: TranscriptSegment[];
    rawText: string;
    chunkCount: number;
    source: string;
  }> {
    return ApiService.processVideo(params);
  }
}
