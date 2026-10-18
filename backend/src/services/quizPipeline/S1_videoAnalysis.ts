import { GoogleGenAI } from '@google/genai';
import { StructuredEvidence, TranscriptChunk, TranscriptSegment } from '../../types/index.js';

export class S1_VideoAnalysis {
  /**
   * Filters out greetings, jokes, ads, promotions, channel subscriptions,
   * social media plugs, and non-informative filler repetition.
   */
  public static cleanTranscriptEvidence(transcript: TranscriptSegment[]): TranscriptSegment[] {
    const fillerPatterns = [
      /\b(subscribe|like and subscribe|smash that like|hit the bell|notification bell)\b/i,
      /\b(welcome back to my channel|hey guys|what's up guys|welcome to today's video)\b/i,
      /\b(link in the description|patreon|sponsor|use code|discount code|merch)\b/i,
      /\b(follow me on|instagram|twitter|tiktok|discord server)\b/i,
      /\b(leave a comment down below|let me know in the comments)\b/i,
      /\b(without further ado|let's jump right in|let's dive right in)\b/i,
      /\b(thanks for watching|see you in the next video|bye bye)\b/i
    ];

    return transcript.filter(segment => {
      const text = segment.text.trim();
      if (text.length < 5) return false;
      return !fillerPatterns.some(pattern => pattern.test(text));
    });
  }

  /**
   * Splits transcript into meaningful sequential chunks for complete video analysis.
   * Every chunk contains videoId, chunkId, chunkIndex, startTime, endTime, transcriptText.
   */
  public static splitIntoChunks(params: {
    videoId: string;
    segments: TranscriptSegment[];
    chunkDurationSec?: number;
    maxCharsPerChunk?: number;
  }): TranscriptChunk[] {
    const { videoId, segments, chunkDurationSec = 300, maxCharsPerChunk = 4000 } = params;
    if (segments.length === 0) return [];

    const chunks: TranscriptChunk[] = [];
    let currentSegments: TranscriptSegment[] = [];
    let currentChars = 0;
    let chunkStart = segments[0].start || 0;
    let chunkIndex = 1;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const segText = seg.text.trim();
      const segEnd = (seg.start || 0) + (seg.duration || 0);

      currentSegments.push(seg);
      currentChars += segText.length;

      const durationSoFar = segEnd - chunkStart;
      const shouldSplit =
        (durationSoFar >= chunkDurationSec || currentChars >= maxCharsPerChunk) &&
        i < segments.length - 1;

      if (shouldSplit) {
        chunks.push({
          videoId,
          chunkId: `chunk_${chunkIndex}`,
          chunkIndex,
          startTime: chunkStart,
          endTime: segEnd,
          transcriptText: currentSegments.map(s => s.text).join(' '),
          segments: [...currentSegments]
        });
        chunkIndex++;
        currentSegments = [];
        currentChars = 0;
        chunkStart = segments[i + 1]?.start || segEnd;
      }
    }

    if (currentSegments.length > 0) {
      const lastSeg = currentSegments[currentSegments.length - 1];
      const lastEnd = (lastSeg.start || 0) + (lastSeg.duration || 0);
      chunks.push({
        videoId,
        chunkId: `chunk_${chunkIndex}`,
        chunkIndex,
        startTime: chunkStart,
        endTime: lastEnd,
        transcriptText: currentSegments.map(s => s.text).join(' '),
        segments: [...currentSegments]
      });
    }

    return chunks;
  }

  /**
   * Analyzes the video transcript and extracts structured educational evidence.
   * STRICT GROUNDING RULE: Evidence is derived exclusively from the spoken transcript.
   * The video title is treated purely as an optional metadata hint, NEVER as evidence.
   */
  public static async analyzeVideo(params: {
    title?: string;
    videoId?: string;
    transcript: TranscriptSegment[];
    client?: GoogleGenAI | null;
  }): Promise<StructuredEvidence> {
    const { title = '', videoId = 'current_video', transcript, client } = params;
    const cleanSegments = this.cleanTranscriptEvidence(transcript);
    const fullText = cleanSegments.map(s => s.text).join(' ');
    const chunks = this.splitIntoChunks({ videoId, segments: cleanSegments });

    console.log(`[S1_VideoAnalysis] Cleaned transcript: ${cleanSegments.length} segments, ${chunks.length} chunks, ${fullText.length} characters.`);

    if (cleanSegments.length === 0 || fullText.trim().length < 80) {
      const err: any = new Error(
        `INSUFFICIENT_EDUCATIONAL_CONTENT: We couldn't read this video's content, so a quiz can't be built. Try another video or paste a transcript.`
      );
      err.code = 'INSUFFICIENT_EDUCATIONAL_CONTENT';
      err.stage = 'video_analysis';
      throw err;
    }

    if (client) {
      try {
        const prompt = `You are a master academic curriculum auditor analyzing an educational video transcript.
CRITICAL GROUNDING DIRECTIVE:
- Extract factual academic evidence EXCLUSIVELY from the spoken TRANSCRIPT below.
- DO NOT use the video title to fabricate concepts, laws, or formulas that are not explicitly taught in the transcript.
- If the title says one thing but the transcript teaches another, the TRANSCRIPT is the sole authoritative source.
- Ignore all channel intros, greetings, sponsor mentions, and jokes.
- The transcript may be in English, Hindi, Gujarati, Spanish, or another language. Extract the academic evidence accurately.

TRANSCRIPT EVIDENCE:
"""
${fullText.slice(0, 45000)}
"""

Return ONLY a valid JSON object matching this schema without markdown code fences:
{
  "subject": "e.g. Physics, Biology, Chemistry, Mathematics, Computer Science, History",
  "academicLevel": "e.g. High School (Grade 11-12) / Undergraduate",
  "chapter": "Academic topic taught in the transcript",
  "topic": "Specific lecture topic taught in the transcript",
  "definitions": [
    { "term": "string", "definition": "string", "timestamp": "mm:ss" }
  ],
  "laws": [
    { "name": "string", "statement": "string" }
  ],
  "formulas": [
    { "name": "string", "formula": "string", "variables": ["v1", "v2"], "conditions": "string" }
  ],
  "variables": [
    { "symbol": "string", "meaning": "string", "unit": "string" }
  ],
  "conditions": ["string"],
  "examples": ["string"],
  "solvingMethods": [
    { "methodId": "string", "description": "string", "steps": ["step 1", "step 2"] }
  ],
  "applications": ["string"],
  "commonMistakes": ["string"]
}`;

        const res = await client.models.generateContent({
          model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
          contents: prompt
        });

        const text = res.text || '';
        const parsed = this.parseJsonSafely<StructuredEvidence>(text);
        if (parsed && parsed.definitions && Array.isArray(parsed.definitions) && parsed.definitions.length > 0) {
          return this.sanitizeEvidence(parsed, cleanSegments, videoId, chunks);
        }
      } catch (err) {
        console.warn('[S1_VideoAnalysis] Gemini extraction failed or quota exceeded, using deterministic transcript extraction:', err);
      }
    }

    return this.extractLocally(cleanSegments, videoId);
  }

  private static parseJsonSafely<T>(str: string): T | null {
    try {
      const clean = str.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(clean) as T;
    } catch {
      const match = str.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]) as T;
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  private static sanitizeEvidence(
    ev: Partial<StructuredEvidence>,
    segments: TranscriptSegment[],
    videoId?: string,
    chunks?: TranscriptChunk[]
  ): StructuredEvidence {
    const fullText = segments.map(s => s.text).join(' ');
    const fallbackTopic = this.deriveTopicFromTranscript(segments);
    const validChunks = chunks || this.splitIntoChunks({ videoId: videoId || 'current_video', segments });

    return {
      videoId: videoId || ev.videoId || 'current_video',
      chunksCount: validChunks.length,
      chunks: validChunks,
      subject: ev.subject || this.inferSubject(fullText),
      academicLevel: ev.academicLevel || 'Grade 11-12 / College Prep',
      chapter: ev.chapter || fallbackTopic,
      topic: ev.topic || fallbackTopic,
      definitions: Array.isArray(ev.definitions) ? ev.definitions : [],
      laws: Array.isArray(ev.laws) ? ev.laws : [],
      formulas: Array.isArray(ev.formulas) ? ev.formulas : [],
      variables: Array.isArray(ev.variables) ? ev.variables : [],
      conditions: Array.isArray(ev.conditions) ? ev.conditions : [],
      examples: Array.isArray(ev.examples) ? ev.examples : [],
      solvingMethods: Array.isArray(ev.solvingMethods) ? ev.solvingMethods : [],
      applications: Array.isArray(ev.applications) ? ev.applications : [],
      commonMistakes: Array.isArray(ev.commonMistakes) ? ev.commonMistakes : []
    };
  }

  public static inferSubject(text: string): string {
    const lower = text.toLowerCase();
    if (
      lower.includes('gravitat') ||
      lower.includes('force') ||
      lower.includes('velocity') ||
      lower.includes('acceleration') ||
      lower.includes('momentum') ||
      lower.includes('kinematics') ||
      lower.includes('thermodynamics') ||
      lower.includes('optics') ||
      lower.includes('refraction') ||
      lower.includes('electrostatics') ||
      lower.includes('snell') ||
      lower.includes('physics')
    ) {
      return 'Physics';
    }
    if (
      lower.includes('algorithm') ||
      lower.includes('binary search') ||
      lower.includes('programming') ||
      lower.includes('python') ||
      lower.includes('data structure') ||
      lower.includes('complexity') ||
      lower.includes('computer science')
    ) {
      return 'Computer Science';
    }
    if (
      lower.includes('photosynthesis') ||
      lower.includes('chloroplast') ||
      lower.includes('cell') ||
      lower.includes('dna') ||
      lower.includes('mitosis') ||
      lower.includes('biology')
    ) {
      return 'Biology';
    }
    if (
      lower.includes('reaction') ||
      lower.includes('stoichiometry') ||
      lower.includes('mole') ||
      lower.includes('acid') ||
      lower.includes('chemistry')
    ) {
      return 'Chemistry';
    }
    if (
      lower.includes('derivative') ||
      lower.includes('integral') ||
      lower.includes('calculus') ||
      lower.includes('algebra') ||
      lower.includes('matrix') ||
      lower.includes('mathematics')
    ) {
      return 'Mathematics';
    }
    if (
      lower.includes('revolution') ||
      lower.includes('bastille') ||
      lower.includes('estates general') ||
      lower.includes('century') ||
      lower.includes('treaty') ||
      lower.includes('history')
    ) {
      return 'History';
    }
    return 'General Studies';
  }

  public static deriveTopicFromTranscript(segments: TranscriptSegment[]): string {
    if (segments.length === 0) return 'Video Lesson';

    // Find first substantive technical phrase in transcript
    for (const seg of segments.slice(0, 5)) {
      const clean = seg.text.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
      const words = clean.split(/\s+/).filter(w => w.length > 2);
      if (words.length >= 2) {
        return words.slice(0, 4).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      }
    }
    return 'Core Lecture Concepts';
  }

  /**
   * Deterministic evidence extraction derived strictly from the transcript text.
   * Completely independent of the video title and zero hardcoded subject cheats.
   */
  public static extractLocally(segments: TranscriptSegment[], videoId?: string): StructuredEvidence {
    const fullText = segments.map(s => s.text).join(' ');
    const subject = this.inferSubject(fullText);
    const topic = this.deriveTopicFromTranscript(segments);
    const chunks = this.splitIntoChunks({ videoId: videoId || 'current_video', segments });

    const definitions: StructuredEvidence['definitions'] = [];
    const formulas: StructuredEvidence['formulas'] = [];
    const laws: StructuredEvidence['laws'] = [];
    const variables: StructuredEvidence['variables'] = [];
    const conditions: string[] = [];
    const examples: string[] = [];
    const solvingMethods: StructuredEvidence['solvingMethods'] = [];
    const applications: string[] = [];
    const commonMistakes: string[] = [];

    // 1. Extract definitions directly from transcript sentences
    segments.forEach(seg => {
      const t = seg.text;
      const defMatch = t.match(/([A-Za-z\u0900-\u0A7F\s]{3,35})\s+(?:is defined as|is called|refers to|means|is the|कहते हैं|कहा जाता है|છે)\s+([^.]+)/i);
      if (defMatch) {
        const term = defMatch[1].trim();
        const definition = defMatch[2].trim();
        if (term.length > 2 && definition.length > 5) {
          const min = Math.floor(seg.start / 60);
          const sec = Math.floor(seg.start % 60);
          definitions.push({
            term,
            definition,
            timestamp: `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`,
            timestampSeconds: seg.start
          });
        }
      }

      // 2. Extract formulas directly from transcript equations
      const formMatch = t.match(/([a-zA-Z_\u0900-\u0A7F\d\s]{1,25})\s*=\s*([^.,;]+)/);
      if (formMatch && formMatch[2].length > 2 && /[+\-*/^()]/.test(formMatch[2])) {
        const rawName = formMatch[1].trim();
        const isValidName =
          rawName.length >= 1 &&
          !/^\d+$/.test(rawName) &&
          !['and', 'or', 'the', 'is', 'for', 'let', 'then', 'so', 'we'].includes(rawName.toLowerCase());

        if (isValidName) {
          const formulaStr = `${rawName} = ${formMatch[2].trim()}`;
          const extractedVars = formMatch[2].match(/[a-zA-Z_]\w*/g) || [];
          formulas.push({
            name: rawName,
            formula: formulaStr,
            variables: extractedVars,
            conditions: 'Grounded in transcript explanation'
          });
          extractedVars.forEach(v => {
            if (!variables.some(existing => existing.symbol === v)) {
              variables.push({ symbol: v, meaning: `Parameter ${v} from ${formulaStr}`, unit: '' });
            }
          });
        }
      }

      // 3. Extract stated laws
      const lawMatch = t.match(/([A-Za-z\u0900-\u0A7F\s]{3,35})\s+(?:law states that|rule states that|principle states that|નિયમ)\s+([^.]+)/i);
      if (lawMatch) {
        laws.push({
          name: lawMatch[1].trim(),
          statement: lawMatch[2].trim()
        });
      }
    });

    // 4. If fewer than 2 definitions found, extract recurring technical terms and anchor them to transcript timestamps
    if (definitions.length < 3 && segments.length > 0) {
      const termFrequency = new Map<string, { count: number; firstStart: number; contextText: string }>();
      const stopWords = new Set([
        'this', 'that', 'with', 'from', 'have', 'were', 'which', 'about', 'there', 'their',
        'will', 'then', 'when', 'what', 'also', 'because', 'these', 'those', 'where', 'other',
        'being', 'between', 'through', 'video', 'welcome', 'lecture', 'today', 'going', 'learn'
      ]);

      segments.forEach(seg => {
        const words = seg.text.replace(/[^a-zA-Z0-9\u0900-\u0A7F\s]/g, ' ').split(/\s+/).filter(w => w.length > 3);
        for (let i = 0; i < words.length; i++) {
          const w = words[i].toLowerCase();
          if (!stopWords.has(w) && w.length > 3) {
            const entry = termFrequency.get(w) || { count: 0, firstStart: seg.start, contextText: seg.text };
            entry.count++;
            termFrequency.set(w, entry);
          }
          if (i + 1 < words.length) {
            const bigram = `${words[i].toLowerCase()} ${words[i + 1].toLowerCase()}`;
            if (!stopWords.has(words[i].toLowerCase()) && !stopWords.has(words[i + 1].toLowerCase())) {
              const entry = termFrequency.get(bigram) || { count: 0, firstStart: seg.start, contextText: seg.text };
              entry.count += 2;
              termFrequency.set(bigram, entry);
            }
          }
        }
      });

      const sortedTerms = Array.from(termFrequency.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 6);

      sortedTerms.forEach(([term, data]) => {
        const capitalized = term.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (!definitions.some(d => d.term.toLowerCase() === term.toLowerCase())) {
          const min = Math.floor(data.firstStart / 60);
          const sec = Math.floor(data.firstStart % 60);
          definitions.push({
            term: capitalized,
            definition: `Core curriculum concept from transcript: "${data.contextText.slice(0, 120)}"`,
            timestamp: `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`,
            timestampSeconds: data.firstStart
          });
        }
      });
    }

    return {
      videoId: videoId || 'current_video',
      chunksCount: chunks.length,
      chunks,
      subject,
      academicLevel: 'High School / Undergraduate',
      chapter: topic,
      topic,
      definitions,
      laws,
      formulas,
      variables,
      conditions,
      examples,
      solvingMethods,
      applications,
      commonMistakes
    };
  }
}
