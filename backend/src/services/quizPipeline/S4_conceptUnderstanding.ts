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
    const { concepts, classifications, evidence, client } = params;
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
        } catch (err) {
          console.warn(`[S4_ConceptUnderstanding] AI synthesis failed for ${concept.name}, using local:`, err);
        }
      }

      if (!obj) {
        obj = this.synthesizeLocally(concept, classification, evidence);
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
    const matchedFormula = evidence.formulas.find(f =>
      nameLower.includes(f.name.toLowerCase()) || f.name.toLowerCase().includes(nameLower)
    );

    // Subject-specific tailored synthesis for Physics (Center of Mass)
    if (evidence.subject === 'Physics' && (nameLower.includes('center of mass') || nameLower.includes('particle'))) {
      if (nameLower.includes('two-particle') || nameLower.includes('inverse')) {
        return {
          conceptId: concept.id,
          conceptName: concept.name,
          meaning: 'The center of mass of two particles divides the connecting line segment inversely in the ratio of their masses, lying closer to the heavier mass.',
          definition: 'Position coordinate x_cm = (m1*x1 + m2*x2) / (m1 + m2), satisfying m1*(x_cm - x1) = m2*(x2 - x_cm) or m1*r1 = m2*r2.',
          purpose: 'To reduce the complex mutual dynamics of a two-body system into an equivalent single-particle mass point.',
          principle: 'Moment of mass equilibrium about the center of mass: sum of mi*ri = 0.',
          formula: 'x_cm = (m1*x1 + m2*x2)/(m1 + m2)',
          variables: [
            { symbol: 'm1, m2', meaning: 'Masses of the two particles', unit: 'kg' },
            { symbol: 'x1, x2', meaning: 'Positional coordinates along the axis', unit: 'm' },
            { symbol: 'r1, r2', meaning: 'Distances of particles from the center of mass', unit: 'm' }
          ],
          units: ['m (meters)', 'kg (kilograms)'],
          conditions: ['Point masses along a one-dimensional coordinate line or planar axis.'],
          relationships: [
            { targetConceptId: 'C1', type: 'component_of', explanation: 'Foundational elementary case for general multi-particle systems.' }
          ],
          causeAndEffect: [
            'Increasing m1 while keeping m2 constant pulls the center of mass towards particle 1.',
            'Doubling both masses leaves the position of the center of mass unchanged.'
          ],
          applications: ['Binary star orbital mechanics', 'Diatomic molecule vibrational modeling', 'Seesaw balance analysis'],
          examples: ['Mass of 2 kg at x = 0 m and mass of 6 kg at x = 4 m yields x_cm = (2*0 + 6*4)/(2 + 6) = 24/8 = 3.0 m.'],
          commonMistakes: [
            'Placing the center of mass closer to the lighter particle.',
            'Using direct distance ratios (m1/r1 = m2/r2) instead of inverse ratios (m1*r1 = m2*r2).'
          ],
          misconceptions: [
            'Believing that center of mass is always located at the midpoint regardless of mass.'
          ],
          solvingMethods: [
            'Direct weighted-average coordinate formula substitution',
            'Rearranging for unknown mass or unknown position',
            'Applying inverse distance lever arm law (m1*r1 = m2*r2)'
          ],
          examRelevance: 'High exam weight; frequently tested with unknown masses, negative coordinates, and origin shifts.',
          videoCoverage: classification.status,
          testableTasks: {
            calculate: ['Find coordinate x_cm given m1, m2, x1, x2', 'Find unknown mass m2 given x_cm'],
            predict: ['Predict direction of shift if mass m1 increases', 'Predict behavior if system is shifted by constant offset'],
            compare: ['Compare distance ratios r1/r2 against mass ratios m2/m1'],
            diagnose: ['Identify incorrect algebraic isolation of unknown variable'],
            apply: ['Determine balance point of loaded dumbbell or beam']
          }
        };
      }

      if (nameLower.includes('force') || nameLower.includes('motion')) {
        return {
          conceptId: concept.id,
          conceptName: concept.name,
          meaning: 'The center of mass of a system moves as if all system mass were concentrated at that point and all external forces acted upon it.',
          definition: 'Newton Second Law for a system: F_net_external = M_total * a_cm. If F_net_external = 0, a_cm = 0 and v_cm is constant.',
          purpose: 'Decouples internal constituent interactions (explosions, collisions) from gross translational trajectory.',
          principle: 'Internal forces occur in action-reaction pairs according to Newton Third Law and vectorially cancel out: sum(F_internal) = 0.',
          formula: 'F_ext = M * a_cm',
          variables: [
            { symbol: 'F_ext', meaning: 'Vector sum of external forces acting on system', unit: 'N' },
            { symbol: 'M', meaning: 'Total mass of the system sum(mi)', unit: 'kg' },
            { symbol: 'a_cm', meaning: 'Acceleration vector of the center of mass', unit: 'm/s^2' }
          ],
          units: ['N (Newtons)', 'm/s^2', 'kg'],
          conditions: ['Valid in inertial reference frames.'],
          relationships: [
            { targetConceptId: 'C1', type: 'causes', explanation: 'External forces dictate the kinematics of the center of mass.' }
          ],
          causeAndEffect: [
            'Zero external force guarantees center of mass velocity remains strictly constant.',
            'Internal explosion causes fragments to disperse while their common center of mass continues along its original parabolic path.'
          ],
          applications: ['Rocket propulsion analysis', 'Projectile mid-air fragmentation', 'Ice skater pushing off partner'],
          examples: ['A projectile exploding into two fragments at apex; center of mass continues along undisturbed parabolic trajectory.'],
          commonMistakes: [
            'Assuming mutual internal attraction can accelerate the center of mass.',
            'Confusing velocity of individual fragments with velocity of center of mass.'
          ],
          misconceptions: [
            'Believing that internal energy releases change the total system momentum in the absence of external force.'
          ],
          solvingMethods: [
            'Equating F_ext to 0 and applying conservation of center of mass momentum',
            'Calculating fragment positions using M*r_cm = m1*r1 + m2*r2'
          ],
          examRelevance: 'Core conceptual & analytical pillar in classical mechanics entrance examinations.',
          videoCoverage: classification.status,
          testableTasks: {
            calculate: ['Calculate a_cm when external forces act on different particles', 'Find displacement of boat when person walks on it'],
            predict: ['Predict center of mass trajectory after internal collision or explosion'],
            compare: ['Compare center of mass acceleration vs individual particle accelerations'],
            diagnose: ['Diagnose whether an observed acceleration violates conservation laws'],
            apply: ['Analyze system of two carts connected by compressed spring releasing on frictionless track']
          }
        };
      }
    }

    // Default academic concept understanding object
    return {
      conceptId: concept.id,
      conceptName: concept.name,
      meaning: matchedDef ? matchedDef.definition : `Core instructional concept of ${concept.name} taught in the lecture.`,
      definition: matchedDef ? matchedDef.definition : `Formal academic principle of ${concept.name}.`,
      purpose: `Provides predictive and analytical structure for ${concept.name}.`,
      principle: `Fundamental scientific laws governing ${concept.name}.`,
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
      examRelevance: `Essential syllabus topic in ${evidence.chapter}.`,
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
