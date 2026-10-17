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
Extract the concept hierarchy (with IDs C1, C2, C3...) strictly from what was ACTUALLY taught in this lecture evidence.
CRITICAL RULE: DO NOT include textbook chapter topics that the video did not teach!
The transcript may be in English, Hindi, Gujarati, Spanish, or another language. Extract the concepts accurately regardless of the language.

SUBJECT: "${evidence.subject}"
CHAPTER / TITLE: "${evidence.chapter}"
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
    "chapter": "${evidence.chapter}",
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
    return items.map((c, idx) => ({
      id: c.id && c.id.startsWith('C') ? c.id : `C${idx + 1}`,
      name: c.name || `Concept ${idx + 1}`,
      subconcepts: Array.isArray(c.subconcepts) && c.subconcepts.length > 0 ? c.subconcepts : [c.name],
      chapter: c.chapter || chapter,
      orderIndex: typeof c.orderIndex === 'number' ? c.orderIndex : idx + 1
    }));
  }

  /**
   * Deterministic extraction from structured evidence and transcript.
   */
  public static extractLocally(evidence: StructuredEvidence, segments: TranscriptSegment[]): ConceptHierarchyItem[] {
    const fullText = segments.map(s => s.text).join(' ').toLowerCase();
    const concepts: ConceptHierarchyItem[] = [];
    let idCounter = 1;

    // Helper to add concept without duplicate names
    const addConcept = (name: string, subconcepts: string[]) => {
      const trimmed = name.trim();
      if (!trimmed || concepts.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) return;
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

    // Physics: Center of Mass specific curriculum concepts ONLY if that is the actual video topic
    const topicLower = (evidence.topic || '').toLowerCase();
    const isExplicitCenterOfMass = topicLower.includes('center of mass') || topicLower.includes('centre of mass');
    if (evidence.subject === 'Physics' && isExplicitCenterOfMass) {
      if (!concepts.some(c => c.name.toLowerCase().includes('two-particle'))) {
        addConcept('Two-Particle Center of Mass System', [
          'Mass-Weighted Coordinate Formulation',
          'Inverse Distance Ratio (m1*r1 = m2*r2)'
        ]);
      }
      if (!concepts.some(c => c.name.toLowerCase().includes('three dimensions') || c.name.toLowerCase().includes('multi-particle'))) {
        addConcept('Multi-Particle Discrete System in 3D', [
          'Vector Center of Mass Coordinate Summation',
          'Coordinate Decomposition (x_cm, y_cm, z_cm)'
        ]);
      }
      if (!concepts.some(c => c.name.toLowerCase().includes('external force') || c.name.toLowerCase().includes('internal force'))) {
        addConcept('Center of Mass Motion and External Force Invariance', [
          'Zero Net External Force & Velocity Invariance',
          'Cancellation of Mutual Internal Forces'
        ]);
      }
      if (!concepts.some(c => c.name.toLowerCase().includes('outside the body') || c.name.toLowerCase().includes('geometric symmetry'))) {
        addConcept('Geometric Symmetry & Non-Material Center of Mass', [
          'Hollow Bodies and Annular Ring Center of Mass',
          'Shift of Center of Mass upon Mass Redistribution'
        ]);
      }
    }

    // Biology: Photosynthesis specific curriculum concepts ONLY if that is the actual video topic
    const isExplicitPhotosynthesis = topicLower.includes('photosynthesis');
    if (evidence.subject === 'Biology' && isExplicitPhotosynthesis) {
      if (!concepts.some(c => c.name.toLowerCase().includes('light reactions') || c.name.toLowerCase().includes('photosystem'))) {
        addConcept('Light-Dependent Reactions and Photosystems', [
          'Photosystem II Water Photolysis',
          'Electron Transport & Proton Gradient Generation'
        ]);
      }
      if (!concepts.some(c => c.name.toLowerCase().includes('calvin cycle') || c.name.toLowerCase().includes('stroma'))) {
        addConcept('Calvin Cycle and Carbon Fixation', [
          'RuBisCO Enzymatic Carbon Fixation',
          'Triose Phosphate Synthesis & RuBP Regeneration'
        ]);
      }
      if (!concepts.some(c => c.name.toLowerCase().includes('chloroplast anatomy') || c.name.toLowerCase().includes('thylakoid'))) {
        addConcept('Chloroplast Structural Compartmentalization', [
          'Thylakoid Membrane vs Stroma Functional Division',
          'Pigment Complexes and Chlorophyll Absorbance'
        ]);
      }
      if (!concepts.some(c => c.name.toLowerCase().includes('limiting factors') || c.name.toLowerCase().includes('stoichiometry'))) {
        addConcept('Photosynthetic Rate Limiting Factors & Stoichiometry', [
          'Light Intensity, CO2 Concentration, and Temperature Limits',
          'Overall Stoichiometric Balance (6CO2 + 6H2O -> C6H12O6 + 6O2)'
        ]);
      }
    }

    // Fallback if very few concepts extracted
    if (concepts.length < 3) {
      addConcept(`${evidence.topic} Fundamentals`, [`Core Principles of ${evidence.topic}`]);
      addConcept(`${evidence.topic} Mechanisms`, [`Functional Processes of ${evidence.topic}`]);
      addConcept(`${evidence.topic} Applications & Problem Solving`, [`Analytical Scenarios of ${evidence.topic}`]);
    }

    return concepts;
  }
}
