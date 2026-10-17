import { Request, Response } from 'express';
import { YouTubeService } from '../services/youtubeService.js';
import { ChunkingService } from '../services/chunkingService.js';
import { DEMO_VIDEOS } from '../services/demoData.js';
import { TranscriptService } from '../services/transcriptService.js';
import { VideoIdentity } from '../utils/videoIdentity.js';

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
      const { url, manualTranscript, demoId, language, analysisSessionId } = req.body;
      const sessionId = (typeof analysisSessionId === 'string' && analysisSessionId.trim())
        ? analysisSessionId.trim()
        : VideoIdentity.createSessionId();

      // Handle demo video request
      if (demoId && DEMO_VIDEOS[demoId]) {
        const demo = DEMO_VIDEOS[demoId];
        const chunks = ChunkingService.splitTranscriptIntoChunks(demo.transcript);
        const canonicalId = demo.id;
        const resData = {
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
        };

        res.json({
          ok: true,
          success: true,
          analysisSessionId: sessionId,
          videoId: canonicalId,
          status: 'success',
          data: resData,
          ...resData
        });
        return;
      }

      if (!url || typeof url !== 'string') {
        res.status(400).json({
          ok: false,
          success: false,
          error: {
            code: 'INVALID_URL',
            message: 'Please provide a valid YouTube URL or video ID.',
            stage: 'input_validation',
            retryable: false
          }
        });
        return;
      }

      const videoId = VideoIdentity.parseCanonicalVideoId(url) || YouTubeService.extractVideoId(url);
      if (!videoId) {
        res.status(400).json({
          ok: false,
          success: false,
          error: {
            code: 'INVALID_URL',
            message: 'Invalid YouTube URL. Please provide a standard link (e.g. youtube.com/watch?v=... or youtu.be/...).',
            stage: 'input_validation',
            retryable: false
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

        const resData = {
          metadata,
          transcript: transcriptSegments,
          rawText,
          chunkCount: chunks.length,
          source: 'manual'
        };

        res.json({
          ok: true,
          success: true,
          analysisSessionId: sessionId,
          videoId,
          status: 'success',
          data: resData,
          ...resData
        });
        return;
      }

      // Fetch authentic transcript via Robust CaptionService
      const fetchResult = await YouTubeService.fetchTranscript(
        videoId,
        metadata.title,
        metadata.author,
        typeof language === 'string' ? language : 'en'
      );

      const cleanSegments = TranscriptService.cleanSegments(fetchResult.transcript);
      const chunks = ChunkingService.splitTranscriptIntoChunks(cleanSegments);

      const resData = {
        metadata,
        transcript: cleanSegments,
        rawText: fetchResult.rawText,
        languageCode: fetchResult.languageCode,
        trackType: fetchResult.trackType,
        chunkCount: chunks.length,
        source: fetchResult.source
      };

      res.json({
        ok: true,
        success: true,
        analysisSessionId: sessionId,
        videoId,
        status: 'success',
        data: resData,
        ...resData
      });
    } catch (err: any) {
      console.error('Error in VideoController.processVideo:', err);

      const rawCode = err.code || (err.message?.includes('NO_CAPTIONS') ? 'NO_CAPTIONS_AVAILABLE' : 'VIDEO_PROCESSING_FAILED');
      const isNoCaptions = rawCode === 'NO_CAPTIONS_AVAILABLE' || err.message?.includes('NO_CAPTIONS_AVAILABLE');
      const isBlocked = rawCode === 'CAPTIONS_BLOCKED_OR_FETCH_FAILED' || err.message?.includes('CAPTIONS_BLOCKED') || err.message?.includes('429');
      const isUnsupportedLang = rawCode === 'UNSUPPORTED_LANGUAGE' || err.message?.includes('UNSUPPORTED_LANGUAGE');

      let statusCode = 500;
      let code = rawCode;
      let retryable = false;

      if (isNoCaptions) {
        statusCode = 404;
        code = 'NO_CAPTIONS_AVAILABLE';
        retryable = false;
      } else if (isBlocked) {
        statusCode = 429;
        code = 'CAPTIONS_BLOCKED_OR_FETCH_FAILED';
        retryable = true;
      } else if (isUnsupportedLang) {
        statusCode = 422;
        code = 'UNSUPPORTED_LANGUAGE';
        retryable = false;
      }

      res.status(statusCode).json({
        ok: false,
        success: false,
        error: {
          code,
          message: err.message || 'An unexpected error occurred while processing the video.',
          stage: 'transcript_fetch',
          retryable
        }
      });
    }
  }
}
