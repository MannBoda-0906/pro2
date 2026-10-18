export interface IdentityEnvelope {
  sourceUrl: string;
  videoId: string;
  analysisSessionId: string;
  generationAttemptId: string;
}

export class VideoIdentity {
  /**
   * Parses any YouTube URL format into a single canonical 11-character videoId (or demo ID).
   */
  public static parseCanonicalVideoId(urlOrId: string): string | null {
    if (!urlOrId || typeof urlOrId !== 'string') return null;
    const trimmed = urlOrId.trim();

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

    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

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
   * Generates a unique UUID v4 for analysis session identification.
   */
  public static createSessionId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Generates a unique generation attempt ID.
   */
  public static createAttemptId(attemptNumber: number = 1): string {
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
    return `att_${attemptNumber}_${uuid}`;
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
