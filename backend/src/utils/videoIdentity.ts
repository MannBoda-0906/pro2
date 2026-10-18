import crypto from 'crypto';
import { TranscriptSegment } from '../types/index.js';

export interface IdentityEnvelope {
  sourceUrl: string;
  videoId: string;
  analysisSessionId: string;
  generationAttemptId: string;
}

export class VideoIdentity {
  /**
   * Parses any YouTube URL format into a single canonical 11-character videoId (or demo ID).
   * Supports:
   * - https://www.youtube.com/watch?v=XXXXXXXXXXX (with any query params like &t=..., &list=..., &feature=...)
   * - https://youtu.be/XXXXXXXXXXX
   * - https://www.youtube.com/shorts/XXXXXXXXXXX
   * - https://www.youtube.com/embed/XXXXXXXXXXX
   * - https://www.youtube.com/live/XXXXXXXXXXX
   * - https://m.youtube.com/watch?v=XXXXXXXXXXX
   * - https://music.youtube.com/watch?v=XXXXXXXXXXX
   * - Raw 11-character videoId
   * - Pre-configured demo IDs (demo-center-of-mass, demo-photosynthesis, etc.)
   */
  public static parseCanonicalVideoId(urlOrId: string): string | null {
    if (!urlOrId || typeof urlOrId !== 'string') return null;
    const trimmed = urlOrId.trim();

    // 1. Check if it's already a demo ID or manual ID or recognized test/curriculum prefix
    if (
      trimmed.startsWith('demo-') ||
      trimmed.startsWith('manual_') ||
      trimmed.startsWith('phys-') ||
      trimmed.startsWith('bio-') ||
      trimmed.startsWith('hindi-') ||
      trimmed.startsWith('video_') ||
      trimmed.startsWith('test_') ||
      trimmed.startsWith('counts-')
    ) {
      return trimmed;
    }

    // 2. Check if it's already an 11-character alphanumeric ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    // 3. Extract using strict regex patterns covering all formats
    const patterns = [
      /[?&]v=([a-zA-Z0-9_-]{11})/i,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/i,
      /\/embed\/([a-zA-Z0-9_-]{11})/i,
      /\/shorts\/([a-zA-Z0-9_-]{11})/i,
      /\/live\/([a-zA-Z0-9_-]{11})/i,
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/))([a-zA-Z0-9_-]{11})/i
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match && match[1] && match[1].length === 11) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Generates a canonical YouTube watch URL for a videoId.
   */
  public static getCanonicalUrl(videoId: string): string {
    if (videoId.startsWith('demo-')) {
      return `https://lumora.ai/demo/${videoId}`;
    }
    if (videoId.startsWith('manual_')) {
      return `https://lumora.ai/manual/${videoId}`;
    }
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  /**
   * Computes a deterministic SHA-256 hash of the transcript's cleaned text.
   * Ensures cache keys are strictly tied to the exact captions of the video.
   */
  public static computeTranscriptHash(transcript: TranscriptSegment[]): string {
    if (!Array.isArray(transcript) || transcript.length === 0) {
      return '';
    }
    const combined = transcript
      .map(s => `${Math.floor(s.start)}:${(s.text || '').trim()}`)
      .join('|');
    return crypto.createHash('sha256').update(combined).digest('hex').slice(0, 16);
  }

  /**
   * Generates a unique UUID/Session ID for an analysis session.
   */
  public static createSessionId(): string {
    return crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generates a unique generation attempt ID.
   */
  public static createAttemptId(attemptNumber: number = 1): string {
    const uuid = crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
    return `att_${attemptNumber}_${uuid}`;
  }

  /**
   * Generates a unique generation job ID.
   */
  public static createJobId(): string {
    const uuid = crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
    return `job_${Date.now()}_${uuid}`;
  }

  /**
   * Constructs a complete, validated identity envelope from a requested URL.
   */
  public static createIdentityEnvelope(
    sourceUrl: string,
    existingSessionId?: string,
    attemptNumber: number = 1
  ): IdentityEnvelope {
    const videoId = this.parseCanonicalVideoId(sourceUrl);
    if (!videoId) {
      throw new Error(`INVALID_YOUTUBE_URL: Could not derive valid videoId from '${sourceUrl}'`);
    }
    return {
      sourceUrl: this.getCanonicalUrl(videoId),
      videoId,
      analysisSessionId: existingSessionId || this.createSessionId(),
      generationAttemptId: this.createAttemptId(attemptNumber)
    };
  }
}
