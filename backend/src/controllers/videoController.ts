import { Request, Response } from 'express';
import { DEMO_VIDEOS } from '../services/demoData.js';
import { VideoIdentity } from '../utils/videoIdentity.js';
import { PipelineLogger } from '../utils/pipelineLogger.js';
import { VideoAnalysisService, VideoAnalysisError } from '../services/videoAnalysisService.js';

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

  /**
   * Fetches video metadata separately (Stage 3).
   * GET /api/videos/metadata/:id or POST /api/videos/metadata
   */
  static async getVideoMetadata(req: Request, res: Response): Promise<void> {
    const rawId = req.params.id || req.body.url || req.body.videoId;
    const sessionId = (typeof req.query.analysisSessionId === 'string' && req.query.analysisSessionId) ||
      (typeof req.body?.analysisSessionId === 'string' && req.body.analysisSessionId) ||
      VideoIdentity.createSessionId();

    try {
      if (!rawId || typeof rawId !== 'string') {
        res.status(400).json({
          ok: false,
          success: false,
          stage: 'VALIDATE_URL',
          code: 'INVALID_YOUTUBE_URL',
          message: 'Please provide a valid YouTube URL or video ID.'
        });
        return;
      }

      const videoId = VideoAnalysisService.extractVideoId(rawId);
      const metadata = await VideoAnalysisService.fetchVideoMetadata(videoId, rawId);

      res.json({
        ok: true,
        success: true,
        analysisSessionId: sessionId,
        videoId,
        metadata: {
          videoId: metadata.id,
          title: metadata.title,
          description: '',
          channel: metadata.author,
          author: metadata.author,
          duration: metadata.duration,
          durationSeconds: metadata.durationSeconds,
          thumbnailUrl: metadata.thumbnailUrl,
          embedUrl: metadata.embedUrl,
          url: metadata.url
        }
      });
    } catch (err: any) {
      const stage = err.stage || 'FETCH_VIDEO_METADATA';
      const code = err.code || 'METADATA_FAILED';
      const statusCode = err.statusCode || 404;
      const message = err.message || 'Unable to retrieve video information from YouTube.';

      res.status(statusCode).json({
        ok: false,
        success: false,
        stage,
        code,
        message,
        analysisSessionId: sessionId,
        error: { stage, code, message }
      });
    }
  }

  /**
   * Processes a video through Stages 1 - 5 (URL validation, ID extraction, metadata, transcript, normalization).
   * POST /api/videos/process
   */
  static async processVideo(req: Request, res: Response): Promise<void> {
    const { url, manualTranscript, demoId, language, analysisSessionId } = req.body;
    const sessionId = (typeof analysisSessionId === 'string' && analysisSessionId.trim())
      ? analysisSessionId.trim()
      : VideoIdentity.createSessionId();

    let extractedVideoId = '';

    try {
      // Handle demo video request
      if (demoId && DEMO_VIDEOS[demoId]) {
        const demoResult = await VideoAnalysisService.analyzeVideoPipeline({
          demoId,
          analysisSessionId: sessionId,
          language: language || 'en'
        });

        res.json({
          ok: true,
          success: true,
          analysisSessionId: sessionId,
          videoId: demoResult.videoId,
          status: 'success',
          data: {
            metadata: demoResult.metadata,
            transcript: demoResult.transcript,
            rawText: demoResult.rawText,
            chunkCount: demoResult.chunkCount,
            source: 'demo'
          },
          metadata: demoResult.metadata,
          transcript: demoResult.transcript,
          rawText: demoResult.rawText,
          chunkCount: demoResult.chunkCount,
          source: 'demo'
        });
        return;
      }

      // Handle user manual transcript override
      if (manualTranscript && typeof manualTranscript === 'string' && manualTranscript.trim().length > 0) {
        const manualResult = await VideoAnalysisService.analyzeVideoPipeline({
          manualTranscript,
          analysisSessionId: sessionId,
          language: language || 'en'
        });

        res.json({
          ok: true,
          success: true,
          analysisSessionId: sessionId,
          videoId: manualResult.videoId,
          status: 'success',
          data: {
            metadata: manualResult.metadata,
            transcript: manualResult.transcript,
            rawText: manualResult.rawText,
            chunkCount: manualResult.chunkCount,
            source: 'manual'
          },
          metadata: manualResult.metadata,
          transcript: manualResult.transcript,
          rawText: manualResult.rawText,
          chunkCount: manualResult.chunkCount,
          source: 'manual'
        });
        return;
      }

      // STAGE 1: VALIDATE_URL
      if (!url || typeof url !== 'string' || url.trim().length === 0) {
        res.status(400).json({
          ok: false,
          success: false,
          analysisSessionId: sessionId,
          stage: 'VALIDATE_URL',
          code: 'INVALID_YOUTUBE_URL',
          message: 'Please provide a valid YouTube URL.',
          error: {
            stage: 'VALIDATE_URL',
            code: 'INVALID_YOUTUBE_URL',
            message: 'Please provide a valid YouTube URL.',
            retryable: false
          }
        });
        return;
      }
      VideoAnalysisService.validateUrl(url);

      // STAGE 2: EXTRACT_VIDEO_ID
      extractedVideoId = VideoAnalysisService.extractVideoId(url);

      // STAGE 3: FETCH_VIDEO_METADATA
      const metadata = await VideoAnalysisService.fetchVideoMetadata(extractedVideoId, url);

      // STAGE 4: FETCH_TRANSCRIPT
      const transcriptResult = await VideoAnalysisService.fetchTranscript(
        extractedVideoId,
        metadata.title,
        metadata.author,
        typeof language === 'string' ? language : 'en'
      );

      // STAGE 5: NORMALIZE_CONTENT
      const normalized = VideoAnalysisService.normalizeContent(transcriptResult.transcript);
      const { ChunkingService } = await import('../services/chunkingService.js');
      const chunks = ChunkingService.splitTranscriptIntoChunks(normalized.cleanSegments);

      const resData = {
        metadata,
        transcript: normalized.cleanSegments,
        rawText: normalized.rawText,
        languageCode: transcriptResult.languageCode,
        trackType: transcriptResult.trackType,
        chunkCount: chunks.length,
        source: transcriptResult.source
      };

      res.json({
        ok: true,
        success: true,
        sourceUrl: VideoIdentity.getCanonicalUrl(extractedVideoId),
        analysisSessionId: sessionId,
        videoId: extractedVideoId,
        status: 'success',
        data: resData,
        ...resData
      });
    } catch (err: any) {
      const stage = err.stage || 'FETCH_TRANSCRIPT';
      let code = err.code || 'TRANSCRIPT_UNAVAILABLE';
      let statusCode = err.statusCode || 500;
      let message = err.message || 'Unable to analyze this video. Please try again.';
      let retryable = err.retryable ?? false;

      // Map well-known errors to human-safe messages and proper HTTP status
      if (code === 'INVALID_YOUTUBE_URL') {
        statusCode = 400;
        message = 'Invalid YouTube URL. Please provide a standard link (e.g. youtube.com/watch?v=... or youtu.be/...).';
        retryable = false;
      } else if (code === 'INVALID_VIDEO_ID') {
        statusCode = 400;
        message = 'The provided YouTube link has an invalid or malformed video ID.';
        retryable = false;
      } else if (code === 'METADATA_FAILED') {
        statusCode = 404;
        message = 'Unable to load video details from YouTube. Please verify the link.';
        retryable = true;
      } else if (code === 'TRANSCRIPT_UNAVAILABLE' || code === 'NO_CAPTIONS_AVAILABLE') {
        statusCode = 404;
        message = "We couldn't read this video's content, so a quiz can't be built. Try another video or paste a transcript.";
        retryable = false;
      } else if (code === 'TRANSCRIPT_TIMEOUT') {
        statusCode = 408;
        message = 'Transcript retrieval timed out. Please try again.';
        retryable = true;
      } else if (code === 'INSUFFICIENT_VIDEO_CONTENT') {
        statusCode = 422;
        message = "We couldn't read this video's content, so a quiz can't be built. Try another video or paste a transcript.";
        retryable = false;
      } else if (err.status === 429 || code === 'RATE_LIMITED' || code === 'AI_SERVICE_ERROR') {
        statusCode = 503;
        code = 'RATE_LIMITED';
        message = 'YouTube or AI service is temporarily rate-limited. Please try again in a few moments.';
        retryable = true;
      }

      // Generate error correlation reference for non-user errors
      let refId: string | undefined;
      if (statusCode >= 500 || code === 'UNKNOWN_ERROR') {
        refId = PipelineLogger.generateRefId();
        // Section 35: Exact log format
        console.error(
          `[ANALYSIS ERROR]\n` +
          `REF=${refId}\n` +
          `SESSION=${sessionId}\n` +
          `VIDEO=${extractedVideoId || 'unknown'}\n` +
          `STAGE=${stage}\n` +
          `CODE=${code}\n` +
          `MESSAGE=${message}\n` +
          `CAUSE=${err?.details || err?.message || String(err)}\n` +
          `TIMESTAMP=${new Date().toISOString()}`
        );
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `[ANALYSIS ERROR]\n` +
            `SESSION=${sessionId}\n` +
            `VIDEO=${extractedVideoId || 'unknown'}\n` +
            `STAGE=${stage}\n` +
            `CODE=${code}\n` +
            `MESSAGE=${message}`
          );
        }
      }

      res.status(statusCode).json({
        ok: false,
        success: false,
        analysisSessionId: sessionId,
        videoId: extractedVideoId,
        stage,
        code,
        message,
        retryable,
        referenceId: refId,
        refId,
        error: {
          stage,
          code,
          message,
          retryable,
          refId,
          referenceId: refId
        }
      });
    }
  }
}
