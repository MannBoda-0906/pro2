import { GoogleGenAI } from '@google/genai';
import {
  ConceptCoverageClassification,
  ConceptHierarchyItem,
  ConceptUnderstandingObject,
  StructuredEvidence
} from '../../types/index.js';

export class S4_ConceptUnderstanding {
  /**
   * Stage 4: Synthesizes rich concept understanding objects per concept.
   * Fields: meaning, definition, purpose, principle, formula, variables, units,
   * conditions, relationships, cause_and_effect, applications, examples,
   * common_mistakes, misconceptions, solving_methods, exam_relevance,
   * video_coverage, and testable_tasks (calculate, predict, compare, diagnose, apply).
   */
  public static async buildConceptUnderstanding(params: {
    concepts: ConceptHierarchyItem[];
    classifications: Record<string, ConceptCoverageClassification>;
    evidence: StructuredEvidence;
    client?: GoogleGenAI | null;
  }): Promise<Record<string, ConceptUnderstandingObject>> {
    let { concepts, classifications, evidence, client } = params;
    const understandings: Record<string, ConceptUnderstandingObject> = {};

    for (const concept of concepts) {
      const classification = classifications[concept.id];
      if (!classification || classification.status === 'NOT_COVERED') {
        continue;
      }

      // Try AI-augmented understanding if client available
      let obj: ConceptUnderstandingObject | null = null;
      if (client) {
        try {
          obj = await this.synthesizeWithAI(concept, classification, evidence, client);
        } catch (err: any) {
          if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED')) {
            client = null;
            console.warn(`[S4_ConceptUnderstanding] Quota/rate limit 429 encountered at ${concept.name}, switching to local synthesis for remainder.`);
          } else {
            console.warn(`[S4_ConceptUnderstanding] AI synthesis failed for ${concept.name}, using local:`, err?.message || err);
          }
        }
      }

      if (!obj) {
        obj = this.synthesizeLocally(concept, classification, evidence);
      }

      if (obj) {
        // Guarantee video evidence segments are attached for question validation traceability
        obj.evidence = (classification.evidence && classification.evidence.length > 0)
          ? classification.evidence
          : (evidence.definitions.length > 0
            ? [{ text: evidence.definitions[0].definition, start: evidence.definitions[0].timestampSeconds || 0, timestamp: evidence.definitions[0].timestamp || '00:00' }]
            : []);
      }

      understandings[concept.id] = obj;
    }

    return understandings;
  }

  private static async synthesizeWithAI(
    concept: ConceptHierarchyItem,
    classification: ConceptCoverageClassification,
    evidence: StructuredEvidence,
    client: GoogleGenAI
  ): Promise<ConceptUnderstandingObject | null> {
    const prompt = `You are a university professor creating an authoritative concept understanding specification for an exam engine.
CONCEPT: "${concept.name}" (ID: ${concept.id})
SUBJECT: "${evidence.subject}"
CHAPTER: "${evidence.chapter}"
COVERAGE STATUS: "${classification.status}"
EVIDENCE EXCERPTS: ${JSON.stringify(classification.evidence.map(e => e.text))}

Generate ONLY a JSON object matching this schema:
{
  "conceptId": "${concept.id}",
  "conceptName": "${concept.name}",
  "meaning": "Deep intuitive meaning",
  "definition": "Formal scientific/academic definition",
  "purpose": "Why this concept exists and what problem it solves",
  "principle": "Fundamental governing physical or theoretical principle",
  "formula": "Standard mathematical formula if applicable, or null",
  "variables": [
    { "symbol": "string", "meaning": "string", "unit": "string" }
  ],
  "units": ["SI or standard units"],
  "conditions": ["Key constraints and boundary conditions"],
  "relationships": [
    { "targetConceptId": "C2", "type": "proportional_to | causes | prerequisite_for | contrasts_with", "explanation": "string" }
  ],
  "causeAndEffect": ["Direct cause-and-effect mechanism"],
  "applications": ["Real-world and technological applications"],
  "examples": ["Concrete textbook/exam examples"],
  "commonMistakes": ["Specific algebraic or conceptual errors made by students"],
  "misconceptions": ["Frequent false beliefs to test against"],
  "solvingMethods": ["Standard step-by-step analytical methods"],
  "examRelevance": "Why and how examiners test this concept",
  "videoCoverage": "${classification.status}",
  "testableTasks": {
    "calculate": ["specific numerical calculation task"],
    "predict": ["predictive outcome task"],
    "compare": ["comparative task between systems"],
    "diagnose": ["error diagnosis task"],
    "apply": ["application scenario"]
  }
}`;

    const res = await client.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      contents: prompt
    });

    const text = res.text || '';
    const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean) as ConceptUnderstandingObject;
    if (parsed && parsed.meaning && parsed.definition) {
      return parsed;
    }
    return null;
  }

  public static synthesizeLocally(
    concept: ConceptHierarchyItem,
    classification: ConceptCoverageClassification,
    evidence: StructuredEvidence
  ): ConceptUnderstandingObject {
    const nameLower = concept.name.toLowerCase();

    // Matching evidence definitions, formulas, variables
    const matchedDef = evidence.definitions.find(d =>
      nameLower.includes(d.term.toLowerCase()) || d.term.toLowerCase().includes(nameLower)
    );
    let matchedFormula = evidence.formulas.find(f =>
      nameLower.includes(f.name.toLowerCase()) || f.name.toLowerCase().includes(nameLower)
    );

    // Default academic concept understanding object derived strictly from evidence and transcript
    const primaryEvidenceSnippet = (classification.evidence && classification.evidence.length > 0)
      ? classification.evidence[0].text
      : '';
    const meaningText = matchedDef
      ? matchedDef.definition
      : (primaryEvidenceSnippet.length > 15
        ? primaryEvidenceSnippet
        : `Core instructional concept of ${concept.name} taught in the lecture.`);

    return {
      conceptId: concept.id,
      conceptName: concept.name,
      meaning: meaningText,
      definition: matchedDef ? matchedDef.definition : meaningText,
      purpose: `Provides predictive and analytical structure for ${concept.name}.`,
      principle: `Governing academic principles of ${concept.name} taught in the video lecture.`,
      formula: matchedFormula ? matchedFormula.formula : undefined,
      variables: evidence.variables.length > 0 ? evidence.variables : undefined,
      units: ['SI standard units'],
      conditions: evidence.conditions.length > 0 ? evidence.conditions : ['Standard reference conditions'],
      relationships: [],
      causeAndEffect: [`Application of ${concept.name} dictates observable system changes.`],
      applications: evidence.applications.length > 0 ? evidence.applications : [`Practical problem solving in ${evidence.subject}`],
      examples: evidence.examples.length > 0 ? evidence.examples : [`Standard examination scenarios of ${concept.name}`],
      commonMistakes: evidence.commonMistakes.length > 0 ? evidence.commonMistakes : ['Calculation errors and variable confusion'],
      misconceptions: ['Overlooking governing boundary constraints'],
      solvingMethods: evidence.solvingMethods.map(m => m.description),
      examRelevance: `Essential syllabus topic in ${evidence.chapter || evidence.topic || 'the lecture'}.`,
      videoCoverage: classification.status,
      testableTasks: {
        calculate: [`Calculate quantitative outcomes involving ${concept.name}`],
        predict: [`Predict behavior when parameters of ${concept.name} are altered`],
        compare: [`Compare two distinct configurations governed by ${concept.name}`],
        diagnose: [`Diagnose common misconceptions regarding ${concept.name}`],
        apply: [`Apply ${concept.name} to solve novel scenarios`]
      }
    };
  }
}

