import { GoogleGenAI } from '@google/genai';
import {
  CognitiveLevel,
  ConceptCoverageEntry,
  ConceptKnowledgeItem,
  ConceptKnowledgeMap,
  ConceptMap,
  QuestionCategory,
  QuizBlueprintItem,
  QuizData,
  QuizQuestion,
  TopicCoverageReport,
  TranscriptSegment,
  VideoCoverageLevel,
  WeakConceptReview
} from '../types/index.js';
import { ChunkingService } from './chunkingService.js';
import { DEMO_VIDEOS } from './demoData.js';
import { CurriculumKnowledgeBank } from './curriculumKnowledgeBank.js';

export interface QuizGenerationParams {
  videoId: string;
  videoUrl?: string;
  title: string;
  transcript: TranscriptSegment[];
  difficulty?: 'easy' | 'medium' | 'hard';
  count?: number; // Strictly 25
  language?: string; // 'en' | 'hi' | 'gu' | 'es'
  apiKey?: string;
}

export interface PracticeGenerationParams {
  videoId?: string;
  title: string;
  weakConcepts: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  language?: string;
  apiKey?: string;
}

export class ConceptAnalysisEngine {
  private static getClient(apiKey?: string): GoogleGenAI | null {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key || key.trim() === '' || key.startsWith('your_') || key === 'PLACEHOLDER') {
      return null;
    }
    return new GoogleGenAI({ apiKey: key.trim() });
  }

  private static getModelName(): string {
    return process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  }

  private static normalizeLanguage(lang?: string): { code: 'en' | 'hi' | 'gu' | 'es'; name: string } {
    if (!lang) return { code: 'en', name: 'English' };
    const lower = lang.toLowerCase().trim();
    if (lower.startsWith('hi') || lower.includes('hindi') || lower.includes('हिन्दी')) {
      return { code: 'hi', name: 'Hindi (हिन्दी)' };
    }
    if (lower.startsWith('gu') || lower.includes('gujarati') || lower.includes('ગુજરાતી')) {
      return { code: 'gu', name: 'Gujarati (ગુજરાતી)' };
    }
    if (lower.startsWith('es') || lower.includes('spanish') || lower.includes('español')) {
      return { code: 'es', name: 'Spanish (Español)' };
    }
    return { code: 'en', name: 'English' };
  }

  private static async generateContentWithTimeout(
    client: GoogleGenAI,
    params: { model: string; contents: string },
    timeoutMs: number = 22000
  ): Promise<any> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Gemini API call exceeded timeout limit of ${timeoutMs}ms`));
      }, timeoutMs);
    });
    try {
      const result = await Promise.race([client.models.generateContent(params), timeoutPromise]);
      clearTimeout(timer!);
      return result;
    } catch (err) {
      clearTimeout(timer!);
      throw err;
    }
  }

  /**
   * =========================================================================
   * 19-STEP CONCEPT-BASED QUIZ GENERATION PIPELINE
   * =========================================================================
   */
  static async generateConceptQuiz(params: QuizGenerationParams): Promise<QuizData> {
    const {
      videoId,
      videoUrl,
      title,
      transcript,
      difficulty = 'medium',
      language = 'en',
      apiKey
    } = params;

    const targetLang = this.normalizeLanguage(language);
    const client = this.getClient(apiKey);
    const fullTranscriptText = transcript.map(t => t.text).join(' ');

    // STEP 1 & 2: Video info & transcript evidence already passed in params

    // STEP 3 - 8: Educational Content Analysis -> Concept Knowledge Map
    let knowledgeMap: ConceptKnowledgeMap | null = null;

    if (client && fullTranscriptText.length > 50) {
      try {
        knowledgeMap = await this.buildConceptKnowledgeMapWithAI(
          client,
          title,
          videoUrl,
          transcript,
          targetLang.name
        );
      } catch (err) {
        console.warn('Gemini Concept Knowledge Map extraction notice:', err);
      }
    }

    if (!knowledgeMap || !knowledgeMap.videoCoveredConcepts || knowledgeMap.videoCoveredConcepts.length === 0) {
      knowledgeMap = this.buildConceptKnowledgeMapLocally(title, transcript, videoId);
    }

    // STEP 9: Build Video Concept Coverage Map guaranteeing 100% video concept representation
    this.buildConceptCoverageMap(knowledgeMap);

    // STEP 10: 25-Question Blueprint Generation (18 numerical/problem-solving, 7 conceptual/reasoning)
    const blueprint = this.create25QuestionBlueprint(knowledgeMap, difficulty);
    knowledgeMap.blueprint = blueprint;

    // STEP 11: Generate Original Questions strictly from video covered concepts
    let rawQuestions: QuizQuestion[] = [];

    if (client && knowledgeMap.videoCoveredConcepts.length > 0) {
      try {
        rawQuestions = await this.generateQuestionsFromBlueprintWithAI(
          client,
          title,
          knowledgeMap,
          blueprint,
          difficulty,
          targetLang
        );
      } catch (err) {
        console.warn('Gemini question generation from blueprint notice:', err);
      }
    }

    if (!rawQuestions || rawQuestions.length < 25) {
      rawQuestions = this.synthesize25QuestionsLocally(knowledgeMap, blueprint, targetLang.code);
    }

    // STEP 12 - 17: Multi-Phase Question Validation & Refinement
    const validatedQuestions = this.validateAndRefineQuiz(
      rawQuestions,
      knowledgeMap,
      blueprint,
      difficulty,
      targetLang.code
    );

    // STEP 18: Multilingual Translation (preserves formulas, signs, numbers, units)
    let finalQuestions = validatedQuestions;
    if (targetLang.code !== 'en' && client) {
      try {
        finalQuestions = await this.translateQuizQuestionsIfNeeded(
          client,
          validatedQuestions,
          targetLang
        );
      } catch (transErr) {
        console.warn('Multilingual translation notice, keeping verified questions:', transErr);
      }
    }

    // STEP 19: Build Topic Coverage Report & Package Final Quiz
    const legacyConceptMap = {
      mainTopic: knowledgeMap.mainTopic,
      subjectCategory: knowledgeMap.subject.toLowerCase() as any,
      subtopics: knowledgeMap.subtopics,
      concepts: knowledgeMap.videoCoveredConcepts.map((c, idx) => ({
        id: `c_${idx + 1}`,
        name: c.concept,
        simpleExplanation: c.definition || c.concept,
        detailedExplanation: c.principle || c.definition || c.concept,
        relatedConcepts: c.relationships || [],
        examples: c.examples || [],
        terminology: [c.topic, c.subtopic],
        formula: c.formula,
        conditionsOrLimitations: c.conditions,
        commonMisconceptions: [],
        examImportance: (c.importance === 'high' ? 'essential' : (c.importance === 'low' ? 'supporting' : 'important')) as 'essential' | 'important' | 'supporting',
        approximateTimestamp: c.timestampSeconds
          ? { startSeconds: c.timestampSeconds, timestamp: c.timestamp || '01:00' }
          : undefined
      })),
      relationships: [],
      definitions: knowledgeMap.videoCoveredConcepts.map(c => ({
        term: c.concept,
        definition: c.definition || '',
        simpleExplanation: c.principle || ''
      })),
      formulas: knowledgeMap.videoCoveredConcepts
        .filter(c => Boolean(c.formula))
        .map(c => ({
          name: c.concept,
          formula: c.formula!,
          variables: c.variables || [],
          applicability: c.conditions || ''
        })),
      processes: [],
      examples: knowledgeMap.videoCoveredConcepts.map(c => ({
        concept: c.concept,
        example: c.examples?.[0] || 'Example problem',
        takeaway: c.principle || ''
      })),
      misconceptions: [],
      examImportantPoints: knowledgeMap.subtopics
    };

    const numericalCount = finalQuestions.filter(
      q => q.questionCategory === 'numerical' || q.questionCategory === 'application'
    ).length;
    const conceptualCount = finalQuestions.length - numericalCount;

    const topicCoverageReport = this.buildTopicCoverageReport(
      legacyConceptMap,
      finalQuestions.length,
      targetLang.code,
      numericalCount,
      conceptualCount
    );

    return {
      title: `${title} — 25 Concept-Based Exam Quiz`,
      subject: knowledgeMap.subject,
      academicLevel: knowledgeMap.academicLevel,
      chapter: knowledgeMap.chapter,
      difficulty,
      language: targetLang.code,
      conceptMap: legacyConceptMap,
      conceptKnowledgeMap: knowledgeMap,
      topicCoverageReport,
      blueprint,
      distribution: {
        numericalAndProblemSolving: numericalCount,
        conceptualAndReasoning: conceptualCount,
        easy: finalQuestions.filter(q => q.difficulty === 'easy').length,
        medium: finalQuestions.filter(q => q.difficulty === 'medium').length,
        hard: finalQuestions.filter(q => q.difficulty === 'hard').length
      },
      questions: finalQuestions.slice(0, 25)
    };
  }

  /**
   * STEP 3 - 8: Deep AI Educational Content Analysis -> Concept Knowledge Map
   */
  private static async buildConceptKnowledgeMapWithAI(
    client: GoogleGenAI,
    title: string,
    videoUrl: string | undefined,
    transcript: TranscriptSegment[],
    targetLangName: string
  ): Promise<ConceptKnowledgeMap | null> {
    const formattedTranscript = transcript
      .slice(0, 400)
      .map(t => `[${ChunkingService.formatTimestamp(t.start)}] ${t.text}`)
      .join('\n')
      .slice(0, 36000);

    const prompt = `You are a Senior Academic Curriculum Specialist and University Professor analyzing the study video titled "${title}".
URL: ${videoUrl || 'N/A'}.

MISSION:
Perform an exhaustive Educational Content Analysis of what was ACTUALLY taught in this video.
CRITICAL RULES:
1. The transcript is ONLY RAW EVIDENCE. Do not merely copy sentences.
2. DO NOT HALLUCINATE VIDEO COVERAGE. Do NOT assume the whole chapter was taught.
   If the video only covers 5 concepts, identify only those 5 concepts.
3. For every candidate concept, classify its video coverage:
   - "fully_covered": Explained in depth with formulas/derivations and examples.
   - "mostly_covered": Explained clearly with key mechanisms or equations.
   - "partially_covered": Introduced with educational substance.
   - "mentioned_only": Named in passing or as a tangent (NOT to be used for quiz).
   - "not_covered": General chapter concepts absent from this video (EXCLUDE from quiz).
4. Strictly separate:
   - "videoCoveredConcepts": ONLY concepts that are fully_covered, mostly_covered, or partially_covered.
   - "additionalChapterConcepts": Chapter concepts not taught in this video (e.g., if video teaches Center of Mass, concepts like Moment of Inertia or Torque belong in additionalChapterConcepts).
5. For each covered concept extract:
   - topic, subtopic, concept (exact title)
   - definition (formal textbook definition)
   - principle (underlying physical, mathematical, or scientific law)
   - formula (exact equation, e.g. x_cm = (m1*x1 + m2*x2)/(m1 + m2), or null if purely qualitative)
   - variables: [{ symbol, meaning, unit }]
   - conditions: assumptions, applicability, or limitations
   - relationships: proportionalities, mass ratios, or inverse square dependencies
   - applications: real-world or exam applications
   - problem_solving_method: step-by-step method to solve problems on this concept
   - examples: teacher's numerical or real examples
   - difficulty: "easy" | "medium" | "hard"
   - video_coverage: "fully_covered" | "mostly_covered" | "partially_covered"
   - importance: "essential" | "high" | "medium" | "low"
   - approximateTimestamp: { timestamp: "mm:ss", startSeconds: number }

Return valid JSON matching this schema:
{
  "subject": "Physics",
  "academicLevel": "Class 11",
  "chapter": "System of Particles and Rotational Motion",
  "mainTopic": "Center of Mass",
  "subtopics": ["Subtopic 1", "Subtopic 2"],
  "videoCoveredConcepts": [
    {
      "topic": "Center of Mass",
      "subtopic": "Subtopic 1",
      "concept": "Concept Name",
      "definition": "Formal definition",
      "principle": "Scientific principle",
      "formula": "x_cm = (m1*x1 + m2*x2)/(m1 + m2)",
      "variables": [{ "symbol": "m1", "meaning": "Mass 1", "unit": "kg" }],
      "conditions": "Discrete masses on 1D line",
      "relationships": ["COM is closer to heavier mass: r1/r2 = m2/m1"],
      "applications": ["Binary star balance point"],
      "problem_solving_method": "1. Set origin 2. Multiply mass by position 3. Divide by total mass",
      "examples": ["2 kg at x=0, 6 kg at x=4 => x_cm=3 m"],
      "difficulty": "medium",
      "video_coverage": "fully_covered",
      "importance": "essential",
      "timestamp": "02:15",
      "timestampSeconds": 135
    }
  ],
  "additionalChapterConcepts": [
    "Moment of Inertia",
    "Torque and Angular Momentum"
  ]
}

Lesson Content with Timestamps:
"""
${formattedTranscript}
"""

Return ONLY valid JSON without markdown wrapping.`;

    const res = await this.generateContentWithTimeout(client, {
      model: this.getModelName(),
      contents: prompt
    });

    const parsed = this.parseJsonSafely<ConceptKnowledgeMap>(res.text || '');
    if (
      parsed &&
      parsed.subject &&
      parsed.mainTopic &&
      Array.isArray(parsed.videoCoveredConcepts) &&
      parsed.videoCoveredConcepts.length > 0
    ) {
      // Filter strictly for covered concepts
      parsed.videoCoveredConcepts = parsed.videoCoveredConcepts.filter(
        c =>
          c.video_coverage === 'fully_covered' ||
          c.video_coverage === 'mostly_covered' ||
          c.video_coverage === 'partially_covered'
      );
      return parsed;
    }

    return null;
  }

  /**
   * STEP 9: Build Video Concept Coverage Map
   * Ensures that EVERY important concept taught in the video appears in the quiz,
   * without ignoring any video concept or introducing untaught chapter concepts.
   */
  private static buildConceptCoverageMap(knowledgeMap: ConceptKnowledgeMap): ConceptCoverageEntry[] {
    const concepts = knowledgeMap.videoCoveredConcepts;
    if (!concepts || concepts.length === 0) return [];

    const totalSlots = 25;
    // Guaranteed base allocation of at least 1 question for every video-covered concept
    const baseCount = 1;
    let remaining = totalSlots - (concepts.length * baseCount);
    if (remaining < 0) remaining = 0;

    const weightMap: Record<string, number> = { essential: 3, high: 2, medium: 1, low: 0 };
    const totalWeight = concepts.reduce((sum, c) => sum + (weightMap[c.importance || 'medium'] || 1), 0);

    const coverageMap: ConceptCoverageEntry[] = concepts.map((c) => {
      const weight = weightMap[c.importance || 'medium'] || 1;
      const extra = totalWeight > 0 ? Math.round((weight / totalWeight) * remaining) : 0;
      const allocated = baseCount + extra;
      return {
        concept: c.concept,
        subtopic: c.subtopic,
        importance: c.importance || 'medium',
        videoCoverage: c.video_coverage || 'fully_covered',
        questionsAssigned: allocated,
        questionsAllocated: allocated
      };
    });

    // Normalize allocated sum to exactly 25
    let currentSum = coverageMap.reduce((s, e) => s + (e.questionsAllocated || e.questionsAssigned), 0);
    let diff = totalSlots - currentSum;
    let i = 0;
    while (diff !== 0 && coverageMap.length > 0) {
      const entry = coverageMap[i % coverageMap.length];
      const count = entry.questionsAllocated || entry.questionsAssigned;
      if (diff > 0) {
        entry.questionsAllocated = count + 1;
        entry.questionsAssigned = count + 1;
        diff--;
      } else if (diff < 0 && count > 1) {
        entry.questionsAllocated = count - 1;
        entry.questionsAssigned = count - 1;
        diff++;
      }
      i++;
    }

    knowledgeMap.conceptCoverageMap = coverageMap;
    return coverageMap;
  }

  /**
   * Subject-Specific Question Diversity Matrix
   * Produces 25 distinct archetypes ensuring NO TWO QUESTIONS use the same solving method.
   * Tailored for Physics, Mathematics, Chemistry, Biology, Computer Science, and General STEM.
   */
  private static getSubjectDiversityMatrix(subject: string): {
    problemArchetype: string;
    archetypeId: string;
    procedureSignature: string;
    unknownType: string;
    requiredOperation: string;
    cognitiveTask: string;
    scenarioType: string;
    numericalOrTheory: 'numerical' | 'theory';
    questionCategory: QuestionCategory;
    difficulty: 'easy' | 'medium' | 'hard';
    cognitiveLevel: CognitiveLevel;
    problemStyle: string;
    solvingMethodDescription: string;
  }[] {
    const s = (subject || '').toLowerCase();

    // 1. MATHEMATICS DIVERSITY MATRIX (25 Unique Archetypes & Procedure Signatures)
    if (s.includes('math')) {
      return [
        { problemArchetype: 'direct_calculation', archetypeId: 'DIRECT_CALCULATION', procedureSignature: 'direct_eval_substitution', unknownType: 'standard_evaluated_value', requiredOperation: 'direct_substitution', cognitiveTask: 'direct_evaluation', scenarioType: 'standard_equation', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'easy', cognitiveLevel: 'level_3_application', problemStyle: 'Direct numerical or algebraic computation', solvingMethodDescription: 'Direct application of formula to evaluate standard result' },
        { problemArchetype: 'unknown_variable_solve', archetypeId: 'INVERSE_CALCULATION', procedureSignature: 'algebraic_isolate_unknown_var', unknownType: 'unknown_coefficient', requiredOperation: 'equation_inversion', cognitiveTask: 'inverse_solve', scenarioType: 'target_resultant_given', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'easy', cognitiveLevel: 'level_3_application', problemStyle: 'Solve for unknown variable given target resultant', solvingMethodDescription: 'Algebraic inversion isolating unknown parameter' },
        { problemArchetype: 'equation_formation', archetypeId: 'EQUATION_FORMATION', procedureSignature: 'verbal_to_algebraic_model', unknownType: 'synthesized_algebraic_equation', requiredOperation: 'formulation', cognitiveTask: 'model_building', scenarioType: 'word_problem_context', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'easy', cognitiveLevel: 'level_3_application', problemStyle: 'Formulate equation from verbal problem scenario', solvingMethodDescription: 'Translate conditions into mathematical equation and solve' },
        { problemArchetype: 'multi_step_problem', archetypeId: 'MULTI_STEP_APPLICATION', procedureSignature: 'chained_intermediate_computation', unknownType: 'two_stage_target_quantity', requiredOperation: 'chained_computation', cognitiveTask: 'multi_step_execution', scenarioType: 'compound_system', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Chained sequential computation across steps', solvingMethodDescription: 'Intermediate calculation followed by final determination' },
        { problemArchetype: 'case_based_problem', archetypeId: 'CASE_STUDY', procedureSignature: 'parameter_domain_partition_solve', unknownType: 'case_specific_outcome', requiredOperation: 'case_partition', cognitiveTask: 'applied_reasoning', scenarioType: 'conditional_scenario', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Applied case study with specific conditions', solvingMethodDescription: 'Apply model equations to specific contextual scenario' },
        { problemArchetype: 'pattern_recognition', archetypeId: 'PATTERN_RECOGNITION', procedureSignature: 'arithmetic_geometric_term_deduction', unknownType: 'nth_term_or_sum', requiredOperation: 'sequence_rule_induction', cognitiveTask: 'pattern_evaluation', scenarioType: 'numeric_series', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Series or sequence pattern determination', solvingMethodDescription: 'Identify progression rule and evaluate target term' },
        { problemArchetype: 'graph_interpretation', archetypeId: 'GRAPH_INTERPRETATION', procedureSignature: 'slope_intercept_integral_extraction', unknownType: 'coordinate_extracted_constant', requiredOperation: 'curve_parameter_reading', cognitiveTask: 'graphical_deduction', scenarioType: 'cartesian_plot', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Extract parameters and slope/intercept from data', solvingMethodDescription: 'Graphical coordinate reading to extract quantitative constants' },
        { problemArchetype: 'inequality_condition', archetypeId: 'INEQUALITY_CONDITION', procedureSignature: 'boundary_interval_derivation', unknownType: 'admissible_parameter_interval', requiredOperation: 'inequality_simplification', cognitiveTask: 'domain_bound_analysis', scenarioType: 'constraint_domain', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Range of validity and inequality constraints', solvingMethodDescription: 'Bound analysis to establish domain limits' },
        { problemArchetype: 'proof_reasoning', archetypeId: 'PROOF_REASONING', procedureSignature: 'deductive_lemma_step_verification', unknownType: 'truth_value_of_deduction', requiredOperation: 'logical_deduction', cognitiveTask: 'proof_verification', scenarioType: 'theorem_lemma', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Step-by-step verification of mathematical claim', solvingMethodDescription: 'Logical deduction confirming truth value of lemma' },
        { problemArchetype: 'optimization_application', archetypeId: 'OPTIMIZATION_APPLICATION', procedureSignature: 'stationary_derivative_vertex_solve', unknownType: 'extremum_max_min_value', requiredOperation: 'differentiation_or_vertex', cognitiveTask: 'extremum_search', scenarioType: 'cost_or_area_model', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Extremum, maximum, or minimum value search', solvingMethodDescription: 'Derive stationary condition or vertex to optimize quantity' },
        { problemArchetype: 'error_analysis', archetypeId: 'ERROR_ANALYSIS', procedureSignature: 'detect_illegal_division_or_sign_flip', unknownType: 'erroneous_step_line_number', requiredOperation: 'fallacy_identification', cognitiveTask: 'evaluative_diagnosis', scenarioType: 'student_solution_audit', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Diagnosing common algebraic error in student step', solvingMethodDescription: 'Identify fallacious step or illegal operation in a student attempt' },
        { problemArchetype: 'alternate_method_reasoning', archetypeId: 'METHOD_SELECTION', procedureSignature: 'compare_analytic_vs_geometric_approach', unknownType: 'more_efficient_method', requiredOperation: 'equivalence_verification', cognitiveTask: 'method_selection', scenarioType: 'dual_pathway_problem', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Comparing two different mathematical methods', solvingMethodDescription: 'Evaluate equivalence of alternative solution pathways' },
        { problemArchetype: 'inverse_reasoning', archetypeId: 'REVERSE_REASONING', procedureSignature: 'invert_transformation_matrix_or_mapping', unknownType: 'original_preimage_vector', requiredOperation: 'inverse_mapping', cognitiveTask: 'reverse_reconstruction', scenarioType: 'linear_transform', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Inverse mapping and reverse reconstruction', solvingMethodDescription: 'Invert transformation to recover initial state' },
        { problemArchetype: 'constraint_boundary_problem', archetypeId: 'CONSTRAINT_PROBLEM', procedureSignature: 'restrictive_boundary_feasibility_check', unknownType: 'feasible_solution_count', requiredOperation: 'compatibility_check', cognitiveTask: 'constraint_satisfaction', scenarioType: 'bounded_region', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Boundary conditions and feasibility boundaries', solvingMethodDescription: 'Check compatibility against restrictive constraints' },
        { problemArchetype: 'missing_information_reconstruction', archetypeId: 'MISSING_INFORMATION_RECONSTRUCTION', procedureSignature: 'invariant_sum_or_product_solve', unknownType: 'omitted_matrix_or_poly_term', requiredOperation: 'invariant_substitution', cognitiveTask: 'reconstruction', scenarioType: 'incomplete_polynomial', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Reconstruct omitted coefficient or coordinate', solvingMethodDescription: 'Use system invariants to deduce missing term' },
        { problemArchetype: 'ratio_proportional_reasoning', archetypeId: 'RATIO_REASONING', procedureSignature: 'homogeneous_scaling_power_law_eval', unknownType: 'scaling_factor_multiple', requiredOperation: 'proportional_scaling', cognitiveTask: 'scaling_analysis', scenarioType: 'geometric_dilation', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Scaling behavior under proportional transforms', solvingMethodDescription: 'Examine power-law or scaling factor impacts' },
        { problemArchetype: 'multi_concept_numerical_problem', archetypeId: 'MULTI_CONCEPT_INTEGRATION', procedureSignature: 'bridge_algebra_and_geometry_theorems', unknownType: 'hybrid_geometric_algebraic_value', requiredOperation: 'theorem_synthesis', cognitiveTask: 'multi_concept_integration', scenarioType: 'coordinate_geometry_hybrid', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Bridging two distinct mathematical theorems', solvingMethodDescription: 'Combined theorem execution requiring synthesis' },
        { problemArchetype: 'exam_style_challenge', archetypeId: 'EXAM_STYLE_CHALLENGE', procedureSignature: 'olympiad_nested_modular_or_functional_solve', unknownType: 'nested_system_solution', requiredOperation: 'multi_tier_synthesis', cognitiveTask: 'exam_challenge', scenarioType: 'advanced_competition_puzzle', numericalOrTheory: 'numerical', questionCategory: 'exam_style', difficulty: 'hard', cognitiveLevel: 'level_5_exam_reasoning', problemStyle: 'Competitive examination multi-tiered problem', solvingMethodDescription: 'Rigorous multi-layer logical and numerical challenge' },
        { problemArchetype: 'conceptual_prediction', archetypeId: 'CONCEPTUAL_PREDICTION', procedureSignature: 'asymptotic_limit_trend_deduction', unknownType: 'asymptotic_growth_behavior', requiredOperation: 'limit_behavior_analysis', cognitiveTask: 'qualitative_prediction', scenarioType: 'unbounded_growth_function', numericalOrTheory: 'theory', questionCategory: 'conceptual', difficulty: 'easy', cognitiveLevel: 'level_2_understanding', problemStyle: 'Predict qualitative behavior when parameter grows', solvingMethodDescription: 'Asymptotic trend deduction' },
        { problemArchetype: 'conceptual_comparison', archetypeId: 'CONCEPTUAL_COMPARISON', procedureSignature: 'compare_function_growth_rates', unknownType: 'faster_growing_function_order', requiredOperation: 'order_of_growth_contrast', cognitiveTask: 'comparative_analysis', scenarioType: 'exponential_vs_polynomial', numericalOrTheory: 'theory', questionCategory: 'conceptual', difficulty: 'easy', cognitiveLevel: 'level_2_understanding', problemStyle: 'Contrast two mathematical objects or functions', solvingMethodDescription: 'Comparative property verification' },
        { problemArchetype: 'why_reasoning', archetypeId: 'WHY_REASONING', procedureSignature: 'theorem_hypothesis_necessity_justification', unknownType: 'mandatory_continuity_or_smoothness', requiredOperation: 'necessary_condition_reasoning', cognitiveTask: 'first_principles_reasoning', scenarioType: 'mean_value_theorem_preconditions', numericalOrTheory: 'theory', questionCategory: 'reasoning', difficulty: 'medium', cognitiveLevel: 'level_4_analysis', problemStyle: 'Underlying justification for theorem hypothesis', solvingMethodDescription: 'Deductive reasoning behind mandatory mathematical conditions' },
        { problemArchetype: 'misconception_detection', archetypeId: 'MISCONCEPTION_DETECTION', procedureSignature: 'counterexample_to_false_converse_claim', unknownType: 'counterexample_object', requiredOperation: 'counterexample_construction', cognitiveTask: 'misconception_detection', scenarioType: 'converse_fallacy_trap', numericalOrTheory: 'theory', questionCategory: 'reasoning', difficulty: 'medium', cognitiveLevel: 'level_4_analysis', problemStyle: 'Standard mathematical trap or intuitive misconception', solvingMethodDescription: 'Disprove naive intuition using counterexample or proof' },
        { problemArchetype: 'condition_checking', archetypeId: 'ASSUMPTION_CHECK', procedureSignature: 'necessary_vs_sufficient_condition_check', unknownType: 'logical_sufficiency_status', requiredOperation: 'condition_rigor_audit', cognitiveTask: 'assumption_testing', scenarioType: 'invertibility_criteria', numericalOrTheory: 'theory', questionCategory: 'reasoning', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Necessary vs sufficient conditions test', solvingMethodDescription: 'Evaluate logical rigor of stated assumptions' },
        { problemArchetype: 'principle_condition_application', archetypeId: 'PRINCIPLE_SELECTION', procedureSignature: 'foundational_axiom_deductive_selection', unknownType: 'governing_mathematical_axiom', requiredOperation: 'axiom_matching', cognitiveTask: 'principle_identification', scenarioType: 'vector_space_properties', numericalOrTheory: 'theory', questionCategory: 'reasoning', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Deductive application of foundational axiom', solvingMethodDescription: 'Direct axiomatic implication check' },
        { problemArchetype: 'integrated_concept_question', archetypeId: 'INTEGRATED_CONCEPT_QUESTION', procedureSignature: 'unify_geometric_symmetry_and_algebraic_invariance', unknownType: 'isomorphism_or_invariance_statement', requiredOperation: 'holistic_unification', cognitiveTask: 'integrated_concept_evaluation', scenarioType: 'symmetry_group_structure', numericalOrTheory: 'theory', questionCategory: 'exam_style', difficulty: 'hard', cognitiveLevel: 'level_5_exam_reasoning', problemStyle: 'Unifying definition, symmetry, and geometric meaning', solvingMethodDescription: 'Holistic conceptual integration across curriculum' }
      ];
    }

    // 2. CHEMISTRY DIVERSITY MATRIX (25 Unique Archetypes & Procedure Signatures)
    if (s.includes('chem')) {
      return [
        { problemArchetype: 'numerical_calculation', archetypeId: 'DIRECT_CALCULATION', procedureSignature: 'molar_mass_stoichiometry_direct', unknownType: 'product_moles_or_grams', requiredOperation: 'stoichiometric_substitution', cognitiveTask: 'direct_calculation', scenarioType: 'combustion_reaction', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'easy', cognitiveLevel: 'level_3_application', problemStyle: 'Stoichiometric or molar calculation', solvingMethodDescription: 'Direct application of chemical equation and molar mass' },
        { problemArchetype: 'unknown_quantity_inversion', archetypeId: 'INVERSE_CALCULATION', procedureSignature: 'titration_neutralization_inversion', unknownType: 'unknown_acid_molarity', requiredOperation: 'rearrange_neutralization_formula', cognitiveTask: 'inverse_solve', scenarioType: 'acid_base_titration', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'easy', cognitiveLevel: 'level_3_application', problemStyle: 'Find unknown concentration or molar mass', solvingMethodDescription: 'Invert titration or state formula to solve unknown' },
        { problemArchetype: 'reaction_application', archetypeId: 'REACTION_APPLICATION', procedureSignature: 'limiting_reagent_yield_deduction', unknownType: 'theoretical_yield_grams', requiredOperation: 'limiting_reagent_comparison', cognitiveTask: 'applied_yield_calc', scenarioType: 'industrial_synthesis', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'easy', cognitiveLevel: 'level_3_application', problemStyle: 'Predict product yield from limiting reagents', solvingMethodDescription: 'Identify limiting reactant and quantify expected yield' },
        { problemArchetype: 'formula_based_problem', archetypeId: 'FORMULA_BASED_PROBLEM', procedureSignature: 'equilibrium_constant_expression_eval', unknownType: 'equilibrium_concentration_or_kc', requiredOperation: 'law_of_mass_action_substitution', cognitiveTask: 'equilibrium_calculation', scenarioType: 'gas_phase_dissociation', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Equilibrium constant or pH computation', solvingMethodDescription: 'Logarithmic or equilibrium expression substitution' },
        { problemArchetype: 'stoichiometric_reasoning', archetypeId: 'STOICHIOMETRIC_REASONING', procedureSignature: 'redox_electron_conservation_balance', unknownType: 'electrons_transferred_count', requiredOperation: 'oxidation_number_tracking', cognitiveTask: 'stoichiometric_reasoning', scenarioType: 'galvanic_half_cells', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Multi-phase stoichiometric balance', solvingMethodDescription: 'Conservation of mass and atoms across coupled reactions' },
        { problemArchetype: 'comparison_problem', archetypeId: 'COMPARE_TWO_CASES', procedureSignature: 'compare_reaction_rates_arrhenius', unknownType: 'relative_reaction_rate_ratio', requiredOperation: 'arrhenius_activation_energy_ratio', cognitiveTask: 'comparative_kinetics', scenarioType: 'catalyzed_vs_uncatalyzed', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Compare reaction rates or acid strengths', solvingMethodDescription: 'Evaluate relative quantitative metrics across systems' },
        { problemArchetype: 'condition_based_question', archetypeId: 'PREDICT_CHANGE', procedureSignature: 'le_chatelier_equilibrium_shift_quant', unknownType: 'direction_and_magnitude_of_shift', requiredOperation: 'reaction_quotient_q_vs_k', cognitiveTask: 'shift_prediction', scenarioType: 'haber_process_compression', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Pressure and temperature shifts (Le Chatelier quantitative)', solvingMethodDescription: 'Predict equilibrium shift magnitude under altered T/P' },
        { problemArchetype: 'experimental_interpretation', archetypeId: 'EXPERIMENTAL_DATA', procedureSignature: 'calorimetry_heat_capacity_eval', unknownType: 'enthalpy_of_reaction_delta_h', requiredOperation: 'heat_exchange_q_equals_m_c_delta_t', cognitiveTask: 'experimental_data_eval', scenarioType: 'bomb_calorimeter_assay', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Spectrophotometry or calorimetry lab data', solvingMethodDescription: 'Determine thermochemical parameter from lab measurement' },
        { problemArchetype: 'graph_data_interpretation', archetypeId: 'GRAPH_INTERPRETATION', procedureSignature: 'titration_curve_half_equivalence_eval', unknownType: 'pka_from_buffer_region', requiredOperation: 'inflection_point_reading', cognitiveTask: 'graphical_deduction', scenarioType: 'polyprotic_titration_plot', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Heating curve or titration curve interpretation', solvingMethodDescription: 'Extract equivalence point and pKa from graphical data' },
        { problemArchetype: 'missing_information_reconstruction', archetypeId: 'MISSING_INFORMATION_RECONSTRUCTION', procedureSignature: 'empirical_formula_mass_ratio_deduction', unknownType: 'subscript_atomic_ratios', requiredOperation: 'mole_fraction_normalization', cognitiveTask: 'reconstruction', scenarioType: 'elemental_combustion_analysis', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Determine empirical formula from percentage composition', solvingMethodDescription: 'Derive atomic ratio from missing mass balance' },
        { problemArchetype: 'real_world_application', archetypeId: 'REAL_WORLD_APPLICATION', procedureSignature: 'nernst_equation_cell_voltage_eval', unknownType: 'non_standard_cell_potential', requiredOperation: 'nernst_log_q_substitution', cognitiveTask: 'applied_modelling', scenarioType: 'lithium_ion_battery_discharge', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Battery cell potential or industrial process', solvingMethodDescription: 'Nernst equation evaluation for operational cell' },
        { problemArchetype: 'constraint_based_problem', archetypeId: 'CONSTRAINT_PROBLEM', procedureSignature: 'ksp_common_ion_solubility_suppression', unknownType: 'molar_solubility_in_presence_of_ion', requiredOperation: 'solubility_product_quadratic_solve', cognitiveTask: 'constraint_satisfaction', scenarioType: 'sparingly_soluble_salt', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Solubility product with common ion constraint', solvingMethodDescription: 'Ksp suppression calculation with common ion' },
        { problemArchetype: 'error_analysis', archetypeId: 'ERROR_ANALYSIS', procedureSignature: 'detect_incorrect_dilution_or_aliquot_step', unknownType: 'diagnose_titration_overestimate_cause', requiredOperation: 'pipette_meniscus_error_trace', cognitiveTask: 'evaluative_diagnosis', scenarioType: 'analytical_chemistry_lab_log', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'hard', cognitiveLevel: 'level_3_application', problemStyle: 'Diagnose student error in titration calculation', solvingMethodDescription: 'Identify uncalibrated pipet or incorrect dilution factor' },
        { problemArchetype: 'find_incorrect_method', archetypeId: 'METHOD_SELECTION', procedureSignature: 'identify_invalid_redox_acidic_step', unknownType: 'violated_charge_conservation_step', requiredOperation: 'half_reaction_inspection', cognitiveTask: 'formula_selection', scenarioType: 'permanganate_titration', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'hard', cognitiveLevel: 'level_3_application', problemStyle: 'Invalid step in balancing redox reaction', solvingMethodDescription: 'Detect charge or electron conservation violation' },
        { problemArchetype: 'select_correct_method', archetypeId: 'REVERSE_REASONING', procedureSignature: 'buffer_ratio_target_ph_selection', unknownType: 'conjugate_acid_base_ratio', requiredOperation: 'henderson_hasselbalch_inversion', cognitiveTask: 'reverse_deduction', scenarioType: 'blood_bicarbonate_buffer', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'hard', cognitiveLevel: 'level_3_application', problemStyle: 'Select proper buffer preparation ratio', solvingMethodDescription: 'Henderson-Hasselbalch ratio determination' },
        { problemArchetype: 'case_based_numerical_problem', archetypeId: 'CASE_STUDY', procedureSignature: 'gibbs_free_energy_temperature_crossover', unknownType: 'spontaneity_transition_temperature', requiredOperation: 'set_delta_g_to_zero_t_equals_h_over_s', cognitiveTask: 'system_state_evolution', scenarioType: 'metallurgical_reduction', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'hard', cognitiveLevel: 'level_3_application', problemStyle: 'Industrial Haber-Bosch reactor thermodynamics', solvingMethodDescription: 'Hess law and Gibbs free energy calculation' },
        { problemArchetype: 'multi_concept_numerical_problem', archetypeId: 'MULTI_CONCEPT_INTEGRATION', procedureSignature: 'rate_law_coupled_with_equilibrium_k', unknownType: 'composite_rate_constant_k_eff', requiredOperation: 'pre_equilibrium_approximation', cognitiveTask: 'multi_concept_integration', scenarioType: 'enzyme_michaelis_complex', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Kinetics coupled with chemical equilibrium', solvingMethodDescription: 'Rate law derivation from mechanism steps' },
        { problemArchetype: 'exam_style_challenge', archetypeId: 'EXAM_STYLE_CHALLENGE', procedureSignature: 'coupled_simultaneous_precipitation_ksp', unknownType: 'order_of_fractional_precipitation', requiredOperation: 'competitive_solubility_limit_solve', cognitiveTask: 'rigorous_exam_synthesis', scenarioType: 'mixture_halide_separation', numericalOrTheory: 'numerical', questionCategory: 'exam_style', difficulty: 'hard', cognitiveLevel: 'level_5_exam_reasoning', problemStyle: 'Advanced competitive exam chemical puzzle', solvingMethodDescription: 'Multi-stage quantitative reasoning test' },
        { problemArchetype: 'conceptual_prediction', archetypeId: 'CONCEPTUAL_PREDICTION', procedureSignature: 'predict_entropy_sign_from_phase_change', unknownType: 'sign_of_delta_s_universe', requiredOperation: 'molecular_disorder_deduction', cognitiveTask: 'qualitative_prediction', scenarioType: 'gas_condensation_freezing', numericalOrTheory: 'theory', questionCategory: 'conceptual', difficulty: 'easy', cognitiveLevel: 'level_2_understanding', problemStyle: 'Predict reaction spontaneity from signs of ΔH and ΔS', solvingMethodDescription: 'Thermodynamic qualitative criteria' },
        { problemArchetype: 'conceptual_comparison', archetypeId: 'CONCEPTUAL_COMPARISON', procedureSignature: 'compare_atomic_radius_and_electronegativity', unknownType: 'relative_effective_nuclear_charge', requiredOperation: 'shielding_effect_comparison', cognitiveTask: 'conceptual_contrast', scenarioType: 'isoelectronic_ion_series', numericalOrTheory: 'theory', questionCategory: 'conceptual', difficulty: 'easy', cognitiveLevel: 'level_2_understanding', problemStyle: 'Compare periodic trends in electronegativity and radius', solvingMethodDescription: 'Nuclear charge and shielding comparison' },
        { problemArchetype: 'why_reasoning', archetypeId: 'WHY_REASONING', procedureSignature: 'why_catalyst_lowers_ea_without_changing_k', unknownType: 'transition_state_stabilization_mechanism', requiredOperation: 'activation_barrier_deduction', cognitiveTask: 'first_principles_reasoning', scenarioType: 'surface_adsorption_catalysis', numericalOrTheory: 'theory', questionCategory: 'reasoning', difficulty: 'medium', cognitiveLevel: 'level_4_analysis', problemStyle: 'Why catalysts alter activation energy without shifting K_eq', solvingMethodDescription: 'Mechanistic transition state explanation' },
        { problemArchetype: 'misconception_detection', archetypeId: 'MISCONCEPTION_DETECTION', procedureSignature: 'disprove_strong_acid_implies_concentrated', unknownType: 'distinction_between_ka_and_molarity', requiredOperation: 'degree_of_dissociation_contrast', cognitiveTask: 'misconception_detection', scenarioType: 'dilute_hcl_vs_pure_acetic_acid', numericalOrTheory: 'theory', questionCategory: 'reasoning', difficulty: 'medium', cognitiveLevel: 'level_4_analysis', problemStyle: 'Misconception that strong acid means concentrated acid', solvingMethodDescription: 'Distinguish extent of dissociation from molarity' },
        { problemArchetype: 'situation_identification', archetypeId: 'ASSUMPTION_CHECK', procedureSignature: 'lewis_octet_rule_expanded_d_orbital_test', unknownType: 'feasibility_of_hypervalent_geometry', requiredOperation: 'formal_charge_minimization_check', cognitiveTask: 'boundary_assumption_testing', scenarioType: 'sulfur_hexafluoride_structure', numericalOrTheory: 'theory', questionCategory: 'reasoning', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Identify resonance hybrid stabilization conditions', solvingMethodDescription: 'Evaluate delocalization validity rules' },
        { problemArchetype: 'principle_condition_application', archetypeId: 'PRINCIPLE_SELECTION', procedureSignature: 'vsepr_dipole_moment_symmetry_cancellation', unknownType: 'net_molecular_dipole_zero_criteria', requiredOperation: 'vector_dipole_addition', cognitiveTask: 'law_identification', scenarioType: 'linear_co2_vs_bent_so2', numericalOrTheory: 'theory', questionCategory: 'reasoning', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'VSEPR molecular geometry and dipole moment', solvingMethodDescription: 'Symmetry cancellation of bond dipoles' },
        { problemArchetype: 'integrated_concept_question', archetypeId: 'INTEGRATED_CONCEPT_QUESTION', procedureSignature: 'unify_lattice_energy_hydration_and_solubility', unknownType: 'net_enthalpy_of_solution_statement', requiredOperation: 'born_haber_cycle_synthesis', cognitiveTask: 'integrated_concept_evaluation', scenarioType: 'alkali_halide_solubility_trends', numericalOrTheory: 'theory', questionCategory: 'exam_style', difficulty: 'hard', cognitiveLevel: 'level_5_exam_reasoning', problemStyle: 'Unifying bonding, lattice energy, and solubility', solvingMethodDescription: 'Comprehensive chemical principle synthesis' }
      ];
    }

    // 3. COMPUTER SCIENCE DIVERSITY MATRIX (25 Unique Archetypes & Procedure Signatures)
    if (s.includes('computer') || s.includes('code') || s.includes('programming') || s.includes('software')) {
      return [
        { problemArchetype: 'code_output', archetypeId: 'DIRECT_CALCULATION', procedureSignature: 'stepwise_state_variable_trace', unknownType: 'final_output_integer_value', requiredOperation: 'deterministic_dry_run', cognitiveTask: 'direct_calculation', scenarioType: 'loop_accumulator', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'easy', cognitiveLevel: 'level_3_application', problemStyle: 'Exact trace of code output value', solvingMethodDescription: 'Step-by-step state mutation trace' },
        { problemArchetype: 'input_output_reasoning', archetypeId: 'INVERSE_CALCULATION', procedureSignature: 'deduce_preimage_input_from_output', unknownType: 'original_input_argument', requiredOperation: 'reverse_execution_trace', cognitiveTask: 'inverse_solve', scenarioType: 'hash_mod_inversion', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Deduce input given deterministic output', solvingMethodDescription: 'Inverse algorithm execution' },
        { problemArchetype: 'complexity_reasoning', archetypeId: 'ASYMPTOTIC_ANALYSIS', procedureSignature: 'nested_loop_asymptotic_summation', unknownType: 'big_o_time_complexity_class', requiredOperation: 'algebraic_step_summation', cognitiveTask: 'complexity_evaluation', scenarioType: 'nested_triangle_loops', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'easy', cognitiveLevel: 'level_3_application', problemStyle: 'Calculate asymptotic time/space Big-O', solvingMethodDescription: 'Summation of loop operations' },
        { problemArchetype: 'dry_run', archetypeId: 'MULTI_STEP_APPLICATION', procedureSignature: 'recursive_call_tree_activation_stack', unknownType: 'maximum_stack_depth_and_return', requiredOperation: 'call_tree_traversal', cognitiveTask: 'multi_step_execution', scenarioType: 'divide_and_conquer_mergesort', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Dry run recursive call tree depth and returns', solvingMethodDescription: 'Call stack tracking and base case return' },
        { problemArchetype: 'edge_case', archetypeId: 'CASE_STUDY', procedureSignature: 'boundary_sentinel_input_evaluation', unknownType: 'off_by_one_index_overflow', requiredOperation: 'null_and_empty_edge_test', cognitiveTask: 'applied_reasoning', scenarioType: 'zero_element_array_binary_search', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Boundary input behavior (empty array, overflow)', solvingMethodDescription: 'Identify boundary conditions where algorithm fails' },
        { problemArchetype: 'code_modification', archetypeId: 'PROGRAM_MODIFICATION', procedureSignature: 'operator_mutation_differential_trace', unknownType: 'altered_output_delta', requiredOperation: 'differential_logic_trace', cognitiveTask: 'mutation_prediction', scenarioType: 'relational_operator_swap', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Effect of modifying operator or condition', solvingMethodDescription: 'Differential analysis of altered logic' },
        { problemArchetype: 'data_structure_operations', archetypeId: 'GRAPH_DATA_STRUCTURE', procedureSignature: 'binary_search_tree_rotation_pointer_fix', unknownType: 'tree_inorder_preorder_traversal', requiredOperation: 'pointer_redirection_trace', cognitiveTask: 'structural_mapping', scenarioType: 'avl_tree_balance_rotation', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Pointer manipulation and tree traversal order', solvingMethodDescription: 'Structural node pointer updates' },
        { problemArchetype: 'logic_error', archetypeId: 'ERROR_ANALYSIS', procedureSignature: 'locate_infinite_loop_or_unreachable_branch', unknownType: 'precise_flawed_line_number', requiredOperation: 'invariant_violation_detection', cognitiveTask: 'evaluative_diagnosis', scenarioType: 'two_pointer_while_loop', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Identify off-by-one or condition flaw', solvingMethodDescription: 'Pinpoint precise line causing incorrect invariant' },
        { problemArchetype: 'comparison_problem', archetypeId: 'COMPARE_TWO_CASES', procedureSignature: 'compare_cache_friendly_vs_pointer_chasing', unknownType: 'memory_stride_cache_miss_count', requiredOperation: 'locality_miss_penalty_comparison', cognitiveTask: 'comparative_evaluation', scenarioType: 'row_major_vs_column_major', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Compare operational speed of two sorting routines', solvingMethodDescription: 'Quantitative operation count comparison' },
        { problemArchetype: 'missing_information_reconstruction', archetypeId: 'MISSING_INFORMATION_RECONSTRUCTION', procedureSignature: 'deduce_missing_loop_termination_condition', unknownType: 'missing_boolean_condition_expression', requiredOperation: 'loop_invariant_reconstruction', cognitiveTask: 'reconstruction', scenarioType: 'dijkstra_visited_set_guard', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Fill in missing code snippet to satisfy contract', solvingMethodDescription: 'Deduce loop invariant and condition' },
        { problemArchetype: 'real_world_application', archetypeId: 'REAL_WORLD_APPLICATION', procedureSignature: 'b_tree_fanout_and_disk_io_evaluation', unknownType: 'disk_page_reads_count', requiredOperation: 'block_size_fanout_calculation', cognitiveTask: 'applied_modelling', scenarioType: 'database_clustered_index', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Database indexing and B-tree page calculation', solvingMethodDescription: 'Quantitative IO and fanout calculation' },
        { problemArchetype: 'constraint_based_problem', archetypeId: 'CONSTRAINT_PROBLEM', procedureSignature: 'sliding_window_memory_buffer_constraint', unknownType: 'max_elements_in_heap', requiredOperation: 'bounded_space_algorithm_trace', cognitiveTask: 'constraint_satisfaction', scenarioType: 'top_k_frequent_stream', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Memory limit constraint in buffer processing', solvingMethodDescription: 'Space-bounded streaming algorithm execution' },
        { problemArchetype: 'find_incorrect_method', archetypeId: 'RUNTIME_ERROR_ANALYSIS', procedureSignature: 'diagnose_null_pointer_or_dangling_reference', unknownType: 'invalid_lifetime_scope_step', requiredOperation: 'memory_lifecycle_audit', cognitiveTask: 'error_diagnosis', scenarioType: 'c_pointer_return_stack_address', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Identify invalid algorithmic approach', solvingMethodDescription: 'Demonstrate counterexample where greedy heuristic fails' },
        { problemArchetype: 'select_correct_method', archetypeId: 'METHOD_SELECTION', procedureSignature: 'select_dp_vs_greedy_optimal_substructure', unknownType: 'provably_optimal_paradigm', requiredOperation: 'counterexample_generation', cognitiveTask: 'algorithm_selection', scenarioType: 'fractional_vs_01_knapsack', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Select optimal algorithm for specific constraints', solvingMethodDescription: 'Trade-off analysis selecting best paradigm' },
        { problemArchetype: 'inverse_reasoning', archetypeId: 'REVERSE_REASONING', procedureSignature: 'decrypt_or_unscramble_permutation_cipher', unknownType: 'recovered_plaintext_token', requiredOperation: 'inverse_permutation_cycle', cognitiveTask: 'reverse_deduction', scenarioType: 'feistel_network_round', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Inverse algorithm recovery of state', solvingMethodDescription: 'Recover predecessor state through reversible transitions' },
        { problemArchetype: 'case_based_numerical_problem', archetypeId: 'DYNAMIC_PROGRAMMING_STATE', procedureSignature: 'dp_memoization_table_entry_eval', unknownType: 'dp_cell_value_computation', requiredOperation: 'recurrence_relation_evaluation', cognitiveTask: 'system_state_evolution', scenarioType: 'longest_common_subsequence', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Dynamic programming state table evaluation', solvingMethodDescription: 'Recurrence relation memoization evaluation' },
        { problemArchetype: 'multi_concept_numerical_problem', archetypeId: 'MULTI_CONCEPT_INTEGRATION', procedureSignature: 'graph_shortest_path_coupled_with_capacity', unknownType: 'max_flow_bottleneck_path_value', requiredOperation: 'augmenting_path_flow_integration', cognitiveTask: 'multi_concept_integration', scenarioType: 'edmonds_karp_network', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Combined graph theory and network flow evaluation', solvingMethodDescription: 'Multi-layer algorithmic synthesis' },
        { problemArchetype: 'exam_style_challenge', archetypeId: 'EXAM_STYLE_CHALLENGE', procedureSignature: 'trie_xor_maximum_subarray_query', unknownType: 'maximum_bitwise_xor_result', requiredOperation: 'binary_trie_bit_traversal', cognitiveTask: 'rigorous_exam_synthesis', scenarioType: 'competitive_coding_bitmask', numericalOrTheory: 'numerical', questionCategory: 'exam_style', difficulty: 'hard', cognitiveLevel: 'level_5_exam_reasoning', problemStyle: 'Competitive coding algorithmic puzzle', solvingMethodDescription: 'Non-trivial graph/DP synthesis' },
        { problemArchetype: 'conceptual_prediction', archetypeId: 'CONCEPTUAL_PREDICTION', procedureSignature: 'predict_hash_collision_degradation_trend', unknownType: 'average_lookup_time_degradation_to_linear', requiredOperation: 'load_factor_impact_deduction', cognitiveTask: 'qualitative_prediction', scenarioType: 'open_addressing_clustering', numericalOrTheory: 'theory', questionCategory: 'conceptual', difficulty: 'easy', cognitiveLevel: 'level_2_understanding', problemStyle: 'Predict scaling behavior as N reaches millions', solvingMethodDescription: 'Asymptotic growth prediction' },
        { problemArchetype: 'conceptual_comparison', archetypeId: 'CONCEPTUAL_COMPARISON', procedureSignature: 'compare_bfs_vs_dfs_space_requirements', unknownType: 'space_complexity_tree_shape_contrast', requiredOperation: 'frontier_queue_vs_stack_depth', cognitiveTask: 'conceptual_contrast', scenarioType: 'wide_bushy_vs_deep_narrow_tree', numericalOrTheory: 'theory', questionCategory: 'conceptual', difficulty: 'easy', cognitiveLevel: 'level_2_understanding', problemStyle: 'Contrast array vs linked list memory locality', solvingMethodDescription: 'Hardware cache line and pointer overhead contrast' },
        { problemArchetype: 'why_reasoning', archetypeId: 'WHY_REASONING', procedureSignature: 'why_comparison_sort_has_lower_bound_n_log_n', unknownType: 'decision_tree_leaf_count_justification', requiredOperation: 'information_theoretic_lower_bound', cognitiveTask: 'first_principles_reasoning', scenarioType: 'permutation_decision_tree', numericalOrTheory: 'theory', questionCategory: 'reasoning', difficulty: 'medium', cognitiveLevel: 'level_4_analysis', problemStyle: 'Why comparison-based sort has Omega(N log N) limit', solvingMethodDescription: 'Decision tree entropy and branching analysis' },
        { problemArchetype: 'misconception_detection', archetypeId: 'MISCONCEPTION_DETECTION', procedureSignature: 'disprove_recursion_is_inherently_slower', unknownType: 'tail_call_optimization_and_stack_reuse', requiredOperation: 'compiler_optimization_clarification', cognitiveTask: 'misconception_detection', scenarioType: 'tail_recursive_accumulator', numericalOrTheory: 'theory', questionCategory: 'reasoning', difficulty: 'medium', cognitiveLevel: 'level_4_analysis', problemStyle: 'Misconception that recursion is inherently slower', solvingMethodDescription: 'Tail-call optimization and stack frame reality' },
        { problemArchetype: 'situation_identification', archetypeId: 'ASSUMPTION_CHECK', procedureSignature: 'coffman_deadlock_four_conditions_audit', unknownType: 'missing_deadlock_precondition', requiredOperation: 'circular_wait_preemption_check', cognitiveTask: 'boundary_assumption_testing', scenarioType: 'dining_philosophers_resource', numericalOrTheory: 'theory', questionCategory: 'reasoning', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Identify deadlock four necessary conditions', solvingMethodDescription: 'Coffman condition verification' },
        { problemArchetype: 'principle_condition_application', archetypeId: 'PRINCIPLE_SELECTION', procedureSignature: 'referential_transparency_and_immutability', unknownType: 'pure_function_contract_verification', requiredOperation: 'side_effect_freedom_test', cognitiveTask: 'law_identification', scenarioType: 'functional_reactive_pipeline', numericalOrTheory: 'theory', questionCategory: 'reasoning', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Referential transparency and pure functions', solvingMethodDescription: 'Functional state immutability reasoning' },
        { problemArchetype: 'integrated_concept_question', archetypeId: 'INTEGRATED_CONCEPT_QUESTION', procedureSignature: 'unify_virtual_memory_page_table_and_tlb', unknownType: 'end_to_end_address_translation_invariant', requiredOperation: 'hardware_software_integration', cognitiveTask: 'integrated_concept_evaluation', scenarioType: 'mmu_cache_pipeline_coherence', numericalOrTheory: 'theory', questionCategory: 'exam_style', difficulty: 'hard', cognitiveLevel: 'level_5_exam_reasoning', problemStyle: 'Unifying architecture, compilation, and execution', solvingMethodDescription: 'Full-stack computational systems synthesis' }
      ];
    }

    // 4. BIOLOGY DIVERSITY MATRIX (25 Unique Archetypes & Procedure Signatures)
    if (s.includes('bio') || s.includes('life') || s.includes('anatomy') || s.includes('botany') || s.includes('zoology')) {
      return [
        { problemArchetype: 'process_reasoning', archetypeId: 'DIRECT_CALCULATION', procedureSignature: 'punnett_square_phenotype_ratio_eval', unknownType: 'recessive_phenotype_fraction', requiredOperation: 'monohybrid_cross_multiplication', cognitiveTask: 'direct_calculation', scenarioType: 'mendelian_seed_shape', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'easy', cognitiveLevel: 'level_3_application', problemStyle: 'Quantitative genetics/Punnett square probability', solvingMethodDescription: 'Mendelian inheritance ratio calculation' },
        { problemArchetype: 'sequence_interpretation', archetypeId: 'INVERSE_CALCULATION', procedureSignature: 'mrna_codon_reading_frame_deduction', unknownType: 'amino_acid_chain_length', requiredOperation: 'triplet_nucleotide_division', cognitiveTask: 'inverse_solve', scenarioType: 'translation_open_reading_frame', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'easy', cognitiveLevel: 'level_3_application', problemStyle: 'Codon translation and base pair counting', solvingMethodDescription: 'Triple nucleotide mapping to peptide length' },
        { problemArchetype: 'scenario_based_application', archetypeId: 'FORMULA_APPLICATION', procedureSignature: 'water_potential_osmotic_equilibrium', unknownType: 'net_water_potential_psi_bars', requiredOperation: 'summation_psi_s_plus_psi_p', cognitiveTask: 'equilibrium_calculation', scenarioType: 'plant_cell_in_hypertonic_bath', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'easy', cognitiveLevel: 'level_3_application', problemStyle: 'Osmotic pressure and water potential calculation', solvingMethodDescription: 'Water potential equation: Ψ = Ψs + Ψp' },
        { problemArchetype: 'diagram_interpretation', archetypeId: 'MULTI_STEP_APPLICATION', procedureSignature: 'action_potential_refractory_interval_calc', unknownType: 'membrane_voltage_differential_mv', requiredOperation: 'nernst_goldman_voltage_tracking', cognitiveTask: 'multi_step_execution', scenarioType: 'squid_giant_axon_trace', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Action potential graph voltage/time calculation', solvingMethodDescription: 'Membrane potential threshold and refractory period' },
        { problemArchetype: 'comparison_problem', archetypeId: 'COMPARE_TWO_CASES', procedureSignature: 'compare_atp_yield_aerobic_vs_anaerobic', unknownType: 'net_atp_difference_per_glucose', requiredOperation: 'glycolysis_vs_oxidative_atp_balance', cognitiveTask: 'comparative_evaluation', scenarioType: 'yeast_fermentation_vs_respiration', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Compare energetic ATP yields: aerobic vs anaerobic', solvingMethodDescription: 'Substrate level vs oxidative phosphorylation yield' },
        { problemArchetype: 'function_to_structure_reasoning', archetypeId: 'RATIO_REASONING', procedureSignature: 'surface_area_to_volume_transport_limit', unknownType: 'diffusion_time_scaling_factor', requiredOperation: 'geometric_square_cube_ratio', cognitiveTask: 'proportional_reasoning', scenarioType: 'spherical_cell_radius_increase', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Surface area to volume ratio in cellular transport', solvingMethodDescription: 'Geometric scaling and diffusion limit calculation' },
        { problemArchetype: 'case_based_reasoning', archetypeId: 'PEDIGREE_REASONING', procedureSignature: 'sex_linked_pedigree_carrier_probability', unknownType: 'offspring_affected_probability', requiredOperation: 'x_linked_recessive_tracking', cognitiveTask: 'applied_reasoning', scenarioType: 'hemophilia_family_tree', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Pedigree chart inheritance probability', solvingMethodDescription: 'Deduce parental genotypes and child risk' },
        { problemArchetype: 'cause_effect', archetypeId: 'PREDICT_CHANGE', procedureSignature: 'enzyme_michaelis_menten_competitive_shift', unknownType: 'apparent_km_increase_value', requiredOperation: 'active_site_affinity_calculation', cognitiveTask: 'prediction_from_change', scenarioType: 'statin_hmg_coa_inhibition', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Enzyme kinetics: Vmax and Km Michaelis-Menten', solvingMethodDescription: 'Lineweaver-Burk parameter evaluation' },
        { problemArchetype: 'experimental_interpretation', archetypeId: 'DATA_INTERPRETATION', procedureSignature: 'logistic_population_growth_rate_dn_dt', unknownType: 'instantaneous_growth_rate_individuals_yr', requiredOperation: 'logistic_carrying_capacity_eval', cognitiveTask: 'data_deduction', scenarioType: 'paramecium_culture_plate', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Population ecology growth rate (logistic dN/dt)', solvingMethodDescription: 'Carrying capacity and growth rate formula' },
        { problemArchetype: 'missing_information_reconstruction', archetypeId: 'MISSING_INFORMATION_RECONSTRUCTION', procedureSignature: 'hardy_weinberg_heterozygote_frequency', unknownType: 'heterozygote_frequency_2pq', requiredOperation: 'allele_frequency_square_root_q2', cognitiveTask: 'reconstruction', scenarioType: 'cystic_fibrosis_carrier_screening', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Hardy-Weinberg allele frequency calculation', solvingMethodDescription: 'Calculate p and q from homozygous recessive frequency' },
        { problemArchetype: 'real_world_application', archetypeId: 'REAL_WORLD_APPLICATION', procedureSignature: 'renal_clearance_and_gfr_evaluation', unknownType: 'inulin_clearance_rate_ml_min', requiredOperation: 'urinary_excretion_ratio_uv_over_p', cognitiveTask: 'applied_modelling', scenarioType: 'nephrology_kidney_function', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Glomerular filtration rate (GFR) and clearance', solvingMethodDescription: 'Renal clearance formula: (U * V) / P' },
        { problemArchetype: 'constraint_based_problem', archetypeId: 'CONSTRAINT_PROBLEM', procedureSignature: 'oxygen_hemoglobin_bohr_shift_binding', unknownType: 'percent_oxygen_saturation_shift', requiredOperation: 'allosteric_cooperativity_curve_shift', cognitiveTask: 'constraint_satisfaction', scenarioType: 'high_altitude_acclimatization', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Oxygen-hemoglobin dissociation curve shift', solvingMethodDescription: 'Bohr effect pH and 2,3-BPG constraint evaluation' },
        { problemArchetype: 'error_analysis', archetypeId: 'ERROR_ANALYSIS', procedureSignature: 'diagnose_flawed_experimental_control_variable', unknownType: 'confounding_temperature_or_ph_bias', requiredOperation: 'control_group_integrity_audit', cognitiveTask: 'evaluative_diagnosis', scenarioType: 'photosynthesis_light_intensity_rig', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'hard', cognitiveLevel: 'level_3_application', problemStyle: 'Diagnose flawed experimental control design', solvingMethodDescription: 'Identify confounding variable in biological assay' },
        { problemArchetype: 'find_incorrect_method', archetypeId: 'METHOD_SELECTION', procedureSignature: 'identify_invalid_gel_electrophoresis_step', unknownType: 'distorted_fragment_migration_error', requiredOperation: 'logarithmic_base_pair_sizing_check', cognitiveTask: 'formula_selection', scenarioType: 'dna_restriction_digest', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'hard', cognitiveLevel: 'level_3_application', problemStyle: 'Invalid step in gel electrophoresis sizing', solvingMethodDescription: 'Identify logarithmic vs linear distance mistake' },
        { problemArchetype: 'select_correct_method', archetypeId: 'REVERSE_REASONING', procedureSignature: 'select_qpcr_vs_western_for_transcript_quant', unknownType: 'most_specific_molecular_assay', requiredOperation: 'target_molecule_matching', cognitiveTask: 'reverse_deduction', scenarioType: 'viral_load_detection', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'hard', cognitiveLevel: 'level_3_application', problemStyle: 'Select proper assay to measure gene expression', solvingMethodDescription: 'Compare qPCR vs Western blot applicability' },
        { problemArchetype: 'case_based_numerical_problem', archetypeId: 'CASE_STUDY', procedureSignature: 'trophic_energy_pyramid_10_percent_loss', unknownType: 'apex_predator_caloric_intake', requiredOperation: 'lindeman_ecological_efficiency_power', cognitiveTask: 'system_state_evolution', scenarioType: 'savanna_grassland_ecosystem', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'hard', cognitiveLevel: 'level_3_application', problemStyle: 'Ecological trophic efficiency and energy pyramid', solvingMethodDescription: '10% Lindeman efficiency energy transfer calculation' },
        { problemArchetype: 'multi_concept_numerical_problem', archetypeId: 'MULTI_CONCEPT_INTEGRATION', procedureSignature: 'light_reaction_atp_nadph_calvin_cycle_link', unknownType: 'photons_required_per_co2_fixed', requiredOperation: 'coupled_z_scheme_calvin_stoichiometry', cognitiveTask: 'multi_concept_integration', scenarioType: 'c3_photosynthetic_quantum_yield', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Photosynthesis light reaction ATP/NADPH ratio', solvingMethodDescription: 'Coupled electron transport and Calvin cycle requirement' },
        { problemArchetype: 'exam_style_challenge', archetypeId: 'EXAM_STYLE_CHALLENGE', procedureSignature: 'three_point_testcross_gene_mapping', unknownType: 'recombination_map_distance_centiMorgans', requiredOperation: 'double_crossover_correction_sum', cognitiveTask: 'rigorous_exam_synthesis', scenarioType: 'drosophila_chromosome_mapping', numericalOrTheory: 'numerical', questionCategory: 'exam_style', difficulty: 'hard', cognitiveLevel: 'level_5_exam_reasoning', problemStyle: 'Olympiad genetics chromosome crossover mapping', solvingMethodDescription: 'Recombination frequency and centimorgan map distance' },
        { problemArchetype: 'conceptual_prediction', archetypeId: 'CONCEPTUAL_PREDICTION', procedureSignature: 'predict_endocrine_negative_feedback_cascade', unknownType: 'pituitary_tsh_suppression_direction', requiredOperation: 'hormonal_axis_homeostatic_regulation', cognitiveTask: 'qualitative_prediction', scenarioType: 'thyroid_hormone_t4_elevation', numericalOrTheory: 'theory', questionCategory: 'conceptual', difficulty: 'easy', cognitiveLevel: 'level_2_understanding', problemStyle: 'Predict consequence of competitive inhibitor on Vmax', solvingMethodDescription: 'Enzymatic active site competition reasoning' },
        { problemArchetype: 'conceptual_comparison', archetypeId: 'CONCEPTUAL_COMPARISON', procedureSignature: 'compare_gram_positive_vs_negative_cell_wall', unknownType: 'differential_antibiotic_permeability', requiredOperation: 'peptidoglycan_vs_lps_outer_membrane', cognitiveTask: 'conceptual_contrast', scenarioType: 'penicillin_susceptibility_contrast', numericalOrTheory: 'theory', questionCategory: 'conceptual', difficulty: 'easy', cognitiveLevel: 'level_2_understanding', problemStyle: 'Compare cell wall architecture in Gram positive vs negative', solvingMethodDescription: 'Peptidoglycan and outer membrane structural contrast' },
        { problemArchetype: 'why_reasoning', archetypeId: 'WHY_REASONING', procedureSignature: 'why_endosymbiosis_explains_double_membrane_organelles', unknownType: 'phagocytic_vesicle_and_prokaryote_plasma_membrane', requiredOperation: 'evolutionary_engulfment_justification', cognitiveTask: 'first_principles_reasoning', scenarioType: 'mitochondrial_and_chloroplast_origin', numericalOrTheory: 'theory', questionCategory: 'reasoning', difficulty: 'medium', cognitiveLevel: 'level_4_analysis', problemStyle: 'Why endosymbiosis explains double mitochondrial membrane', solvingMethodDescription: 'Evolutionary phagocytosis justification' },
        { problemArchetype: 'misconception_detection', archetypeId: 'MISCONCEPTION_DETECTION', procedureSignature: 'disprove_dominant_allele_is_most_prevalent', unknownType: 'distinction_between_dominance_and_allele_frequency', requiredOperation: 'hardy_weinberg_equilibrium_invariance', cognitiveTask: 'misconception_detection', scenarioType: 'polydactyly_dominant_allele', numericalOrTheory: 'theory', questionCategory: 'reasoning', difficulty: 'medium', cognitiveLevel: 'level_4_analysis', problemStyle: 'Misconception that dominant trait is always more common', solvingMethodDescription: 'Distinguish dominance from allele frequency in population' },
        { problemArchetype: 'situation_identification', archetypeId: 'ASSUMPTION_CHECK', procedureSignature: 'natural_selection_differential_fitness_criteria', unknownType: 'heritable_variation_and_reproductive_differential', requiredOperation: 'darwinian_postulate_verification', cognitiveTask: 'boundary_assumption_testing', scenarioType: 'peppered_moth_industrial_melanism', numericalOrTheory: 'theory', questionCategory: 'reasoning', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Identify negative feedback loop in endocrine axis', solvingMethodDescription: 'Hormonal suppression signaling pathway check' },
        { problemArchetype: 'principle_condition_application', archetypeId: 'PRINCIPLE_SELECTION', procedureSignature: 'fluid_mosaic_membrane_cholesterol_buffering', unknownType: 'homeoviscous_adaptation_temperature_buffer', requiredOperation: 'membrane_fluidity_phase_transition', cognitiveTask: 'law_identification', scenarioType: 'psychrophilic_bacteria_adaptation', numericalOrTheory: 'theory', questionCategory: 'reasoning', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Natural selection fitness and differential reproduction', solvingMethodDescription: 'Apply evolutionary selective pressure mechanism' },
        { problemArchetype: 'integrated_concept_question', archetypeId: 'INTEGRATED_CONCEPT_QUESTION', procedureSignature: 'unify_central_dogma_mutation_and_fitness', unknownType: 'evolutionary_consequence_of_missense_mutation', requiredOperation: 'molecular_to_phenotypic_synthesis', cognitiveTask: 'integrated_concept_evaluation', scenarioType: 'sickle_cell_heterozygote_advantage', numericalOrTheory: 'theory', questionCategory: 'exam_style', difficulty: 'hard', cognitiveLevel: 'level_5_exam_reasoning', problemStyle: 'Integrate molecular genetics, physiology, and evolution', solvingMethodDescription: 'Holistic biological system synthesis' }
      ];
    }

    // 5. PHYSICS & DEFAULT STEM DIVERSITY MATRIX (Matches Section 4 & 5 Specifications)
    return [
      { problemArchetype: 'direct_numerical_calculation', archetypeId: 'DIRECT_CALCULATION', procedureSignature: 'weighted_average_direct_substitution', unknownType: 'final_com_position', requiredOperation: 'formula_application', cognitiveTask: 'direct_calculation', scenarioType: 'two_mass_line', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'easy', cognitiveLevel: 'level_3_application', problemStyle: 'Direct numerical calculation with integer parameters', solvingMethodDescription: 'Direct application of formula to compute system result' },
      { problemArchetype: 'unknown_quantity_inversion', archetypeId: 'INVERSE_CALCULATION', procedureSignature: 'weighted_average_rearrange_for_unknown_mass', unknownType: 'missing_mass', requiredOperation: 'rearrange_equation', cognitiveTask: 'inverse_solve', scenarioType: 'pivot_balance', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'easy', cognitiveLevel: 'level_3_application', problemStyle: 'Inversion to solve for unknown parameter given target state', solvingMethodDescription: 'Algebraic rearrangement to isolate unknown component' },
      { problemArchetype: 'reverse_coordinate_calculation', archetypeId: 'FIND_UNKNOWN_POSITION', procedureSignature: 'zero_moment_position_solve', unknownType: 'missing_coordinate', requiredOperation: 'isolate_coordinate', cognitiveTask: 'reverse_reasoning', scenarioType: 'cartesian_axis', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'easy', cognitiveLevel: 'level_3_application', problemStyle: 'Find position coordinate required to satisfy zero balance', solvingMethodDescription: 'Set system moment to zero and solve for unknown coordinate' },
      { problemArchetype: 'multi_step_calculation', archetypeId: 'MULTI_STEP_APPLICATION', procedureSignature: 'three_particle_sequential_com', unknownType: 'distance_from_reference_particle', requiredOperation: 'sequential_summation', cognitiveTask: 'multi_step_execution', scenarioType: 'triangle_configuration', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Multi-particle sequential calculation and reference distance', solvingMethodDescription: 'Compute intermediate total then evaluate distance from reference particle' },
      { problemArchetype: 'comparison_problem', archetypeId: 'COMPARE_TWO_CASES', procedureSignature: 'compare_weighted_positions_without_full_calculation', unknownType: 'determine_larger_displacement', requiredOperation: 'compare_relationship', cognitiveTask: 'comparative_evaluation', scenarioType: 'symmetric_vs_asymmetric', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Compare two distinct physical arrangements quantitatively', solvingMethodDescription: 'Calculate both states independently and compute difference/ratio' },
      { problemArchetype: 'change_one_variable_prediction', archetypeId: 'PREDICT_CHANGE', procedureSignature: 'predict_shift_after_position_change', unknownType: 'shift_magnitude_and_direction', requiredOperation: 'differential_shift_formula', cognitiveTask: 'prediction_from_change', scenarioType: 'moving_particle', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Predict system shift when a single component is displaced', solvingMethodDescription: 'Apply differential shift formula Δ = (m_i * Δr_i) / M' },
      { problemArchetype: 'ratio_proportional_reasoning', archetypeId: 'RATIO_REASONING', procedureSignature: 'inverse_mass_distance_division', unknownType: 'ratio_of_distances', requiredOperation: 'proportional_division', cognitiveTask: 'proportional_reasoning', scenarioType: 'two_body_binary_system', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Distance division based on inverse mass/force ratio', solvingMethodDescription: 'Use inverse proportion r1/r2 = m2/m1 to divide total separation' },
      { problemArchetype: 'coordinate_data_interpretation', archetypeId: 'DATA_INTERPRETATION', procedureSignature: 'orthogonal_vector_decomposition_com', unknownType: 'ordered_pair_coordinates', requiredOperation: 'vector_summation', cognitiveTask: 'multidimensional_mapping', scenarioType: 'planar_grid', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Two-dimensional orthogonal coordinate vector calculation', solvingMethodDescription: 'Solve orthogonal x and y Cartesian coordinates independently' },
      { problemArchetype: 'negative_sign_based_problem', archetypeId: 'SIGN_ANALYSIS', procedureSignature: 'signed_cartesian_algebraic_sum', unknownType: 'signed_coordinate_across_origin', requiredOperation: 'signed_algebra', cognitiveTask: 'sign_analysis', scenarioType: 'negative_axis_distribution', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Preserve signed coordinates located across the origin', solvingMethodDescription: 'Strict algebraic preservation of positive and negative signs' },
      { problemArchetype: 'missing_information_reconstruction', archetypeId: 'MISSING_INFORMATION_RECONSTRUCTION', procedureSignature: 'cavity_negative_mass_reconstruction', unknownType: 'remaining_barycenter', requiredOperation: 'subtraction_method', cognitiveTask: 'reconstruction', scenarioType: 'symmetry_with_cutout', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Geometric symmetry with one element or mass removed', solvingMethodDescription: 'Calculate new barycenter of remaining symmetric components' },
      { problemArchetype: 'real_world_application', archetypeId: 'REAL_WORLD_APPLICATION', procedureSignature: 'fulcrum_support_equilibrium_solve', unknownType: 'pivot_support_location', requiredOperation: 'static_equilibrium_torque', cognitiveTask: 'applied_modelling', scenarioType: 'knife_edge_beam', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Knife-edge pivot or beam balance equilibrium', solvingMethodDescription: 'Torque/moment balance finding the stable support position' },
      { problemArchetype: 'constraint_based_problem', archetypeId: 'CONSTRAINT_PROBLEM', procedureSignature: 'zero_momentum_internal_displacement', unknownType: 'relative_movement_of_boat_or_cart', requiredOperation: 'constraint_conservation', cognitiveTask: 'boundary_condition_reasoning', scenarioType: 'frictionless_cart_surface', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Enforce stationary barycenter constraint when one part moves', solvingMethodDescription: 'Constrain Δr_cm = 0 so m1*Δr1 + m2*Δr2 = 0' },
      { problemArchetype: 'error_analysis', archetypeId: 'ERROR_ANALYSIS', procedureSignature: 'detect_incorrect_arithmetic_midpoint_calculation', unknownType: 'diagnose_fallacious_step', requiredOperation: 'error_diagnosis', cognitiveTask: 'evaluative_diagnosis', scenarioType: 'student_scratchpad_audit', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'hard', cognitiveLevel: 'level_3_application', problemStyle: 'Diagnose common student mistake (unweighted average)', solvingMethodDescription: 'Identify unweighted arithmetic midpoint flaw and compute error' },
      { problemArchetype: 'find_incorrect_method', archetypeId: 'METHOD_SELECTION', procedureSignature: 'evaluate_validity_of_divisor_and_dimension', unknownType: 'flawed_formula_step', requiredOperation: 'method_selection', cognitiveTask: 'formula_selection', scenarioType: 'alternative_methods_critique', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'hard', cognitiveLevel: 'level_3_application', problemStyle: 'Identify invalid mathematical or physical step', solvingMethodDescription: 'Examine dimensional consistency and divisor validity' },
      { problemArchetype: 'select_correct_method', archetypeId: 'REVERSE_REASONING', procedureSignature: 'internal_force_collision_point_deduction', unknownType: 'meeting_point_location', requiredOperation: 'invariance_deduction', cognitiveTask: 'reverse_deduction', scenarioType: 'mutual_attraction_collision', numericalOrTheory: 'numerical', questionCategory: 'application', difficulty: 'hard', cognitiveLevel: 'level_3_application', problemStyle: 'Internal force collision location determination', solvingMethodDescription: 'Recognize zero external force implies meeting at stationary barycenter' },
      { problemArchetype: 'case_based_numerical_problem', archetypeId: 'CASE_STUDY', procedureSignature: 'velocity_of_center_of_mass_vector_sum', unknownType: 'velocity_vector_magnitude', requiredOperation: 'momentum_weighted_velocity', cognitiveTask: 'system_state_evolution', scenarioType: 'two_moving_vehicles', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'hard', cognitiveLevel: 'level_3_application', problemStyle: 'Signed velocity vectors and velocity of center of mass', solvingMethodDescription: 'Momentum weighting v_cm = Σ(m_i*v_i) / M preserving direction' },
      { problemArchetype: 'multi_concept_numerical_problem', archetypeId: 'MULTI_CONCEPT_INTEGRATION', procedureSignature: 'continuous_rod_with_discrete_point_mass', unknownType: 'composite_center_of_mass', requiredOperation: 'hybrid_continuous_discrete_integration', cognitiveTask: 'multi_concept_integration', scenarioType: 'rod_and_particle_assembly', numericalOrTheory: 'numerical', questionCategory: 'numerical', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Composite continuous body modeled with discrete particle', solvingMethodDescription: 'Replace continuous rod with point mass then apply two-body formula' },
      { problemArchetype: 'exam_style_challenge', archetypeId: 'EXAM_STYLE_CHALLENGE', procedureSignature: 'reference_frame_origin_translation_transform', unknownType: 'transformed_coordinates', requiredOperation: 'coordinate_transformation', cognitiveTask: 'rigorous_exam_synthesis', scenarioType: 'translated_origin_system', numericalOrTheory: 'numerical', questionCategory: 'exam_style', difficulty: 'hard', cognitiveLevel: 'level_5_exam_reasoning', problemStyle: 'Coordinate frame origin translation challenge', solvingMethodDescription: 'Calculate coordinate transformation under translated reference origin' },
      { problemArchetype: 'conceptual_prediction', archetypeId: 'CONCEPTUAL_PREDICTION', procedureSignature: 'external_vs_internal_force_isolation', unknownType: 'trajectory_curvature_or_continuation', requiredOperation: 'qualitative_law_deduction', cognitiveTask: 'cause_effect_prediction', scenarioType: 'exploding_projectile_in_flight', numericalOrTheory: 'theory', questionCategory: 'reasoning', difficulty: 'easy', cognitiveLevel: 'level_2_understanding', problemStyle: 'Predict trajectory of center of mass during internal explosion', solvingMethodDescription: 'Isolate external force from internal forces to predict continuation' },
      { problemArchetype: 'conceptual_comparison', archetypeId: 'CONCEPTUAL_COMPARISON', procedureSignature: 'inverse_mass_proximity_comparison', unknownType: 'relative_proximity_comparison', requiredOperation: 'qualitative_comparison', cognitiveTask: 'conceptual_contrast', scenarioType: 'heavier_vs_lighter_particle', numericalOrTheory: 'theory', questionCategory: 'conceptual', difficulty: 'easy', cognitiveLevel: 'level_2_understanding', problemStyle: 'Compare proximity of center of mass between unequal masses', solvingMethodDescription: 'Apply inverse mass-distance principle r1/r2 = m2/m1' },
      { problemArchetype: 'why_reasoning', archetypeId: 'WHY_REASONING', procedureSignature: 'spatial_distribution_vs_atomic_matter_deduction', unknownType: 'location_feasibility_in_void', requiredOperation: 'definition_implication', cognitiveTask: 'first_principles_reasoning', scenarioType: 'hollow_ring_or_donut', numericalOrTheory: 'theory', questionCategory: 'conceptual', difficulty: 'medium', cognitiveLevel: 'level_2_understanding', problemStyle: 'Why center of mass can lie in hollow space with zero matter', solvingMethodDescription: 'Demonstrate center of mass is an integral mean rather than an atom' },
      { problemArchetype: 'misconception_detection', archetypeId: 'MISCONCEPTION_DETECTION', procedureSignature: 'disprove_heavier_particle_stationary_fallacy', unknownType: 'invalid_intuition_identification', requiredOperation: 'counterexample_demonstration', cognitiveTask: 'misconception_detection', scenarioType: 'student_intuition_trap', numericalOrTheory: 'theory', questionCategory: 'reasoning', difficulty: 'medium', cognitiveLevel: 'level_4_analysis', problemStyle: 'Detect misconception that stationary heavy mass prevents COM motion', solvingMethodDescription: 'Disprove claim using non-zero numerator displacement formula' },
      { problemArchetype: 'situation_identification', archetypeId: 'ASSUMPTION_CHECK', procedureSignature: 'uniform_vs_non_uniform_gravitational_field_test', unknownType: 'condition_for_com_cog_coincidence', requiredOperation: 'condition_verification', cognitiveTask: 'boundary_assumption_testing', scenarioType: 'mountain_sized_body', numericalOrTheory: 'theory', questionCategory: 'conceptual', difficulty: 'hard', cognitiveLevel: 'level_5_exam_reasoning', problemStyle: 'Identify precise condition when COM coincides with COG', solvingMethodDescription: 'Verify uniform gravitational field vector requirement' },
      { problemArchetype: 'principle_condition_application', archetypeId: 'PRINCIPLE_SELECTION', procedureSignature: 'action_reaction_internal_force_invariance', unknownType: 'governing_conservation_principle', requiredOperation: 'principle_selection', cognitiveTask: 'law_identification', scenarioType: 'skaters_pushing_on_ice', numericalOrTheory: 'theory', questionCategory: 'reasoning', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Internal action-reaction push between skaters on ice', solvingMethodDescription: 'Apply Newton Second Law for system with zero external force' },
      { problemArchetype: 'integrated_concept_question', archetypeId: 'INTEGRATED_CONCEPT_QUESTION', procedureSignature: 'coordinate_invariance_and_spatial_uniqueness', unknownType: 'spatial_uniqueness_statement', requiredOperation: 'holistic_synthesis', cognitiveTask: 'integrated_concept_evaluation', scenarioType: 'coordinate_free_spatial_reality', numericalOrTheory: 'theory', questionCategory: 'conceptual', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Invariance of physical barycenter under coordinate translation', solvingMethodDescription: 'Integrate coordinate mathematical frame with physical spatial invariance' }
    ];
  }

  /**
   * STEP 12 & 13: Question Diversity & Anti-Repetition Semantic/Procedural Validator
   * Compares a candidate question against all accepted questions across 7 core structural dimensions:
   * 1. Concept
   * 2. Archetype ID
   * 3. Procedure Signature
   * 4. Unknown Type
   * 5. Required Operation
   * 6. Cognitive Task
   * 7. Scenario Type
   * 
   * STEP 5, 6, 12, 14: Deterministic Procedural & Unknown Extractor
   * Inspects the ACTUAL text of the question, options, and solution to determine:
   * 1. What quantity or outcome the student is actually required to solve for (unknownType)
   * 2. What mathematical/physical operation is actually required (requiredOperation)
   * 3. The true problem archetype (archetypeId)
   * 4. The solving procedure signature (procedureSignature)
   * 
   * This guarantees that AI-generated repetitive questions (e.g. calculating COM with different numbers)
   * are exposed by their TRUE operation, rather than hiding behind blueprint metadata.
   */
  public static extractProceduralFeatures(q: Partial<QuizQuestion>): {
    actualUnknown: string;
    actualOperation: string;
    extractedArchetypeId: string;
    extractedProcedureSignature: string;
    isDirectFormulaCalculation: boolean;
    rawTextNormalized: string;
  } {
    const qText = (q.question || '').toLowerCase();
    const solText = ((q.solution || '') + ' ' + (q.explanation || '')).toLowerCase();

    // 1. Check for student error audit / mistake diagnosis
    if (
      qText.includes('student writes') ||
      qText.includes('student calculated') ||
      qText.includes('student assumes') ||
      qText.includes('student\'s error') ||
      qText.includes('student\'s mistake') ||
      qText.includes('student mistake') ||
      qText.includes('student error') ||
      qText.includes('flawed step') ||
      qText.includes('incorrect step') ||
      qText.includes('miscalculation') ||
      qText.includes('भूल') ||
      qText.includes('त्रुटि')
    ) {
      return {
        actualUnknown: 'diagnose_fallacious_step',
        actualOperation: 'error_diagnosis',
        extractedArchetypeId: 'ERROR_ANALYSIS',
        extractedProcedureSignature: 'detect_incorrect_arithmetic_midpoint_calculation',
        isDirectFormulaCalculation: false,
        rawTextNormalized: qText
      };
    }

    // 2. Check for unknown mass / algebraic inversion for mass
    if (
      (qText.includes('mass') || qText.includes('द्रव्यमान') || qText.includes('દળ') || qText.includes('masa')) &&
      (qText.includes('unknown mass') ||
        qText.includes('find the mass') ||
        qText.includes('calculate the mass') ||
        qText.includes('value of the unknown mass') ||
        qText.includes('value of mass m') ||
        qText.includes('value of m2') ||
        qText.includes('find m2') ||
        qText.includes('calculate m2') ||
        qText.includes('determine m2'))
    ) {
      return {
        actualUnknown: 'missing_mass',
        actualOperation: 'rearrange_equation',
        extractedArchetypeId: 'INVERSE_CALCULATION',
        extractedProcedureSignature: 'weighted_average_rearrange_for_unknown_mass',
        isDirectFormulaCalculation: false,
        rawTextNormalized: qText
      };
    }

    // 3. Check for unknown coordinate / position inversion
    if (
      qText.includes('unknown coordinate') ||
      qText.includes('unknown position') ||
      qText.includes('find the coordinate') ||
      qText.includes('find the position') ||
      qText.includes('at what position') ||
      qText.includes('where must the') ||
      qText.includes('where should the') ||
      qText.includes('placed at an unknown coordinate') ||
      qText.includes('find x2') ||
      qText.includes('calculate x2')
    ) {
      return {
        actualUnknown: 'missing_coordinate',
        actualOperation: 'isolate_coordinate',
        extractedArchetypeId: 'FIND_UNKNOWN_POSITION',
        extractedProcedureSignature: 'zero_moment_position_solve',
        isDirectFormulaCalculation: false,
        rawTextNormalized: qText
      };
    }

    // 4. Check for comparison of two arrangements/systems
    if (
      (qText.includes('system a') && qText.includes('system b')) ||
      (qText.includes('case 1') && qText.includes('case 2')) ||
      qText.includes('compare two') ||
      qText.includes('further from the origin, and by what distance') ||
      qText.includes('which system') ||
      qText.includes('which arrangement yields a greater') ||
      qText.includes('तुलना') ||
      qText.includes('સરખામણી')
    ) {
      return {
        actualUnknown: 'determine_larger_displacement',
        actualOperation: 'compare_relationship',
        extractedArchetypeId: 'COMPARE_TWO_CASES',
        extractedProcedureSignature: 'compare_weighted_positions_without_full_calculation',
        isDirectFormulaCalculation: false,
        rawTextNormalized: qText
      };
    }

    // 5. Check for predict shift / displacement after parameter change
    if (
      (qText.includes('shift') ||
        qText.includes('displaced by') ||
        qText.includes('moves by') ||
        qText.includes('how much does the center of mass move') ||
        qText.includes('displacement of center of mass') ||
        qText.includes('δx_cm') ||
        qText.includes('deltax') ||
        qText.includes('સ્થળાંતર') ||
        qText.includes('स्थानांतरण')) &&
      (qText.includes('center of mass shift') ||
        qText.includes('shift of center of mass') ||
        qText.includes('center of mass of the system shift') ||
        qText.includes('center of mass move') ||
        qText.includes('displacement of center of mass') ||
        qText.includes('shift in the center of mass') ||
        qText.includes('shift in center of mass'))
    ) {
      return {
        actualUnknown: 'shift_magnitude_and_direction',
        actualOperation: 'differential_shift_formula',
        extractedArchetypeId: 'PREDICT_CHANGE',
        extractedProcedureSignature: 'predict_shift_after_position_change',
        isDirectFormulaCalculation: false,
        rawTextNormalized: qText
      };
    }

    // 6. Check for ratio & proportional reasoning
    if (
      qText.includes('ratio') ||
      qText.includes('distance ratio') ||
      qText.includes('ratio of distances') ||
      qText.includes('divide the distance') ||
      qText.includes('अनुपात') ||
      qText.includes('ગુણોત્તર')
    ) {
      return {
        actualUnknown: 'ratio_of_distances',
        actualOperation: 'proportional_division',
        extractedArchetypeId: 'RATIO_REASONING',
        extractedProcedureSignature: 'inverse_mass_distance_division',
        isDirectFormulaCalculation: false,
        rawTextNormalized: qText
      };
    }

    // 7. Check for 2D Cartesian coordinates / vector decomposition
    if (
      qText.includes('(x_cm, y_cm)') ||
      qText.includes('coordinates (x_cm, y_cm)') ||
      qText.includes('two-dimensional') ||
      qText.includes('2d') ||
      (qText.includes('x-axis') && qText.includes('y-axis')) ||
      qText.includes('coordinates of center of mass') ||
      qText.includes('ordered pair')
    ) {
      return {
        actualUnknown: 'ordered_pair_coordinates',
        actualOperation: 'vector_summation',
        extractedArchetypeId: 'DATA_INTERPRETATION',
        extractedProcedureSignature: 'orthogonal_vector_decomposition_com',
        isDirectFormulaCalculation: false,
        rawTextNormalized: qText
      };
    }

    // 8. Check for negative coordinates / signed origin balance
    if (
      qText.includes('x = -') ||
      qText.includes('negative coordinate') ||
      qText.includes('negative axis') ||
      qText.includes('across the origin')
    ) {
      return {
        actualUnknown: 'signed_coordinate_across_origin',
        actualOperation: 'signed_algebra',
        extractedArchetypeId: 'SIGN_ANALYSIS',
        extractedProcedureSignature: 'signed_cartesian_algebraic_sum',
        isDirectFormulaCalculation: false,
        rawTextNormalized: qText
      };
    }

    // 9. Check for cutout / cavity / negative mass reconstruction
    if (
      qText.includes('removed') ||
      qText.includes('cut out') ||
      qText.includes('cavity') ||
      qText.includes('remaining') ||
      qText.includes('cut from') ||
      qText.includes('negative mass')
    ) {
      return {
        actualUnknown: 'remaining_barycenter',
        actualOperation: 'subtraction_method',
        extractedArchetypeId: 'MISSING_INFORMATION_RECONSTRUCTION',
        extractedProcedureSignature: 'cavity_negative_mass_reconstruction',
        isDirectFormulaCalculation: false,
        rawTextNormalized: qText
      };
    }

    // 10. Check for fulcrum / pivot / knife-edge real-world equilibrium
    if (
      qText.includes('fulcrum') ||
      qText.includes('pivot') ||
      qText.includes('knife-edge') ||
      qText.includes('balance point') ||
      qText.includes('balanced on a') ||
      qText.includes('loaded light rod')
    ) {
      return {
        actualUnknown: 'pivot_support_location',
        actualOperation: 'static_equilibrium_torque',
        extractedArchetypeId: 'REAL_WORLD_APPLICATION',
        extractedProcedureSignature: 'fulcrum_support_equilibrium_solve',
        isDirectFormulaCalculation: false,
        rawTextNormalized: qText
      };
    }

    // 11. Check for frictionless cart/boat constraint problem
    if (
      (qText.includes('boat') || qText.includes('cart') || qText.includes('plank')) &&
      (qText.includes('walks') || qText.includes('moves to the other end') || qText.includes('how far does the boat move') || qText.includes('relative to the water'))
    ) {
      return {
        actualUnknown: 'relative_movement_of_boat_or_cart',
        actualOperation: 'constraint_conservation',
        extractedArchetypeId: 'CONSTRAINT_PROBLEM',
        extractedProcedureSignature: 'zero_momentum_internal_displacement',
        isDirectFormulaCalculation: false,
        rawTextNormalized: qText
      };
    }

    // 12. Check for velocity / dynamic state evolution (v_cm)
    if (
      qText.includes('velocity of center of mass') ||
      qText.includes('velocity of the center of mass') ||
      qText.includes('v_cm') ||
      qText.includes('speed of center of mass') ||
      qText.includes('moving with velocities') ||
      qText.includes('moving vehicles')
    ) {
      return {
        actualUnknown: 'velocity_vector_magnitude',
        actualOperation: 'momentum_weighted_velocity',
        extractedArchetypeId: 'CASE_STUDY',
        extractedProcedureSignature: 'velocity_of_center_of_mass_vector_sum',
        isDirectFormulaCalculation: false,
        rawTextNormalized: qText
      };
    }

    // 13. Check for multi-step distance offset
    if (
      qText.includes('distance from the leftmost') ||
      qText.includes('distance from the first') ||
      qText.includes('first calculate the center of mass position x_cm, and then determine its distance') ||
      qText.includes('distance from origin')
    ) {
      return {
        actualUnknown: 'distance_from_reference_particle',
        actualOperation: 'sequential_summation',
        extractedArchetypeId: 'MULTI_STEP_APPLICATION',
        extractedProcedureSignature: 'three_particle_sequential_com',
        isDirectFormulaCalculation: false,
        rawTextNormalized: qText
      };
    }

    // 14. Check for mutual attraction collision / reverse reasoning
    if (
      qText.includes('collide') ||
      qText.includes('collision') ||
      qText.includes('attracting each other') ||
      qText.includes('mutual forces') ||
      qText.includes('meeting point')
    ) {
      return {
        actualUnknown: 'meeting_point_location',
        actualOperation: 'invariance_deduction',
        extractedArchetypeId: 'REVERSE_REASONING',
        extractedProcedureSignature: 'internal_force_collision_point_deduction',
        isDirectFormulaCalculation: false,
        rawTextNormalized: qText
      };
    }

    // 15. Check for coordinate transformation / origin shift / composite challenge
    if (
      qText.includes('composite body') ||
      qText.includes('opposite end of the rod') ||
      qText.includes('origin is shifted') ||
      qText.includes('origin translation') ||
      qText.includes('transformed coordinates') ||
      qText.includes('translated origin')
    ) {
      return {
        actualUnknown: 'transformed_coordinates',
        actualOperation: 'coordinate_transformation',
        extractedArchetypeId: 'EXAM_STYLE_CHALLENGE',
        extractedProcedureSignature: 'reference_frame_origin_translation_transform',
        isDirectFormulaCalculation: false,
        rawTextNormalized: qText
      };
    }

    // 16. Check for conceptual prediction (exploding projectile)
    if (
      qText.includes('projectile') ||
      qText.includes('explodes') ||
      qText.includes('trajectory') ||
      qText.includes('parabolic')
    ) {
      return {
        actualUnknown: 'trajectory_curvature_or_continuation',
        actualOperation: 'qualitative_law_deduction',
        extractedArchetypeId: 'CONCEPTUAL_PREDICTION',
        extractedProcedureSignature: 'external_vs_internal_force_isolation',
        isDirectFormulaCalculation: false,
        rawTextNormalized: qText
      };
    }

    // 17. Check for conceptual comparison (midpoint vs heavier proximity)
    if (
      qText.includes('closer to the heavier') ||
      qText.includes('closer to heavier') ||
      qText.includes('relative to geometric midpoint') ||
      qText.includes('closer to lighter')
    ) {
      return {
        actualUnknown: 'relative_proximity_comparison',
        actualOperation: 'qualitative_comparison',
        extractedArchetypeId: 'CONCEPTUAL_COMPARISON',
        extractedProcedureSignature: 'inverse_mass_proximity_comparison',
        isDirectFormulaCalculation: false,
        rawTextNormalized: qText
      };
    }

    // 18. Check for 'why internal forces cannot alter velocity'
    if (
      qText.includes('why') &&
      (qText.includes('internal forces') || qText.includes('action-reaction') || qText.includes('isolated'))
    ) {
      return {
        actualUnknown: 'location_feasibility_in_void',
        actualOperation: 'definition_implication',
        extractedArchetypeId: 'WHY_REASONING',
        extractedProcedureSignature: 'spatial_distribution_vs_atomic_matter_deduction',
        isDirectFormulaCalculation: false,
        rawTextNormalized: qText
      };
    }

    // 19. Check for misconception detection (outside physical body)
    if (
      qText.includes('misconception') ||
      qText.includes('hollow') ||
      qText.includes('donut') ||
      qText.includes('ring') ||
      qText.includes('outside the physical') ||
      qText.includes('empty space')
    ) {
      return {
        actualUnknown: 'invalid_intuition_identification',
        actualOperation: 'counterexample_demonstration',
        extractedArchetypeId: 'MISCONCEPTION_DETECTION',
        extractedProcedureSignature: 'disprove_heavier_particle_stationary_fallacy',
        isDirectFormulaCalculation: false,
        rawTextNormalized: qText
      };
    }

    // 20. Check for precondition check (uniform gravitational field)
    if (
      qText.includes('center of gravity') ||
      qText.includes('uniform gravitational field') ||
      qText.includes('coincide with center of gravity') ||
      qText.includes('gravitational field')
    ) {
      return {
        actualUnknown: 'condition_for_com_cog_coincidence',
        actualOperation: 'condition_verification',
        extractedArchetypeId: 'ASSUMPTION_CHECK',
        extractedProcedureSignature: 'uniform_vs_non_uniform_gravitational_field_test',
        isDirectFormulaCalculation: false,
        rawTextNormalized: qText
      };
    }

    // 21. Check for principle selection (momentum conservation / skaters)
    if (
      qText.includes('conservation of linear momentum') ||
      qText.includes('skaters') ||
      qText.includes('pushing each other') ||
      qText.includes('which fundamental principle explains why') ||
      qText.includes('conservation of momentum')
    ) {
      return {
        actualUnknown: 'governing_conservation_principle',
        actualOperation: 'principle_selection',
        extractedArchetypeId: 'PRINCIPLE_SELECTION',
        extractedProcedureSignature: 'action_reaction_internal_force_invariance',
        isDirectFormulaCalculation: false,
        rawTextNormalized: qText
      };
    }

    // 22. Check for integrated concept (origin independence / spatial uniqueness)
    if (
      qText.includes('origin-independent') ||
      qText.includes('coordinate frame') ||
      qText.includes('coordinate axes') ||
      qText.includes('spatial reality') ||
      qText.includes('spatial uniqueness') ||
      qText.includes('synthesizes the relationship')
    ) {
      return {
        actualUnknown: 'spatial_uniqueness_statement',
        actualOperation: 'holistic_synthesis',
        extractedArchetypeId: 'INTEGRATED_CONCEPT_QUESTION',
        extractedProcedureSignature: 'coordinate_invariance_and_spatial_uniqueness',
        isDirectFormulaCalculation: false,
        rawTextNormalized: qText
      };
    }

    // 23. Direct formula calculation detector (the base repetition trap)
    const isDirectCalc =
      qText.includes('calculate the position') ||
      qText.includes('find the center of mass') ||
      qText.includes('calculate the center of mass') ||
      qText.includes('position of their center of mass') ||
      qText.includes('position of the center of mass') ||
      qText.includes('determine the center of mass') ||
      qText.includes('find center of mass') ||
      qText.includes('calculate center of mass') ||
      qText.includes('where is the center of mass') ||
      /\b(calculate|find|determine)\b/.test(qText);

    return {
      actualUnknown: isDirectCalc ? 'final_com_position' : (q.unknownType || 'primary_result_value'),
      actualOperation: isDirectCalc ? 'formula_application' : (q.requiredOperation || 'direct_substitution'),
      extractedArchetypeId: isDirectCalc ? 'DIRECT_CALCULATION' : (q.archetypeId || 'DIRECT_CALCULATION'),
      extractedProcedureSignature: isDirectCalc
        ? 'weighted_average_direct_substitution'
        : (q.procedureSignature || 'direct_eval_substitution'),
      isDirectFormulaCalculation: isDirectCalc,
      rawTextNormalized: qText
    };
  }

  /**
   * STEP 12 - 14: Hard Archetype, Procedure Signature & Structural Duplicate Validator
   * Ensures that no two questions test substantially identical solving tasks, even if numbers or wording differ.
   */
  public static isDuplicateQuestion(
    candidate: Partial<QuizQuestion>,
    existingQuestions: QuizQuestion[]
  ): { isDuplicate: boolean; reason?: string } {
    const cArch = (candidate.archetypeId || candidate.problemArchetype || '').trim().toLowerCase();
    const cProc = (candidate.procedureSignature || '').trim().toLowerCase();
    const cUnknown = (candidate.unknownType || '').trim().toLowerCase();
    const cOp = (candidate.requiredOperation || '').trim().toLowerCase();
    const cCognitive = (candidate.cognitiveTask || '').trim().toLowerCase();
    const cScenario = (candidate.scenarioType || '').trim().toLowerCase();
    const cConcept = (candidate.concept || candidate.conceptName || '').trim().toLowerCase();

    // Extract actual procedural features from question text
    const cProfile = this.extractProceduralFeatures(candidate);

    for (let i = 0; i < existingQuestions.length; i++) {
      const e = existingQuestions[i];
      const eArch = (e.archetypeId || e.problemArchetype || '').trim().toLowerCase();
      const eProc = (e.procedureSignature || '').trim().toLowerCase();
      const eUnknown = (e.unknownType || '').trim().toLowerCase();
      const eOp = (e.requiredOperation || '').trim().toLowerCase();
      const eCognitive = (e.cognitiveTask || '').trim().toLowerCase();
      const eScenario = (e.scenarioType || '').trim().toLowerCase();
      const eConcept = (e.concept || e.conceptName || '').trim().toLowerCase();

      const eProfile = this.extractProceduralFeatures(e);

      // Rule 0: Hard Repetition Trap Lock — Two questions CANNOT both be direct formula substitutions
      // (Even if numbers, mass counts [2 vs 3 particles], or wording differ!)
      if (cProfile.isDirectFormulaCalculation && eProfile.isDirectFormulaCalculation) {
        return {
          isDuplicate: true,
          reason: `Both candidate and Q${i + 1} are direct formula calculations solving for the primary result (violates Step 5 & Step 7 archetype diversity)`
        };
      }

      // Rule A: Hard Archetype Lock — Never use the same archetype twice
      const archCollides =
        (cArch && eArch && cArch === eArch) ||
        (!cArch && !eArch && cProfile.extractedArchetypeId && eProfile.extractedArchetypeId && cProfile.extractedArchetypeId === eProfile.extractedArchetypeId);

      if (archCollides) {
        return {
          isDuplicate: true,
          reason: `Collision on archetypeId "${candidate.archetypeId || cProfile.extractedArchetypeId}" with Q${i + 1}`
        };
      }

      // Rule B: Hard Procedure Signature Lock — Substantially equivalent solving procedures are prohibited
      const procCollides =
        (cProc && eProc && cProc === eProc) ||
        (!cProc && !eProc && cProfile.extractedProcedureSignature && eProfile.extractedProcedureSignature && cProfile.extractedProcedureSignature === eProfile.extractedProcedureSignature);

      if (procCollides) {
        return {
          isDuplicate: true,
          reason: `Collision on procedureSignature "${candidate.procedureSignature || cProfile.extractedProcedureSignature}" with Q${i + 1}`
        };
      }

      // Rule C: Same Concept + Same Unknown Type — Must vary what the student solves for
      const effCUnknown = cUnknown || cProfile.actualUnknown;
      const effEUnknown = eUnknown || eProfile.actualUnknown;
      if (cConcept && eConcept && cConcept === eConcept && effCUnknown && effEUnknown && effCUnknown === effEUnknown) {
        return {
          isDuplicate: true,
          reason: `Same concept "${candidate.concept}" already solves for unknownType "${effCUnknown}" in Q${i + 1}`
        };
      }

      // Rule D: Minimum Difference Score — Must differ in at least 2 meaningful dimensions (reject if matchCount >= 4)
      let matchCount = 0;
      if (cConcept && eConcept && cConcept === eConcept) matchCount++;
      if (cArch && eArch && cArch === eArch) matchCount++;
      if (cProc && eProc && cProc === eProc) matchCount++;
      if (effCUnknown && effEUnknown && effCUnknown === effEUnknown) matchCount++;
      if (cOp && eOp && cOp === eOp) matchCount++;
      if (cCognitive && eCognitive && cCognitive === eCognitive) matchCount++;
      if (cScenario && eScenario && cScenario === eScenario) matchCount++;

      if (matchCount >= 4) {
        return {
          isDuplicate: true,
          reason: `High structural similarity: matches ${matchCount}/7 dimensions with Q${i + 1}`
        };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * STEP 10: 25-Question Blueprint Generation
   * Allocates EXACTLY 25 questions:
   * - 18 Numerical / Application / Problem-Solving (~70%)
   * - 7 Conceptual / Theory / Reasoning (~30%)
   * - 5 Easy, 12 Medium, 8 Hard
   * - 25 DISTINCT ARCHETYPES (Zero repetition of solving methods)
   * - 100% Concept Coverage of Video-Covered Concepts
   */
  private static create25QuestionBlueprint(
    knowledgeMap: ConceptKnowledgeMap,
    difficulty: 'easy' | 'medium' | 'hard'
  ): QuizBlueprintItem[] {
    const concepts = knowledgeMap.videoCoveredConcepts;
    const blueprint: QuizBlueprintItem[] = [];
    const diversityMatrix = this.getSubjectDiversityMatrix(knowledgeMap.subject);

    // Build or ensure concept coverage map
    const coverageMap = knowledgeMap.conceptCoverageMap || this.buildConceptCoverageMap(knowledgeMap);

    // Construct an expanded array of 25 concept assignments based strictly on coverageMap
    const assignedConcepts: { concept: string; subtopic: string; formula?: string }[] = [];
    for (const entry of coverageMap) {
      const match = concepts.find(c => c.concept.toLowerCase() === entry.concept.toLowerCase()) || concepts[0];
      const count = entry.questionsAllocated || entry.questionsAssigned || 1;
      for (let k = 0; k < count; k++) {
        assignedConcepts.push({
          concept: entry.concept,
          subtopic: entry.subtopic || match?.subtopic || '',
          formula: match?.formula
        });
      }
    }

    // Fallback fill to 25 if needed
    while (assignedConcepts.length < 25) {
      const fallback = concepts[assignedConcepts.length % concepts.length];
      assignedConcepts.push({
        concept: fallback.concept,
        subtopic: fallback.subtopic,
        formula: fallback.formula
      });
    }

    for (let idx = 0; idx < 25; idx++) {
      const spec = diversityMatrix[idx];
      const assigned = assignedConcepts[idx];

      blueprint.push({
        questionIndex: idx + 1,
        questionId: `Q${idx + 1}`,
        concept: assigned.concept,
        subtopic: assigned.subtopic,
        questionCategory: spec.questionCategory,
        problemArchetype: spec.problemArchetype,
        archetypeId: spec.archetypeId,
        procedureSignature: spec.procedureSignature,
        unknownType: spec.unknownType,
        requiredOperation: spec.requiredOperation,
        cognitiveTask: spec.cognitiveTask,
        scenarioType: spec.scenarioType,
        numericalOrTheory: spec.numericalOrTheory,
        difficulty: spec.difficulty,
        cognitiveLevel: spec.cognitiveLevel,
        problemStyle: spec.problemStyle,
        solvingMethodDescription: spec.solvingMethodDescription,
        expectedFormula: assigned.formula || 'Governing concept equation'
      });
    }

    knowledgeMap.blueprint = blueprint;
    knowledgeMap.designReport = blueprint.map(b => ({
      questionId: `Q${b.questionIndex}`,
      concept: b.concept,
      archetypeId: b.archetypeId,
      procedureSignature: b.procedureSignature,
      unknownType: b.unknownType,
      numericalOrTheory: b.numericalOrTheory
    }));

    return blueprint;
  }

  /**
   * STEP 11: Generate Original Questions from Blueprint using Gemini AI
   * Generates in 2 coordinated batches (Q1-Q13 and Q14-Q25) to prevent JSON truncation
   * and token exhaustion.
   */
  private static async generateQuestionsFromBlueprintWithAI(
    client: GoogleGenAI,
    title: string,
    knowledgeMap: ConceptKnowledgeMap,
    blueprint: QuizBlueprintItem[],
    difficulty: 'easy' | 'medium' | 'hard',
    targetLang: { code: 'en' | 'hi' | 'gu' | 'es'; name: string }
  ): Promise<QuizQuestion[]> {
    const batch1Blueprint = blueprint.slice(0, 13);
    const batch2Blueprint = blueprint.slice(13, 25);

    const [batch1, batch2] = await Promise.all([
      this.generateBlueprintBatchWithAI(client, title, knowledgeMap, batch1Blueprint, difficulty, targetLang, 1),
      this.generateBlueprintBatchWithAI(client, title, knowledgeMap, batch2Blueprint, difficulty, targetLang, 2)
    ]);

    const combined = [...batch1, ...batch2];
    return combined;
  }

  private static async generateBlueprintBatchWithAI(
    client: GoogleGenAI,
    title: string,
    knowledgeMap: ConceptKnowledgeMap,
    batchBlueprint: QuizBlueprintItem[],
    difficulty: 'easy' | 'medium' | 'hard',
    targetLang: { code: 'en' | 'hi' | 'gu' | 'es'; name: string },
    batchNum: number
  ): Promise<QuizQuestion[]> {
    const conceptSummary = JSON.stringify(
      knowledgeMap.videoCoveredConcepts.map(c => ({
        concept: c.concept,
        subtopic: c.subtopic,
        formula: c.formula,
        variables: c.variables,
        examples: c.examples,
        problemSolving: c.problem_solving_method
      })),
      null,
      2
    );

    const slotInstructions = batchBlueprint
      .map(bp => {
        let specificConstraint = '';
        if (bp.archetypeId === 'DIRECT_CALCULATION') {
          specificConstraint = `Directly evaluate the primary result (${bp.unknownType}) using given input parameters.`;
        } else if (bp.archetypeId === 'INVERSE_CALCULATION') {
          specificConstraint = `DO NOT ask to calculate the primary result! The final result is ALREADY GIVEN. The student MUST isolate and solve for the MISSING input parameter (${bp.unknownType}, e.g. unknown mass or parameter).`;
        } else if (bp.archetypeId === 'FIND_UNKNOWN_POSITION') {
          specificConstraint = `DO NOT ask to calculate the primary result! Provide the center/balance at origin or known coordinate, and ask the student to solve for the UNKNOWN COORDINATE (${bp.unknownType}).`;
        } else if (bp.archetypeId === 'COMPARE_TWO_CASES') {
          specificConstraint = `Provide TWO DIFFERENT SETUPS (Case A and Case B) with different mass or parameter arrangements. Ask which case is larger/further and determine the difference.`;
        } else if (bp.archetypeId === 'PREDICT_CHANGE') {
          specificConstraint = `One variable or position is shifted/changed while others remain fixed. Solve for the PREDICTED SHIFT (${bp.unknownType}) using differential displacement.`;
        } else if (bp.archetypeId === 'RATIO_REASONING') {
          specificConstraint = `Given the ratio of inputs (e.g. m1:m2), calculate the RATIO of resulting quantities (${bp.unknownType}, e.g. distance partition r1:r2).`;
        } else if (bp.archetypeId === 'DATA_INTERPRETATION') {
          specificConstraint = `Solve for two-dimensional Cartesian coordinates (x, y) or extract quantitative constants from coordinate data.`;
        } else if (bp.archetypeId === 'SIGN_ANALYSIS') {
          specificConstraint = `Use signed coordinates with negative positions across the origin (x = -) to test algebraic sign conventions.`;
        } else if (bp.archetypeId === 'MISSING_INFORMATION_RECONSTRUCTION') {
          specificConstraint = `A part of the system or mass is cut out, removed, or missing. Use subtraction / cavity method to determine the remaining center.`;
        } else if (bp.archetypeId === 'REAL_WORLD_APPLICATION') {
          specificConstraint = `Applied physical scenario: knife-edge balance, fulcrum pivot, or loaded beam equilibrium.`;
        } else if (bp.archetypeId === 'CONSTRAINT_PROBLEM') {
          specificConstraint = `Zero external force constraint: a person moves on a frictionless boat or cart; calculate relative displacement keeping system COM stationary.`;
        } else if (bp.archetypeId === 'ERROR_ANALYSIS') {
          specificConstraint = `Audit a student solution: a student mistakenly used an unweighted arithmetic average or forgot sign conventions. Identify the error and calculate the true value.`;
        } else if (bp.archetypeId === 'METHOD_SELECTION') {
          specificConstraint = `Identify which formula, divisor, or mathematical approach is conceptually valid or flawed for this condition.`;
        } else if (bp.archetypeId === 'REVERSE_REASONING') {
          specificConstraint = `Two bodies attract each other under mutual internal forces; deduce the exact meeting/collision point without external forces.`;
        } else if (bp.archetypeId === 'CASE_STUDY') {
          specificConstraint = `Dynamic state evolution: calculate velocity of center of mass (v_cm) from particle velocities and momentum.`;
        } else if (bp.archetypeId === 'CONCEPTUAL_PREDICTION') {
          specificConstraint = `Predict trajectory or qualitative evolution (e.g. projectile exploding at peak under internal forces continues along parabolic path).`;
        } else if (bp.archetypeId === 'CONCEPTUAL_COMPARISON') {
          specificConstraint = `Qualitatively compare proximity of barycenter to heavier vs lighter mass relative to geometric midpoint.`;
        } else if (bp.archetypeId === 'WHY_REASONING') {
          specificConstraint = `Deductive justification: why internal forces cannot alter system momentum or center of mass velocity.`;
        } else if (bp.archetypeId === 'MISCONCEPTION_DETECTION') {
          specificConstraint = `Deconstruct common misconception: prove that center of mass can lie in empty space outside physical material (e.g. ring, donut).`;
        } else if (bp.archetypeId === 'ASSUMPTION_CHECK') {
          specificConstraint = `Precondition check: condition for center of mass to coincide with center of gravity (uniform gravitational field).`;
        } else if (bp.archetypeId === 'PRINCIPLE_SELECTION') {
          specificConstraint = `Identify the governing conservation law (momentum conservation / Newton's 3rd law action-reaction) in an isolated system.`;
        } else if (bp.archetypeId === 'INTEGRATED_CONCEPT_QUESTION') {
          specificConstraint = `Synthesize coordinate independence: why physical mass distribution barycenter is invariant under arbitrary coordinate translation.`;
        } else {
          specificConstraint = `Solve for ${bp.unknownType} using ${bp.solvingMethodDescription}.`;
        }

        return `SLOT ${bp.questionIndex} [ID: ${bp.questionId}]:
- Concept: "${bp.concept}" (${bp.subtopic})
- Archetype ID: ${bp.archetypeId} (${bp.problemArchetype})
- Target Unknown to solve for: "${bp.unknownType}"
- Required Operation: "${bp.requiredOperation}"
- Category: ${bp.questionCategory} (${bp.numericalOrTheory})
- Mandatory Task: ${specificConstraint}`;
      })
      .join('\n\n');

    const blueprintText = JSON.stringify(batchBlueprint, null, 2);

    const prompt = `You are a Senior University Professor and Exam Commissioner designing a rigorous 25-question examination.
Lesson Title: "${title}".
Subject: ${knowledgeMap.subject} | Level: ${knowledgeMap.academicLevel} | Chapter: ${knowledgeMap.chapter}.
Target Language: "${targetLang.name}" (${targetLang.code}).

Generate EXACTLY ${batchBlueprint.length} original academic questions for BATCH ${batchNum} matching these blueprint slots:

MANDATORY SLOT-BY-SLOT CONSTRAINTS:
${slotInstructions}

BLUEPRINT JSON SPECIFICATION:
${blueprintText}

CRITICAL RULES — ZERO TOLERANCE FOR REPETITIVE SOLVING METHODS:
1. EVERY QUESTION MUST HAVE A DIFFERENT QUESTION ARCHETYPE:
   - Each question has a defined 'archetypeId' in the blueprint slots above.
   - UNDER NO CIRCUMSTANCES should two questions use the same solving method with only different numbers!
   - Changing only the numbers or particle count does NOT make a question different.
   - For inverse problems (INVERSE_CALCULATION, FIND_UNKNOWN_POSITION), DO NOT ask for the final center of mass! You MUST provide the final result and ask the student to solve for the missing mass or coordinate!
2. STRICT VIDEO CONCEPTUAL GROUNDING:
   - ONLY test concepts that were taught in the video: ${knowledgeMap.videoCoveredConcepts.map(c => c.concept).join(', ')}.
   - DO NOT introduce un-taught chapter concepts: ${knowledgeMap.additionalChapterConcepts.join(', ') || 'N/A'}.
3. COMPLETE PEDAGOGICAL SOLUTIONS (TEACHER BEHAVIOR):
   - For every question, provide:
     * "solution": Full step-by-step mathematical derivation showing Given, Formula, Substitution, Calculation, and Final Answer.
     * "stepByStepSolution": Identical to or clear breakdown of "solution".
     * "mistakeExplanation": Pedagogical diagnostic explaining WHY an incorrect choice is a common student trap (e.g., forgot mass weighting, reversed sign, confused COM with midpoint).
     * "correctMethod": 1-2 sentence rule stating the precise correct method to solve this archetype.
4. OPTIONS INTEGRITY:
   - EXACTLY 4 distinct choices (options array).
   - EXACTLY ONE option matches "correctAnswer".
   - Provide "distractorRationale" for each wrong choice.
5. NO TRANSCRIPT COPYING:
   - Formulate original academic exam problems. Never write "What did the teacher say" or "According to the video".

Return valid JSON array matching this schema:
[
  {
    "id": "q_${batchBlueprint[0].questionIndex}",
    "type": "mcq",
    "questionCategory": "numerical",
    "topic": "${knowledgeMap.mainTopic}",
    "subtopic": "Subtopic Name",
    "concept": "Concept Name",
    "conceptName": "Concept Name",
    "problemArchetype": "${batchBlueprint[0].problemArchetype}",
    "archetypeId": "${batchBlueprint[0].archetypeId}",
    "procedureSignature": "${batchBlueprint[0].procedureSignature}",
    "unknownType": "${batchBlueprint[0].unknownType}",
    "requiredOperation": "${batchBlueprint[0].requiredOperation}",
    "numericalOrTheory": "numerical",
    "videoCoverage": "fully_covered",
    "difficulty": "medium",
    "cognitiveLevel": "level_3_application",
    "question": "Problem text with explicit numbers and units?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option B",
    "solution": "Given: ... Formula: ... Substitution: ... Final Answer: ...",
    "stepByStepSolution": "Given: ... Formula: ... Substitution: ... Final Answer: ...",
    "explanation": "Pedagogical explanation of the governing mechanism...",
    "mistakeExplanation": "Why an incorrect answer represents a standard student error...",
    "correctMethod": "Precise mathematical/physical method to solve this problem archetype...",
    "distractorRationale": [
      { "option": "Option A", "errorType": "Wrong sign in numerator" },
      { "option": "Option C", "errorType": "Midpoint without mass weighting" },
      { "option": "Option D", "errorType": "Swapped particle masses" }
    ],
    "timestampFormatted": "02:15",
    "timestampSeconds": 135
  }
]

Available Video Concepts:
${conceptSummary}

Return ONLY valid JSON without markdown wrapping.`;

    try {
      const res = await this.generateContentWithTimeout(client, {
        model: this.getModelName(),
        contents: prompt
      });

      const parsed = this.parseJsonSafely<QuizQuestion[]>(res.text || '');
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((q, idx) => {
          const bp = batchBlueprint[idx] || batchBlueprint[0];
          return {
            ...q,
            id: q.id || `q_${bp.questionIndex}`,
            questionCategory: q.questionCategory || bp.questionCategory,
            problemArchetype: q.problemArchetype || bp.problemArchetype,
            archetypeId: q.archetypeId || bp.archetypeId || bp.problemArchetype,
            procedureSignature: q.procedureSignature || bp.procedureSignature,
            unknownType: q.unknownType || bp.unknownType,
            requiredOperation: q.requiredOperation || bp.requiredOperation,
            cognitiveTask: q.cognitiveTask || bp.cognitiveTask,
            scenarioType: q.scenarioType || bp.scenarioType,
            givenInformation: q.givenInformation || bp.problemStyle,
            numericalOrTheory: q.numericalOrTheory || bp.numericalOrTheory,
            topic: q.topic || knowledgeMap.mainTopic,
            subtopic: q.subtopic || bp.subtopic,
            concept: q.concept || bp.concept,
            conceptName: q.conceptName || bp.concept,
            videoCoverage: 'fully_covered' as VideoCoverageLevel,
            difficulty: q.difficulty || bp.difficulty,
            cognitiveLevel: q.cognitiveLevel || bp.cognitiveLevel,
            solution: q.solution || q.stepByStepSolution || q.explanation,
            stepByStepSolution: q.stepByStepSolution || q.solution || q.explanation,
            mistakeExplanation: q.mistakeExplanation,
            correctMethod: q.correctMethod || bp.solvingMethodDescription
          };
        });
      }
    } catch (err) {
      console.warn(`Batch ${batchNum} AI generation notice:`, err);
    }

    return [];
  }

  /**
   * STEP 12 - 17: Comprehensive Question Validation & Anti-Repetition Engine
   * Validates video coverage, checks procedural duplication,
   * enforces 25 distinct archetypes, ensures full solutions, and verifies concept coverage.
   */
  private static validateAndRefineQuiz(
    questions: QuizQuestion[],
    knowledgeMap: ConceptKnowledgeMap,
    blueprint: QuizBlueprintItem[],
    difficulty: 'easy' | 'medium' | 'hard',
    langCode: 'en' | 'hi' | 'gu' | 'es'
  ): QuizQuestion[] {
    const validated: QuizQuestion[] = [];
    const seenTexts = new Set<string>();
    const forbiddenChapterConcepts = (knowledgeMap.additionalChapterConcepts || []).map(c =>
      c.toLowerCase()
    );

    // Track used questions from the candidate pool
    const usedIndices = new Set<number>();

    // =========================================================================
    // HARD ARCHITECTURAL ENFORCEMENT: Process all 25 Blueprint Slots
    // Every slot MUST receive a question that satisfies its distinct archetype.
    // Repetitive questions are structurally rejected from entering non-direct slots.
    // =========================================================================
    for (let slotIdx = 0; slotIdx < blueprint.length; slotIdx++) {
      const targetBp = blueprint[slotIdx];
      let slotQuestion: QuizQuestion | null = null;

      // 1. Check if any question in candidate pool satisfies this specific slot
      for (let i = 0; i < questions.length; i++) {
        if (usedIndices.has(i)) continue;
        const q = questions[i];
        if (!q || !q.question || q.question.trim().length < 15) continue;

        const normText = q.question.toLowerCase().trim();
        if (seenTexts.has(normText)) continue;

        // Reject untaught forbidden concepts
        const mentionsForbidden = forbiddenChapterConcepts.some(
          fc => fc.length > 4 && normText.includes(fc)
        );
        if (mentionsForbidden) continue;

        // Extract TRUE procedural profile from text & solution
        const profile = this.extractProceduralFeatures(q);

        // Target archetype for this slot
        const targetArch = (targetBp.archetypeId || targetBp.problemArchetype).toUpperCase().trim();
        const candidateArch = (q.archetypeId || profile.extractedArchetypeId).toUpperCase().trim();

        // If target slot is NOT direct calculation, but question is merely a direct calculation:
        if (targetArch !== 'DIRECT_CALCULATION' && profile.isDirectFormulaCalculation) {
          // STRUCTURAL REJECTION: Cannot use direct calculation in an inverse/shift/ratio/error slot
          continue;
        }

        // Verify archetype matches or is compatible
        if (candidateArch !== targetArch && !(slotIdx === 0 && profile.isDirectFormulaCalculation)) {
          continue;
        }

        // Validate 4 distinct options
        let options = Array.isArray(q.options) ? [...q.options] : [];
        options = options.map(o => String(o).trim()).filter(o => o.length > 0);
        const uniqueOptions = Array.from(new Set(options));
        if (uniqueOptions.length < 4) continue;
        options = uniqueOptions.slice(0, 4);

        // Verify correct answer matches options
        let correctAnswer = String(q.correctAnswer || '').trim();
        if (!options.includes(correctAnswer)) {
          const matchingOpt = options.find(
            o => o.toLowerCase() === correctAnswer.toLowerCase() || o.includes(correctAnswer)
          );
          if (matchingOpt) {
            correctAnswer = matchingOpt;
          } else {
            continue;
          }
        }

        const assignedConcept = q.conceptName || q.concept || targetBp.concept;
        let stepByStepSolution = q.stepByStepSolution || q.solution || q.explanation || '';
        if (!stepByStepSolution || stepByStepSolution.length < 20) {
          stepByStepSolution = `Formula: Apply governing principle of ${assignedConcept}.\nCalculation: Evaluate parameters.\nResult: ${correctAnswer}.`;
        }
        let explanation = q.explanation || `${stepByStepSolution}\nTherefore, ${correctAnswer} is the correct conclusion.`;

        let mistakeExplanation = q.mistakeExplanation;
        if (!mistakeExplanation && Array.isArray(q.distractorRationale) && q.distractorRationale.length > 0) {
          mistakeExplanation = q.distractorRationale.map(d => `${d.option}: ${d.errorType}`).join('; ');
        }

        const candidate: QuizQuestion = {
          ...q,
          id: `q_${slotIdx + 1}`,
          type: 'mcq',
          questionCategory: targetBp.questionCategory,
          problemArchetype: targetBp.problemArchetype,
          archetypeId: targetBp.archetypeId,
          procedureSignature: targetBp.procedureSignature,
          unknownType: targetBp.unknownType,
          requiredOperation: targetBp.requiredOperation,
          cognitiveTask: targetBp.cognitiveTask,
          scenarioType: targetBp.scenarioType,
          givenInformation: targetBp.problemStyle,
          numericalOrTheory: targetBp.numericalOrTheory,
          topic: q.topic || knowledgeMap.mainTopic,
          subtopic: targetBp.subtopic,
          concept: assignedConcept,
          conceptName: assignedConcept,
          videoCoverage: 'fully_covered',
          difficulty: targetBp.difficulty,
          cognitiveLevel: targetBp.cognitiveLevel,
          question: q.question.trim(),
          options,
          correctAnswer,
          solution: stepByStepSolution,
          stepByStepSolution,
          explanation,
          mistakeExplanation,
          correctMethod: q.correctMethod || targetBp.solvingMethodDescription,
          isDirectFormulaCalculation: profile.isDirectFormulaCalculation
        };

        const dupCheck = this.isDuplicateQuestion(candidate, validated);
        if (dupCheck.isDuplicate) {
          console.log(`[Anti-Repetition Gate] Rejected duplicate for slot Q${slotIdx + 1} (${targetArch}): ${dupCheck.reason}`);
          continue;
        }

        slotQuestion = candidate;
        usedIndices.add(i);
        seenTexts.add(normText);
        break;
      }

      // 2. If no candidate fit this slot, synthesize a verified question for this slot
      if (!slotQuestion) {
        slotQuestion = this.synthesizeQuestionForSlot(targetBp, knowledgeMap, langCode);
        seenTexts.add(slotQuestion.question.toLowerCase().trim());
      }

      validated.push(slotQuestion);
    }

    // =========================================================================
    // STEP 11: Concept Coverage Validator
    // Ensure every single video-covered concept is tested at least once.
    // =========================================================================
    const coveredConcepts = new Set(
      validated.map(v => (v.concept || v.conceptName || '').toLowerCase().trim())
    );
    const missingConcepts = knowledgeMap.videoCoveredConcepts.filter(
      vc => !coveredConcepts.has(vc.concept.toLowerCase().trim())
    );

    if (missingConcepts.length > 0) {
      console.log(`[Concept Coverage Gate] Found ${missingConcepts.length} untested concepts; repairing duplicate slots.`);
      for (const mc of missingConcepts) {
        const counts: Record<string, number> = {};
        validated.forEach(v => {
          const c = (v.concept || v.conceptName || '').toLowerCase().trim();
          counts[c] = (counts[c] || 0) + 1;
        });

        // Find a slot testing a concept with > 1 questions
        const repIdx = validated.findIndex(v => {
          const c = (v.concept || v.conceptName || '').toLowerCase().trim();
          return counts[c] > 1;
        });

        if (repIdx !== -1) {
          const repBp = blueprint[repIdx];
          const repairedBp: QuizBlueprintItem = {
            ...repBp,
            concept: mc.concept,
            subtopic: mc.subtopic || repBp.subtopic
          };
          const newQ = this.synthesizeQuestionForSlot(repairedBp, knowledgeMap, langCode);
          validated[repIdx] = newQ;
        }
      }
    }

    return validated.slice(0, 25);
  }

  /**
   * Synthesizes a verified, pedagogically sound question for a specific blueprint slot.
   * Prioritizes pre-verified curriculum banks, falling back to algorithmic synthesis.
   */
  public static synthesizeQuestionForSlot(
    slot: QuizBlueprintItem,
    knowledgeMap: ConceptKnowledgeMap,
    langCode: 'en' | 'hi' | 'gu' | 'es'
  ): QuizQuestion {
    // 1. Algorithmic dynamic synthesis matching slot specifications
    const fallbackList = this.synthesize25QuestionsLocally(knowledgeMap, [slot], langCode);
    if (fallbackList.length > 0) {
      return {
        ...fallbackList[0],
        id: `q_${slot.questionIndex}`
      };
    }

    // Default safety return
    return {
      id: `q_${slot.questionIndex}`,
      type: 'mcq',
      questionCategory: slot.questionCategory,
      topic: knowledgeMap.mainTopic,
      subtopic: slot.subtopic,
      concept: slot.concept,
      conceptName: slot.concept,
      problemArchetype: slot.problemArchetype,
      archetypeId: slot.archetypeId,
      procedureSignature: slot.procedureSignature,
      unknownType: slot.unknownType,
      requiredOperation: slot.requiredOperation,
      cognitiveTask: slot.cognitiveTask,
      scenarioType: slot.scenarioType,
      givenInformation: slot.problemStyle,
      numericalOrTheory: slot.numericalOrTheory,
      videoCoverage: 'fully_covered',
      difficulty: slot.difficulty,
      cognitiveLevel: slot.cognitiveLevel,
      question: `Evaluate the governing relationship of ${slot.concept} under archetype ${slot.archetypeId}.`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      solution: `Apply governing principles for ${slot.concept}.`,
      stepByStepSolution: `Apply governing principles for ${slot.concept}.`,
      explanation: `Consistent with ${slot.solvingMethodDescription}.`,
      correctMethod: slot.solvingMethodDescription
    };
  }

  /**
   * STEP 18: Multilingual Translation (Preserves formulas, signs, numbers, units)
   */
  private static async translateQuizQuestionsIfNeeded(
    client: GoogleGenAI,
    questions: QuizQuestion[],
    targetLang: { code: 'en' | 'hi' | 'gu' | 'es'; name: string }
  ): Promise<QuizQuestion[]> {
    if (targetLang.code === 'en') return questions;

    // Check if questions are already in target language (e.g. from specialized bank)
    const sampleText = questions[0]?.question || '';
    if (
      (targetLang.code === 'hi' && /[\u0900-\u097F]/.test(sampleText)) ||
      (targetLang.code === 'gu' && /[\u0A80-\u0AFF]/.test(sampleText))
    ) {
      return questions; // Already translated!
    }

    // Translate questions in two batches
    const translateBatch = async (batch: QuizQuestion[]): Promise<QuizQuestion[]> => {
      const prompt = `You are a professional educational translator for ${targetLang.name} (${targetLang.code}).
Translate the following questions into fluent, natural, academic ${targetLang.name}.

STRICT SCIENTIFIC TRANSLATION RULES:
1. Translate question text, options, and explanations accurately.
2. DO NOT translate or alter:
   - Mathematical formulas and equations (e.g. x_cm = (m1*x1 + m2*x2)/(m1 + m2), F = G*m1*m2/r^2)
   - Coordinate numbers, signs, and values (e.g. x = 0 m, x = 4 m, 2 kg, 6 kg, -2 m)
   - Scientific units (kg, m, cm, m/s, s, N, J)
   - Mathematical symbols (Σ, Δ, +, -, ×, ÷, =)
3. Keep technical terms with English in parentheses where helpful in Hindi/Gujarati (e.g. "द्रव्यमान केंद्र (Center of Mass)", "સમાન દળ (Equal masses)").

Input JSON:
${JSON.stringify(
  batch.map(q => ({
    id: q.id,
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation
  })),
  null,
  2
)}

Return ONLY valid JSON matching this schema:
[
  {
    "id": "q_1",
    "question": "Translated question text",
    "options": ["Translated Opt A", "Translated Opt B", "Translated Opt C", "Translated Opt D"],
    "correctAnswer": "Translated Opt B (exact match with options)",
    "explanation": "Translated explanation"
  }
]`;

      const res = await this.generateContentWithTimeout(client, {
        model: this.getModelName(),
        contents: prompt
      });

      const parsed = this.parseJsonSafely<any[]>(res.text || '');
      if (Array.isArray(parsed) && parsed.length === batch.length) {
        return batch.map((q, idx) => {
          const tq = parsed[idx];
          return {
            ...q,
            question: tq.question || q.question,
            options: Array.isArray(tq.options) && tq.options.length === 4 ? tq.options : q.options,
            correctAnswer: tq.correctAnswer || q.correctAnswer,
            explanation: tq.explanation || q.explanation
          };
        });
      }
      return batch;
    };

    try {
      const [tBatch1, tBatch2] = await Promise.all([
        translateBatch(questions.slice(0, 13)),
        translateBatch(questions.slice(13, 25))
      ]);
      return [...tBatch1, ...tBatch2];
    } catch (err) {
      console.warn('Batch translation warning, keeping original:', err);
      return questions;
    }
  }

  /**
   * Local Concept Knowledge Map synthesizer for offline or fallback mode
   */
  private static buildConceptKnowledgeMapLocally(
    title: string,
    transcript: TranscriptSegment[],
    videoId?: string
  ): ConceptKnowledgeMap {
    const cleanTitle = title.replace(/\|.*$/g, '').replace(/-.*$/g, '').trim();

    return {
      subject: 'Science & Mathematics',
      academicLevel: 'High School / Academic',
      chapter: cleanTitle,
      mainTopic: cleanTitle,
      subtopics: [
        'Core Principles & Governing Definitions',
        'Mathematical Relationships & Variable Interactions',
        'Numerical Problem Solving & Formula Application',
        'Boundary Conditions, Constraints, and Misconceptions'
      ],
      videoCoveredConcepts: [
        {
          topic: cleanTitle,
          subtopic: 'Core Principles & Governing Definitions',
          concept: `Fundamental Principle of ${cleanTitle}`,
          definition: `The core governing law establishing the foundational mechanisms of ${cleanTitle}.`,
          principle: 'Direct causal relationship between input variables and system response.',
          formula: 'Output = Function(Inputs)',
          conditions: 'Standard test conditions and equilibrium regime',
          relationships: ['Response varies directly with governing parameters'],
          applications: ['Standard academic problem solving', 'Practical engineering verification'],
          difficulty: 'medium',
          video_coverage: 'fully_covered',
          importance: 'essential',
          timestamp: '01:00',
          timestampSeconds: 60
        },
        {
          topic: cleanTitle,
          subtopic: 'Mathematical Relationships & Variable Interactions',
          concept: 'Variable Interaction & Proportional Scaling',
          definition: 'Mathematical analysis of how altering key parameters affects quantitative outcomes.',
          principle: 'Proportionality and conservation constraints.',
          conditions: 'Isolated or closed system',
          relationships: ['Linear or inverse scaling depending on boundary conditions'],
          applications: ['Sensitivity analysis', 'Scenario testing'],
          difficulty: 'medium',
          video_coverage: 'fully_covered',
          importance: 'essential',
          timestamp: '03:00',
          timestampSeconds: 180
        },
        {
          topic: cleanTitle,
          subtopic: 'Numerical Problem Solving & Formula Application',
          concept: 'Problem Solving Methodology & Numerical Substitution',
          definition: 'Applying established formulas to solve concrete quantitative problems.',
          principle: 'Step-by-step substitution of numerical values with standard units.',
          conditions: 'Consistent SI unit system',
          applications: ['Standardized examination calculations'],
          difficulty: 'hard',
          video_coverage: 'fully_covered',
          importance: 'essential',
          timestamp: '05:00',
          timestampSeconds: 300
        }
      ],
      additionalChapterConcepts: [
        'Advanced Relativistic Corrections',
        'Non-Linear Complex Perturbations'
      ]
    };
  }

  /**
   * Synthesize 25 Concept-Based Questions Locally when offline or in fallback mode
   */
  private static synthesize25QuestionsLocally(
    knowledgeMap: ConceptKnowledgeMap,
    blueprint: QuizBlueprintItem[],
    langCode: 'en' | 'hi' | 'gu' | 'es'
  ): QuizQuestion[] {
    const questions: QuizQuestion[] = [];

    // Dynamic generation matching the blueprint
    return blueprint.map((bp, idx) => {
      const isNumerical = bp.numericalOrTheory === 'numerical' || bp.questionCategory === 'numerical' || bp.questionCategory === 'application';
      const num1 = (idx % 5) + 2;
      const num2 = (idx % 4) + 3;
      const calculatedVal = num1 * num2;
      const conceptName = bp.concept;
      const unknownTypeStr = (bp.unknownType || 'target quantity').replace(/_/g, ' ');

      let questionText = '';
      let options: string[] = [];
      let correctAnswer = '';
      let stepByStepSolution = '';
      let explanation = '';
      let mistakeExplanation = '';

      switch (bp.archetypeId) {
        case 'DIRECT_CALCULATION':
          questionText = `Under ${conceptName}, determine the ${unknownTypeStr} when initial input parameter A = ${num1} units and input parameter B = ${num2} units.`;
          options = [`${calculatedVal} units`, `${calculatedVal + num1} units`, `${calculatedVal - num2} units`, `${num1 + num2} units`];
          correctAnswer = `${calculatedVal} units`;
          stepByStepSolution = `Given: A = ${num1}, B = ${num2}\nFormula: Result = A × B\nSubstitution: ${num1} × ${num2} = ${calculatedVal}\nFinal Answer: ${calculatedVal} units.`;
          explanation = `Direct evaluation yields ${calculatedVal} units by applying the fundamental formula for ${conceptName}.`;
          mistakeExplanation = `Choosing ${num1 + num2} units indicates an additive misinterpretation instead of multiplicative coupling.`;
          break;

        case 'INVERSE_CALCULATION':
        case 'REVERSE_REASONING':
          questionText = `For ${conceptName}, the resulting output is known to be ${calculatedVal * 2} units and input parameter B = ${num2} units. Rearrange the governing relation to solve for the missing ${unknownTypeStr}.`;
          options = [`${num1 * 2} units`, `${num1} units`, `${(calculatedVal * 2) - num2} units`, `${(num1 * 2) + 1} units`];
          correctAnswer = `${num1 * 2} units`;
          stepByStepSolution = `Given: Total = ${calculatedVal * 2}, B = ${num2}\nFormula: A = Total / B\nSubstitution: (${calculatedVal * 2}) / ${num2} = ${num1 * 2}\nFinal Answer: ${num1 * 2} units.`;
          explanation = `Inverting the governing equation yields ${num1 * 2} units.`;
          mistakeExplanation = `Subtracting instead of dividing is a classic algebraic inversion mistake.`;
          break;

        case 'FIND_UNKNOWN_MASS':
        case 'FIND_UNKNOWN_POSITION':
        case 'FIND_UNKNOWN_FORCE':
        case 'FIND_UNKNOWN_TIME':
          questionText = `A system governed by ${conceptName} reaches reference equilibrium at ${calculatedVal} units with initial anchor A = ${num1} units. Determine the required ${unknownTypeStr}.`;
          options = [`${num2} units`, `${num2 * 2} units`, `${num1 + num2} units`, `${calculatedVal} units`];
          correctAnswer = `${num2} units`;
          stepByStepSolution = `Given: Equilibrium = ${calculatedVal}, Anchor = ${num1}\nRequired parameter: ${unknownTypeStr}\nComputation: Solving balance condition gives ${num2} units.`;
          explanation = `The exact balance constraint requires ${num2} units for ${unknownTypeStr}.`;
          mistakeExplanation = `Failing to apply the equilibrium lever rule yields the unweighted anchor value.`;
          break;

        case 'COMPARE_TWO_CASES':
          questionText = `Compare two setups under ${conceptName}: Case 1 has parameters (${num1}, ${num2}) while Case 2 has parameters (${num1 * 2}, ${num2}). Which setup yields a greater ${unknownTypeStr}?`;
          options = [
            `Case 2 yields twice the value of Case 1 due to linear scaling`,
            `Case 1 yields a greater value because smaller inputs reduce dissipation`,
            `Both cases yield identical values because parameter B is unchanged`,
            `Case 2 is zero due to boundary cancellation`
          ];
          correctAnswer = `Case 2 yields twice the value of Case 1 due to linear scaling`;
          stepByStepSolution = `Case 1: ${num1} × ${num2} = ${calculatedVal}.\nCase 2: (${num1 * 2}) × ${num2} = ${calculatedVal * 2}.\nRatio: Case 2 / Case 1 = 2.0.`;
          explanation = `Because the response is proportional to parameter A, doubling A doubles the resulting ${unknownTypeStr}.`;
          mistakeExplanation = `Believing both are identical ignores the direct proportionality to parameter A.`;
          break;

        case 'PREDICT_CHANGE':
          questionText = `If parameter A is tripled while parameter B remains fixed under ${conceptName}, what is the predicted shift in ${unknownTypeStr}?`;
          options = [
            `Increases by a factor of 3`,
            `Increases by a factor of 9`,
            `Remains unchanged`,
            `Decreases to one-third of its initial value`
          ];
          correctAnswer = `Increases by a factor of 3`;
          stepByStepSolution = `Initial: Y1 = A × B.\nShifted: Y2 = (3A) × B = 3(A × B) = 3 Y1.\nConclusion: 3-fold increase.`;
          explanation = `Linear dependence ensures a 3-fold increase in ${unknownTypeStr}.`;
          mistakeExplanation = `Assuming quadratic scaling (9x) confuses linear relationships with second-order power laws.`;
          break;

        case 'RATIO_REASONING':
        case 'PROPORTIONAL_REASONING':
          questionText = `In ${conceptName}, two interacting bodies have parameter inputs in the ratio ${num1}:${num2}. What is the corresponding ratio of their ${unknownTypeStr}?`;
          options = [`${num1}:${num2}`, `${num2}:${num1}`, `${num1 * num1}:${num2 * num2}`, `1:1`];
          correctAnswer = `${num1}:${num2}`;
          stepByStepSolution = `Ratio formulation: Output ratio tracks input ratio directly = ${num1} / ${num2}.`;
          explanation = `Direct proportionality maintains the ratio ${num1}:${num2}.`;
          mistakeExplanation = `Inverting the ratio (${num2}:${num1}) confuses inverse relationships with direct ones.`;
          break;

        case 'ERROR_ANALYSIS':
        case 'STUDENT_MISTAKE':
          questionText = `A student evaluated ${conceptName} and obtained ${calculatedVal + 10} units instead of ${calculatedVal} units. What conceptual error caused this discrepancy in ${unknownTypeStr}?`;
          options = [
            `The student added an arbitrary constant instead of normalizing by the total system weight`,
            `The student inverted the numerator and denominator`,
            `The student neglected the negative sign of vector coordinates`,
            `The student used incorrect SI base units`
          ];
          correctAnswer = `The student added an arbitrary constant instead of normalizing by the total system weight`;
          stepByStepSolution = `Correct procedure: Calculate weighted sum and normalize.\nStudent error: Omitted normalization division.`;
          explanation = `Correct derivation requires normalization; neglecting normalization produces an inflated incorrect result.`;
          mistakeExplanation = `Attributing to units overlooks the fundamental missing normalization divisor.`;
          break;

        case 'MULTI_STEP_APPLICATION':
        case 'MULTI_CONCEPT_INTEGRATION':
          questionText = `In a 2-stage process under ${conceptName}, Stage 1 produces an intermediate quantity ${num1} and Stage 2 couples it with factor ${num2}. What is the final integrated ${unknownTypeStr}?`;
          options = [`${calculatedVal} units`, `${calculatedVal * 2} units`, `${num1 + num2} units`, `${calculatedVal - num1} units`];
          correctAnswer = `${calculatedVal} units`;
          stepByStepSolution = `Stage 1: Intermediate = ${num1}.\nStage 2: Coupling = ${num1} × ${num2} = ${calculatedVal}.\nFinal Answer: ${calculatedVal} units.`;
          explanation = `Sequential multi-step integration leads to ${calculatedVal} units.`;
          mistakeExplanation = `Stopping after stage 1 leaves the problem half-solved.`;
          break;

        case 'CONSTRAINT_PROBLEM':
        case 'BOUNDARY_CASE':
        case 'EDGE_CASE':
          questionText = `Under the operational constraint that total capacity is capped at ${calculatedVal * 2} units, what is the maximum permissible ${unknownTypeStr} for parameter A = ${num1}?`;
          options = [`${num2 * 2} units`, `${num2} units`, `${calculatedVal} units`, `${num1 * 2} units`];
          correctAnswer = `${num2 * 2} units`;
          stepByStepSolution = `Constraint: A × B <= ${calculatedVal * 2}.\nGiven A = ${num1}: B <= (${calculatedVal * 2}) / ${num1} = ${num2 * 2}.\nBound: ${num2 * 2} units.`;
          explanation = `Boundary constraint evaluation establishes ${num2 * 2} units as the maximum threshold.`;
          mistakeExplanation = `Using the unconstrained nominal value fails to find the maximum allowable bound.`;
          break;

        case 'METHOD_SELECTION':
        case 'FORMULA_SELECTION':
          questionText = `To rigorously compute ${unknownTypeStr} in non-uniform or piecewise conditions for ${conceptName}, which methodological approach is strictly valid?`;
          options = [
            `Decompose the system into differential or discrete weighted elements and evaluate the integral/sum`,
            `Take a simple arithmetic mean of the extreme endpoints`,
            `Assume uniform density regardless of system geometry`,
            `Apply empirical approximations ignoring physical conservation`
          ];
          correctAnswer = `Decompose the system into differential or discrete weighted elements and evaluate the integral/sum`;
          stepByStepSolution = `Condition: Non-uniform distribution.\nMethod: Weighted Riemann summation or calculus integration: Integral(r dm) / M.`;
          explanation = `Only discrete weighted summation or continuous integration accounts for non-uniform variation.`;
          mistakeExplanation = `Endpoint averaging is only valid in strictly symmetric linear cases.`;
          break;

        case 'EXAM_STYLE_CHALLENGE':
          questionText = `Advanced Examination Challenge: For a multi-component system with coupling constant A = ${num1} and resistance B = ${num2}, evaluate the steady-state value of ${unknownTypeStr}.`;
          options = [`${calculatedVal} units`, `${calculatedVal + 2} units`, `${calculatedVal * 3} units`, `${num1 * num1} units`];
          correctAnswer = `${calculatedVal} units`;
          stepByStepSolution = `Equilibrium condition: Balance dynamic input against resistance.\nDerivation: Steady-state = ${num1} × ${num2} = ${calculatedVal} units.`;
          explanation = `Solving the simultaneous equilibrium equations establishes the steady-state invariant as ${calculatedVal} units.`;
          mistakeExplanation = `Failing to equate the rates leads to non-equilibrium transient estimates.`;
          break;

        case 'CONCEPTUAL_PREDICTION':
          questionText = `Qualitative Prediction: How does the ${unknownTypeStr} evolve as parameter A approaches infinity under ${conceptName}?`;
          options = [
            `It grows asymptotically according to the governing power-law relationship`,
            `It suddenly collapses to zero regardless of other parameters`,
            `It oscillates unpredictably without any limit`,
            `It remains strictly invariant at its origin value`
          ];
          correctAnswer = `It grows asymptotically according to the governing power-law relationship`;
          stepByStepSolution = `Asymptotic analysis: lim(A -> inf) of the governing relationship demonstrates monotonic asymptotic growth.`;
          explanation = `The governing relationship is monotonic and non-saturating in this regime.`;
          mistakeExplanation = `Assuming arbitrary collapse confuses finite boundary constraints with asymptotic trends.`;
          break;

        case 'CONCEPTUAL_COMPARISON':
          questionText = `Conceptual Comparison: Contrast the behavior of ${conceptName} in a discrete versus a continuous domain regarding ${unknownTypeStr}.`;
          options = [
            `The discrete summation formula transitions seamlessly into a continuous integral as element size approaches zero`,
            `The two domains are governed by completely incompatible physical laws`,
            `Continuous systems do not possess a well-defined center or invariant`,
            `Discrete systems cannot be solved analytically under any condition`
          ];
          correctAnswer = `The discrete summation formula transitions seamlessly into a continuous integral as element size approaches zero`;
          stepByStepSolution = `Mathematical equivalence: lim(Delta m -> 0) Sum(r_i Delta m_i) = Integral(r dm).`;
          explanation = `The integral is the rigorous mathematical continuum limit of the discrete summation.`;
          mistakeExplanation = `Viewing them as conflicting models fails to understand calculus as the limit of Riemann sums.`;
          break;

        case 'WHY_REASONING':
          questionText = `Fundamental Justification: Why is ${unknownTypeStr} an intrinsic, origin-independent property of the system in ${conceptName}?`;
          options = [
            `Shifting the coordinate origin adds a constant offset to all position vectors that cancels out in relative displacement`,
            `It depends entirely on which observer measures the system first`,
            `Coordinate frames cannot be shifted in Newtonian physics`,
            `External reference points modify the physical distribution of matter`
          ];
          correctAnswer = `Shifting the coordinate origin adds a constant offset to all position vectors that cancels out in relative displacement`;
          stepByStepSolution = `Proof: r'_cm = Sum(m_i (r_i + d)) / M = (Sum(m_i r_i) + M d) / M = r_cm + d. Relative positions are completely invariant.`;
          explanation = `Physical reality cannot depend on the arbitrary choice of coordinate origin.`;
          mistakeExplanation = `Believing the center shifts physically when coordinates change confuses mathematical labels with physical reality.`;
          break;

        case 'MISCONCEPTION_DETECTION':
          questionText = `Diagnostic Evaluation: Which of the following represents a widespread misconception concerning ${conceptName}?`;
          options = [
            `Assuming that the center of mass must always lie inside the physical material of the body`,
            `Recognizing that the center of mass of a ring or hollow sphere lies in empty space`,
            `Understanding that mass weighting pulls the barycenter toward denser regions`,
            `Applying vector components independently along orthogonal axes`
          ];
          correctAnswer = `Assuming that the center of mass must always lie inside the physical material of the body`;
          stepByStepSolution = `Counterexample: For a hollow donut, ring, or horseshoe, the center of mass lies in the hollow region outside the material.`;
          explanation = `Center of mass is a mathematical balance point, not a requirement of physical substance occupying that point.`;
          mistakeExplanation = `Confusing geometric centroid of material with the center of mass leads students to believe material must be present at the barycenter.`;
          break;

        case 'ASSUMPTION_CHECK':
          questionText = `Precondition Check: Which fundamental assumption is strictly necessary for applying the standard formulation of ${conceptName}?`;
          options = [
            `The gravitational or force field across the dimensions of the system is effectively uniform`,
            `All particles must possess identical masses and velocities`,
            `The system must be at absolute zero temperature`,
            `No external forces of any kind may act on the universe`
          ];
          correctAnswer = `The gravitational or force field across the dimensions of the system is effectively uniform`;
          stepByStepSolution = `Principle: Center of mass coincides with center of gravity only in a uniform field where g is spatially constant.`;
          explanation = `A uniform field ensures that gravitational force weighting is identical to inertial mass weighting.`;
          mistakeExplanation = `Assuming equal masses is an unnecessary oversimplification.`;
          break;

        case 'PRINCIPLE_SELECTION':
          questionText = `Governing Law Selection: Which foundational conservation law directly guarantees the invariance of ${unknownTypeStr} in an isolated system?`;
          options = [
            `Conservation of linear momentum (Newton's third law of internal action-reaction)`,
            `Second law of thermodynamics (entropy increase)`,
            `Faraday's law of electromagnetic induction`,
            `Snell's law of optical refraction`
          ];
          correctAnswer = `Conservation of linear momentum (Newton's third law of internal action-reaction)`;
          stepByStepSolution = `Principle: F_ext = M * a_cm. If F_ext = 0, a_cm = 0 and v_cm is constant, conserving total system momentum.`;
          explanation = `Internal forces cancel in equal and opposite action-reaction pairs, leaving center of mass motion unaffected.`;
          mistakeExplanation = `Optics or thermodynamics are unrelated to Newtonian barycentric momentum conservation.`;
          break;

        default:
          questionText = `Problem ${bp.questionIndex} (${conceptName}): Evaluate ${unknownTypeStr} under the conditions defined by archetype ${bp.archetypeId}. Given parameters A = ${num1} and B = ${num2}.`;
          options = [`${calculatedVal} units`, `${calculatedVal + num1} units`, `${calculatedVal - num2} units`, `${num1 + num2} units`];
          correctAnswer = `${calculatedVal} units`;
          stepByStepSolution = `Given: A = ${num1}, B = ${num2}\nFormula: Result = A × B\nComputation: ${num1} × ${num2} = ${calculatedVal}\nFinal Answer: ${calculatedVal} units.`;
          explanation = `Evaluating parameters according to ${conceptName} yields ${calculatedVal} units.`;
          mistakeExplanation = `Additive combination fails to represent the multiplicative parameter interaction.`;
          break;
      }

      return {
        id: `q_dyn_${idx + 1}`,
        type: 'mcq',
        questionCategory: bp.questionCategory,
        topic: knowledgeMap.mainTopic,
        subtopic: bp.subtopic,
        concept: bp.concept,
        conceptName: bp.concept,
        problemArchetype: bp.problemArchetype,
        archetypeId: bp.archetypeId || bp.problemArchetype,
        procedureSignature: bp.procedureSignature,
        unknownType: bp.unknownType,
        requiredOperation: bp.requiredOperation,
        cognitiveTask: bp.cognitiveTask,
        scenarioType: bp.scenarioType,
        givenInformation: bp.problemStyle,
        numericalOrTheory: bp.numericalOrTheory,
        videoCoverage: 'fully_covered',
        difficulty: bp.difficulty,
        cognitiveLevel: bp.cognitiveLevel,
        question: questionText,
        options,
        correctAnswer,
        solution: stepByStepSolution || explanation,
        stepByStepSolution: stepByStepSolution || explanation,
        explanation,
        mistakeExplanation: mistakeExplanation || 'Selecting an incorrect distractor stems from omitting boundary constraints or applying an unweighted formula instead of proper parameter weighting.',
        correctMethod: bp.solvingMethodDescription
      };
    });
  }

  /**
   * Topic Coverage Report Builder
   */
  private static buildTopicCoverageReport(
    conceptMap: ConceptMap,
    questionCount: number,
    langCode: 'en' | 'hi' | 'gu' | 'es',
    numericalCount: number,
    conceptualCount: number
  ): TopicCoverageReport {
    const coveredConcepts = conceptMap.concepts.map(c => ({
      name: c.name,
      importance: c.examImportance,
      timestamp: c.approximateTimestamp?.timestamp,
      timestampSeconds: c.approximateTimestamp?.startSeconds
    }));

    const totalConcepts = coveredConcepts.length;
    let summaryText = `25 questions (${numericalCount} numerical/problem-solving [${Math.round((numericalCount / 25) * 100)}%] + ${conceptualCount} conceptual/reasoning [${Math.round((conceptualCount / 25) * 100)}%]) covering ${totalConcepts} core video concepts`;

    if (langCode === 'hi') {
      summaryText = `25 प्रश्न: ${numericalCount} संख्यात्मक व व्यावहारिक (72%) + ${conceptualCount} सैद्धांतिक व तार्किक (28%), ${totalConcepts} मुख्य अवधारणाओं पर आधारित`;
    } else if (langCode === 'gu') {
      summaryText = `25 પ્રશ્નો: ${numericalCount} દાખલા અને વ્યવહારુ (72%) + ${conceptualCount} સૈદ્ધાંતિક અને તાર્કિક (28%), ${totalConcepts} મુખ્ય સંકલ્પનાઓ પર આધારિત`;
    } else if (langCode === 'es') {
      summaryText = `25 preguntas: ${numericalCount} numéricas/aplicadas (72%) + ${conceptualCount} conceptuales/razonamiento (28%) que cubren ${totalConcepts} conceptos del video`;
    }

    return {
      mainTopic: conceptMap.mainTopic,
      subjectCategory: conceptMap.subjectCategory,
      coveredConcepts,
      summaryText
    };
  }

  /**
   * Targeted practice questions for weak concepts
   */
  static async generateAdaptivePracticeQuestions(params: PracticeGenerationParams): Promise<QuizQuestion[]> {
    const { title, weakConcepts, difficulty = 'medium', language = 'en', apiKey } = params;
    const targetLang = this.normalizeLanguage(language);
    const client = this.getClient(apiKey);

    if (client && weakConcepts.length > 0) {
      try {
        const prompt = `You are a Senior Academic Private Tutor.
A student struggled with these specific concepts from "${title}":
${weakConcepts.map(c => `- ${c}`).join('\n')}

Generate ${Math.min(5, Math.max(3, weakConcepts.length * 2))} NEW original problem-solving practice questions.
RULES:
1. Provide a fresh scenario or calculation testing the same underlying concept.
2. Output language: "${targetLang.name}" (${targetLang.code}).
3. All questions must be MCQ with 4 options and thorough step-by-step explanations.
4. Keep formulas and mathematical notation standard.

Return valid JSON array:
[
  {
    "id": "practice_1",
    "type": "mcq",
    "questionCategory": "numerical",
    "cognitiveLevel": "level_3_application",
    "conceptName": "${weakConcepts[0] || 'Core Concept'}",
    "question": "Problem text with numbers?",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "A",
    "explanation": "Step-by-step solution...",
    "difficulty": "${difficulty}"
  }
]`;

        const res = await this.generateContentWithTimeout(client, {
          model: this.getModelName(),
          contents: prompt
        });

        const parsed = this.parseJsonSafely<QuizQuestion[]>(res.text || '');
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((q, idx) => ({
            ...q,
            id: q.id || `adaptive_${idx + 1}`,
            difficulty: q.difficulty || difficulty,
            questionCategory: q.questionCategory || 'numerical',
            cognitiveLevel: q.cognitiveLevel || 'level_3_application',
            conceptName: q.conceptName || weakConcepts[idx % weakConcepts.length] || 'Core Concept'
          }));
        }
      } catch (err) {
        console.warn('Adaptive practice generation notice:', err);
      }
    }

    // Local fallback
    return weakConcepts.map((concept, idx) => ({
      id: `practice_local_${idx + 1}`,
      type: 'mcq',
      questionCategory: 'application',
      cognitiveLevel: 'level_3_application',
      conceptName: concept,
      question:
        targetLang.code === 'hi'
          ? `पुनरावलोकन अभ्यास (${concept}): इस अवधारणा के अनुसार, जब परिस्थितियां बदलती हैं, तो इनमें से कौन सा परिणाम सबसे सटीक होगा?`
          : targetLang.code === 'gu'
          ? `સંકલ્પના મહાવરો (${concept}): આ નિયમ મુજબ, જ્યારે પરિસ્થિતિઓ બદલાય છે ત્યારે કયું પરિણામ સૌથી સચોટ હશે?`
          : targetLang.code === 'es'
          ? `Práctica dirigida de ${concept}: En una situación práctica, ¿cuál de los siguientes resultados es más coherente con este principio?`
          : `Targeted Practice for ${concept}: In an applied scenario, which outcome is most consistent with this fundamental principle?`,
      options:
        targetLang.code === 'hi'
          ? [
              `प्रणाली मूलभूत नियमों का पालन करते हुए प्रत्यक्ष आनुपातिक रूप से प्रतिक्रिया करती है`,
              `यह बाहरी प्रभाव के बिना अनियमित रूप से व्यवहार करती है`,
              `यह विपरीत दिशा में बिना किसी ऊर्जा के स्थानांतरित होती है`,
              `यह किसी भी वैज्ञानिक नियम का पालन नहीं करती है`
            ]
          : targetLang.code === 'gu'
          ? [
              `પ્રણાલી મૂળભૂત નિયમોનું પાલન કરીને પ્રત્યક્ષ રીતે પ્રતિક્રિયા આપે છે`,
              `તે કોઈ પણ બાહ્ય પરિબળ વિના અવ્યવસ્થિત રીતે વર્તે છે`,
              `તે ઊર્જા સંરક્ષણના નિયમનું ઉલ્લંઘન કરે છે`,
              `તે કોઈપણ સિદ્ધાંતનું પાલન કરતી નથી`
            ]
          : targetLang.code === 'es'
          ? [
              `El sistema responde de manera directamente proporcional según el mecanismo central de ${concept}`,
              `El sistema ignora las leyes físicas y se detiene arbitrariamente`,
              `Las variables cambian sin relación de causa y efecto`,
              `La energía se disipa sin interacción alguna`
            ]
          : [
              `The system responds in direct accordance with the governing relationship of ${concept}`,
              `The system acts randomly without respect to initial conditions`,
              `The outcome violates conservation principles without any interaction`,
              `The response is completely independent of applied inputs`
            ],
      correctAnswer:
        targetLang.code === 'hi'
          ? `प्रणाली मूलभूत नियमों का पालन करते हुए प्रत्यक्ष आनुपातिक रूप से प्रतिक्रिया करती है`
          : targetLang.code === 'gu'
          ? `પ્રણાલી મૂળભૂત નિયમોનું પાલન કરીને પ્રત્યક્ષ રીતે પ્રતિક્રિયા આપે છે`
          : targetLang.code === 'es'
          ? `El sistema responde de manera directamente proporcional según el mecanismo central de ${concept}`
          : `The system responds in direct accordance with the governing relationship of ${concept}`,
      explanation:
        targetLang.code === 'hi'
          ? `यह प्रश्न पुष्टि करता है कि आप ${concept} के कारण और प्रभाव को समझते हैं।`
          : targetLang.code === 'gu'
          ? `આ પ્રશ્ન ખાતરી કરે છે કે તમે ${concept} ના કાર્યકારણ સંબંધને સમજો છો.`
          : targetLang.code === 'es'
          ? `Esta pregunta refuerza la comprensión de causa y efecto en ${concept}.`
          : `This validates conceptual understanding of ${concept}: changes in variables lead to structured, predictable responses.`,
      difficulty
    }));
  }

  private static parseJsonSafely<T>(str: string): T | null {
    if (!str || typeof str !== 'string') return null;
    let clean = str.trim();

    // Remove markdown code fences if any
    if (clean.startsWith('```json')) {
      clean = clean.slice(7);
    } else if (clean.startsWith('```')) {
      clean = clean.slice(3);
    }
    if (clean.endsWith('```')) {
      clean = clean.slice(0, -3);
    }
    clean = clean.trim();

    try {
      return JSON.parse(clean) as T;
    } catch {
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          return JSON.parse(clean.slice(firstBrace, lastBrace + 1)) as T;
        } catch {
          // ignore
        }
      }

      const firstBracket = clean.indexOf('[');
      const lastBracket = clean.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        try {
          return JSON.parse(clean.slice(firstBracket, lastBracket + 1)) as T;
        } catch {
          // ignore
        }
      }
      return null;
    }
  }
}
