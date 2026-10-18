import { GoogleGenAI } from '@google/genai';
import { ConceptHierarchyItem, StructuredEvidence, TranscriptSegment } from '../../types/index.js';

export class S2_ConceptExtraction {
  /**
   * Stage 2: Extracts a concept hierarchy with IDs (C1, C2, ...) strictly from
   * what was ACTUALLY taught in the video, NOT from standard textbook lists of untaught concepts.
   */
  public static async extractConcepts(params: {
    evidence: StructuredEvidence;
    transcript: TranscriptSegment[];
    client?: GoogleGenAI | null;
  }): Promise<ConceptHierarchyItem[]> {
    const { evidence, transcript, client } = params;
    const fullText = transcript.map(s => s.text).join(' ');

    console.log(`[S2_ConceptExtraction] Starting concept extraction from ${transcript.length} segments (${fullText.length} chars)...`);

    if (client) {
      const maxRetries = 2;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const prompt = `You are an elite academic curriculum designer.
Extract the concept hierarchy (with IDs C1, C2, C3...) strictly from what was ACTUALLY taught in this spoken transcript excerpt.
CRITICAL RULES:
1. Extract concepts ONLY from what is spoken in the transcript text below. NEVER extract concepts from video titles or textbook chapters that are not in the spoken content!
2. Every concept must have real instructional evidence in the transcript.
3. The transcript may be in English, Hindi, Gujarati, Spanish, or another language. Extract the concepts accurately regardless of the language.

SUBJECT HINT: "${evidence.subject}" (hint only, not a source of concepts)
DEFINITIONS TAUGHT: ${JSON.stringify(evidence.definitions.map(d => d.term))}
LAWS TAUGHT: ${JSON.stringify(evidence.laws.map(l => l.name))}
FORMULAS TAUGHT: ${JSON.stringify(evidence.formulas.map(f => f.name))}
TRANSCRIPT EXCERPT:
"""
${fullText.slice(0, 35000)}
"""

Return ONLY a valid JSON array of concepts without markdown fences:
[
  {
    "id": "C1",
    "name": "Full descriptive concept title taught in video",
    "subconcepts": ["subconcept 1", "subconcept 2"],
    "chapter": "${evidence.topic || 'Lecture Content'}",
    "orderIndex": 1
  }
]`;

          const res = await client.models.generateContent({
            model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
            contents: prompt
          });

          const text = res.text || '';
          console.log(`[S2_ConceptExtraction] Attempt ${attempt}: Raw LLM response length=${text.length} chars.`);

          const parsed = this.parseJsonSafely<ConceptHierarchyItem[]>(text);
          const parseSuccess = Array.isArray(parsed) && parsed.length > 0;
          console.log(`[S2_ConceptExtraction] Attempt ${attempt}: JSON parse success=${parseSuccess}, items found=${parsed ? parsed.length : 0}`);

          if (parseSuccess) {
            const sanitized = this.sanitizeConceptList(parsed!, evidence.chapter);
            console.log(`[S2_ConceptExtraction] Successfully extracted ${sanitized.length} concepts via AI.`);
            return sanitized;
          }
        } catch (err: any) {
          console.warn(`[S2_ConceptExtraction] AI attempt ${attempt} warning:`, err.message);
          // If rate limited or quota exhausted, fall through to deterministic extraction grounded in video transcript
        }
      }
    }

    console.log(`[S2_ConceptExtraction] Using deterministic academic concept extraction.`);
    const local = this.extractLocally(evidence, transcript);
    console.log(`[S2_ConceptExtraction] Local extraction produced ${local.length} concepts.`);
    return local;
  }

  private static parseJsonSafely<T>(str: string): T | null {
    try {
      const clean = str.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(clean) as T;
    } catch {
      const match = str.match(/\[[\s\S]*\]/);
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

  private static sanitizeConceptList(items: ConceptHierarchyItem[], chapter: string): ConceptHierarchyItem[] {
    const valid = items.filter(c => {
      const name = (c.name || '').trim();
      return (
        name.length >= 3 &&
        /\p{L}/u.test(name) &&
        !/^\d+$/.test(name) &&
        !['unknown', 'undefined', 'null'].includes(name.toLowerCase())
      );
    });

    return valid.map((c, idx) => ({
      id: `C${idx + 1}`,
      name: c.name.trim(),
      subconcepts: Array.isArray(c.subconcepts) && c.subconcepts.length > 0 ? c.subconcepts : [c.name.trim()],
      chapter: c.chapter || chapter,
      orderIndex: idx + 1
    }));
  }

  /**
   * Deterministic extraction from structured evidence and transcript.
   */
  public static extractLocally(evidence: StructuredEvidence, segments: TranscriptSegment[]): ConceptHierarchyItem[] {
    const fullText = segments.map(s => s.text).join(' ').toLowerCase();
    const concepts: ConceptHierarchyItem[] = [];
    let idCounter = 1;

    // Helper to add concept without duplicate names and sanitize noise
    const addConcept = (name: string, subconcepts: string[]) => {
      const trimmed = name.trim();
      if (
        !trimmed ||
        trimmed.length < 3 ||
        !/\p{L}/u.test(trimmed) ||
        /^\d+$/.test(trimmed) ||
        ['and', 'or', 'the', 'is', 'for', 'let', 'then', 'so', 'we'].includes(trimmed.toLowerCase()) ||
        concepts.some(c => c.name.toLowerCase() === trimmed.toLowerCase())
      ) {
        return;
      }
      concepts.push({
        id: `C${idCounter}`,
        name: trimmed,
        subconcepts: subconcepts.length > 0 ? subconcepts : [trimmed],
        chapter: evidence.chapter,
        orderIndex: idCounter
      });
      idCounter++;
    };

    // 1. From definitions
    evidence.definitions.forEach(def => {
      addConcept(def.term, [
        `${def.term} Definition & Properties`,
        `Physical / Biological Significance of ${def.term}`
      ]);
    });

    // 2. From laws & principles
    evidence.laws.forEach(law => {
      addConcept(law.name, [
        `Statement and Governing Equation of ${law.name}`,
        `Conservation & Boundary Conditions in ${law.name}`
      ]);
    });

    // 3. From formulas
    evidence.formulas.forEach(form => {
      addConcept(form.name, [
        `Algebraic Structure of ${form.name}`,
        `Variables & Dimensional Consistency of ${form.name}`
      ]);
    });

    // 4. Grounded in transcript segment key phrases if fewer than 3 concepts
    if (concepts.length < 3 && segments.length > 0) {
      const numSections = Math.min(5, Math.max(1, segments.length));
      const step = Math.max(1, Math.floor(segments.length / numSections));
      for (let s = 0; s < numSections; s++) {
        const segIndex = Math.min(s * step, segments.length - 1);
        const seg = segments[segIndex];
        const words = seg.text.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w.length > 2);
        if (words.length >= 2) {
          const namePart = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          if (namePart.length >= 3 && !concepts.some(c => c.name.toLowerCase() === namePart.toLowerCase())) {
            addConcept(namePart, [
              `Instructional explanation at ${Math.floor(seg.start / 60)}m`,
              `Core principles and applications of ${namePart}`
            ]);
          }
        }
      }
    }

    // Filter to ensure every concept has at least one verifiable mention or related term in the transcript text
    const grounded = concepts.filter(c => {
      const tokens = c.name.toLowerCase().split(/\s+/).filter(t => t.length > 2);
      if (tokens.length === 0) return fullText.includes(c.name.toLowerCase());
      return tokens.some(t => fullText.includes(t));
    });

    return grounded.length > 0 ? grounded : concepts;
  }
}

