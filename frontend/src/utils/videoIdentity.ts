export class VideoIdentity {
  /**
   * Parses any YouTube URL format into a single canonical 11-character videoId (or demo ID).
   */
  public static parseCanonicalVideoId(urlOrId: string): string | null {
    if (!urlOrId || typeof urlOrId !== 'string') return null;
    const trimmed = urlOrId.trim();

    if (trimmed.startsWith('demo-')) {
      return trimmed;
    }

    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

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
   * Generates a unique UUID v4 for analysis session identification.
   */
  public static createSessionId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
