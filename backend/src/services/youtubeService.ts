import { YoutubeTranscript } from 'youtube-transcript';
import { TranscriptSegment, VideoMetadata } from '../types/index.js';
import { DEMO_VIDEOS } from './demoData.js';

export class YouTubeService {
  /**
   * Extracts the 11-character video ID from a wide variety of YouTube URLs.
   */
  static extractVideoId(urlOrId: string): string | null {
    if (!urlOrId || typeof urlOrId !== 'string') return null;
    const trimmed = urlOrId.trim();

    // Check if it's already a demo ID
    if (DEMO_VIDEOS[trimmed]) {
      return trimmed;
    }

    // Check if it's already an 11-character ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    // Standard YouTube URL formats
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?m\.youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?music\.youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Retrieves video metadata using YouTube's official oEmbed API and page inspection.
   */
  private static videoDetailsCache = new Map<string, {
    title: string;
    author: string;
    lengthSeconds: number;
    description: string;
    chapters: { text: string; start: number }[];
    thumbnailUrl?: string;
  }>();

  /**
   * Inspects video details, description, and chapters directly from YouTube.
   */
  static async inspectVideo(videoId: string): Promise<{
    title?: string;
    author?: string;
    lengthSeconds?: number;
    description?: string;
    chapters: { text: string; start: number }[];
    thumbnailUrl?: string;
    isUnavailable?: boolean;
    unavailableReason?: string;
  }> {
    if (this.videoDetailsCache.has(videoId)) {
      return this.videoDetailsCache.get(videoId)!;
    }

    let title: string | undefined;
    let author: string | undefined;
    let lengthSeconds: number | undefined;
    let description: string | undefined;
    const chapters: { text: string; start: number }[] = [];
    let thumbnailUrl: string | undefined;
    let isUnavailable = false;
    let unavailableReason: string | undefined;

    try {
      const response = await fetch('https://www.youtube.com/youtubei/v1/player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20230526.01.00'
            }
          }
        })
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        if (data.playabilityStatus?.status === 'ERROR' || data.playabilityStatus?.status === 'LOGIN_REQUIRED') {
          isUnavailable = true;
          unavailableReason = data.playabilityStatus?.reason || 'Video unavailable or private.';
        }

        const details = data.videoDetails;
        if (details) {
          title = details.title;
          author = details.author;
          if (details.lengthSeconds) {
            lengthSeconds = parseInt(details.lengthSeconds, 10);
          }
          description = details.shortDescription || '';

          // Parse timestamped chapters from the video description if present
          if (description) {
            const lines = description.split(/\r?\n/);
            for (const line of lines) {
              const trimmedLine = line.trim();
              const match = trimmedLine.match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s*[-–—:]?\s*(.+)$/);
              if (match) {
                const hours = match[1] ? parseInt(match[1], 10) : 0;
                const minutes = parseInt(match[2], 10);
                const seconds = parseInt(match[3], 10);
                const totalSeconds = hours * 3600 + minutes * 60 + seconds;
                const chapterTitle = match[4].trim();
                if (chapterTitle.length > 2) {
                  chapters.push({ text: chapterTitle, start: totalSeconds });
                }
              }
            }
          }

          if (details.thumbnail?.thumbnails?.length) {
            const best = details.thumbnail.thumbnails[details.thumbnail.thumbnails.length - 1];
            thumbnailUrl = best.url;
          }
        }
      }
    } catch (err) {
      console.warn(`InnerTube inspection notice for ${videoId}:`, err);
    }

    const result = {
      title,
      author,
      lengthSeconds: lengthSeconds || 0,
      description: description || '',
      chapters,
      thumbnailUrl,
      isUnavailable,
      unavailableReason
    };

    if (title || description) {
      this.videoDetailsCache.set(videoId, {
        title: title || '',
        author: author || '',
        lengthSeconds: lengthSeconds || 0,
        description: description || '',
        chapters,
        thumbnailUrl
      });
    }

    return result;
  }

  /**
   * Retrieves video metadata using YouTube's official oEmbed API and page inspection.
   */
  static async fetchMetadata(videoId: string, originalUrl?: string): Promise<VideoMetadata> {
    // Check if it's one of our built-in demos
    if (DEMO_VIDEOS[videoId]) {
      const demo = DEMO_VIDEOS[videoId];
      return {
        id: demo.id,
        url: demo.url,
        title: demo.title,
        author: demo.author,
        thumbnailUrl: demo.thumbnailUrl,
        duration: demo.duration,
        durationSeconds: demo.durationSeconds,
        embedUrl: `https://www.youtube.com/embed/${demo.url.split('v=')[1] || 'k6U-i4gXka8'}`
      };
    }

    const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    const defaultThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    // Concurrently inspect via InnerTube and oEmbed
    const [inspected, oembedRes] = await Promise.all([
      this.inspectVideo(videoId).catch(() => null),
      (async () => {
        try {
          const oembedEndpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(standardUrl)}&format=json`;
          const response = await fetch(oembedEndpoint, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StudyTube/1.0'
            }
          });
          if (response.ok) {
            return (await response.json()) as any;
          }
        } catch {
          // ignore
        }
        return null;
      })()
    ]);

    const title = inspected?.title || oembedRes?.title || `YouTube Video (${videoId})`;
    const author = inspected?.author || oembedRes?.author_name || 'YouTube Creator';
    const authorUrl = oembedRes?.author_url;
    const thumbnailUrl = inspected?.thumbnailUrl || oembedRes?.thumbnail_url || defaultThumbnail;
    const durationSeconds = inspected?.lengthSeconds || 0;

    let duration: string | undefined;
    if (durationSeconds > 0) {
      const m = Math.floor(durationSeconds / 60);
      const s = durationSeconds % 60;
      duration = `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    return {
      id: videoId,
      url: originalUrl || standardUrl,
      title,
      author,
      authorUrl,
      thumbnailUrl,
      duration,
      durationSeconds: durationSeconds > 0 ? durationSeconds : undefined,
      embedUrl
    };
  }

  /**
   * Fetches authentic transcript using prioritized caption track selection,
   * language targeting, deduplication, and caching.
   */
  static async fetchTranscript(
    videoId: string,
    title?: string,
    author?: string,
    preferredLanguage: string = 'en'
  ): Promise<{
    transcript: TranscriptSegment[];
    rawText: string;
    languageCode?: string;
    trackType?: 'manual' | 'auto-generated';
    source: 'youtube' | 'demo' | 'manual';
  }> {
    // 1. Check built-in demo videos first
    if (DEMO_VIDEOS[videoId]) {
      const demo = DEMO_VIDEOS[videoId];
      const rawText = demo.transcript.map(t => t.text).join(' ');
      return {
        transcript: demo.transcript,
        rawText,
        languageCode: 'en',
        trackType: 'manual',
        source: 'demo'
      };
    }

    // 2. Fetch using Robust CaptionService (prioritizing manual in preferred lang, ASR in preferred lang, English, etc.)
    const { CaptionService } = await import('./captionService.js');
    const result = await CaptionService.fetchTranscript(videoId, preferredLanguage);

    return {
      transcript: result.transcript,
      rawText: result.rawText,
      languageCode: result.languageCode,
      trackType: result.trackType,
      source: 'youtube'
    };
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
}

