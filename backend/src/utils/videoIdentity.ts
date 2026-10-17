import crypto from 'crypto';
import { TranscriptSegment } from '../types/index.js';

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

    // 1. Check if it's already a demo ID
    if (trimmed.startsWith('demo-')) {
      return trimmed;
    }

    // 2. Check if it's already an 11-character alphanumeric ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    // 3. Extract using strict regex patterns covering all formats
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/i,
      /[?&]v=([a-zA-Z0-9_-]{11})/i,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/i,
      /\/embed\/([a-zA-Z0-9_-]{11})/i,
      /\/shorts\/([a-zA-Z0-9_-]{11})/i,
      /\/live\/([a-zA-Z0-9_-]{11})/i
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
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  /**
   * Computes a deterministic SHA-256 hash of the transcript's cleaned text.
   * Ensures cache keys are strictly tied to the exact captions of the video.
   */
  public static computeTranscriptHash(transcript: TranscriptSegment[]): string {
    if (!Array.isArray(transcript) || transcript.length === 0) {
      return 'empty_transcript_hash';
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
}
