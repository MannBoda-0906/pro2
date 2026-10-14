import { TranscriptSegment } from '../types/index.js';

export interface TranscriptChunk {
  index: number;
  startSecond: number;
  endSecond: number;
  text: string;
}

export class ChunkingService {
  /**
   * Splits a long transcript into coherent chunks based on word count/token bounds,
   * preserving timestamp boundaries for chaptering and hierarchical summarization.
   */
  static splitTranscriptIntoChunks(
    segments: TranscriptSegment[],
    maxWordsPerChunk: number = 700
  ): TranscriptChunk[] {
    if (!segments || segments.length === 0) return [];

    const chunks: TranscriptChunk[] = [];
    let currentWords: string[] = [];
    let chunkStart = segments[0].start;
    let chunkEnd = segments[0].start + (segments[0].duration || 0);

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const segWords = seg.text.trim().split(/\s+/).filter(Boolean);

      if (currentWords.length + segWords.length > maxWordsPerChunk && currentWords.length > 0) {
        // Finalize chunk
        chunks.push({
          index: chunks.length,
          startSecond: chunkStart,
          endSecond: chunkEnd,
          text: currentWords.join(' ')
        });

        currentWords = [...segWords];
        chunkStart = seg.start;
        chunkEnd = seg.start + (seg.duration || 0);
      } else {
        currentWords.push(...segWords);
        chunkEnd = seg.start + (seg.duration || 0);
      }
    }

    if (currentWords.length > 0) {
      chunks.push({
        index: chunks.length,
        startSecond: chunkStart,
        endSecond: chunkEnd,
        text: currentWords.join(' ')
      });
    }

    return chunks;
  }

  /**
   * Helper to format seconds as mm:ss or hh:mm:ss.
   */
  static formatTimestamp(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const secs = s % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(secs)}`;
    }
    return `${pad(minutes)}:${pad(secs)}`;
  }
}
