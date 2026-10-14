import { TranscriptSegment } from '../types/index.js';
import { cleanText } from '../utils/index.js';

export class TranscriptService {
  /**
   * Cleans and sanitizes transcript segments
   */
  static cleanSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
    return segments
      .map(s => ({
        ...s,
        text: cleanText(s.text)
      }))
      .filter(s => s.text.trim().length > 0);
  }

  /**
   * Parses manual text pasted by user into timestamped segments
   */
  static parseManualTranscript(text: string): TranscriptSegment[] {
    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    return lines.map((line, idx) => ({
      text: cleanText(line),
      start: idx * 10,
      duration: 10
    }));
  }

  /**
   * Converts segments to a continuous raw string
   */
  static segmentsToRawText(segments: TranscriptSegment[]): string {
    return segments.map(s => s.text).join(' ');
  }
}
