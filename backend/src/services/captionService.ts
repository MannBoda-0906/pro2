import fetch from 'node-fetch';
import { YoutubeTranscript } from 'youtube-transcript';
import { TranscriptSegment } from '../types/index.js';

export interface CaptionTrackInfo {
  languageCode: string;
  name: string;
  kind: 'manual' | 'asr';
  vssId?: string;
  baseUrl?: string;
  isTranslatable?: boolean;
}

export interface FetchTranscriptResult {
  transcript: TranscriptSegment[];
  rawText: string;
  languageCode: string;
  trackType: 'manual' | 'auto-generated';
  trackName: string;
  totalCharacters: number;
  source: 'youtube' | 'cache';
}

export class CaptionService {
  private static cache = new Map<string, FetchTranscriptResult>();

  /**
   * Cleans text: decodes HTML entities, strips audio bracket cues, normalizes whitespace.
   */
  public static cleanCaptionText(text: string): string {
    if (!text) return '';
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
      .replace(/\[\s*(music|applause|laughter|silence|cheering|chuckles|groans|screaming)\s*\]/gi, '')
      .replace(/\(\s*(music|applause|laughter|silence|cheering|chuckles|groans|screaming)\s*\)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Inspects all available caption tracks from YouTube via page HTML and player API.
   */
  public static async getAvailableCaptionTracks(videoId: string): Promise<CaptionTrackInfo[]> {
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    let html = '';

    try {
      const res = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+478'
        }
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('CAPTIONS_BLOCKED_OR_FETCH_FAILED: YouTube rate limited IP (HTTP 429). Please paste transcript or try again later.');
        }
      } else {
        html = await res.text();
      }
    } catch (netErr: any) {
      if (netErr.message?.includes('CAPTIONS_BLOCKED')) throw netErr;
      console.warn(`[CaptionService] Watch page fetch notice for ${videoId}: ${netErr.message}`);
    }

    if (html.includes('class="g-recaptcha"') || html.includes('captcha-box')) {
      throw new Error('CAPTIONS_BLOCKED_OR_FETCH_FAILED: YouTube request blocked with captcha. Please paste transcript manually.');
    }

    let captionTracks: any[] = [];

    // Attempt 1: Parse "captionTracks" regex from watch page HTML
    if (html) {
      const trackMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
      if (trackMatch) {
        try {
          captionTracks = JSON.parse(trackMatch[1]);
        } catch {}
      }

      // Attempt 2: Parse ytInitialPlayerResponse inline JSON
      if (captionTracks.length === 0) {
        const pMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});(?:var\s|const\s|let\s|<\/script)/s);
        if (pMatch) {
          try {
            const pr = JSON.parse(pMatch[1]);
            if (pr.playabilityStatus?.status === 'ERROR' && pr.playabilityStatus?.reason) {
              console.warn(`[CaptionService] Player status: ${pr.playabilityStatus.status} (${pr.playabilityStatus.reason})`);
            }
            captionTracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
          } catch {}
        }
      }
    }

    // Attempt 3: InnerTube player endpoint with desktop WEB client
    if (captionTracks.length === 0) {
      try {
        const playerRes = await fetch('https://www.youtube.com/youtubei/v1/player', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          body: JSON.stringify({
            videoId,
            context: {
              client: { clientName: 'WEB', clientVersion: '2.20240216.00.00' }
            }
          })
        });
        if (playerRes.ok) {
          const playerData = (await playerRes.json()) as any;
          captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        }
      } catch (innerErr: any) {
        console.warn(`[CaptionService] InnerTube fallback notice: ${innerErr.message}`);
      }
    }

    return captionTracks.map(t => ({
      languageCode: t.languageCode,
      name: t.name?.simpleText || t.name?.runs?.[0]?.text || t.languageCode,
      kind: t.kind === 'asr' ? 'asr' : 'manual',
      vssId: t.vssId,
      baseUrl: t.baseUrl,
      isTranslatable: Boolean(t.isTranslatable)
    }));
  }

  /**
   * Prioritized track selection:
   * 1. Manual in preferred language
   * 2. Auto (ASR) in preferred language
   * 3. Manual in English
   * 4. Auto (ASR) in English
   * 5. Any manual caption track
   * 6. Any available track
   */
  public static selectBestTrack(tracks: CaptionTrackInfo[], preferredLang: string = 'en'): CaptionTrackInfo | null {
    if (!tracks || tracks.length === 0) return null;

    const norm = preferredLang.toLowerCase().slice(0, 2);

    // 1. Manual in preferred language
    const manualPref = tracks.find(t => t.kind === 'manual' && t.languageCode.toLowerCase().startsWith(norm));
    if (manualPref) return manualPref;

    // 2. ASR in preferred language
    const asrPref = tracks.find(t => t.kind === 'asr' && t.languageCode.toLowerCase().startsWith(norm));
    if (asrPref) return asrPref;

    // 3. Manual in English
    const manualEn = tracks.find(t => t.kind === 'manual' && t.languageCode.toLowerCase().startsWith('en'));
    if (manualEn) return manualEn;

    // 4. ASR in English
    const asrEn = tracks.find(t => t.kind === 'asr' && t.languageCode.toLowerCase().startsWith('en'));
    if (asrEn) return asrEn;

    // 5. Any manual track
    const anyManual = tracks.find(t => t.kind === 'manual');
    if (anyManual) return anyManual;

    // 6. First available track
    return tracks[0];
  }

  /**
   * Robust transcript fetch with fallback chain, retries, and caching.
   * Throws distinct, well-defined errors on true failures.
   */
  public static async fetchTranscript(videoId: string, preferredLang: string = 'en'): Promise<FetchTranscriptResult> {
    const cacheKey = `${videoId}_${preferredLang.toLowerCase()}`;
    if (this.cache.has(cacheKey)) {
      console.log(`[CaptionService] Serving cached transcript for ${videoId} (${preferredLang})`);
      return this.cache.get(cacheKey)!;
    }

    console.log(`[CaptionService] Fetching transcript for video ${videoId} (preferred: "${preferredLang}")...`);
    let tracks: CaptionTrackInfo[] = [];
    let lastError: any = null;

    // Up to 2 retries with exponential backoff
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        tracks = await this.getAvailableCaptionTracks(videoId);
        break;
      } catch (err: any) {
        lastError = err;
        if (attempt < 2) {
          console.warn(`[CaptionService] Attempt ${attempt} failed for ${videoId}: ${err.message}. Retrying in 1.2s...`);
          await new Promise(r => setTimeout(r, 1200));
        }
      }
    }

    if (!tracks || tracks.length === 0) {
      if (lastError && lastError.message?.includes('CAPTIONS_BLOCKED')) {
        throw lastError;
      }
      const noCapErr: any = new Error(
        `NO_CAPTIONS_AVAILABLE: This video has no captions or subtitles available on YouTube. Please paste a transcript below.`
      );
      noCapErr.code = 'NO_CAPTIONS_AVAILABLE';
      throw noCapErr;
    }

    console.log(`[CaptionService] Found ${tracks.length} caption tracks: [${tracks.map(t => `${t.languageCode}(${t.kind})`).join(', ')}]`);

    const selectedTrack = this.selectBestTrack(tracks, preferredLang);
    if (!selectedTrack) {
      const err: any = new Error(
        `NO_CAPTIONS_AVAILABLE: No suitable caption track found among available tracks: [${tracks.map(t => t.languageCode).join(', ')}].`
      );
      err.code = 'NO_CAPTIONS_AVAILABLE';
      throw err;
    }

    console.log(`[CaptionService] Selected Track: Lang="${selectedTrack.languageCode}", Kind="${selectedTrack.kind}", Name="${selectedTrack.name}"`);

    let rawSegments: Array<{ text: string; start: number; duration: number }> = [];

    // Method A: Exact language fetch via youtube-transcript library
    try {
      const libRes = await YoutubeTranscript.fetchTranscript(videoId, { lang: selectedTrack.languageCode });
      if (Array.isArray(libRes) && libRes.length > 0) {
        rawSegments = libRes.map(s => ({
          text: this.cleanCaptionText(s.text),
          start: Math.round(s.offset / 1000),
          duration: Math.round(s.duration / 1000)
        }));
      }
    } catch (libErr: any) {
      console.warn(`[CaptionService] Library fetch notice (${selectedTrack.languageCode}): ${libErr.message}. Trying direct baseUrl fetch...`);
    }

    // Method B: Direct baseUrl timedtext XML/json3 fetch
    if (rawSegments.length === 0 && selectedTrack.baseUrl) {
      try {
        const fetchUrl = selectedTrack.baseUrl.includes('fmt=json3')
          ? selectedTrack.baseUrl
          : `${selectedTrack.baseUrl}&fmt=json3`;

        const bRes = await fetch(fetchUrl);
        if (bRes.ok) {
          const jData = (await bRes.json()) as any;
          if (Array.isArray(jData.events)) {
            jData.events.forEach((ev: any) => {
              if (ev.segs) {
                const segText = ev.segs.map((s: any) => s.utf8 || '').join('');
                const clean = this.cleanCaptionText(segText);
                if (clean.length > 0) {
                  rawSegments.push({
                    text: clean,
                    start: Math.round((ev.tStartMs || 0) / 1000),
                    duration: Math.round((ev.dDurationMs || 0) / 1000)
                  });
                }
              }
            });
          }
        }
      } catch (directErr: any) {
        console.warn(`[CaptionService] Direct baseUrl fetch notice: ${directErr.message}`);
      }
    }

    // Method C: Any available fallback language if selected track was empty
    if (rawSegments.length === 0) {
      for (const fallbackTrack of tracks) {
        if (fallbackTrack.languageCode === selectedTrack.languageCode) continue;
        try {
          const fbRes = await YoutubeTranscript.fetchTranscript(videoId, { lang: fallbackTrack.languageCode });
          if (Array.isArray(fbRes) && fbRes.length > 0) {
            rawSegments = fbRes.map(s => ({
              text: this.cleanCaptionText(s.text),
              start: Math.round(s.offset / 1000),
              duration: Math.round(s.duration / 1000)
            }));
            console.log(`[CaptionService] Successfully recovered using fallback track: ${fallbackTrack.languageCode}`);
            break;
          }
        } catch {}
      }
    }

    // Clean, filter, and deduplicate consecutive auto-caption lines
    const cleanedSegments: TranscriptSegment[] = [];
    let lastSeenText = '';

    for (const seg of rawSegments) {
      const t = seg.text.trim();
      if (t.length > 0 && t.toLowerCase() !== lastSeenText.toLowerCase()) {
        cleanedSegments.push({ ...seg, text: t });
        lastSeenText = t;
      }
    }

    if (cleanedSegments.length === 0) {
      const emptyErr: any = new Error(
        `NO_CAPTIONS_AVAILABLE: Caption track was found for "${selectedTrack.languageCode}", but returned 0 text segments. Please paste a transcript below.`
      );
      emptyErr.code = 'NO_CAPTIONS_AVAILABLE';
      throw emptyErr;
    }

    const fullRawText = cleanedSegments.map(s => s.text).join(' ');

    const result: FetchTranscriptResult = {
      transcript: cleanedSegments,
      rawText: fullRawText,
      languageCode: selectedTrack.languageCode,
      trackType: selectedTrack.kind === 'asr' ? 'auto-generated' : 'manual',
      trackName: selectedTrack.name || selectedTrack.languageCode,
      totalCharacters: fullRawText.length,
      source: 'youtube'
    };

    console.log(
      `[CaptionService] Successfully fetched transcript for ${videoId}: ` +
      `Lang=${result.languageCode} (${result.trackType}), Segments=${result.transcript.length}, Chars=${result.totalCharacters}`
    );

    this.cache.set(cacheKey, result);
    return result;
  }
}
