import { Request, Response } from 'express';
import { YouTubeService } from '../services/youtubeService.js';
import { ChunkingService } from '../services/chunkingService.js';
import { DEMO_VIDEOS } from '../services/demoData.js';
import { TranscriptService } from '../services/transcriptService.js';

export class VideoController {
  static getDemos(_req: Request, res: Response): void {
    const demos = Object.values(DEMO_VIDEOS).map(d => ({
      id: d.id,
      url: d.url,
      title: d.title,
      author: d.author,
      thumbnailUrl: d.thumbnailUrl,
      duration: d.duration,
      durationSeconds: d.durationSeconds,
      summaryPreview: d.summary.shortSummary.slice(0, 120) + '...'
    }));

    res.json({ success: true, demos });
  }

  static async processVideo(req: Request, res: Response): Promise<void> {
    try {
      const { url, manualTranscript, demoId } = req.body;

      // Handle demo video request
      if (demoId && DEMO_VIDEOS[demoId]) {
        const demo = DEMO_VIDEOS[demoId];
        const chunks = ChunkingService.splitTranscriptIntoChunks(demo.transcript);
        res.json({
          success: true,
          metadata: {
            id: demo.id,
            url: demo.url,
            title: demo.title,
            author: demo.author,
            thumbnailUrl: demo.thumbnailUrl,
            duration: demo.duration,
            durationSeconds: demo.durationSeconds,
            embedUrl: `https://www.youtube.com/embed/${demo.url.split('v=')[1] || 'k6U-i4gXka8'}`
          },
          transcript: demo.transcript,
          rawText: demo.transcript.map(t => t.text).join(' '),
          chunkCount: chunks.length,
          source: 'demo'
        });
        return;
      }

      if (!url || typeof url !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_URL',
            message: 'Please provide a valid YouTube URL or video ID.'
          }
        });
        return;
      }

      const videoId = YouTubeService.extractVideoId(url);
      if (!videoId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_URL',
            message: 'Invalid YouTube URL. Please provide a standard link (e.g. youtube.com/watch?v=... or youtu.be/...).'
          }
        });
        return;
      }

      const metadata = await YouTubeService.fetchMetadata(videoId, url);

      // Handle user manual transcript override
      if (manualTranscript && typeof manualTranscript === 'string' && manualTranscript.trim().length > 0) {
        const transcriptSegments = TranscriptService.parseManualTranscript(manualTranscript);
        const rawText = TranscriptService.segmentsToRawText(transcriptSegments);
        const chunks = ChunkingService.splitTranscriptIntoChunks(transcriptSegments);

        res.json({
          success: true,
          metadata,
          transcript: transcriptSegments,
          rawText,
          chunkCount: chunks.length,
          source: 'manual'
        });
        return;
      }

      // Fetch automated transcript
      const { transcript, rawText, source } = await YouTubeService.fetchTranscript(
        videoId,
        metadata.title,
        metadata.author
      );
      const cleanSegments = TranscriptService.cleanSegments(transcript);
      const chunks = ChunkingService.splitTranscriptIntoChunks(cleanSegments);

      res.json({
        success: true,
        metadata,
        transcript: cleanSegments,
        rawText,
        chunkCount: chunks.length,
        source
      });
    } catch (err: any) {
      console.error('Error in VideoController.processVideo:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'VIDEO_PROCESSING_FAILED',
          message: err.message || 'An unexpected error occurred while processing the video.'
        }
      });
    }
  }
}
