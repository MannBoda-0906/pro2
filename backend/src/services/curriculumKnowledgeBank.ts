import {
  ConceptCoverageEntry,
  ConceptKnowledgeMap,
  ConceptMap,
  QuizBlueprintItem,
  QuizData,
  QuizQuestion
} from '../types/index.js';

export class CurriculumKnowledgeBank {
  /**
   * Expert prompt training directives, cognitive rubrics, and distractor doctrine
   * used to guide Gemini models in concept-level analysis and exam construction.
   */
  static getPedagogicalTrainingPrompt(): string {
    return `
EXPERT PEDAGOGICAL DECONSTRUCTION & EXAM COMMISSIONER TRAINING DIRECTIVES:

1. STRICT VIDEO CONCEPTUAL GROUNDING:
   - The transcript and captions are ONLY RAW EVIDENCE.
   - NEVER create questions by copying teacher sentences or asking "What did the teacher say?" or "According to the video...".
   - Transform the educational concepts into novel, original application problems and conceptual reasoning questions.
   - DO NOT hallucinate concepts that were not taught in the video. If the video covers 5 concepts of a chapter, questions must come ONLY from those 5 concepts.
   - Strictly separate VIDEO COVERED CONCEPTS from ADDITIONAL CHAPTER CONCEPTS.

2. 25-QUESTION EXAM BLUEPRINT DISTRIBUTION:
   - Final Quiz MUST contain EXACTLY 25 questions.
   - Target: ~70% (17-18) NUMERICAL / APPLICATION / PROBLEM-SOLVING and ~30% (7-8) CONCEPTUAL / THEORY / REASONING.
   - Difficulty: ~5 Easy (20%), ~12 Medium (50%), ~8 Hard (30%).
   - Numerical questions MUST require actual problem solving and calculation (not just formula recall).
   - Numerical problems must have varied scenarios (direct calculation, unequal masses, equal masses, coordinate-based, negative coordinates, find unknown mass, find unknown position, shift in mass effect, symmetry, multi-step).
   - Every numerical question MUST be independently calculated and verified step-by-step.
   - Conceptual questions must test physical meaning, cause-and-effect, boundary conditions, and common misconceptions.

3. DISTRACTOR DESIGN DOCTRINE (ZERO-JOKE RULE):
   - EVERY distractor MUST be diagnostic: an incorrect choice should map directly to a recognized student cognitive error (e.g. neglected negative sign, swapped mass ratio, forgotten mass in total mass divisor, inverted formula, arithmetic slip).
   - NEVER use absurd, silly, or giveaway choices. All 4 options MUST be credible, plausible academic choices.

4. STEP-BY-STEP PEDAGOGICAL EXPLANATIONS:
   - Explanations must clearly state the relevant formula/principle, substitute given values, carry out calculations with units, and explain the physical logic.

5. MULTILINGUAL DISCIPLINE:
   - For Hindi and Gujarati, preserve technical scientific terms in English within parentheses where appropriate.
   - ALWAYS preserve mathematical formulas, coordinate numbers, signs, Greek symbols, and scientific units standard across all languages.
`;
  }

  /**
   * Provides specialized Concept Knowledge Maps for key curriculum subjects.
   */
  static getSpecializedConceptKnowledgeMap(title: string, videoId?: string): ConceptKnowledgeMap | null {
    const t = title.toLowerCase();

    // 1. Class 11 Physics: Center of Mass (System of Particles and Rotational Motion)
    if (
      t.includes('center of mass') ||
      t.includes('centre of mass') ||
      t.includes('द्रव्यमान केंद्र') ||
      t.includes('દ્રવ્યમાન કેન્દ્ર') ||
      t.includes('system of particles') ||
      videoId === 'demo-center-of-mass'
    ) {
      return {
        subject: 'Physics',
        academicLevel: 'Class 11',
        chapter: 'System of Particles and Rotational Motion',
        mainTopic: 'Center of Mass',
        subtopics: [
          'Meaning and Definition of Center of Mass',
          'Two-Particle System Position Formula',
          'Multi-Particle System & Coordinate Method (1D and 2D)',
          'Unequal and Equal Mass Distributions (Symmetry)',
          'Displacement and Motion of Center of Mass',
          'Physical Significance & Applications'
        ],
        videoCoveredConcepts: [
          {
            topic: 'Center of Mass',
            subtopic: 'Meaning and Definition of Center of Mass',
            concept: 'Meaning and Physical Significance of Center of Mass',
            definition:
              'The center of mass of a system of particles is the unique point at which the entire mass of the system may be assumed to be concentrated for describing translational motion.',
            principle:
              "Newton's Second Law for a system: F_ext = M * a_cm. Internal forces between particles cancel in pairs by Newton's Third Law.",
            conditions: 'Applies to discrete particles and continuous mass distributions in inertial reference frames.',
            relationships: [
              'In a uniform gravitational field, center of mass coincides exactly with center of gravity',
              'Center of mass can lie outside the material body (e.g. hollow ring, hollow sphere, horseshoe)'
            ],
            applications: ['Binary star orbits', 'Ballistics trajectory', 'Vehicle stability'],
            difficulty: 'easy',
            video_coverage: 'fully_covered',
            importance: 'essential',
            timestamp: '00:45',
            timestampSeconds: 45
          },
          {
            topic: 'Center of Mass',
            subtopic: 'Two-Particle System Position Formula',
            concept: 'Two-Particle System Center of Mass',
            definition:
              'The position coordinate of the center of mass of two point masses m1 and m2 located along a line is given by x_cm = (m1*x1 + m2*x2) / (m1 + m2).',
            principle:
              'The sum of the mass moments about the center of mass is strictly zero: m1*(x_cm - x1) + m2*(x_cm - x2) = 0.',
            formula: 'x_cm = (m1*x1 + m2*x2) / (m1 + m2)',
            variables: [
              { symbol: 'x_cm', meaning: 'Coordinate of center of mass', unit: 'm' },
              { symbol: 'm1, m2', meaning: 'Masses of interacting particles', unit: 'kg' },
              { symbol: 'x1, x2', meaning: 'Position coordinates of particles', unit: 'm' }
            ],
            conditions: 'Discrete masses along a linear axis',
            relationships: [
              'The center of mass always lies closer to the heavier mass: r1/r2 = m2/m1',
              'If masses are equal (m1 = m2), the center of mass lies exactly at the midpoint: x_cm = (x1 + x2)/2'
            ],
            applications: ['Balance point of dumbbells', 'Barycenter in celestial mechanics'],
            problem_solving_method:
              '1. Establish coordinate origin. 2. Record masses and coordinates. 3. Compute Σ(m_i * x_i). 4. Divide by total mass (m1 + m2).',
            examples: ['2 kg at x = 0 m and 6 kg at x = 4 m yields x_cm = (0 + 24)/8 = 3.0 m'],
            difficulty: 'medium',
            video_coverage: 'fully_covered',
            importance: 'essential',
            timestamp: '02:10',
            timestampSeconds: 130
          },
          {
            topic: 'Center of Mass',
            subtopic: 'Multi-Particle System & Coordinate Method (1D and 2D)',
            concept: 'Multi-Particle Coordinate Method (1D & 2D)',
            definition:
              'For a system of N discrete particles in a plane, the Cartesian coordinates of the center of mass are x_cm = (Σ m_i x_i)/M and y_cm = (Σ m_i y_i)/M, where M = Σ m_i.',
            principle:
              'Orthogonal Cartesian coordinates decouple completely: the x-coordinate of the center of mass depends solely on x-coordinates of individual masses.',
            formula: 'x_cm = (Σ m_i x_i)/M , y_cm = (Σ m_i y_i)/M',
            variables: [
              { symbol: 'x_cm, y_cm', meaning: 'Cartesian coordinates of center of mass', unit: 'm' },
              { symbol: 'm_i', meaning: 'Mass of the i-th particle', unit: 'kg' },
              { symbol: 'x_i, y_i', meaning: 'Cartesian coordinates of the i-th particle', unit: 'm' },
              { symbol: 'M', meaning: 'Total mass of the system', unit: 'kg' }
            ],
            conditions: 'Orthogonal Cartesian reference frame',
            relationships: [
              'Calculating x_cm is independent of y_cm coordinates',
              'Negative coordinates must carry their algebraic minus signs into the summation'
            ],
            applications: ['Planar particle distributions', 'Molecular barycenters'],
            problem_solving_method:
              'Calculate x_cm and y_cm independently using the mass-moment sum divided by total mass M.',
            examples: [
              '1 kg at (0,0), 2 kg at (3,0), 3 kg at (0,4) gives x_cm = 6/6 = 1.0 m, y_cm = 12/6 = 2.0 m'
            ],
            difficulty: 'medium',
            video_coverage: 'fully_covered',
            importance: 'essential',
            timestamp: '04:30',
            timestampSeconds: 270
          },
          {
            topic: 'Center of Mass',
            subtopic: 'Unequal and Equal Mass Distributions (Symmetry)',
            concept: 'Mass Ratio and Symmetry Principles',
            definition:
              'The distances of two particles from their center of mass are inversely proportional to their masses: r1 / r2 = m2 / m1.',
            principle:
              'In any symmetric distribution with uniform density, the center of mass lies on the geometric axis or plane of symmetry.',
            formula: 'r1 = (m2 / (m1 + m2)) * L',
            variables: [
              { symbol: 'r1', meaning: 'Distance of mass m1 from center of mass', unit: 'm' },
              { symbol: 'L', meaning: 'Total separation between masses', unit: 'm' }
            ],
            conditions: 'Two-particle system or symmetric geometric body',
            relationships: [
              'Distance from the heavier mass is smaller than distance from the lighter mass'
            ],
            applications: ['Balancing rods on pivots', 'Symmetric geometry centroids'],
            problem_solving_method:
              'Find distance from mass m1 by multiplying total separation L by the opposing mass fraction m2 / (m1 + m2).',
            examples: ['4 kg and 12 kg separated by 60 cm: distance from 4 kg mass is (12/16)*60 = 45 cm'],
            difficulty: 'medium',
            video_coverage: 'fully_covered',
            importance: 'high',
            timestamp: '06:15',
            timestampSeconds: 375
          },
          {
            topic: 'Center of Mass',
            subtopic: 'Displacement and Motion of Center of Mass',
            concept: 'Motion and Displacement of Center of Mass',
            definition:
              'The displacement of the center of mass is Δx_cm = (Σ m_i Δx_i)/M, and its velocity is v_cm = (Σ m_i v_i)/M.',
            principle:
              'In the absence of net external forces (F_ext = 0), the velocity of the center of mass remains constant (a_cm = 0). Internal forces cannot accelerate the center of mass.',
            formula: 'v_cm = (m1*v1 + m2*v2) / (m1 + m2)',
            variables: [
              { symbol: 'v_cm', meaning: 'Velocity of center of mass', unit: 'm/s' },
              { symbol: 'v1, v2', meaning: 'Velocities of particles', unit: 'm/s' },
              { symbol: 'Δx_cm', meaning: 'Displacement of center of mass', unit: 'm' }
            ],
            conditions: 'Isolated or closed system (no net external impulse)',
            relationships: [
              'Internal explosions, collisions, or mutual attraction cannot displace or accelerate the center of mass',
              'To keep the center of mass stationary (Δx_cm = 0), we must have m1*Δx1 + m2*Δx2 = 0'
            ],
            applications: ['Exploding projectile trajectory', 'Skaters pushing each other on frictionless ice'],
            problem_solving_method:
              'Apply conservation of center-of-mass velocity: v_cm = (Σ m_i v_i)/M taking signs into account.',
            examples: ['2 kg moving at +4 m/s and 3 kg at -1 m/s: v_cm = (8 - 3)/5 = +1.0 m/s'],
            difficulty: 'hard',
            video_coverage: 'fully_covered',
            importance: 'high',
            timestamp: '08:45',
            timestampSeconds: 525
          }
        ],
        additionalChapterConcepts: [
          'Moment of Inertia of Rigid Bodies',
          'Torque and Rotational Dynamics (τ = I * α)',
          'Conservation of Angular Momentum (L = I * ω)',
          'Pure Rolling Motion without Slipping',
          'Radius of Gyration',
          'Parallel and Perpendicular Axes Theorems'
        ]
      };
    }

    // 2. Class 11 Physics: Gravitation
    if (t.includes('gravitation') || t.includes('गुरुत्वाकर्षण') || t.includes('gravity') || t.includes('newton')) {
      return {
        subject: 'Physics',
        academicLevel: 'Class 11',
        chapter: 'Gravitation',
        mainTopic: "Newton's Universal Law of Gravitation",
        subtopics: [
          'Universal Gravitation Principle & Inverse-Square Law',
          'Universal Constant G vs Surface Acceleration g',
          'Action-Reaction Symmetry in Gravitational Interaction',
          'Gravitational Field Strength & Calculations'
        ],
        videoCoveredConcepts: [
          {
            topic: 'Gravitation',
            subtopic: 'Universal Gravitation Principle & Inverse-Square Law',
            concept: "Newton's Universal Law of Gravitation",
            definition:
              'Every particle in the universe attracts every other particle with a force proportional to the product of their masses and inversely proportional to the square of their separation distance.',
            principle: 'Inverse-Square Law: F = G * (m1 * m2) / r^2 along the line of centers.',
            formula: 'F = G * (m1 * m2) / r^2',
            variables: [
              { symbol: 'F', meaning: 'Gravitational Force', unit: 'N' },
              { symbol: 'G', meaning: 'Gravitational Constant (6.674e-11)', unit: 'N*m^2/kg^2' },
              { symbol: 'm1, m2', meaning: 'Interacting Masses', unit: 'kg' },
              { symbol: 'r', meaning: 'Center-to-center separation distance', unit: 'm' }
            ],
            conditions: 'Point masses or spherically symmetric mass distributions',
            relationships: [
              'Doubling distance reduces gravitational attraction by a factor of 4',
              'Tripling distance reduces attraction by a factor of 9'
            ],
            applications: ['Orbital mechanics', 'Tidal forces'],
            difficulty: 'medium',
            video_coverage: 'fully_covered',
            importance: 'essential'
          },
          {
            topic: 'Gravitation',
            subtopic: 'Universal Constant G vs Surface Acceleration g',
            concept: 'Universal Constant G vs Local Surface Gravity g',
            definition:
              'G is an invariant universal scalar constant, whereas g is local gravitational field acceleration dependent on the celestial mass and radius: g = G * M / R^2.',
            principle: 'Surface acceleration is derived by equating gravitational force to weight (m * g).',
            formula: 'g = G * M / R^2',
            variables: [
              { symbol: 'g', meaning: 'Local surface acceleration', unit: 'm/s^2' },
              { symbol: 'M', meaning: 'Celestial mass', unit: 'kg' },
              { symbol: 'R', meaning: 'Celestial radius', unit: 'm' }
            ],
            conditions: 'Spherical planetary surface',
            relationships: [
              'If planetary radius doubles while mass is constant, surface gravity decreases to g/4',
              'If mass doubles and radius doubles, surface gravity becomes g/2'
            ],
            applications: ['Weight variation on Moon and planets'],
            difficulty: 'medium',
            video_coverage: 'fully_covered',
            importance: 'essential'
          }
        ],
        additionalChapterConcepts: [
          'Gravitational Potential Energy & Escape Velocity',
          "Kepler's Laws of Planetary Motion",
          'Geostationary Satellites & Orbital Velocity',
          'Variation of g with Altitude, Depth, and Latitude'
        ]
      };
    }

    return null;
  }

  /**
   * Compatibility wrapper for ConceptMap structure
   */
  static getSpecializedConceptMap(title: string, videoId?: string): ConceptMap | null {
    const km = this.getSpecializedConceptKnowledgeMap(title, videoId);
    if (!km) return null;

    return {
      mainTopic: km.mainTopic,
      subjectCategory: km.subject.toLowerCase() as any,
      subtopics: km.subtopics,
      concepts: km.videoCoveredConcepts.map((c, idx) => ({
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
        examImportance: c.importance === 'essential' ? 'essential' : 'important',
        approximateTimestamp: c.timestampSeconds
          ? { startSeconds: c.timestampSeconds, timestamp: c.timestamp || '01:00' }
          : undefined
      })),
      relationships: [],
      definitions: km.videoCoveredConcepts.map(c => ({
        term: c.concept,
        definition: c.definition || '',
        simpleExplanation: c.principle || ''
      })),
      formulas: km.videoCoveredConcepts
        .filter(c => Boolean(c.formula))
        .map(c => ({
          name: c.concept,
          formula: c.formula!,
          variables: c.variables || [],
          applicability: c.conditions || ''
        })),
      processes: [],
      examples: km.videoCoveredConcepts.map(c => ({
        concept: c.concept,
        example: c.examples?.[0] || 'Standard numerical problem',
        takeaway: c.principle || ''
      })),
      misconceptions: [],
      examImportantPoints: km.subtopics
    };
  }

  /**
   * Generates a verified 25-Question Quiz for specialized benchmark topics.
   * Target: 18 Numerical / Application / Problem-Solving, 7 Conceptual / Theory / Reasoning.
   * Exactly 25 questions with independent step-by-step mathematical solutions and realistic error distractors.
   */
  static getSpecialized25Quiz(params: {
    title: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    langCode: 'en' | 'hi' | 'gu' | 'es';
    count?: number;
  }): QuizData | null {
    const { title, difficulty = 'medium', langCode = 'en' } = params;
    const t = title.toLowerCase();

    if (
      t.includes('center of mass') ||
      t.includes('centre of mass') ||
      t.includes('द्रव्यमान केंद्र') ||
      t.includes('દ્રવ્યમાન કેન્દ્ર') ||
      t.includes('system of particles')
    ) {
      return this.buildCenterOfMass25Quiz(difficulty, langCode);
    }

    return null;
  }

  /**
   * Look up a pre-verified, mathematically checked question by problem archetype.
   * Ensures that if a slot needs a specific archetype (e.g. INVERSE_CALCULATION, FIND_UNKNOWN_POSITION),
   * a verified question with a complete step-by-step solution can be retrieved instantly.
   */
  static getPreverifiedQuestionByArchetype(params: {
    title: string;
    archetypeId: string;
    langCode?: 'en' | 'hi' | 'gu' | 'es';
  }): QuizQuestion | null {
    const { title, archetypeId, langCode = 'en' } = params;
    const specialized = this.getSpecialized25Quiz({ title, langCode });
    if (!specialized || !specialized.questions) return null;

    const normArch = archetypeId.trim().toUpperCase();
    return (
      specialized.questions.find(
        q => (q.archetypeId || q.problemArchetype || '').trim().toUpperCase() === normArch
      ) || null
    );
  }

  /**
   * Complete, mathematically verified 25-question quiz for Class 11 Physics: Center of Mass.
   * EXACTLY 25 questions: 18 Numerical/Problem-Solving (~70%), 7 Conceptual/Reasoning (~30%).
   */
  private static buildCenterOfMass25Quiz(
    difficulty: 'easy' | 'medium' | 'hard',
    langCode: 'en' | 'hi' | 'gu' | 'es'
  ): QuizData {
    const knowledgeMap = this.getSpecializedConceptKnowledgeMap('Center of Mass')!;

    // 25 Blueprint items with 25 distinct problem archetypes (NO REPEATED METHOD)
    const blueprint: QuizBlueprintItem[] = [
      { questionIndex: 1, questionId: 'Q1', topic: 'Center of Mass', subtopic: 'Two-Particle System Position Formula', concept: 'Two-Particle System Center of Mass', questionCategory: 'numerical', numericalOrTheory: 'numerical', problemArchetype: 'direct_numerical_calculation', archetypeId: 'DIRECT_CALCULATION', procedureSignature: 'weighted_average_direct_substitution', unknownType: 'final_com_position', requiredOperation: 'formula_application', cognitiveTask: 'direct_calculation', scenarioType: 'two_mass_line', difficulty: 'easy', cognitiveLevel: 'level_3_application', problemStyle: 'Direct numerical calculation with equal masses verifying midpoint', solvingMethodDescription: 'Direct formula application with equal masses x_cm = (x1 + x2)/2', expectedFormula: 'x_cm = (m1*x1 + m2*x2)/(m1 + m2)' },
      { questionIndex: 2, questionId: 'Q2', topic: 'Center of Mass', subtopic: 'Two-Particle System Position Formula', concept: 'Two-Particle System Center of Mass', questionCategory: 'numerical', numericalOrTheory: 'numerical', problemArchetype: 'unknown_quantity_inversion', archetypeId: 'INVERSE_CALCULATION', procedureSignature: 'weighted_average_rearrange_for_unknown_mass', unknownType: 'missing_mass', requiredOperation: 'rearrange_equation', cognitiveTask: 'inverse_solve', scenarioType: 'pivot_balance', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Find unknown mass given system center of mass location', solvingMethodDescription: 'Invert equation to solve algebraically for unknown mass m2', expectedFormula: 'm2 = m1*(x_cm - x1)/(x2 - x_cm)' },
      { questionIndex: 3, questionId: 'Q3', topic: 'Center of Mass', subtopic: 'Multi-Particle System & Coordinate Method (1D and 2D)', concept: 'Multi-Particle Coordinate Method (1D & 2D)', questionCategory: 'numerical', numericalOrTheory: 'numerical', problemArchetype: 'reverse_coordinate_calculation', archetypeId: 'FIND_UNKNOWN_POSITION', procedureSignature: 'zero_moment_position_solve', unknownType: 'missing_coordinate', requiredOperation: 'isolate_coordinate', cognitiveTask: 'reverse_reasoning', scenarioType: 'cartesian_axis', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Find unknown position coordinate given center of mass at origin', solvingMethodDescription: 'Invert equation to solve algebraically for unknown position coordinate x2', expectedFormula: 'x2 = -m1*x1 / m2' },
      { questionIndex: 4, questionId: 'Q4', topic: 'Center of Mass', subtopic: 'Multi-Particle System & Coordinate Method (1D and 2D)', concept: 'Multi-Particle Coordinate Method (1D & 2D)', questionCategory: 'numerical', numericalOrTheory: 'numerical', problemArchetype: 'multi_step_calculation', archetypeId: 'MULTI_STEP_APPLICATION', procedureSignature: 'three_particle_sequential_com', unknownType: 'distance_from_reference_particle', requiredOperation: 'sequential_summation', cognitiveTask: 'multi_step_execution', scenarioType: 'triangle_configuration', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Three particles along a line, solve COM then compute distance from origin', solvingMethodDescription: 'Sequential two-stage: evaluate weighted sum Σmx / M then compute origin offset', expectedFormula: 'x_cm = (Σ m_i x_i)/M' },
      { questionIndex: 5, questionId: 'Q5', topic: 'Center of Mass', subtopic: 'Two-Particle System Position Formula', concept: 'Two-Particle System Center of Mass', questionCategory: 'numerical', numericalOrTheory: 'numerical', problemArchetype: 'comparison_problem', archetypeId: 'COMPARE_TWO_CASES', procedureSignature: 'compare_weighted_positions_without_full_calculation', unknownType: 'determine_larger_displacement', requiredOperation: 'compare_relationship', cognitiveTask: 'comparative_evaluation', scenarioType: 'symmetric_vs_asymmetric', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Comparison problem between two differing mass distribution arrangements', solvingMethodDescription: 'Calculate x_cm for System A and System B, compare magnitudes and difference', expectedFormula: 'Δx_cm = x_cm(B) - x_cm(A)' },
      { questionIndex: 6, questionId: 'Q6', topic: 'Center of Mass', subtopic: 'Displacement and Motion of Center of Mass', concept: 'Motion and Displacement of Center of Mass', questionCategory: 'numerical', numericalOrTheory: 'numerical', problemArchetype: 'change_one_variable_prediction', archetypeId: 'PREDICT_CHANGE', procedureSignature: 'predict_shift_after_position_change', unknownType: 'shift_magnitude_and_direction', requiredOperation: 'differential_shift_formula', cognitiveTask: 'prediction_from_change', scenarioType: 'moving_particle', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Shift in COM when one particle position is displaced', solvingMethodDescription: 'Evaluate incremental displacement Δx_cm = (m1 * Δx1)/M', expectedFormula: 'Δx_cm = (m1*Δx1)/M' },
      { questionIndex: 7, questionId: 'Q7', topic: 'Center of Mass', subtopic: 'Unequal and Equal Mass Distributions (Symmetry)', concept: 'Mass Ratio and Symmetry Principles', questionCategory: 'numerical', numericalOrTheory: 'numerical', problemArchetype: 'ratio_proportional_reasoning', archetypeId: 'RATIO_REASONING', procedureSignature: 'inverse_mass_distance_division', unknownType: 'ratio_of_distances', requiredOperation: 'proportional_division', cognitiveTask: 'proportional_reasoning', scenarioType: 'two_body_binary_system', difficulty: 'easy', cognitiveLevel: 'level_3_application', problemStyle: 'Distance ratio calculation: distance of COM from lighter vs heavier mass', solvingMethodDescription: 'Solve purely using mass ratios and distance partition r1 = [m2/(m1+m2)]*L', expectedFormula: 'r1 = (m2 / (m1 + m2)) * L' },
      { questionIndex: 8, questionId: 'Q8', topic: 'Center of Mass', subtopic: 'Multi-Particle System & Coordinate Method (1D and 2D)', concept: 'Multi-Particle Coordinate Method (1D & 2D)', questionCategory: 'numerical', numericalOrTheory: 'numerical', problemArchetype: 'coordinate_data_interpretation', archetypeId: 'DATA_INTERPRETATION', procedureSignature: 'orthogonal_vector_decomposition_com', unknownType: 'ordered_pair_coordinates', requiredOperation: 'vector_summation', cognitiveTask: 'multidimensional_mapping', scenarioType: 'planar_grid', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Two-dimensional Cartesian coordinate center of mass calculation (x_cm, y_cm)', solvingMethodDescription: 'Decompose into independent orthogonal Cartesian components x_cm and y_cm', expectedFormula: 'x_cm = (Σ m_i x_i)/M , y_cm = (Σ m_i y_i)/M' },
      { questionIndex: 9, questionId: 'Q9', topic: 'Center of Mass', subtopic: 'Multi-Particle System & Coordinate Method (1D and 2D)', concept: 'Multi-Particle Coordinate Method (1D & 2D)', questionCategory: 'numerical', numericalOrTheory: 'numerical', problemArchetype: 'negative_sign_based_problem', archetypeId: 'SIGN_ANALYSIS', procedureSignature: 'signed_cartesian_algebraic_sum', unknownType: 'signed_coordinate_across_origin', requiredOperation: 'signed_algebra', cognitiveTask: 'sign_analysis', scenarioType: 'negative_axis_distribution', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Signed coordinate calculation with negative, zero, and positive coordinates', solvingMethodDescription: 'Maintain rigorous algebraic signs for coordinates across Cartesian origin', expectedFormula: 'x_cm = (Σ m_i x_i)/M' },
      { questionIndex: 10, questionId: 'Q10', topic: 'Center of Mass', subtopic: 'Unequal and Equal Mass Distributions (Symmetry)', concept: 'Mass Ratio and Symmetry Principles', questionCategory: 'numerical', numericalOrTheory: 'numerical', problemArchetype: 'missing_information_reconstruction', archetypeId: 'MISSING_INFORMATION_RECONSTRUCTION', procedureSignature: 'cavity_negative_mass_reconstruction', unknownType: 'remaining_barycenter', requiredOperation: 'subtraction_method', cognitiveTask: 'reconstruction', scenarioType: 'symmetry_with_cutout', difficulty: 'hard', cognitiveLevel: 'level_3_application', problemStyle: 'Symmetric geometric distribution with one corner/particle missing', solvingMethodDescription: 'Reconstruct new center of mass from symmetry subtraction / remaining subset', expectedFormula: 'r_cm_rem = (M_total*r_0 - m_rem*r_rem) / (M_total - m_rem)' },
      { questionIndex: 11, questionId: 'Q11', topic: 'Center of Mass', subtopic: 'Unequal and Equal Mass Distributions (Symmetry)', concept: 'Mass Ratio and Symmetry Principles', questionCategory: 'application', numericalOrTheory: 'numerical', problemArchetype: 'real_world_application', archetypeId: 'REAL_WORLD_APPLICATION', procedureSignature: 'fulcrum_support_equilibrium_solve', unknownType: 'pivot_support_location', requiredOperation: 'static_equilibrium_torque', cognitiveTask: 'applied_modelling', scenarioType: 'knife_edge_beam', difficulty: 'easy', cognitiveLevel: 'level_3_application', problemStyle: 'Pivot balance point calculation on a loaded light rod', solvingMethodDescription: 'Apply equilibrium knife-edge pivot principle coinciding with barycenter', expectedFormula: 'd_pivot = (m1 / (m1 + m2)) * L' },
      { questionIndex: 12, questionId: 'Q12', topic: 'Center of Mass', subtopic: 'Displacement and Motion of Center of Mass', concept: 'Motion and Displacement of Center of Mass', questionCategory: 'numerical', numericalOrTheory: 'numerical', problemArchetype: 'constraint_based_problem', archetypeId: 'CONSTRAINT_PROBLEM', procedureSignature: 'zero_momentum_internal_displacement', unknownType: 'relative_movement_of_boat_or_cart', requiredOperation: 'constraint_conservation', cognitiveTask: 'boundary_condition_reasoning', scenarioType: 'frictionless_cart_surface', difficulty: 'hard', cognitiveLevel: 'level_3_application', problemStyle: 'Displacement required on second mass to keep center of mass strictly stationary', solvingMethodDescription: 'Apply constraint Δx_cm = 0 => m1*Δx1 + m2*Δx2 = 0', expectedFormula: 'm1*Δx1 + m2*Δx2 = 0' },
      { questionIndex: 13, questionId: 'Q13', topic: 'Center of Mass', subtopic: 'Unequal and Equal Mass Distributions (Symmetry)', concept: 'Mass Ratio and Symmetry Principles', questionCategory: 'numerical', numericalOrTheory: 'numerical', problemArchetype: 'error_analysis', archetypeId: 'ERROR_ANALYSIS', procedureSignature: 'detect_incorrect_arithmetic_midpoint_calculation', unknownType: 'diagnose_fallacious_step', requiredOperation: 'error_diagnosis', cognitiveTask: 'evaluative_diagnosis', scenarioType: 'student_scratchpad_audit', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Diagnose student error of taking unweighted midpoint and determine true value', solvingMethodDescription: 'Identify unweighted arithmetic average slip and compute correct weighted position', expectedFormula: 'Error = x_unweighted - x_true' },
      { questionIndex: 14, questionId: 'Q14', topic: 'Center of Mass', subtopic: 'Multi-Particle System & Coordinate Method (1D and 2D)', concept: 'Multi-Particle Coordinate Method (1D & 2D)', questionCategory: 'numerical', numericalOrTheory: 'numerical', problemArchetype: 'find_incorrect_method', archetypeId: 'METHOD_SELECTION', procedureSignature: 'evaluate_validity_of_divisor_and_dimension', unknownType: 'flawed_formula_step', requiredOperation: 'method_selection', cognitiveTask: 'formula_selection', scenarioType: 'alternative_methods_critique', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Identify the conceptually flawed step in an attempted COM calculation', solvingMethodDescription: 'Evaluate mathematical validity of calculation steps to pinpoint procedural violation', expectedFormula: 'x_cm = (Σ m_i x_i)/M' },
      { questionIndex: 15, questionId: 'Q15', topic: 'Center of Mass', subtopic: 'Displacement and Motion of Center of Mass', concept: 'Motion and Displacement of Center of Mass', questionCategory: 'application', numericalOrTheory: 'numerical', problemArchetype: 'select_correct_method', archetypeId: 'REVERSE_REASONING', procedureSignature: 'internal_force_collision_point_deduction', unknownType: 'meeting_point_location', requiredOperation: 'invariance_deduction', cognitiveTask: 'reverse_deduction', scenarioType: 'mutual_attraction_collision', difficulty: 'medium', cognitiveLevel: 'level_3_application', problemStyle: 'Collision point of two particles attracting each other under internal mutual forces', solvingMethodDescription: 'Select stationary COM principle (F_ext = 0) to determine collision position', expectedFormula: 'x_collision = x_cm = (m2 / (m1 + m2)) * d' },
      { questionIndex: 16, questionId: 'Q16', topic: 'Center of Mass', subtopic: 'Displacement and Motion of Center of Mass', concept: 'Motion and Displacement of Center of Mass', questionCategory: 'numerical', numericalOrTheory: 'numerical', problemArchetype: 'case_based_numerical_problem', archetypeId: 'CASE_STUDY', procedureSignature: 'velocity_of_center_of_mass_vector_sum', unknownType: 'velocity_vector_magnitude', requiredOperation: 'momentum_weighted_velocity', cognitiveTask: 'system_state_evolution', scenarioType: 'two_moving_vehicles', difficulty: 'hard', cognitiveLevel: 'level_3_application', problemStyle: 'Velocity of center of mass with opposing particle velocities', solvingMethodDescription: 'Compute system momentum rate v_cm = (m1*v1 + m2*v2)/(m1 + m2)', expectedFormula: 'v_cm = (m1*v1 + m2*v2)/(m1 + m2)' },
      { questionIndex: 17, questionId: 'Q17', topic: 'Center of Mass', subtopic: 'Multi-Particle System & Coordinate Method (1D and 2D)', concept: 'Multi-Particle Coordinate Method (1D & 2D)', questionCategory: 'numerical', numericalOrTheory: 'numerical', problemArchetype: 'multi_concept_numerical_problem', archetypeId: 'MULTI_CONCEPT_INTEGRATION', procedureSignature: 'continuous_rod_with_discrete_point_mass', unknownType: 'composite_center_of_mass', requiredOperation: 'hybrid_continuous_discrete_integration', cognitiveTask: 'multi_concept_integration', scenarioType: 'rod_and_particle_assembly', difficulty: 'hard', cognitiveLevel: 'level_3_application', problemStyle: 'Coordinate transformation: center of mass coordinates after origin translation', solvingMethodDescription: 'Transform coordinates across reference frames via vector origin translation', expectedFormula: "x'_cm = x_cm - x_shift" },
      { questionIndex: 18, questionId: 'Q18', topic: 'Center of Mass', subtopic: 'Multi-Particle System & Coordinate Method (1D and 2D)', concept: 'Multi-Particle Coordinate Method (1D & 2D)', questionCategory: 'numerical', numericalOrTheory: 'numerical', problemArchetype: 'exam_style_challenge', archetypeId: 'EXAM_STYLE_CHALLENGE', procedureSignature: 'reference_frame_origin_translation_transform', unknownType: 'transformed_coordinates', requiredOperation: 'coordinate_transformation', cognitiveTask: 'rigorous_exam_synthesis', scenarioType: 'translated_origin_system', difficulty: 'hard', cognitiveLevel: 'level_5_exam_reasoning', problemStyle: 'Non-collinear 3-particle system distance calculation from origin', solvingMethodDescription: 'Multi-step coordinate solution followed by Euclidean distance calculation r = sqrt(x^2 + y^2)', expectedFormula: 'r_cm = sqrt(x_cm^2 + y_cm^2)' },
      { questionIndex: 19, questionId: 'Q19', topic: 'Center of Mass', subtopic: 'Meaning and Definition of Center of Mass', concept: 'Meaning and Physical Significance of Center of Mass', questionCategory: 'conceptual', numericalOrTheory: 'theory', problemArchetype: 'conceptual_prediction', archetypeId: 'CONCEPTUAL_PREDICTION', procedureSignature: 'external_vs_internal_force_isolation', unknownType: 'trajectory_curvature_or_continuation', requiredOperation: 'qualitative_law_deduction', cognitiveTask: 'cause_effect_prediction', scenarioType: 'exploding_projectile_in_flight', difficulty: 'easy', cognitiveLevel: 'level_2_understanding', problemStyle: 'Physical prediction of exploding projectile trajectory under internal forces', solvingMethodDescription: 'Apply Newton second law for system: external force unchanged => trajectory invariant', expectedFormula: 'F_ext = M * a_cm' },
      { questionIndex: 20, questionId: 'Q20', topic: 'Center of Mass', subtopic: 'Two-Particle System Position Formula', concept: 'Two-Particle System Center of Mass', questionCategory: 'conceptual', numericalOrTheory: 'theory', problemArchetype: 'conceptual_comparison', archetypeId: 'CONCEPTUAL_COMPARISON', procedureSignature: 'inverse_mass_proximity_comparison', unknownType: 'relative_proximity_comparison', requiredOperation: 'qualitative_comparison', cognitiveTask: 'conceptual_contrast', scenarioType: 'heavier_vs_lighter_particle', difficulty: 'medium', cognitiveLevel: 'level_4_analysis', problemStyle: 'Position of COM relative to geometric midpoint in unequal mass system', solvingMethodDescription: 'Compare mass-weighted barycenter against unweighted centroid', expectedFormula: 'm1*r1 = m2*r2' },
      { questionIndex: 21, questionId: 'Q21', topic: 'Center of Mass', subtopic: 'Meaning and Definition of Center of Mass', concept: 'Meaning and Physical Significance of Center of Mass', questionCategory: 'reasoning', numericalOrTheory: 'theory', problemArchetype: 'why_reasoning', archetypeId: 'WHY_REASONING', procedureSignature: 'spatial_distribution_vs_atomic_matter_deduction', unknownType: 'location_feasibility_in_void', requiredOperation: 'definition_implication', cognitiveTask: 'first_principles_reasoning', scenarioType: 'hollow_ring_or_donut', difficulty: 'easy', cognitiveLevel: 'level_2_understanding', problemStyle: 'Why internal forces cannot alter velocity or momentum of isolated COM', solvingMethodDescription: 'Analyze internal forces canceling in Third Law pairs (Σ F_int = 0)', expectedFormula: 'Σ F_int = 0' },
      { questionIndex: 22, questionId: 'Q22', topic: 'Center of Mass', subtopic: 'Meaning and Definition of Center of Mass', concept: 'Meaning and Physical Significance of Center of Mass', questionCategory: 'conceptual', numericalOrTheory: 'theory', problemArchetype: 'misconception_detection', archetypeId: 'MISCONCEPTION_DETECTION', procedureSignature: 'disprove_heavier_particle_stationary_fallacy', unknownType: 'invalid_intuition_identification', requiredOperation: 'counterexample_demonstration', cognitiveTask: 'misconception_detection', scenarioType: 'student_intuition_trap', difficulty: 'medium', cognitiveLevel: 'level_4_analysis', problemStyle: 'Boundary conditions: center of mass located in hollow space outside physical material', solvingMethodDescription: 'Deconstruct student misconception requiring physical matter at barycenter', expectedFormula: 'Geometrical centroid' },
      { questionIndex: 23, questionId: 'Q23', topic: 'Center of Mass', subtopic: 'Meaning and Definition of Center of Mass', concept: 'Meaning and Physical Significance of Center of Mass', questionCategory: 'exam_style', numericalOrTheory: 'theory', problemArchetype: 'situation_identification', archetypeId: 'ASSUMPTION_CHECK', procedureSignature: 'uniform_vs_non_uniform_gravitational_field_test', unknownType: 'condition_for_com_cog_coincidence', requiredOperation: 'condition_verification', cognitiveTask: 'boundary_assumption_testing', scenarioType: 'mountain_sized_body', difficulty: 'hard', cognitiveLevel: 'level_5_exam_reasoning', problemStyle: 'Exam diagnostic: condition under which center of mass coincides with center of gravity', solvingMethodDescription: 'Identify gravitational field homogeneity condition (uniform g vector)', expectedFormula: 'Uniform gravitational field g = const' },
      { questionIndex: 24, questionId: 'Q24', topic: 'Center of Mass', subtopic: 'Displacement and Motion of Center of Mass', concept: 'Motion and Displacement of Center of Mass', questionCategory: 'reasoning', numericalOrTheory: 'theory', problemArchetype: 'principle_condition_application', archetypeId: 'PRINCIPLE_SELECTION', procedureSignature: 'action_reaction_internal_force_invariance', unknownType: 'governing_conservation_principle', requiredOperation: 'principle_selection', cognitiveTask: 'law_identification', scenarioType: 'skaters_pushing_on_ice', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Conservation of momentum: two skaters pushing each other on frictionless surface', solvingMethodDescription: 'Apply horizontal isolation condition: net external force zero implies zero acceleration', expectedFormula: 'F_ext = 0 => v_cm = const' },
      { questionIndex: 25, questionId: 'Q25', topic: 'Center of Mass', subtopic: 'Meaning and Definition of Center of Mass', concept: 'Meaning and Physical Significance of Center of Mass', questionCategory: 'conceptual', numericalOrTheory: 'theory', problemArchetype: 'integrated_concept_question', archetypeId: 'INTEGRATED_CONCEPT_QUESTION', procedureSignature: 'coordinate_invariance_and_spatial_uniqueness', unknownType: 'spatial_uniqueness_statement', requiredOperation: 'holistic_synthesis', cognitiveTask: 'integrated_concept_evaluation', scenarioType: 'coordinate_free_spatial_reality', difficulty: 'hard', cognitiveLevel: 'level_4_analysis', problemStyle: 'Coordinate independence: invariance of physical barycenter point under coordinate axis translation', solvingMethodDescription: 'Synthesize coordinate transformation invariance with intrinsic physical mass distribution', expectedFormula: 'Invariance of vector barycenter' }
    ];

    const conceptCoverageMap: ConceptCoverageEntry[] = knowledgeMap.videoCoveredConcepts.map(c => {
      let assignedCount = 5;
      if (c.concept.includes('Meaning')) assignedCount = 5;
      else if (c.concept.includes('Two-Particle')) assignedCount = 5;
      else if (c.concept.includes('Multi-Particle')) assignedCount = 5;
      else if (c.concept.includes('Mass Ratio')) assignedCount = 5;
      else if (c.concept.includes('Displacement')) assignedCount = 5;
      return {
        concept: c.concept,
        importance: c.importance || 'essential',
        videoCoverage: c.video_coverage,
        questionsAssigned: assignedCount,
        testedArchetypes: []
      };
    });

    const rawQuestions: QuizQuestion[] = this.buildCenterOfMassQuestionsByLanguage(langCode);
    const questions: QuizQuestion[] = rawQuestions.map((q, idx) => {
      const bp = blueprint[idx] || blueprint[0];
      return {
        ...q,
        problemArchetype: bp.problemArchetype,
        archetypeId: bp.archetypeId,
        procedureSignature: bp.procedureSignature,
        unknownType: bp.unknownType,
        requiredOperation: bp.requiredOperation,
        cognitiveTask: bp.cognitiveTask,
        scenarioType: bp.scenarioType,
        numericalOrTheory: bp.numericalOrTheory,
        questionCategory: bp.questionCategory,
        difficulty: bp.difficulty,
        cognitiveLevel: bp.cognitiveLevel,
        correctMethod: q.correctMethod || bp.solvingMethodDescription
      };
    });

    const designReport = blueprint.map(b => ({
      questionId: `Q${b.questionIndex}`,
      concept: b.concept,
      archetypeId: b.archetypeId,
      procedureSignature: b.procedureSignature,
      unknownType: b.unknownType,
      numericalOrTheory: b.numericalOrTheory
    }));

    return {
      title:
        langCode === 'hi'
          ? 'कक्षा 11 भौतिकी: द्रव्यमान केंद्र — 25 अवधारणा-आधारित प्रश्न'
          : langCode === 'gu'
          ? 'ધોરણ 11 ભૌતિકવિજ્ઞાન: દ્રવ્યમાન કેન્દ્ર — 25 સંકલ્પના-આધારિત પ્રશ્નો'
          : langCode === 'es'
          ? 'Física Clase 11: Centro de Masas — 25 Preguntas Conceptuales'
          : 'Class 11 Physics: Center of Mass — 25 Concept-Based Questions',
      subject: 'Physics',
      academicLevel: 'Class 11',
      chapter: 'System of Particles and Rotational Motion',
      difficulty,
      language: langCode,
      conceptKnowledgeMap: {
        ...knowledgeMap,
        conceptCoverageMap,
        blueprint,
        designReport
      },
      topicCoverageReport: {
        mainTopic: 'Center of Mass',
        subjectCategory: 'physics',
        coveredConcepts: knowledgeMap.videoCoveredConcepts.map(c => ({
          name: c.concept,
          importance: c.importance === 'essential' ? 'essential' : 'important',
          timestamp: c.timestamp,
          timestampSeconds: c.timestampSeconds
        })),
        summaryText:
          langCode === 'hi'
            ? '25 प्रश्न: 18 गणना/संख्यात्मक और व्यावहारिक प्रश्न (72%) + 7 सैद्धांतिक और तार्किक प्रश्न (28%)'
            : langCode === 'gu'
            ? '25 પ્રશ્નો: 18 દાખલા/ગણતરી અને વ્યવહારુ પ્રશ્નો (72%) + 7 સૈદ્ધાંતિક અને તાર્કિક પ્રશ્નો (28%)'
            : langCode === 'es'
            ? '25 preguntas: 18 problemas numéricos/aplicados (72%) + 7 conceptuales/razonamiento (28%)'
            : '25 questions: 18 numerical & problem-solving (72%) + 7 conceptual & reasoning (28%)'
      },
      blueprint,
      distribution: {
        numericalAndProblemSolving: 18,
        conceptualAndReasoning: 7,
        easy: 5,
        medium: 12,
        hard: 8
      },
      questions
    };
  }

  private static buildCenterOfMassQuestionsByLanguage(langCode: 'en' | 'hi' | 'gu' | 'es'): QuizQuestion[] {
    if (langCode === 'hi') {
      return this.getCenterOfMassQuestionsHindi();
    }
    if (langCode === 'gu') {
      return this.getCenterOfMassQuestionsGujarati();
    }
    if (langCode === 'es') {
      return this.getCenterOfMassQuestionsSpanish();
    }
    return this.getCenterOfMassQuestionsEnglish();
  }

  // ===================== ENGLISH 25 QUESTIONS =====================
  private static getCenterOfMassQuestionsEnglish(): QuizQuestion[] {
    return [
      {
        id: 'q_com_1',
        type: 'mcq',
        questionCategory: 'numerical',
        topic: 'Center of Mass',
        subtopic: 'Two-Particle System Position Formula',
        concept: 'Two-Particle System Center of Mass',
        conceptName: 'Two-Particle System Center of Mass',
        problemArchetype: 'direct_numerical_calculation',
        numericalOrTheory: 'numerical',
        videoCoverage: 'fully_covered',
        difficulty: 'easy',
        cognitiveLevel: 'level_3_application',
        question:
          'Two identical particles, each of mass 3 kg, are placed on a line at x = 0 m and x = 4 m respectively. Calculate the position of their center of mass.',
        options: ['1.0 m', '2.0 m', '3.0 m', '4.0 m'],
        correctAnswer: '2.0 m',
        solution:
          'Given:\nm1 = 3 kg at x1 = 0 m\nm2 = 3 kg at x2 = 4 m\n\nFormula:\nx_cm = (m1*x1 + m2*x2) / (m1 + m2)\n\nSubstitute:\nx_cm = (3*0 + 3*4) / (3 + 3)\nx_cm = 12 / 6 = 2.0 m\n\nFinal Answer: 2.0 m (exact midpoint for equal masses)',
        stepByStepSolution:
          'Given:\nm1 = 3 kg at x1 = 0 m\nm2 = 3 kg at x2 = 4 m\n\nFormula:\nx_cm = (m1*x1 + m2*x2) / (m1 + m2)\n\nSubstitute:\nx_cm = (3*0 + 3*4) / (3 + 3)\nx_cm = 12 / 6 = 2.0 m\n\nFinal Answer: 2.0 m (exact midpoint for equal masses)',
        explanation:
          'For two equal masses (m1 = m2 = 3 kg), the center of mass is located precisely halfway between them: x_cm = (0 + 4) / 2 = 2.0 m.',
        mistakeExplanation:
          'Selecting 1.0 m comes from quartering the span instead of taking the half. Selecting 4.0 m gives the position of particle 2 rather than the barycenter.',
        correctMethod:
          'Apply the direct two-particle formula x_cm = (m1*x1 + m2*x2)/(m1 + m2); when m1 = m2, simplify to x_cm = (x1 + x2)/2.',
        distractorRationale: [
          { option: '1.0 m', errorType: 'Arithmetic quarter division error' },
          { option: '3.0 m', errorType: 'Swapped ratio toward non-existent heavier mass' },
          { option: '4.0 m', errorType: 'Chose position of the second particle instead of center of mass' }
        ],
        timestampFormatted: '02:10',
        timestampSeconds: 130
      },
      {
        id: 'q_com_2',
        type: 'mcq',
        questionCategory: 'numerical',
        topic: 'Center of Mass',
        subtopic: 'Two-Particle System Position Formula',
        concept: 'Two-Particle System Center of Mass',
        conceptName: 'Two-Particle System Center of Mass',
        problemArchetype: 'unknown_quantity_inversion',
        numericalOrTheory: 'numerical',
        videoCoverage: 'fully_covered',
        difficulty: 'medium',
        cognitiveLevel: 'level_3_application',
        question:
          'A particle of mass 2 kg is located at x = 0 m and an unknown mass m2 is placed at x = 4 m. If the center of mass of the system is at x = 3.0 m, calculate the value of the unknown mass m2.',
        options: ['2.0 kg', '4.0 kg', '6.0 kg', '8.0 kg'],
        correctAnswer: '6.0 kg',
        solution:
          'Given:\nm1 = 2 kg at x1 = 0 m\nm2 = ? at x2 = 4 m\nx_cm = 3.0 m\n\nFormula:\nx_cm = (m1*x1 + m2*x2) / (m1 + m2)\n\nSubstitute:\n3.0 = (2*0 + m2*4) / (2 + m2)\n3.0 * (2 + m2) = 4*m2\n6.0 + 3*m2 = 4*m2\n4*m2 - 3*m2 = 6.0\nm2 = 6.0 kg\n\nFinal Answer: 6.0 kg',
        stepByStepSolution:
          'Given:\nm1 = 2 kg at x1 = 0 m\nm2 = ? at x2 = 4 m\nx_cm = 3.0 m\n\nFormula:\nx_cm = (m1*x1 + m2*x2) / (m1 + m2)\n\nSubstitute:\n3.0 = (2*0 + m2*4) / (2 + m2)\n3.0 * (2 + m2) = 4*m2\n6.0 + 3*m2 = 4*m2\n4*m2 - 3*m2 = 6.0\nm2 = 6.0 kg\n\nFinal Answer: 6.0 kg',
        explanation:
          'Using the inverse center of mass relation x_cm = (m1*x1 + m2*x2)/(m1 + m2): substituting x_cm = 3.0, x1 = 0, x2 = 4 gives 3(2 + m2) = 4*m2, which yields m2 = 6.0 kg.',
        mistakeExplanation:
          'Choosing 4.0 kg confuses the position coordinate (x2 = 4 m) with the mass quantity. Choosing 2.0 kg erroneously assumes equal masses despite x_cm being at 3.0 m rather than the midpoint 2.0 m.',
        correctMethod:
          'Invert the center of mass formula: set x_cm as known, isolate m2 algebraically, and verify that the distance ratio r1/r2 = (3-0)/(4-3) = 3 matches the mass ratio m2/m1 = 6/2 = 3.',
        distractorRationale: [
          { option: '2.0 kg', errorType: 'Assumed equal masses without considering that COM is at x = 3 m, not the midpoint 2 m' },
          { option: '4.0 kg', errorType: 'Confused the position coordinate x = 4 m with mass quantity' },
          { option: '8.0 kg', errorType: 'Arithmetic mistake in solving 6 + 3*m2 = 4*m2' }
        ],
        timestampFormatted: '02:40',
        timestampSeconds: 160
      },
      {
        id: 'q_com_3',
        type: 'mcq',
        questionCategory: 'numerical',
        topic: 'Center of Mass',
        subtopic: 'Multi-Particle System & Coordinate Method (1D and 2D)',
        concept: 'Multi-Particle Coordinate Method (1D & 2D)',
        conceptName: 'Multi-Particle Coordinate Method (1D & 2D)',
        problemArchetype: 'reverse_coordinate_calculation',
        numericalOrTheory: 'numerical',
        videoCoverage: 'fully_covered',
        difficulty: 'medium',
        cognitiveLevel: 'level_3_application',
        question:
          'A mass of 3 kg is placed at x = -2 m and a mass of 1 kg is placed at an unknown coordinate x2. If their center of mass lies exactly at the origin (x = 0 m), find the coordinate x2.',
        options: ['-6.0 m', '+2.0 m', '+4.0 m', '+6.0 m'],
        correctAnswer: '+6.0 m',
        solution:
          'Given:\nm1 = 3 kg at x1 = -2 m\nm2 = 1 kg at x2 = ?\nx_cm = 0.0 m\n\nFormula:\nx_cm = (m1*x1 + m2*x2) / (m1 + m2)\n\nSubstitute:\n0.0 = [3*(-2) + 1*x2] / (3 + 1)\n-6 + x2 = 0\nx2 = +6.0 m\n\nFinal Answer: +6.0 m',
        stepByStepSolution:
          'Given:\nm1 = 3 kg at x1 = -2 m\nm2 = 1 kg at x2 = ?\nx_cm = 0.0 m\n\nFormula:\nx_cm = (m1*x1 + m2*x2) / (m1 + m2)\n\nSubstitute:\n0.0 = [3*(-2) + 1*x2] / (3 + 1)\n-6 + x2 = 0\nx2 = +6.0 m\n\nFinal Answer: +6.0 m',
        explanation:
          'For the center of mass to be at the origin, the total mass-moment must equal zero: m1*x1 + m2*x2 = 0. Thus 3(-2) + 1(x2) = 0 => x2 = +6.0 m.',
        mistakeExplanation:
          'Choosing -6.0 m inverts the required sign, placing both masses on the negative axis which would make x_cm negative rather than 0.',
        correctMethod:
          'Set the numerator Σ(m_i * x_i) equal to zero whenever the center of mass is situated at the origin, and solve for the unknown coordinate.',
        distractorRationale: [
          { option: '-6.0 m', errorType: 'Sign reversal error placing both masses on the negative side' },
          { option: '+2.0 m', errorType: 'Assumed symmetric distance without accounting for mass weighting 3:1' },
          { option: '+4.0 m', errorType: 'Arithmetic error in moment balancing' }
        ],
        timestampFormatted: '03:15',
        timestampSeconds: 195
      },
      {
        id: 'q_com_4',
        type: 'mcq',
        questionCategory: 'numerical',
        topic: 'Center of Mass',
        subtopic: 'Multi-Particle System & Coordinate Method (1D and 2D)',
        concept: 'Multi-Particle Coordinate Method (1D & 2D)',
        conceptName: 'Multi-Particle Coordinate Method (1D & 2D)',
        problemArchetype: 'multi_step_calculation',
        numericalOrTheory: 'numerical',
        videoCoverage: 'fully_covered',
        difficulty: 'medium',
        cognitiveLevel: 'level_3_application',
        question:
          'Three point masses: 2 kg at x = 0 m, 3 kg at x = 4 m, and 5 kg at x = 10 m are placed on the x-axis. First calculate the center of mass position x_cm, and then determine its distance from the leftmost mass.',
        options: ['4.7 m', '5.0 m', '6.2 m', '7.1 m'],
        correctAnswer: '6.2 m',
        solution:
          'Given:\nm1 = 2 kg at x1 = 0 m\nm2 = 3 kg at x2 = 4 m\nm3 = 5 kg at x3 = 10 m\n\nStep 1: Compute total mass\nM = 2 + 3 + 5 = 10 kg\n\nStep 2: Compute weighted moment sum\nΣ m_i x_i = (2*0) + (3*4) + (5*10) = 0 + 12 + 50 = 62 kg·m\n\nStep 3: Calculate center of mass\nx_cm = 62 / 10 = 6.2 m\n\nStep 4: Distance from leftmost mass (x1 = 0 m)\nDistance = 6.2 m - 0 m = 6.2 m\n\nFinal Answer: 6.2 m',
        stepByStepSolution:
          'Given:\nm1 = 2 kg at x1 = 0 m\nm2 = 3 kg at x2 = 4 m\nm3 = 5 kg at x3 = 10 m\n\nStep 1: Compute total mass\nM = 2 + 3 + 5 = 10 kg\n\nStep 2: Compute weighted moment sum\nΣ m_i x_i = (2*0) + (3*4) + (5*10) = 0 + 12 + 50 = 62 kg·m\n\nStep 3: Calculate center of mass\nx_cm = 62 / 10 = 6.2 m\n\nStep 4: Distance from leftmost mass (x1 = 0 m)\nDistance = 6.2 m - 0 m = 6.2 m\n\nFinal Answer: 6.2 m',
        explanation:
          'Using the multi-particle center of mass formula: x_cm = Σ(m_i*x_i) / Σ m_i = (2×0 + 3×4 + 5×10) / (2+3+5) = 62 / 10 = 6.2 m. The distance from the 2 kg mass at x = 0 is 6.2 m.',
        mistakeExplanation:
          'Selecting 4.7 m results from calculating the unweighted arithmetic average of positions (0+4+10)/3 = 4.67 m, completely ignoring the mass weighting.',
        correctMethod:
          'Sum all mass-position products in the numerator, sum all particle masses in the denominator, divide to find x_cm, and subtract the reference particle coordinate.',
        distractorRationale: [
          { option: '4.7 m', errorType: 'Computed unweighted position average: (0+4+10)/3 = 4.67 m' },
          { option: '5.0 m', errorType: 'Assumed simple midpoint of span: 10 / 2 = 5.0 m' },
          { option: '7.1 m', errorType: 'Inverted weighting toward the 5 kg particle excessively' }
        ],
        timestampFormatted: '04:10',
        timestampSeconds: 250
      },
      {
        id: 'q_com_5',
        type: 'mcq',
        questionCategory: 'numerical',
        topic: 'Center of Mass',
        subtopic: 'Two-Particle System Position Formula',
        concept: 'Two-Particle System Center of Mass',
        conceptName: 'Two-Particle System Center of Mass',
        problemArchetype: 'comparison_problem',
        numericalOrTheory: 'numerical',
        videoCoverage: 'fully_covered',
        difficulty: 'medium',
        cognitiveLevel: 'level_3_application',
        question:
          'System A consists of two 4 kg particles located at x = 0 m and x = 6 m. System B consists of a 1 kg particle at x = 0 m and a 3 kg particle at x = 8 m. Which system\'s center of mass is located further from the origin, and by what distance?',
        options: [
          'System A is further by 1.0 m',
          'System B is further by 3.0 m',
          'Both have identical center of mass at 3.0 m',
          'System B is further by 2.0 m'
        ],
        correctAnswer: 'System B is further by 3.0 m',
        solution:
          'Given:\nSystem A: m1 = 4 kg at x1 = 0 m, m2 = 4 kg at x2 = 6 m\nSystem B: m1 = 1 kg at x1 = 0 m, m2 = 3 kg at x2 = 8 m\n\nStep 1: Calculate x_cm for System A\nx_cm(A) = (4*0 + 4*6) / (4 + 4) = 24 / 8 = 3.0 m\n\nStep 2: Calculate x_cm for System B\nx_cm(B) = (1*0 + 3*8) / (1 + 3) = 24 / 4 = 6.0 m\n\nStep 3: Compare distances from origin\nDifference = x_cm(B) - x_cm(A) = 6.0 m - 3.0 m = 3.0 m\n\nFinal Answer: System B is further by 3.0 m',
        stepByStepSolution:
          'Given:\nSystem A: m1 = 4 kg at x1 = 0 m, m2 = 4 kg at x2 = 6 m\nSystem B: m1 = 1 kg at x1 = 0 m, m2 = 3 kg at x2 = 8 m\n\nStep 1: Calculate x_cm for System A\nx_cm(A) = (4*0 + 4*6) / (4 + 4) = 24 / 8 = 3.0 m\n\nStep 2: Calculate x_cm for System B\nx_cm(B) = (1*0 + 3*8) / (1 + 3) = 24 / 4 = 6.0 m\n\nStep 3: Compare distances from origin\nDifference = x_cm(B) - x_cm(A) = 6.0 m - 3.0 m = 3.0 m\n\nFinal Answer: System B is further by 3.0 m',
        explanation:
          'For System A: equal masses give x_cm(A) = (0 + 6)/2 = 3.0 m. For System B: x_cm(B) = (1×0 + 3×8)/(1 + 3) = 24/4 = 6.0 m. Comparing the two, System B is further from the origin by 6.0 - 3.0 = 3.0 m.',
        mistakeExplanation:
          'Assuming both have identical COM at 3.0 m overlooks that System B has an unequal mass distribution with 75% of mass concentrated at x = 8 m.',
        correctMethod:
          'Independently evaluate x_cm for each distinct system setup, then compute the difference in coordinates.',
        distractorRationale: [
          { option: 'System A is further by 1.0 m', errorType: 'Arithmetic mistake in evaluating System B' },
          { option: 'Both have identical center of mass at 3.0 m', errorType: 'Ignored unequal weighting in System B' },
          { option: 'System B is further by 2.0 m', errorType: 'Subtracted 4 from 6 instead of 3 from 6' }
        ],
        timestampFormatted: '05:00',
        timestampSeconds: 300
      },
      {
        id: 'q_com_6',
        type: 'mcq',
        questionCategory: 'numerical',
        topic: 'Center of Mass',
        subtopic: 'Displacement and Motion of Center of Mass',
        concept: 'Motion and Displacement of Center of Mass',
        conceptName: 'Motion and Displacement of Center of Mass',
        problemArchetype: 'change_one_variable_prediction',
        numericalOrTheory: 'numerical',
        videoCoverage: 'fully_covered',
        difficulty: 'medium',
        cognitiveLevel: 'level_3_application',
        question:
          'In a two-particle system with masses m1 = 2 kg and m2 = 8 kg, mass m1 is shifted to the right by 10 cm while mass m2 remains fixed. By what distance does the center of mass of the system shift?',
        options: ['1.0 cm', '2.0 cm', '5.0 cm', '10.0 cm'],
        correctAnswer: '2.0 cm',
        solution:
          'Given:\nm1 = 2 kg\nm2 = 8 kg\nΔx1 = +10 cm\nΔx2 = 0 cm\n\nFormula:\nΔx_cm = (m1*Δx1 + m2*Δx2) / (m1 + m2)\n\nSubstitute:\nΔx_cm = (2 * 10 + 8 * 0) / (2 + 8)\nΔx_cm = 20 / 10 = 2.0 cm\n\nFinal Answer: 2.0 cm to the right',
        stepByStepSolution:
          'Given:\nm1 = 2 kg\nm2 = 8 kg\nΔx1 = +10 cm\nΔx2 = 0 cm\n\nFormula:\nΔx_cm = (m1*Δx1 + m2*Δx2) / (m1 + m2)\n\nSubstitute:\nΔx_cm = (2 * 10 + 8 * 0) / (2 + 8)\nΔx_cm = 20 / 10 = 2.0 cm\n\nFinal Answer: 2.0 cm to the right',
        explanation:
          'The displacement of the center of mass when one particle moves is Δx_cm = (m1*Δx1)/M = (2 × 10)/(2 + 8) = 20/10 = 2.0 cm to the right.',
        mistakeExplanation:
          'Selecting 10.0 cm erroneously assumes the entire system moves with the single particle. Selecting 5.0 cm assumes an unweighted midpoint displacement.',
        correctMethod:
          'Differentiate or take increments of the position formula: Δx_cm = Σ(m_i * Δx_i) / M.',
        distractorRationale: [
          { option: '1.0 cm', errorType: 'Divided 10 by total mass directly without multiplying m1' },
          { option: '5.0 cm', errorType: 'Assumed midpoint shift of 10 / 2 = 5.0 cm' },
          { option: '10.0 cm', errorType: 'Assumed the center of mass shifts by the full 10 cm' }
        ],
        timestampFormatted: '06:40',
        timestampSeconds: 400
      },
      {
        id: 'q_com_7',
        type: 'mcq',
        questionCategory: 'numerical',
        topic: 'Center of Mass',
        subtopic: 'Unequal and Equal Mass Distributions (Symmetry)',
        concept: 'Mass Ratio and Symmetry Principles',
        conceptName: 'Mass Ratio and Symmetry Principles',
        problemArchetype: 'ratio_proportional_reasoning',
        numericalOrTheory: 'numerical',
        videoCoverage: 'fully_covered',
        difficulty: 'easy',
        cognitiveLevel: 'level_3_application',
        question:
          'Two particles of masses 4 kg and 12 kg are separated by a distance of 60 cm. Using the inverse mass ratio principle, find the distance of their center of mass from the lighter 4 kg mass.',
        options: ['15 cm', '30 cm', '45 cm', '50 cm'],
        correctAnswer: '45 cm',
        solution:
          'Given:\nm1 = 4 kg\nm2 = 12 kg\nSeparation L = 60 cm\n\nFormula:\nDistance from m1 is r1 = [m2 / (m1 + m2)] * L\n\nSubstitute:\nr1 = [12 / (4 + 12)] * 60\nr1 = (12 / 16) * 60 = (3 / 4) * 60 = 45 cm\n\nFinal Answer: 45 cm from the 4 kg mass',
        stepByStepSolution:
          'Given:\nm1 = 4 kg\nm2 = 12 kg\nSeparation L = 60 cm\n\nFormula:\nDistance from m1 is r1 = [m2 / (m1 + m2)] * L\n\nSubstitute:\nr1 = [12 / (4 + 12)] * 60\nr1 = (12 / 16) * 60 = (3 / 4) * 60 = 45 cm\n\nFinal Answer: 45 cm from the 4 kg mass',
        explanation:
          'The distance of the center of mass from mass m1 is inversely proportional to m1: r1 = [m2 / (m1 + m2)] × L = (12/16) × 60 = 45 cm. The center of mass is 45 cm from the 4 kg mass and 15 cm from the 12 kg mass.',
        mistakeExplanation:
          'Selecting 15 cm gives the distance from the heavier 12 kg mass instead of the lighter 4 kg mass.',
        correctMethod:
          'Use the ratio partition rule: the distance from mass m1 is proportional to the other mass m2: r1 = (m2/M)*L.',
        distractorRationale: [
          { option: '15 cm', errorType: 'Calculated distance from the 12 kg mass instead' },
          { option: '30 cm', errorType: 'Assumed unweighted midpoint 60 / 2 = 30 cm' },
          { option: '50 cm', errorType: 'Approximation arithmetic mistake' }
        ],
        timestampFormatted: '08:50',
        timestampSeconds: 530
      },
      {
        id: 'q_com_8',
        type: 'mcq',
        questionCategory: 'numerical',
        topic: 'Center of Mass',
        subtopic: 'Multi-Particle System & Coordinate Method (1D and 2D)',
        concept: 'Multi-Particle Coordinate Method (1D & 2D)',
        conceptName: 'Multi-Particle Coordinate Method (1D & 2D)',
        problemArchetype: 'coordinate_data_interpretation',
        numericalOrTheory: 'numerical',
        videoCoverage: 'fully_covered',
        difficulty: 'medium',
        cognitiveLevel: 'level_3_application',
        question:
          'Particle 1 of mass 2 kg is located at (1, 2) m and Particle 2 of mass 3 kg is located at (6, 7) m in a Cartesian plane. Find the coordinates (x_cm, y_cm) of their center of mass.',
        options: ['(3.5, 4.5) m', '(4.0, 5.0) m', '(4.5, 5.5) m', '(5.0, 4.0) m'],
        correctAnswer: '(4.0, 5.0) m',
        solution:
          'Given:\nm1 = 2 kg at (1, 2) m\nm2 = 3 kg at (6, 7) m\nTotal mass M = 2 + 3 = 5 kg\n\nStep 1: Calculate x_cm\nx_cm = (m1*x1 + m2*x2) / M = (2*1 + 3*6) / 5 = (2 + 18) / 5 = 20 / 5 = 4.0 m\n\nStep 2: Calculate y_cm\ny_cm = (m1*y1 + m2*y2) / M = (2*2 + 3*7) / 5 = (4 + 21) / 5 = 25 / 5 = 5.0 m\n\nFinal Answer: (4.0, 5.0) m',
        stepByStepSolution:
          'Given:\nm1 = 2 kg at (1, 2) m\nm2 = 3 kg at (6, 7) m\nTotal mass M = 2 + 3 = 5 kg\n\nStep 1: Calculate x_cm\nx_cm = (m1*x1 + m2*x2) / M = (2*1 + 3*6) / 5 = (2 + 18) / 5 = 20 / 5 = 4.0 m\n\nStep 2: Calculate y_cm\ny_cm = (m1*y1 + m2*y2) / M = (2*2 + 3*7) / 5 = (4 + 21) / 5 = 25 / 5 = 5.0 m\n\nFinal Answer: (4.0, 5.0) m',
        explanation:
          'Calculate x and y components independently: x_cm = (2×1 + 3×6)/5 = 20/5 = 4.0 m, and y_cm = (2×2 + 3×7)/5 = 25/5 = 5.0 m. Center of mass coordinates are (4.0, 5.0) m.',
        mistakeExplanation:
          'Selecting (3.5, 4.5) m comes from calculating the unweighted geometric midpoint ((1+6)/2, (2+7)/2), ignoring the 3 kg mass weighting.',
        correctMethod:
          'Treat orthogonal x and y axes independently using the 1D formula for each coordinate direction.',
        distractorRationale: [
          { option: '(3.5, 4.5) m', errorType: 'Calculated unweighted geometric midpoint: ((1+6)/2, (2+7)/2)' },
          { option: '(4.5, 5.5) m', errorType: 'Swapped mass weighting between particles' },
          { option: '(5.0, 4.0) m', errorType: 'Swapped x and y coordinates' }
        ],
        timestampFormatted: '07:50',
        timestampSeconds: 470
      },
      {
        id: 'q_com_9',
        type: 'mcq',
        questionCategory: 'numerical',
        topic: 'Center of Mass',
        subtopic: 'Multi-Particle System & Coordinate Method (1D and 2D)',
        concept: 'Multi-Particle Coordinate Method (1D & 2D)',
        conceptName: 'Multi-Particle Coordinate Method (1D & 2D)',
        problemArchetype: 'negative_sign_based_problem',
        numericalOrTheory: 'numerical',
        videoCoverage: 'fully_covered',
        difficulty: 'medium',
        cognitiveLevel: 'level_3_application',
        question:
          'Three masses are placed along the x-axis: 2 kg at x = -4 m, 3 kg at x = 0 m, and 5 kg at x = +6 m. Calculate the x-coordinate of their center of mass.',
        options: ['+1.5 m', '+2.2 m', '+3.0 m', '-0.8 m'],
        correctAnswer: '+2.2 m',
        solution:
          'Given:\nm1 = 2 kg at x1 = -4 m\nm2 = 3 kg at x2 = 0 m\nm3 = 5 kg at x3 = +6 m\n\nStep 1: Compute total mass\nM = 2 + 3 + 5 = 10 kg\n\nStep 2: Compute signed moment sum\nΣ m_i x_i = 2*(-4) + 3*(0) + 5*(6) = -8 + 0 + 30 = +22 kg·m\n\nStep 3: Calculate center of mass\nx_cm = 22 / 10 = +2.2 m\n\nFinal Answer: +2.2 m',
        stepByStepSolution:
          'Given:\nm1 = 2 kg at x1 = -4 m\nm2 = 3 kg at x2 = 0 m\nm3 = 5 kg at x3 = +6 m\n\nStep 1: Compute total mass\nM = 2 + 3 + 5 = 10 kg\n\nStep 2: Compute signed moment sum\nΣ m_i x_i = 2*(-4) + 3*(0) + 5*(6) = -8 + 0 + 30 = +22 kg·m\n\nStep 3: Calculate center of mass\nx_cm = 22 / 10 = +2.2 m\n\nFinal Answer: +2.2 m',
        explanation:
          'Maintain signed coordinates: total mass M = 10 kg. The numerator sum of moments is 2(-4) + 3(0) + 5(6) = -8 + 30 = +22 kg·m. Dividing by 10 gives x_cm = +2.2 m.',
        mistakeExplanation:
          'Selecting +3.0 m ignores the negative sign on x1 and calculates (8 + 30)/10 = 3.8 or (0+30)/10 = 3.0 m.',
        correctMethod:
          'Always preserve the negative sign for coordinates to the left of the origin when calculating the algebraic sum Σ(m_i * x_i).',
        distractorRationale: [
          { option: '+1.5 m', errorType: 'Arithmetic mistake in moment addition' },
          { option: '+3.0 m', errorType: 'Ignored negative sign: (8 + 30) / 10 or omitted particle 1' },
          { option: '-0.8 m', errorType: 'Subtracted 30 from -8 incorrectly' }
        ],
        timestampFormatted: '08:20',
        timestampSeconds: 500
      },
      {
        id: 'q_com_10',
        type: 'mcq',
        questionCategory: 'numerical',
        topic: 'Center of Mass',
        subtopic: 'Unequal and Equal Mass Distributions (Symmetry)',
        concept: 'Mass Ratio and Symmetry Principles',
        conceptName: 'Mass Ratio and Symmetry Principles',
        problemArchetype: 'missing_information_reconstruction',
        numericalOrTheory: 'numerical',
        videoCoverage: 'fully_covered',
        difficulty: 'hard',
        cognitiveLevel: 'level_3_application',
        question:
          'Four identical particles of mass 2 kg each are positioned at the corners of a square of side 2 m: (0,0), (2,0), (2,2), and (0,2). If the particle at (2,2) is removed, where is the center of mass of the remaining three particles located?',
        options: ['(1.00, 1.00) m', '(0.67, 0.67) m', '(0.50, 0.50) m', '(1.33, 1.33) m'],
        correctAnswer: '(0.67, 0.67) m',
        solution:
          'Given:\nOriginal 4 masses of 2 kg each at (0,0), (2,0), (2,2), (0,2)\nRemoved mass at (2,2)\nRemaining 3 masses are at (0,0), (2,0), (0,2)\n\nStep 1: Total remaining mass\nM_rem = 2 + 2 + 2 = 6 kg\n\nStep 2: Calculate x_cm\nx_cm = [2*0 + 2*2 + 2*0] / 6 = 4 / 6 = 2/3 ≈ 0.67 m\n\nStep 3: Calculate y_cm\ny_cm = [2*0 + 2*0 + 2*2] / 6 = 4 / 6 = 2/3 ≈ 0.67 m\n\nFinal Answer: (0.67, 0.67) m',
        stepByStepSolution:
          'Given:\nOriginal 4 masses of 2 kg each at (0,0), (2,0), (2,2), (0,2)\nRemoved mass at (2,2)\nRemaining 3 masses are at (0,0), (2,0), (0,2)\n\nStep 1: Total remaining mass\nM_rem = 2 + 2 + 2 = 6 kg\n\nStep 2: Calculate x_cm\nx_cm = [2*0 + 2*2 + 2*0] / 6 = 4 / 6 = 2/3 ≈ 0.67 m\n\nStep 3: Calculate y_cm\ny_cm = [2*0 + 2*0 + 2*2] / 6 = 4 / 6 = 2/3 ≈ 0.67 m\n\nFinal Answer: (0.67, 0.67) m',
        explanation:
          'For the remaining 3 masses, total mass is 6 kg. x_cm = (2×2)/6 = 2/3 ≈ 0.67 m and y_cm = (2×2)/6 = 2/3 ≈ 0.67 m. The center of mass shifts diagonally away from the removed corner.',
        mistakeExplanation:
          'Selecting (1.00, 1.00) m assumes the center of mass remains at the square\'s geometric center despite one corner mass being missing.',
        correctMethod:
          'Reconstruct the system by summing only the remaining masses, or subtract the removed mass moment from the full symmetric system moment.',
        distractorRationale: [
          { option: '(1.00, 1.00) m', errorType: 'Assumed center of mass remains at the original square center' },
          { option: '(0.50, 0.50) m', errorType: 'Divided 2 by 4 instead of 6' },
          { option: '(1.33, 1.33) m', errorType: 'Shifted toward the missing mass instead of away' }
        ],
        timestampFormatted: '09:25',
        timestampSeconds: 565
      },
      {
        id: 'q_com_11',
        type: 'mcq',
        questionCategory: 'application',
        topic: 'Center of Mass',
        subtopic: 'Unequal and Equal Mass Distributions (Symmetry)',
        concept: 'Mass Ratio and Symmetry Principles',
        conceptName: 'Mass Ratio and Symmetry Principles',
        problemArchetype: 'real_world_application',
        numericalOrTheory: 'numerical',
        videoCoverage: 'fully_covered',
        difficulty: 'easy',
        cognitiveLevel: 'level_3_application',
        question:
          'Two point masses 2 kg and 6 kg are attached to opposite ends of a 40 cm light rigid rod of negligible mass. At what distance from the heavier 6 kg mass can the rod be perfectly balanced on a knife-edge pivot?',
        options: ['10 cm', '20 cm', '30 cm', '35 cm'],
        correctAnswer: '10 cm',
        solution:
          'Given:\nm1 = 2 kg\nm2 = 6 kg\nRod length L = 40 cm\n\nFormula:\nA rigid body balances at its center of mass.\nDistance from heavier mass m2 is r2 = [m1 / (m1 + m2)] * L\n\nSubstitute:\nr2 = [2 / (2 + 6)] * 40\nr2 = (2 / 8) * 40 = (1 / 4) * 40 = 10 cm\n\nFinal Answer: 10 cm from the 6 kg mass',
        stepByStepSolution:
          'Given:\nm1 = 2 kg\nm2 = 6 kg\nRod length L = 40 cm\n\nFormula:\nA rigid body balances at its center of mass.\nDistance from heavier mass m2 is r2 = [m1 / (m1 + m2)] * L\n\nSubstitute:\nr2 = [2 / (2 + 6)] * 40\nr2 = (2 / 8) * 40 = (1 / 4) * 40 = 10 cm\n\nFinal Answer: 10 cm from the 6 kg mass',
        explanation:
          'A physical system balances when pivoted at its center of mass. The distance from the 6 kg mass is (2 / (2 + 6)) × 40 = (2/8) × 40 = 10 cm.',
        mistakeExplanation:
          'Selecting 30 cm calculates the distance from the 2 kg mass rather than the 6 kg mass.',
        correctMethod:
          'Set up the pivot balance condition: torque balance about pivot requires m1*r1 = m2*r2, which is identical to the center of mass position definition.',
        distractorRationale: [
          { option: '30 cm', errorType: 'Calculated distance from the 2 kg mass: (6/8)*40 = 30 cm' },
          { option: '20 cm', errorType: 'Assumed geometric midpoint 40 / 2 = 20 cm' },
          { option: '35 cm', errorType: 'Arithmetic approximation error' }
        ],
        timestampFormatted: '11:00',
        timestampSeconds: 660
      },
      {
        id: 'q_com_12',
        type: 'mcq',
        questionCategory: 'numerical',
        topic: 'Center of Mass',
        subtopic: 'Displacement and Motion of Center of Mass',
        concept: 'Motion and Displacement of Center of Mass',
        conceptName: 'Motion and Displacement of Center of Mass',
        problemArchetype: 'constraint_based_problem',
        numericalOrTheory: 'numerical',
        videoCoverage: 'fully_covered',
        difficulty: 'hard',
        cognitiveLevel: 'level_3_application',
        question:
          'Two particles of masses m1 = 3 kg and m2 = 6 kg lie on a line. If mass m1 is moved 4 m to the right, how far and in which direction must mass m2 be moved to keep the center of mass strictly stationary?',
        options: ['2 m to the left', '2 m to the right', '4 m to the left', '8 m to the left'],
        correctAnswer: '2 m to the left',
        solution:
          'Given:\nm1 = 3 kg\nm2 = 6 kg\nΔx1 = +4 m\nConstraint: Δx_cm = 0\n\nFormula:\nm1*Δx1 + m2*Δx2 = 0\n\nSubstitute:\n3*(+4) + 6*(Δx2) = 0\n12 + 6*Δx2 = 0\n6*Δx2 = -12\nΔx2 = -2 m (2 m to the left)\n\nFinal Answer: 2 m to the left',
        stepByStepSolution:
          'Given:\nm1 = 3 kg\nm2 = 6 kg\nΔx1 = +4 m\nConstraint: Δx_cm = 0\n\nFormula:\nm1*Δx1 + m2*Δx2 = 0\n\nSubstitute:\n3*(+4) + 6*(Δx2) = 0\n12 + 6*Δx2 = 0\n6*Δx2 = -12\nΔx2 = -2 m (2 m to the left)\n\nFinal Answer: 2 m to the left',
        explanation:
          'To keep the center of mass fixed, the net change in mass moments must be zero: m1*Δx1 + m2*Δx2 = 0. Therefore 3(+4) + 6(Δx2) = 0, giving Δx2 = -2 m (2 m to the left).',
        mistakeExplanation:
          'Selecting 2 m to the right has the correct magnitude but wrong sign; moving both particles in the same direction inevitably displaces the center of mass.',
        correctMethod:
          'Apply the zero-displacement constraint m1*Δx1 + m2*Δx2 = 0 and solve algebraically for Δx2.',
        distractorRationale: [
          { option: '2 m to the right', errorType: 'Correct magnitude but wrong direction' },
          { option: '4 m to the left', errorType: 'Assumed equal displacements regardless of mass ratio' },
          { option: '8 m to the left', errorType: 'Inverted the mass ratio: (6/3) * 4 = 8 m' }
        ],
        timestampFormatted: '07:15',
        timestampSeconds: 435
      },
      {
        id: 'q_com_13',
        type: 'mcq',
        questionCategory: 'numerical',
        topic: 'Center of Mass',
        subtopic: 'Unequal and Equal Mass Distributions (Symmetry)',
        concept: 'Mass Ratio and Symmetry Principles',
        conceptName: 'Mass Ratio and Symmetry Principles',
        problemArchetype: 'error_analysis',
        numericalOrTheory: 'numerical',
        videoCoverage: 'fully_covered',
        difficulty: 'medium',
        cognitiveLevel: 'level_3_application',
        question:
          'A student calculated the center of mass for a 2 kg mass at x = 0 m and a 6 kg mass at x = 8 m by simply taking the unweighted average (0 + 8)/2 = 4.0 m. What is the student\'s calculation error, and what is the true position of the center of mass?',
        options: [
          'True COM is at 6.0 m; student\'s estimate was 2.0 m too low',
          'True COM is at 4.0 m; the student\'s calculation was correct',
          'True COM is at 5.0 m; student\'s estimate was 1.0 m too low',
          'True COM is at 7.0 m; student\'s estimate was 3.0 m too low'
        ],
        correctAnswer: 'True COM is at 6.0 m; student\'s estimate was 2.0 m too low',
        solution:
          'Given:\nm1 = 2 kg at x1 = 0 m\nm2 = 6 kg at x2 = 8 m\nStudent unweighted estimate: (0 + 8)/2 = 4.0 m\n\nStep 1: Compute true center of mass\nx_cm = (m1*x1 + m2*x2) / (m1 + m2)\nx_cm = (2*0 + 6*8) / (2 + 6) = 48 / 8 = 6.0 m\n\nStep 2: Evaluate error\nError = x_cm(true) - x_student = 6.0 m - 4.0 m = 2.0 m\n\nFinal Answer: True COM is at 6.0 m; student\'s estimate was 2.0 m too low',
        stepByStepSolution:
          'Given:\nm1 = 2 kg at x1 = 0 m\nm2 = 6 kg at x2 = 8 m\nStudent unweighted estimate: (0 + 8)/2 = 4.0 m\n\nStep 1: Compute true center of mass\nx_cm = (m1*x1 + m2*x2) / (m1 + m2)\nx_cm = (2*0 + 6*8) / (2 + 6) = 48 / 8 = 6.0 m\n\nStep 2: Evaluate error\nError = x_cm(true) - x_student = 6.0 m - 4.0 m = 2.0 m\n\nFinal Answer: True COM is at 6.0 m; student\'s estimate was 2.0 m too low',
        explanation:
          'The student omitted mass weighting. True x_cm = (2×0 + 6×8)/8 = 48/8 = 6.0 m. Because the 6 kg mass is 3 times heavier, COM is 3/4 of the way toward it. The student\'s unweighted midpoint (4.0 m) was 2.0 m too low.',
        mistakeExplanation:
          'Believing the student was correct ignores that center of mass is a mass-weighted barycenter, which only equals the unweighted midpoint when all masses are identical.',
        correctMethod:
          'Diagnose the unweighted arithmetic average misconception, evaluate true x_cm using Σmx/M, and calculate the deviation.',
        distractorRationale: [
          { option: 'True COM is at 4.0 m; the student\'s calculation was correct', errorType: 'Endorsed the unweighted average misconception' },
          { option: 'True COM is at 5.0 m; student\'s estimate was 1.0 m too low', errorType: 'Arithmetic mistake in weighted sum' },
          { option: 'True COM is at 7.0 m; student\'s estimate was 3.0 m too low', errorType: 'Overestimated mass weighting' }
        ],
        timestampFormatted: '10:00',
        timestampSeconds: 600
      },
      {
        id: 'q_com_14',
        type: 'mcq',
        questionCategory: 'numerical',
        topic: 'Center of Mass',
        subtopic: 'Multi-Particle System & Coordinate Method (1D and 2D)',
        concept: 'Multi-Particle Coordinate Method (1D & 2D)',
        conceptName: 'Multi-Particle Coordinate Method (1D & 2D)',
        problemArchetype: 'find_incorrect_method',
        numericalOrTheory: 'numerical',
        videoCoverage: 'fully_covered',
        difficulty: 'medium',
        cognitiveLevel: 'level_3_application',
        question:
          'When calculating the center of mass of a system of particles using x_cm = Σ(m_i x_i)/M, which of the following calculation steps represents an invalid mathematical or physical procedure?',
        options: [
          'Multiplying each particle mass by its position coordinate',
          'Dividing the total moment Σ(m_i x_i) by the total number of particles N instead of total mass M',
          'Treating orthogonal coordinate axes x and y completely independently',
          'Assigning negative signs to coordinates located on the negative axis'
        ],
        correctAnswer:
          'Dividing the total moment Σ(m_i x_i) by the total number of particles N instead of total mass M',
        solution:
          'Given formula: x_cm = Σ(m_i * x_i) / Σ m_i\nValid procedure 1: Multiply each particle mass m_i by its position coordinate x_i.\nValid procedure 2: Preserve signs of negative coordinates.\nValid procedure 3: Solve x, y, z coordinates independently.\nInvalid procedure: Dividing by the number of particles N instead of the total system mass M = Σ m_i.\n\nFinal Answer: Dividing the total moment Σ(m_i x_i) by the total number of particles N instead of total mass M',
        stepByStepSolution:
          'Given formula: x_cm = Σ(m_i * x_i) / Σ m_i\nValid procedure 1: Multiply each particle mass m_i by its position coordinate x_i.\nValid procedure 2: Preserve signs of negative coordinates.\nValid procedure 3: Solve x, y, z coordinates independently.\nInvalid procedure: Dividing by the number of particles N instead of the total system mass M = Σ m_i.\n\nFinal Answer: Dividing the total moment Σ(m_i x_i) by the total number of particles N instead of total mass M',
        explanation:
          'The denominator in the center of mass formula must always be the total mass M = Σ m_i, not the particle count N. Dividing by N yields an unweighted or dimensionally invalid result (kg·m / particle instead of m).',
        mistakeExplanation:
          'Believing that orthogonal axes cannot be treated independently is incorrect; Cartesian components x_cm, y_cm, z_cm are strictly independent linear projections.',
        correctMethod:
          'Check dimensional consistency [L] and ensure that the divisor is the scalar total mass M = Σ m_i.',
        distractorRationale: [
          { option: 'Multiplying each particle mass by its position coordinate', errorType: 'This is the mandatory first step of taking moments' },
          { option: 'Treating orthogonal coordinate axes x and y completely independently', errorType: 'Orthogonal independence is mathematically and physically correct' },
          { option: 'Assigning negative signs to coordinates located on the negative axis', errorType: 'Signed coordinates are essential to preserve vector direction' }
        ],
        timestampFormatted: '10:30',
        timestampSeconds: 630
      },
      {
        id: 'q_com_15',
        type: 'mcq',
        questionCategory: 'application',
        topic: 'Center of Mass',
        subtopic: 'Displacement and Motion of Center of Mass',
        concept: 'Motion and Displacement of Center of Mass',
        conceptName: 'Motion and Displacement of Center of Mass',
        problemArchetype: 'select_correct_method',
        numericalOrTheory: 'numerical',
        videoCoverage: 'fully_covered',
        difficulty: 'medium',
        cognitiveLevel: 'level_3_application',
        question:
          'Two masses 4 kg and 8 kg are initially at rest separated by a distance of 12 m on a frictionless plane. They attract each other due to mutual internal gravity and eventually collide. Which method correctly determines the position where they collide, and what is its distance from the 4 kg mass?',
        options: [
          '4.0 m, because the heavier mass pulls the lighter mass to its location',
          '6.0 m, by assuming particles under equal forces meet at the geometric midpoint',
          '8.0 m, by applying stationary center of mass (F_ext = 0) so particles meet at the barycenter',
          '10.0 m, by using the acceleration ratio of 2:1 applied over time'
        ],
        correctAnswer:
          '8.0 m, by applying stationary center of mass (F_ext = 0) so particles meet at the barycenter',
        solution:
          'Given:\nm1 = 4 kg at x = 0\nm2 = 8 kg at x = 12 m\nInitial velocity = 0\nExternal force F_ext = 0\n\nMethod:\nBecause F_ext = 0, a_cm = 0 and v_cm = 0. The center of mass remains permanently stationary.\nThe collision must take place exactly at the stationary center of mass.\n\nCalculation:\nx_collision = x_cm = [m2 / (m1 + m2)] * d\nx_collision = [8 / (4 + 8)] * 12 = (8 / 12) * 12 = 8.0 m\n\nFinal Answer: 8.0 m, by applying stationary center of mass',
        stepByStepSolution:
          'Given:\nm1 = 4 kg at x = 0\nm2 = 8 kg at x = 12 m\nInitial velocity = 0\nExternal force F_ext = 0\n\nMethod:\nBecause F_ext = 0, a_cm = 0 and v_cm = 0. The center of mass remains permanently stationary.\nThe collision must take place exactly at the stationary center of mass.\n\nCalculation:\nx_collision = x_cm = [m2 / (m1 + m2)] * d\nx_collision = [8 / (4 + 8)] * 12 = (8 / 12) * 12 = 8.0 m\n\nFinal Answer: 8.0 m, by applying stationary center of mass',
        explanation:
          'Since no external forces act on the isolated system, the center of mass remains at its initial location. They meet at the stationary center of mass. Distance from the 4 kg mass is (8 / 12) × 12 = 8.0 m.',
        mistakeExplanation:
          'Assuming they meet at the geometric midpoint 6.0 m overlooks that unequal masses experience unequal accelerations (a1 = 2*a2), so the lighter mass travels twice as far.',
        correctMethod:
          'Recognize that internal mutual forces cannot displace the center of mass; find the static barycenter position directly.',
        distractorRationale: [
          { option: '4.0 m, because the heavier mass pulls the lighter mass to its location', errorType: 'Distance from the 8 kg mass instead of 4 kg mass' },
          { option: '6.0 m, by assuming particles under equal forces meet at the geometric midpoint', errorType: 'Assumed equal accelerations despite unequal masses' },
          { option: '10.0 m, by using the acceleration ratio of 2:1 applied over time', errorType: 'Misapplied acceleration ratio' }
        ],
        timestampFormatted: '12:15',
        timestampSeconds: 735
      },
      {
        id: 'q_com_16',
        type: 'mcq',
        questionCategory: 'numerical',
        topic: 'Center of Mass',
        subtopic: 'Displacement and Motion of Center of Mass',
        concept: 'Motion and Displacement of Center of Mass',
        conceptName: 'Motion and Displacement of Center of Mass',
        problemArchetype: 'case_based_numerical_problem',
        numericalOrTheory: 'numerical',
        videoCoverage: 'fully_covered',
        difficulty: 'hard',
        cognitiveLevel: 'level_3_application',
        question:
          'Particle A of mass 2 kg moves with velocity v1 = +4 m/s along the x-axis, and Particle B of mass 3 kg moves with velocity v2 = -1 m/s along the same axis. What is the velocity of their center of mass v_cm?',
        options: ['+1.0 m/s', '+1.5 m/s', '+2.2 m/s', '-1.0 m/s'],
        correctAnswer: '+1.0 m/s',
        solution:
          'Given:\nm1 = 2 kg, v1 = +4 m/s\nm2 = 3 kg, v2 = -1 m/s\n\nFormula:\nv_cm = (m1*v1 + m2*v2) / (m1 + m2)\n\nSubstitute:\nv_cm = [2*(+4) + 3*(-1)] / (2 + 3)\nv_cm = (8 - 3) / 5 = 5 / 5 = +1.0 m/s\n\nFinal Answer: +1.0 m/s',
        stepByStepSolution:
          'Given:\nm1 = 2 kg, v1 = +4 m/s\nm2 = 3 kg, v2 = -1 m/s\n\nFormula:\nv_cm = (m1*v1 + m2*v2) / (m1 + m2)\n\nSubstitute:\nv_cm = [2*(+4) + 3*(-1)] / (2 + 3)\nv_cm = (8 - 3) / 5 = 5 / 5 = +1.0 m/s\n\nFinal Answer: +1.0 m/s',
        explanation:
          'Velocity of center of mass is v_cm = (m1*v1 + m2*v2)/(m1 + m2) = (2×4 + 3×(-1))/5 = (8 - 3)/5 = +1.0 m/s along the positive x-axis.',
        mistakeExplanation:
          'Selecting +1.5 m/s computes the unweighted average velocity (4 - 1)/2 = 1.5 m/s. Selecting +2.2 m/s ignores velocity direction and adds absolute values (8 + 3)/5 = 2.2 m/s.',
        correctMethod:
          'Apply momentum weighting v_cm = P_total / M_total, strictly preserving the sign of velocity vectors.',
        distractorRationale: [
          { option: '+1.5 m/s', errorType: 'Calculated unweighted average velocity: (4 - 1)/2 = 1.5 m/s' },
          { option: '+2.2 m/s', errorType: 'Ignored direction and added magnitudes: (8 + 3)/5 = 2.2 m/s' },
          { option: '-1.0 m/s', errorType: 'Incorrect overall sign calculation' }
        ],
        timestampFormatted: '11:40',
        timestampSeconds: 700
      },
      {
        id: 'q_com_17',
        type: 'mcq',
        questionCategory: 'numerical',
        topic: 'Center of Mass',
        subtopic: 'Multi-Particle System & Coordinate Method (1D and 2D)',
        concept: 'Multi-Particle Coordinate Method (1D & 2D)',
        conceptName: 'Multi-Particle Coordinate Method (1D & 2D)',
        problemArchetype: 'multi_concept_numerical_problem',
        numericalOrTheory: 'numerical',
        videoCoverage: 'fully_covered',
        difficulty: 'hard',
        cognitiveLevel: 'level_4_analysis',
        question:
          'A composite system consists of a uniform thin rod of length 2.0 m and mass 3.0 kg placed along the x-axis from x = 0 to x = 2.0 m (with its center of mass at its midpoint x = 1.0 m), and a point mass of 1.0 kg attached at its end x = 2.0 m. What is the center of mass position x_cm of the combined system?',
        options: ['1.00 m', '1.25 m', '1.50 m', '1.75 m'],
        correctAnswer: '1.25 m',
        solution:
          'Given:\nRod: mass m_rod = 3.0 kg, center of mass x_rod = 1.0 m\nPoint mass: m_pt = 1.0 kg at x_pt = 2.0 m\n\nConcept:\nA continuous body can be replaced by its equivalent point mass located at its individual center of mass.\n\nCalculation:\nx_cm = (m_rod * x_rod + m_pt * x_pt) / (m_rod + m_pt)\nx_cm = [(3.0 * 1.0) + (1.0 * 2.0)] / (3.0 + 1.0)\nx_cm = (3.0 + 2.0) / 4.0 = 5.0 / 4.0 = 1.25 m\n\nFinal Answer: 1.25 m',
        stepByStepSolution:
          'Given:\nRod: mass m_rod = 3.0 kg, center of mass x_rod = 1.0 m\nPoint mass: m_pt = 1.0 kg at x_pt = 2.0 m\n\nConcept:\nA continuous body can be replaced by its equivalent point mass located at its individual center of mass.\n\nCalculation:\nx_cm = (m_rod * x_rod + m_pt * x_pt) / (m_rod + m_pt)\nx_cm = [(3.0 * 1.0) + (1.0 * 2.0)] / (3.0 + 1.0)\nx_cm = (3.0 + 2.0) / 4.0 = 5.0 / 4.0 = 1.25 m\n\nFinal Answer: 1.25 m',
        explanation:
          'Replace the uniform rod with an equivalent 3 kg point mass at its geometric center (x = 1.0 m). Now calculate two-body center of mass with the 1 kg particle at x = 2.0 m: x_cm = (3×1 + 1×2)/4 = 5/4 = 1.25 m.',
        mistakeExplanation:
          'Selecting 1.50 m computes the unweighted midpoint (1.0 + 2.0)/2 = 1.50 m, ignoring that the 3 kg rod outweighs the 1 kg particle 3:1.',
        correctMethod:
          'Condense symmetric continuous parts into point masses at their respective barycenters, then apply the standard weighted summation Σ(m_i*x_i)/M.',
        distractorRationale: [
          { option: '1.00 m', errorType: 'Ignored the attached 1 kg particle completely' },
          { option: '1.50 m', errorType: 'Computed unweighted midpoint of the two centers: (1 + 2)/2 = 1.5 m' },
          { option: '1.75 m', errorType: 'Inverted the mass weights giving 3 kg to the point mass' }
        ],
        timestampFormatted: '12:30',
        timestampSeconds: 750
      },
      {
        id: 'q_com_18',
        type: 'mcq',
        questionCategory: 'numerical',
        topic: 'Center of Mass',
        subtopic: 'Multi-Particle System & Coordinate Method (1D and 2D)',
        concept: 'Multi-Particle Coordinate Method (1D & 2D)',
        conceptName: 'Multi-Particle Coordinate Method (1D & 2D)',
        problemArchetype: 'exam_style_challenge',
        numericalOrTheory: 'numerical',
        videoCoverage: 'fully_covered',
        difficulty: 'hard',
        cognitiveLevel: 'level_5_exam_reasoning',
        question:
          "Two masses 1 kg and 3 kg are at x = 2 m and x = 6 m. If the origin is shifted to x = +2 m (so that mass 1 is at the new origin x' = 0), what is the position of the center of mass in this new coordinate system?",
        options: ['1.5 m', '3.0 m', '5.0 m', '7.0 m'],
        correctAnswer: '3.0 m',
        solution:
          "Method 1 (Old frame then shift):\nx_cm = (1*2 + 3*6)/(1 + 3) = 20 / 4 = 5.0 m\nNew origin is at x = +2 m, so x'_cm = x_cm - 2 = 5.0 - 2.0 = 3.0 m.\n\nMethod 2 (Directly in new frame):\nMass 1 is at x'1 = 0 m\nMass 2 is at x'2 = 6 - 2 = 4.0 m\nx'_cm = (1*0 + 3*4) / (1 + 3) = 12 / 4 = 3.0 m.\n\nFinal Answer: 3.0 m",
        stepByStepSolution:
          "Method 1 (Old frame then shift):\nx_cm = (1*2 + 3*6)/(1 + 3) = 20 / 4 = 5.0 m\nNew origin is at x = +2 m, so x'_cm = x_cm - 2 = 5.0 - 2.0 = 3.0 m.\n\nMethod 2 (Directly in new frame):\nMass 1 is at x'1 = 0 m\nMass 2 is at x'2 = 6 - 2 = 4.0 m\nx'_cm = (1*0 + 3*4) / (1 + 3) = 12 / 4 = 3.0 m.\n\nFinal Answer: 3.0 m",
        explanation:
          "In the new coordinate frame, mass 1 is at the origin (x' = 0) and mass 2 is at x' = 4 m. The center of mass is x'_cm = (1×0 + 3×4)/4 = 3.0 m. This confirms that translating coordinates shifts the coordinate value by the shift distance (5.0 m - 2.0 m = 3.0 m) while preserving the physical barycenter.",
        mistakeExplanation:
          "Selecting 5.0 m gives the answer in the original unshifted coordinate frame, forgetting that the question specifically requested the coordinate in the new reference frame.",
        correctMethod:
          "Either calculate x_cm in the original frame and subtract the origin displacement (x' = x - x_0), or recompute in the shifted coordinates directly.",
        distractorRationale: [
          { option: '1.5 m', errorType: 'Divided 3 by 2 instead of total mass 4' },
          { option: '5.0 m', errorType: 'Provided coordinate in the old frame instead of new frame' },
          { option: '7.0 m', errorType: 'Added 2 m instead of subtracting coordinate shift' }
        ],
        timestampFormatted: '12:50',
        timestampSeconds: 770
      },
      {
        id: 'q_com_19',
        type: 'mcq',
        questionCategory: 'reasoning',
        topic: 'Center of Mass',
        subtopic: 'Displacement and Motion of Center of Mass',
        concept: 'Motion and Displacement of Center of Mass',
        conceptName: 'Motion and Displacement of Center of Mass',
        problemArchetype: 'conceptual_prediction',
        numericalOrTheory: 'theory',
        videoCoverage: 'fully_covered',
        difficulty: 'medium',
        cognitiveLevel: 'level_4_analysis',
        question:
          'A projectile is moving along a parabolic trajectory in the air. At the peak of its trajectory, it explodes into three fragments due to internal chemical reactions. What path does the center of mass of the fragments follow immediately after the explosion (neglecting air resistance)?',
        options: [
          'It continues along the exact same parabolic trajectory that the unexploded shell would have followed',
          'It halts abruptly in mid-air because the fragments fly in all directions',
          'It falls straight down vertically under gravity',
          'It accelerates upwards due to the force of the explosion'
        ],
        correctAnswer:
          'It continues along the exact same parabolic trajectory that the unexploded shell would have followed',
        solution:
          'Principle:\nMotion of center of mass is governed exclusively by net external force: Σ F_ext = M * a_cm.\n\nAnalysis:\n1. The explosion is caused entirely by internal chemical forces (action-reaction pairs sum to zero).\n2. The only external force acting on the projectile system is uniform gravity: F_ext = M * g downwards.\n3. Therefore, a_cm = g downwards before, during, and after the explosion.\n4. Since its position and velocity at the explosion point are continuous, the center of mass continues along the exact same parabolic trajectory.\n\nFinal Answer: It continues along the exact same parabolic trajectory that the unexploded shell would have followed',
        stepByStepSolution:
          'Principle:\nMotion of center of mass is governed exclusively by net external force: Σ F_ext = M * a_cm.\n\nAnalysis:\n1. The explosion is caused entirely by internal chemical forces (action-reaction pairs sum to zero).\n2. The only external force acting on the projectile system is uniform gravity: F_ext = M * g downwards.\n3. Therefore, a_cm = g downwards before, during, and after the explosion.\n4. Since its position and velocity at the explosion point are continuous, the center of mass continues along the exact same parabolic trajectory.\n\nFinal Answer: It continues along the exact same parabolic trajectory that the unexploded shell would have followed',
        explanation:
          'The explosion is caused entirely by internal forces. Because the only external force acting on the system is gravity, the acceleration of the center of mass remains a_cm = g downwards. Thus, the center of mass continues along the original parabolic path.',
        mistakeExplanation:
          'Believing it falls vertically neglects the horizontal momentum of the center of mass, which remains constant in the absence of horizontal external forces.',
        correctMethod:
          'Isolate external forces from internal forces; if net external force is unchanged, center-of-mass acceleration and trajectory are unaffected.',
        distractorRationale: [
          { option: 'It halts abruptly in mid-air because the fragments fly in all directions', errorType: 'Incorrectly assumes fragment dispersal affects center-of-mass momentum' },
          { option: 'It falls straight down vertically under gravity', errorType: 'Neglects horizontal momentum conservation of the center of mass' },
          { option: 'It accelerates upwards due to the force of the explosion', errorType: 'Confuses internal explosive forces with net external force' }
        ],
        timestampFormatted: '13:20',
        timestampSeconds: 800
      },
      {
        id: 'q_com_20',
        type: 'mcq',
        questionCategory: 'conceptual',
        topic: 'Center of Mass',
        subtopic: 'Meaning and Definition of Center of Mass',
        concept: 'Meaning and Physical Significance of Center of Mass',
        conceptName: 'Meaning and Physical Significance of Center of Mass',
        problemArchetype: 'conceptual_comparison',
        numericalOrTheory: 'theory',
        videoCoverage: 'fully_covered',
        difficulty: 'easy',
        cognitiveLevel: 'level_2_understanding',
        question:
          'In any two-particle system with unequal masses m1 and m2 (where m2 > m1), where does the center of mass always lie along the line segment joining them?',
        options: [
          'Exactly at the geometric midpoint, independent of mass values',
          'Closer to the heavier mass m2, because distance is inversely proportional to mass (m1*r1 = m2*r2)',
          'Closer to the lighter mass m1, because lighter particles have higher acceleration',
          'Outside the line segment on the side of the heavier mass'
        ],
        correctAnswer:
          'Closer to the heavier mass m2, because distance is inversely proportional to mass (m1*r1 = m2*r2)',
        solution:
          'Principle:\nFor a two-particle system with origin at the center of mass:\nm1 * r1 = m2 * r2\nr1 / r2 = m2 / m1\n\nReasoning:\nSince m2 > m1, it follows that r1 / r2 > 1, so r1 > r2.\nThis proves mathematically that the center of mass is closer to m2 (the heavier mass) than to m1 (the lighter mass).\n\nFinal Answer: Closer to the heavier mass m2, because distance is inversely proportional to mass (m1*r1 = m2*r2)',
        stepByStepSolution:
          'Principle:\nFor a two-particle system with origin at the center of mass:\nm1 * r1 = m2 * r2\nr1 / r2 = m2 / m1\n\nReasoning:\nSince m2 > m1, it follows that r1 / r2 > 1, so r1 > r2.\nThis proves mathematically that the center of mass is closer to m2 (the heavier mass) than to m1 (the lighter mass).\n\nFinal Answer: Closer to the heavier mass m2, because distance is inversely proportional to mass (m1*r1 = m2*r2)',
        explanation:
          'From m1*r1 = m2*r2, the distance of the center of mass from a particle is inversely proportional to its mass. Therefore, the center of mass always lies closer to the heavier mass.',
        mistakeExplanation:
          'Assuming the geometric midpoint confuses an unweighted centroid with the mass-weighted barycenter.',
        correctMethod:
          'Use the inverse distance-mass relationship r1/r2 = m2/m1 to compare relative proximity.',
        distractorRationale: [
          { option: 'Exactly at the geometric midpoint, independent of mass values', errorType: 'Confuses center of mass with geometric centroid' },
          { option: 'Closer to the lighter mass m1, because lighter particles have higher acceleration', errorType: 'Confuses kinematic acceleration with static mass moment' },
          { option: 'Outside the line segment on the side of the heavier mass', errorType: 'Center of mass of two discrete positive masses must lie strictly within the connecting segment' }
        ],
        timestampFormatted: '01:20',
        timestampSeconds: 80
      },
      {
        id: 'q_com_21',
        type: 'mcq',
        questionCategory: 'conceptual',
        topic: 'Center of Mass',
        subtopic: 'Meaning and Definition of Center of Mass',
        concept: 'Meaning and Physical Significance of Center of Mass',
        conceptName: 'Meaning and Physical Significance of Center of Mass',
        problemArchetype: 'why_reasoning',
        numericalOrTheory: 'theory',
        videoCoverage: 'fully_covered',
        difficulty: 'easy',
        cognitiveLevel: 'level_2_understanding',
        question:
          'Can the center of mass of a rigid physical object lie at a location in space where no physical material or mass of the body exists, and why?',
        options: [
          'No, the center of mass must always coincide with an actual physical particle of the body',
          'Yes, because center of mass is a mathematical weighted mean of position and can fall in hollow spaces like in a ring or hollow sphere',
          'Only when the body is in zero gravity in outer space',
          'Only if the body is rotating at relativistic speeds'
        ],
        correctAnswer:
          'Yes, because center of mass is a mathematical weighted mean of position and can fall in hollow spaces like in a ring or hollow sphere',
        solution:
          'Definition:\nCenter of mass is defined as the weighted average coordinate: r_cm = (1/M) ∫ r dm.\n\nReasoning:\nBecause it is an integral mean over the entire spatial distribution of mass rather than a physical atom, symmetry can place this point in a region of zero density.\nExample: A uniform ring of radius R has its center of mass at its geometric center, where there is empty space.\n\nFinal Answer: Yes, because center of mass is a mathematical weighted mean of position and can fall in hollow spaces like in a ring or hollow sphere',
        stepByStepSolution:
          'Definition:\nCenter of mass is defined as the weighted average coordinate: r_cm = (1/M) ∫ r dm.\n\nReasoning:\nBecause it is an integral mean over the entire spatial distribution of mass rather than a physical atom, symmetry can place this point in a region of zero density.\nExample: A uniform ring of radius R has its center of mass at its geometric center, where there is empty space.\n\nFinal Answer: Yes, because center of mass is a mathematical weighted mean of position and can fall in hollow spaces like in a ring or hollow sphere',
        explanation:
          'The center of mass is a mathematical point defined by mass distribution. In hollow objects like a ring, hollow sphere, or horseshoe, the center of mass is located at the geometric center where no physical matter exists.',
        mistakeExplanation:
          'Believing that mass must exist at the center of mass confuses a point particle with an integrated statistical barycenter.',
        correctMethod:
          'Treat center of mass as a mathematically defined barycenter (mean coordinate) rather than a physical constituent particle.',
        distractorRationale: [
          { option: 'No, the center of mass must always coincide with an actual physical particle of the body', errorType: 'Common student misconception that COM requires physical mass at that specific point' },
          { option: 'Only when the body is in zero gravity in outer space', errorType: 'Center of mass is an intrinsic geometric-mass property independent of external gravity' },
          { option: 'Only if the body is rotating at relativistic speeds', errorType: 'Unrelated physical theory' }
        ],
        timestampFormatted: '01:50',
        timestampSeconds: 110
      },
      {
        id: 'q_com_22',
        type: 'mcq',
        questionCategory: 'reasoning',
        topic: 'Center of Mass',
        subtopic: 'Two-Particle System Position Formula',
        concept: 'Two-Particle System Center of Mass',
        conceptName: 'Two-Particle System Center of Mass',
        problemArchetype: 'misconception_detection',
        numericalOrTheory: 'theory',
        videoCoverage: 'fully_covered',
        difficulty: 'medium',
        cognitiveLevel: 'level_4_analysis',
        question:
          'A 2 kg mass and a 10 kg mass are separated by a distance L. A student claims that moving the 2 kg mass farther away by distance d will not change the center of mass position because the 10 kg mass is much heavier and remained fixed. Why is this claim incorrect?',
        options: [
          'The center of mass shifts toward the 2 kg mass by [2 / (2 + 10)] * d because any particle displacement alters the total mass moment',
          'The center of mass shifts toward the 10 kg mass because heavier masses attract the center of mass',
          'The claim is actually correct because 10 kg dominates the system',
          'The center of mass shifts by the full distance d regardless of mass'
        ],
        correctAnswer:
          'The center of mass shifts toward the 2 kg mass by [2 / (2 + 10)] * d because any particle displacement alters the total mass moment',
        solution:
          'Principle:\nDisplacement of center of mass: Δr_cm = (Σ m_i * Δr_i) / M_total\n\nEvaluation of misconception:\nEven if m2 = 10 kg is heavier and remains stationary (Δr2 = 0), the displacement of m1 = 2 kg produces a non-zero numerator:\nΔr_cm = (2 * d + 10 * 0) / (2 + 10) = (2 / 12) * d = d / 6 in the direction of the 2 kg mass.\nThus, the center of mass must shift.\n\nFinal Answer: The center of mass shifts toward the 2 kg mass by [2 / (2 + 10)] * d because any particle displacement alters the total mass moment',
        stepByStepSolution:
          'Principle:\nDisplacement of center of mass: Δr_cm = (Σ m_i * Δr_i) / M_total\n\nEvaluation of misconception:\nEven if m2 = 10 kg is heavier and remains stationary (Δr2 = 0), the displacement of m1 = 2 kg produces a non-zero numerator:\nΔr_cm = (2 * d + 10 * 0) / (2 + 10) = (2 / 12) * d = d / 6 in the direction of the 2 kg mass.\nThus, the center of mass must shift.\n\nFinal Answer: The center of mass shifts toward the 2 kg mass by [2 / (2 + 10)] * d because any particle displacement alters the total mass moment',
        explanation:
          'When mass m1 moves by vector displacement d, the center of mass shifts by Δr_cm = (m1 * d) / (m1 + m2) in the same direction. Here it shifts toward the 2 kg mass by (2/12)*d = d/6.',
        mistakeExplanation:
          'Believing that a stationary heavy mass fixes the center of mass ignores that center of mass is sensitive to changes in any component mass coordinate.',
        correctMethod:
          'Apply the differential displacement relation Δx_cm = (m1 Δx1 + m2 Δx2) / M.',
        distractorRationale: [
          { option: 'The center of mass shifts toward the 10 kg mass because heavier masses attract the center of mass', errorType: 'Incorrect direction: moving a mass away pulls the center of mass in that direction' },
          { option: 'The claim is actually correct because 10 kg dominates the system', errorType: 'Endorses the misconception' },
          { option: 'The center of mass shifts by the full distance d regardless of mass', errorType: 'Assumes center of mass moves by the full displacement without mass weighting' }
        ],
        timestampFormatted: '07:00',
        timestampSeconds: 420
      },
      {
        id: 'q_com_23',
        type: 'mcq',
        questionCategory: 'conceptual',
        topic: 'Center of Mass',
        subtopic: 'Meaning and Definition of Center of Mass',
        concept: 'Meaning and Physical Significance of Center of Mass',
        conceptName: 'Meaning and Physical Significance of Center of Mass',
        problemArchetype: 'situation_identification',
        numericalOrTheory: 'theory',
        videoCoverage: 'fully_covered',
        difficulty: 'hard',
        cognitiveLevel: 'level_5_exam_reasoning',
        question:
          'Under which physical situation does the Center of Mass (COM) of an extended body coincide precisely with its Center of Gravity (COG)?',
        options: [
          'They always coincide unconditionally for all objects throughout the universe',
          'Only when the body is in a uniform gravitational field where g is identical in magnitude and direction at all points',
          'Only when the body is completely symmetrical and spherical',
          'Only when the body is in dynamic rotational equilibrium'
        ],
        correctAnswer:
          'Only when the body is in a uniform gravitational field where g is identical in magnitude and direction at all points',
        solution:
          'Definitions:\nCenter of Mass (COM): r_cm = (1/M) ∫ r dm (pure mass distribution).\nCenter of Gravity (COG): r_cg = (1/W) ∫ r (g dm) (point where net gravitational torque vanishes).\n\nCondition for Equivalence:\nIf g is uniform (constant vector everywhere), it factors out of the integral:\nr_cg = [g ∫ r dm] / [g ∫ dm] = (1/M) ∫ r dm = r_cm.\nIf g varies with altitude or location, r_cg deviates from r_cm.\n\nFinal Answer: Only when the body is in a uniform gravitational field where g is identical in magnitude and direction at all points',
        stepByStepSolution:
          'Definitions:\nCenter of Mass (COM): r_cm = (1/M) ∫ r dm (pure mass distribution).\nCenter of Gravity (COG): r_cg = (1/W) ∫ r (g dm) (point where net gravitational torque vanishes).\n\nCondition for Equivalence:\nIf g is uniform (constant vector everywhere), it factors out of the integral:\nr_cg = [g ∫ r dm] / [g ∫ dm] = (1/M) ∫ r dm = r_cm.\nIf g varies with altitude or location, r_cg deviates from r_cm.\n\nFinal Answer: Only when the body is in a uniform gravitational field where g is identical in magnitude and direction at all points',
        explanation:
          'Center of mass depends purely on mass distribution, whereas center of gravity is the point where the net gravitational torque vanishes. They coincide only when the gravitational field g is strictly uniform across the entire body.',
        mistakeExplanation:
          'Assuming unconditional equivalence is a standard exam trap: for huge structures like mountains or space elevators, g varies with height, displacing COG below COM.',
        correctMethod:
          'Distinguish mass weighting (scalar mass) from force weighting (gravitational field vector g(r)).',
        distractorRationale: [
          { option: 'They always coincide unconditionally for all objects throughout the universe', errorType: 'Very common exam trap: g varies slightly with height in large bodies' },
          { option: 'Only when the body is completely symmetrical and spherical', errorType: 'Symmetry is not required; uniform g is the sole requirement' },
          { option: 'Only when the body is in dynamic rotational equilibrium', errorType: 'Equilibrium state does not dictate geometric centroid equality' }
        ],
        timestampFormatted: '02:00',
        timestampSeconds: 120
      },
      {
        id: 'q_com_24',
        type: 'mcq',
        questionCategory: 'reasoning',
        topic: 'Center of Mass',
        subtopic: 'Displacement and Motion of Center of Mass',
        concept: 'Motion and Displacement of Center of Mass',
        conceptName: 'Motion and Displacement of Center of Mass',
        problemArchetype: 'principle_condition_application',
        numericalOrTheory: 'theory',
        videoCoverage: 'fully_covered',
        difficulty: 'hard',
        cognitiveLevel: 'level_4_analysis',
        question:
          'Two skaters of masses 50 kg and 80 kg stand facing each other on frictionless horizontal ice. The 50 kg skater pushes the 80 kg skater with a force of 100 N. Which of the following statements correctly applies the principle of center of mass motion to this situation?',
        options: [
          'The center of mass accelerates toward the 80 kg skater',
          'The center of mass accelerates toward the 50 kg skater',
          'The center of mass remains completely at rest because the pushing force is strictly internal to the two-skater system',
          'The center of mass accelerates with a = 100 / (50 + 80) m/s²'
        ],
        correctAnswer:
          'The center of mass remains completely at rest because the pushing force is strictly internal to the two-skater system',
        solution:
          'Principle:\nNewton\'s Second Law for a system: Σ F_ext = M_total * a_cm.\n\nApplication:\n1. The 100 N push is an interaction force between the two members of the system.\n2. By Newton\'s Third Law, skater 1 experiences -100 N and skater 2 experiences +100 N, which sum to zero.\n3. Frictionless ice means no external horizontal forces act: Σ F_ext = 0.\n4. Therefore, a_cm = 0, and since both skaters started from rest, the center of mass remains completely stationary.\n\nFinal Answer: The center of mass remains completely at rest because the pushing force is strictly internal to the two-skater system',
        stepByStepSolution:
          'Principle:\nNewton\'s Second Law for a system: Σ F_ext = M_total * a_cm.\n\nApplication:\n1. The 100 N push is an interaction force between the two members of the system.\n2. By Newton\'s Third Law, skater 1 experiences -100 N and skater 2 experiences +100 N, which sum to zero.\n3. Frictionless ice means no external horizontal forces act: Σ F_ext = 0.\n4. Therefore, a_cm = 0, and since both skaters started from rest, the center of mass remains completely stationary.\n\nFinal Answer: The center of mass remains completely at rest because the pushing force is strictly internal to the two-skater system',
        explanation:
          'The contact force between the skaters is an internal action-reaction pair. Since the ice is frictionless and no net external force acts horizontally (Σ F_ext = 0), a_cm = 0. The center of mass remains strictly at rest.',
        mistakeExplanation:
          'Treating the 100 N push as an external force is incorrect because both skaters are part of the defined closed system.',
        correctMethod:
          'Identify system boundaries: forces between parts within the boundary are internal and cannot accelerate the center of mass.',
        distractorRationale: [
          { option: 'The center of mass accelerates toward the 80 kg skater', errorType: 'Incorrectly treats internal pushing force as an external force' },
          { option: 'The center of mass accelerates toward the 50 kg skater', errorType: 'Confuses recoil acceleration with center of mass acceleration' },
          { option: 'The center of mass accelerates with a = 100 / (50 + 80) m/s²', errorType: 'Falsely applies F_ext formula using an internal force' }
        ],
        timestampFormatted: '13:50',
        timestampSeconds: 830
      },
      {
        id: 'q_com_25',
        type: 'mcq',
        questionCategory: 'conceptual',
        topic: 'Center of Mass',
        subtopic: 'Meaning and Definition of Center of Mass',
        concept: 'Meaning and Physical Significance of Center of Mass',
        conceptName: 'Meaning and Physical Significance of Center of Mass',
        problemArchetype: 'integrated_concept_question',
        numericalOrTheory: 'theory',
        videoCoverage: 'fully_covered',
        difficulty: 'hard',
        cognitiveLevel: 'level_4_analysis',
        question:
          'If the origin of the coordinate axes is shifted from point O to a new point O\' by translation, what happens to the physical location of the center of mass of a system of particles in physical space?',
        options: [
          'Its physical location in space shifts by the same vector as the origin shift',
          'Its physical location in space remains completely unchanged; only its numerical coordinates change relative to the new origin',
          'Its physical location shifts toward the heavier particle',
          'The center of mass splits into multiple points'
        ],
        correctAnswer:
          'Its physical location in space remains completely unchanged; only its numerical coordinates change relative to the new origin',
        solution:
          'Integration of Concepts:\n1. Coordinate Frame: A coordinate system is an arbitrary mathematical construct used to assign numerical labels (coordinates) to spatial points.\n2. Center of Mass: The center of mass is an intrinsic physical barycenter of the mass distribution.\n3. Translation Transformation: If position vectors transform as r\'_i = r_i - r_0, then:\nr\'_cm = [Σ m_i (r_i - r_0)] / M = r_cm - r_0.\n4. Although the coordinates change by -r_0, this new vector points to the exact same physical spot in space.\n\nFinal Answer: Its physical location in space remains completely unchanged; only its numerical coordinates change relative to the new origin',
        stepByStepSolution:
          'Integration of Concepts:\n1. Coordinate Frame: A coordinate system is an arbitrary mathematical construct used to assign numerical labels (coordinates) to spatial points.\n2. Center of Mass: The center of mass is an intrinsic physical barycenter of the mass distribution.\n3. Translation Transformation: If position vectors transform as r\'_i = r_i - r_0, then:\nr\'_cm = [Σ m_i (r_i - r_0)] / M = r_cm - r_0.\n4. Although the coordinates change by -r_0, this new vector points to the exact same physical spot in space.\n\nFinal Answer: Its physical location in space remains completely unchanged; only its numerical coordinates change relative to the new origin',
        explanation:
          'The center of mass is an intrinsic physical attribute of the mass distribution in space. Shifting or rotating the coordinate reference frame changes only the numerical coordinates (x_cm, y_cm), while the physical point itself remains invariant.',
        mistakeExplanation:
          'Confusing the numerical coordinate change (x\' = x - a) with physical displacement of matter or barycenter.',
        correctMethod:
          'Recognize coordinate invariance: physical properties and locations exist independently of chosen reference frames.',
        distractorRationale: [
          { option: 'Its physical location in space shifts by the same vector as the origin shift', errorType: 'Confuses numerical coordinate shift with actual physical movement in space' },
          { option: 'Its physical location shifts toward the heavier particle', errorType: 'Coordinate translation does not alter mass weighting' },
          { option: 'The center of mass splits into multiple points', errorType: 'Center of mass is unique and singular for any given mass distribution' }
        ],
        timestampFormatted: '14:15',
        timestampSeconds: 855
      }
    ];
  }

  // ===================== HINDI 25 QUESTIONS =====================
  private static getCenterOfMassQuestionsHindi(): QuizQuestion[] {
    const englishQuestions = this.getCenterOfMassQuestionsEnglish();
    const hindiOverrides: Record<number, { q: string; opts: string[]; ans: string; sol: string; exp: string }> = {
      0: {
        q: '3 kg द्रव्यमान के दो समान कण एक सीधी रेखा पर क्रमशः x = 0 m और x = 4 m पर रखे गए हैं। उनके द्रव्यमान केंद्र (Center of Mass) की स्थिति ज्ञात कीजिए।',
        opts: ['1.0 m', '2.0 m', '3.0 m', '4.0 m'],
        ans: '2.0 m',
        sol: 'सूत्र x_cm = (m1*x1 + m2*x2)/(m1 + m2) से:\nx_cm = (3×0 + 3×4) / (3 + 3) = 12 / 6 = 2.0 m.\nसमान द्रव्यमान होने के कारण द्रव्यमान केंद्र ठीक मध्य बिंदु पर स्थित है।',
        exp: 'समान द्रव्यमान (m1 = m2 = 3 kg) के दो कणों का द्रव्यमान केंद्र उनके बीच की दूरी के ठीक मध्य बिंदु पर होता है: x_cm = (0 + 4) / 2 = 2.0 m।'
      },
      1: {
        q: '4 kg का एक द्रव्यमान x = 2 m पर स्थित है तथा एक अज्ञात द्रव्यमान m को x = 8 m पर रखा गया है। यदि निकाय का द्रव्यमान केंद्र x = 6 m पर है, तो द्रव्यमान m का मान ज्ञात कीजिए।',
        opts: ['4 kg', '6 kg', '8 kg', '12 kg'],
        ans: '8 kg',
        sol: '6 = (4×2 + m×8) / (4 + m)\n6×(4 + m) = 8 + 8m\n24 + 6m = 8 + 8m => 2m = 16 => m = 8 kg.',
        exp: 'द्रव्यमान केंद्र सूत्र से: 6 = (8 + 8m)/(4 + m)। तिर्यक गुणा करने पर 24 + 6m = 8 + 8m, जिससे m = 8 kg प्राप्त होता है।'
      },
      2: {
        q: '3 kg का द्रव्यमान x = -2 m पर तथा 1 kg का द्रव्यमान अज्ञात स्थिति x2 पर रखा है। यदि पूरे निकाय का द्रव्यमान केंद्र मूल बिंदु (x = 0.0 m) पर हो, तो x2 का मान ज्ञात कीजिए।',
        opts: ['-6.0 m', '+2.0 m', '+4.0 m', '+6.0 m'],
        ans: '+6.0 m',
        sol: 'x_cm = [3×(-2) + 1×x2] / (3 + 1) = 0\n-6 + x2 = 0 => x2 = +6.0 m.',
        exp: 'मूल बिंदु पर द्रव्यमान केंद्र होने के लिए कुल आघूर्ण शून्य होना चाहिए: 3(-2) + 1(x2) = 0, अतः x2 = +6.0 m।'
      },
      3: {
        q: '2 kg, 3 kg और 5 kg द्रव्यमान के तीन बिंदु कण x-अक्ष पर क्रमशः x = 0 m, x = 4 m और x = 10 m पर रखे हैं। पहले द्रव्यमान केंद्र x_cm ज्ञात करें, फिर सबसे बाएं कण (x = 0) से उसकी दूरी ज्ञात कीजिए।',
        opts: ['4.7 m', '5.0 m', '6.2 m', '7.1 m'],
        ans: '6.2 m',
        sol: 'कुल द्रव्यमान M = 2 + 3 + 5 = 10 kg.\nΣ m_i x_i = (2×0) + (3×4) + (5×10) = 0 + 12 + 50 = 62 kg·m.\nx_cm = 62 / 10 = 6.2 m.\nx = 0 से दूरी = 6.2 m.',
        exp: 'x_cm = Σ(m_i * x_i) / Σ m_i = (0 + 12 + 50)/10 = 62/10 = 6.2 m।'
      },
      4: {
        q: 'निकाय A में 2 kg के दो समान द्रव्यमान x = 0 m और x = 6 m पर हैं। निकाय B में 1 kg द्रव्यमान x = 0 m पर तथा 3 kg द्रव्यमान x = 6 m पर है। निकाय B और निकाय A के द्रव्यमान केंद्रों की स्थितियों में क्या अंतर है (x_cm(B) - x_cm(A))?',
        opts: ['0.0 m', '1.0 m', '1.5 m', '2.0 m'],
        ans: '1.5 m',
        sol: 'निकाय A के लिए: x_cm(A) = (2×0 + 2×6)/4 = 3.0 m.\nनिकाय B के लिए: x_cm(B) = (1×0 + 3×6)/4 = 18/4 = 4.5 m.\nअंतर = 4.5 m - 3.0 m = 1.5 m.',
        exp: 'निकाय A का द्रव्यमान केंद्र 3.0 m पर है तथा निकाय B का 4.5 m पर है। अतः दोनों के द्रव्यमान केंद्रों का अंतर 1.5 m है।'
      },
      5: {
        q: 'm1 = 2 kg और m2 = 8 kg द्रव्यमान वाले निकाय में, द्रव्यमान m1 को दाईं ओर 10 cm खिसकाया जाता है। निकाय का द्रव्यमान केंद्र कितनी दूरी खिसकेगा?',
        opts: ['1.0 cm', '2.0 cm', '5.0 cm', '10.0 cm'],
        ans: '2.0 cm',
        sol: 'Δx_cm = (m1 * Δx1) / (m1 + m2) = (2 kg × 10 cm) / 10 kg = 2.0 cm.',
        exp: 'द्रव्यमान केंद्र का विस्थापन Δx_cm = (m1×Δx1)/M = (2 × 10)/10 = 2.0 cm दाईं ओर होगा।'
      },
      6: {
        q: '4 kg और 12 kg के दो कण 60 cm की दूरी पर हैं। 4 kg द्रव्यमान से उनके द्रव्यमान केंद्र की दूरी ज्ञात कीजिए।',
        opts: ['15 cm', '30 cm', '45 cm', '50 cm'],
        ans: '45 cm',
        sol: 'r1 = [m2 / (m1 + m2)] × L = (12 / 16) × 60 = 45 cm.',
        exp: 'द्रव्यमान m1 से दूरी r1 = (m2 / (m1+m2)) × L = (12/16) × 60 = 45 cm होगी।'
      },
      7: {
        q: '2 kg द्रव्यमान का कण (1, 2) m पर और 3 kg द्रव्यमान का कण (6, 7) m पर स्थित है। उनके द्रव्यमान केंद्र के निर्देशांक (x_cm, y_cm) ज्ञात कीजिए।',
        opts: ['(3.5, 4.5) m', '(4.0, 5.0) m', '(4.5, 5.5) m', '(5.0, 4.0) m'],
        ans: '(4.0, 5.0) m',
        sol: 'x_cm = (2×1 + 3×6)/5 = 20/5 = 4.0 m.\ny_cm = (2×2 + 3×7)/5 = 25/5 = 5.0 m.',
        exp: 'प्रत्येक निर्देशांक की स्वतंत्र गणना: x_cm = 4.0 m तथा y_cm = 5.0 m, अतः (4.0, 5.0) m।'
      },
      8: {
        q: '5 kg और 15 kg द्रव्यमान के दो कण मूल बिंदु के सममित क्रमशः x = -4 m और x = +4 m पर रखे हैं। उनके द्रव्यमान केंद्र की स्थिति ज्ञात कीजिए।',
        opts: ['0.0 m', '+1.0 m', '+2.0 m', '+3.0 m'],
        ans: '+2.0 m',
        sol: 'x_cm = [5×(-4) + 15×(+4)] / 20 = (-20 + 60)/20 = +2.0 m.',
        exp: 'x_cm = (-20 + 60)/20 = +2.0 m। द्रव्यमान केंद्र भारी 15 kg द्रव्यमान की ओर विस्थापित है।'
      },
      9: {
        q: '2 m भुजा वाले एक वर्ग के चारों कोनों (0,0), (2,0), (2,2) और (0,2) पर 2 kg के चार समान कण रखे हैं। यदि (2,2) पर स्थित कण हटा दिया जाए, तो शेष तीन कणों का द्रव्यमान केंद्र कहाँ होगा?',
        opts: ['(1.00, 1.00) m', '(0.67, 0.67) m', '(0.50, 0.50) m', '(1.33, 1.33) m'],
        ans: '(0.67, 0.67) m',
        sol: 'शेष द्रव्यमान = 6 kg.\nx_cm = (2×2)/6 = 2/3 ≈ 0.67 m.\ny_cm = (2×2)/6 = 2/3 ≈ 0.67 m.',
        exp: 'शेष तीन द्रव्यमानों के लिए x_cm = 4/6 ≈ 0.67 m तथा y_cm = 4/6 ≈ 0.67 m।'
      },
      10: {
        q: 'नगण्य द्रव्यमान की 40 cm लंबी एक हल्की छड़ के सिरों पर 2 kg और 6 kg के दो बिंदु द्रव्यमान जुड़े हैं। 6 kg द्रव्यमान से कितनी दूरी पर छड़ को संतुलित किया जा सकता है?',
        opts: ['10 cm', '20 cm', '30 cm', '35 cm'],
        ans: '10 cm',
        sol: 'संतुलन बिंदु द्रव्यमान केंद्र होता है।\nr2 = [2 / (2 + 6)] × 40 = (2 / 8) × 40 = 10 cm.',
        exp: 'निकाय अपने द्रव्यमान केंद्र पर संतुलित होता है। 6 kg द्रव्यमान से दूरी = (2/8) × 40 = 10 cm है।'
      },
      11: {
        q: 'm1 = 3 kg और m2 = 6 kg द्रव्यमान के दो कण एक रेखा पर हैं। यदि m1 को 4 m दाईं ओर ले जाया जाता है, तो द्रव्यमान केंद्र को पूरी तरह स्थिर रखने के लिए m2 को कितना और किस दिशा में खिसकाना होगा?',
        opts: ['2 m बाईं ओर', '2 m दाईं ओर', '4 m बाईं ओर', '8 m बाईं ओर'],
        ans: '2 m बाईं ओर',
        sol: 'Δx_cm = 0 के लिए: m1*Δx1 + m2*Δx2 = 0\n3*(+4) + 6*(Δx2) = 0 => Δx2 = -2 m (2 m बाईं ओर).',
        exp: 'द्रव्यमान केंद्र को स्थिर रखने के लिए कुल आघूर्ण परिवर्तन शून्य होना चाहिए: 3(+4) + 6(Δx2) = 0, अतः Δx2 = -2 m (2 m बाईं ओर)।'
      },
      12: {
        q: 'एक छात्र 2 kg (x = 0 m पर) और 6 kg (x = 8 m पर) के निकाय के द्रव्यमान केंद्र का अनुमान बिना द्रव्यमान भार के केवल मध्य बिंदु (0+8)/2 = 4.0 m लगाकर निकालता है। वास्तविक द्रव्यमान केंद्र का मान क्या है और छात्र की गणना में कितनी त्रुटि है?',
        opts: [
          'वास्तविक द्रव्यमान केंद्र 4.0 m पर है; छात्र की गणना सही थी',
          'वास्तविक द्रव्यमान केंद्र 5.0 m पर है; छात्र का मान 1.0 m कम था',
          'वास्तविक द्रव्यमान केंद्र 6.0 m पर है; छात्र का मान 2.0 m कम था',
          'वास्तविक द्रव्यमान केंद्र 7.0 m पर है; छात्र का मान 3.0 m कम था'
        ],
        ans: 'वास्तविक द्रव्यमान केंद्र 6.0 m पर है; छात्र का मान 2.0 m कम था',
        sol: 'वास्तविक द्रव्यमान केंद्र: x_cm = (2×0 + 6×8)/(2+6) = 48/8 = 6.0 m.\nत्रुटि = 6.0 m - 4.0 m = 2.0 m.',
        exp: 'द्रव्यमान केंद्र साधारण मध्य बिंदु नहीं बल्कि द्रव्यमान-भारित होता है। वास्तविक x_cm = 6.0 m है, अतः छात्र का अनुमान 2.0 m कम था।'
      },
      13: {
        q: 'द्रव्यमान केंद्र सूत्र x_cm = Σ(m_i x_i)/M का उपयोग करते समय, निम्नलिखित में से कौन सा गणना चरण एक अमान्य प्रक्रिया है?',
        opts: [
          'प्रत्येक कण के द्रव्यमान को उसके स्थिति निर्देशांक से गुणा करना',
          'कुल आघूर्ण Σ(m_i x_i) को कुल द्रव्यमान M के स्थान पर कणों की संख्या N से भाग देना',
          'लांबिक अक्षों x और y को पूरी तरह स्वतंत्र रूप से हल करना',
          'ऋणात्मक अक्ष पर स्थित निर्देशांकों को ऋणात्मक चिह्न देना'
        ],
        ans: 'कुल आघूर्ण Σ(m_i x_i) को कुल द्रव्यमान M के स्थान पर कणों की संख्या N से भाग देना',
        sol: 'द्रव्यमान केंद्र सूत्र में हर सदैव कुल द्रव्यमान M = Σm_i होना चाहिए, न कि कणों की संख्या N।',
        exp: 'कुल द्रव्यमान M के स्थान पर कणों की संख्या N से भाग देना विमीय और भौतिक रूप से त्रुटिपूर्ण है।'
      },
      14: {
        q: '4 kg और 8 kg के दो कण प्रारंभ में एक घर्षण रहित तल पर 12 m की दूरी पर विराम में हैं। वे अपने पारस्परिक गुरुत्वाकर्षण आकर्षण के कारण एक-दूसरे की ओर गति करते हैं और टकराते हैं। कौन सी विधि सही है और 4 kg कण की प्रारंभिक स्थिति से कितनी दूरी पर वे टकराएंगे?',
        opts: [
          '4.0 m, क्योंकि भारी द्रव्यमान हल्के द्रव्यमान को अपनी ओर खींच लेता है',
          '6.0 m, क्योंकि समान बल लगने पर कण ठीक मध्य बिंदु पर मिलते हैं',
          '8.0 m, क्योंकि बाह्य बल शून्य (F_ext = 0) होने से वे स्थिर द्रव्यमान केंद्र पर मिलते हैं',
          '10.0 m, क्योंकि त्वरण का अनुपात 2:1 समय के साथ लागू होता है'
        ],
        ans: '8.0 m, क्योंकि बाह्य बल शून्य (F_ext = 0) होने से वे स्थिर द्रव्यमान केंद्र पर मिलते हैं',
        sol: 'बाह्य बल शून्य होने के कारण द्रव्यमान केंद्र स्थिर रहता है। कण द्रव्यमान केंद्र पर ही मिलेंगे:\nx = [8 / (4 + 8)] × 12 = 8.0 m.',
        exp: 'चूँकि कोई बाह्य बल नहीं है (F_ext = 0), द्रव्यमान केंद्र स्थिर रहता है। टकराव बिंदु की 4 kg द्रव्यमान से दूरी = (8/12) × 12 = 8.0 m होगी।'
      },
      15: {
        q: '2 kg का कण A वेग v1 = +4 m/s से तथा 3 kg का कण B वेग v2 = -1 m/s से x-अक्ष पर गतिमान हैं। उनके द्रव्यमान केंद्र का वेग v_cm क्या होगा?',
        opts: ['+1.0 m/s', '+1.5 m/s', '+2.2 m/s', '-1.0 m/s'],
        ans: '+1.0 m/s',
        sol: 'v_cm = [2×(+4) + 3×(-1)] / (2 + 3) = (8 - 3) / 5 = +1.0 m/s.',
        exp: 'v_cm = (m1*v1 + m2*v2)/(m1 + m2) = (8 - 3)/5 = +1.0 m/s।'
      },
      16: {
        q: 'एक 2.0 m लंबी तथा 3.0 kg द्रव्यमान की एकसमान पतली छड़ x-अक्ष पर x = 0 से x = 2.0 m तक रखी है (जिसका द्रव्यमान केंद्र x = 1.0 m पर है), और इसके सिरे x = 2.0 m पर 1.0 kg का बिंदु द्रव्यमान जुड़ा है। संयुक्त निकाय के द्रव्यमान केंद्र की स्थिति x_cm क्या होगी?',
        opts: ['1.00 m', '1.25 m', '1.50 m', '1.75 m'],
        ans: '1.25 m',
        sol: 'x_cm = (m_rod * x_rod + m_pt * x_pt) / (m_rod + m_pt)\nx_cm = (3.0×1.0 + 1.0×2.0) / (3.0 + 1.0) = 5.0 / 4.0 = 1.25 m.',
        exp: 'छड़ को उसके द्रव्यमान केंद्र (x = 1.0 m) पर 3 kg का बिंदु द्रव्यमान मानकर हल करने पर: x_cm = (3×1 + 1×2)/4 = 1.25 m प्राप्त होता है।'
      },
      17: {
        q: 'दो द्रव्यमान 1 kg और 3 kg क्रमशः x = 2 m और x = 6 m पर हैं। यदि मूल बिंदु को x = +2 m पर स्थानांतरित कर दिया जाए, तो इस नए निर्देशांक निकाय में द्रव्यमान केंद्र की स्थिति क्या होगी?',
        opts: ['1.5 m', '3.0 m', '5.0 m', '7.0 m'],
        ans: '3.0 m',
        sol: "मूल निकाय में x_cm = 20/4 = 5.0 m.\nनए निकाय में x'_cm = 5.0 - 2.0 = 3.0 m.",
        exp: "नए निकाय में द्रव्यमान 1 x'=0 पर तथा द्रव्यमान 2 x'=4 m पर है। x'_cm = (3×4)/4 = 3.0 m।"
      },
      18: {
        q: 'एक प्रक्षेप्य हवा में परवलयाकार पथ पर गति कर रहा है। अपने उच्चतम बिंदु पर, आंतरिक रासायनिक प्रतिक्रिया के कारण यह तीन टुकड़ों में फट जाता है। विस्फोट के तुरंत बाद टुकड़ों का द्रव्यमान केंद्र किस पथ का अनुसरण करेगा (वायु प्रतिरोध नगण्य मानकर)?',
        opts: [
          'यह ठीक उसी परवलयाकार पथ पर गति करता रहेगा जिस पर अविभाजित प्रक्षेप्य चलता',
          'यह हवा में अचानक रुक जाता है क्योंकि टुकड़े सभी दिशाओं में उड़ते हैं',
          'यह गुरुत्वाकर्षण के कारण सीधे नीचे गिर जाता है',
          'विस्फोट के बल के कारण यह ऊपर की ओर त्वरित होता है'
        ],
        ans: 'यह ठीक उसी परवलयाकार पथ पर गति करता रहेगा जिस पर अविभाजित प्रक्षेप्य चलता',
        sol: 'विस्फोट आंतरिक बलों के कारण होता है। बाह्य बल केवल गुरुत्वाकर्षण है, अतः a_cm = g नीचे की ओर बना रहता है।',
        exp: 'विस्फोट पूर्णतः आंतरिक बलों से होता है। चूंकि निकाय पर केवल बाह्य गुरुत्वाकर्षण बल कार्य कर रहा है, द्रव्यमान केंद्र का त्वरण पूर्ववत बना रहता है और वह मूल परवलयाकार पथ पर ही चलता है।'
      },
      19: {
        q: 'असमान द्रव्यमानों m1 और m2 (जहाँ m2 > m1) वाले किसी दो-कण निकाय में, द्रव्यमान केंद्र सदैव दोनों कणों को मिलाने वाली रेखा पर कहाँ स्थित होता है?',
        opts: [
          'द्रव्यमानों के मान से स्वतंत्र, ठीक मध्य बिंदु पर',
          'भारी द्रव्यमान m2 के अधिक निकट, क्योंकि दूरी द्रव्यमान के व्युत्क्रमानुपाती होती है (m1*r1 = m2*r2)',
          'हल्के द्रव्यमान m1 के अधिक निकट, क्योंकि हल्के कण तेजी से त्वरित होते हैं',
          'भारी द्रव्यमान की ओर दोनों कणों के बाहर'
        ],
        ans: 'भारी द्रव्यमान m2 के अधिक निकट, क्योंकि दूरी द्रव्यमान के व्युत्क्रमानुपाती होती है (m1*r1 = m2*r2)',
        sol: 'संबंध m1*r1 = m2*r2 से, भारी द्रव्यमान की द्रव्यमान केंद्र से दूरी कम होती है।',
        exp: 'द्रव्यमान केंद्र से कणों की दूरियाँ उनके द्रव्यमानों के व्युत्क्रमानुपाती होती हैं: r1/r2 = m2/m1। अतः द्रव्यमान केंद्र भारी कण के अधिक पास होता है।'
      },
      20: {
        q: 'क्या किसी ठोस भौतिक वस्तु का द्रव्यमान केंद्र अंतरिक्ष में ऐसे स्थान पर हो सकता है जहाँ वस्तु का कोई वास्तविक पदार्थ या द्रव्यमान मौजूद न हो?',
        opts: [
          'नहीं, द्रव्यमान केंद्र सदैव वस्तु के किसी वास्तविक भौतिक कण पर ही होना चाहिए',
          'हाँ, उदाहरण के लिए एक खोखले छल्ले (ring), खोखले गोले या घोड़े की नाल में द्रव्यमान केंद्र खोखले स्थान में स्थित होता है',
          'केवल तब जब वस्तु अंतरिक्ष में शून्य गुरुत्वाकर्षण में हो',
          'केवल यदि वस्तु प्रकाश की गति के निकट सापेक्षिक गति से घूम रही हो'
        ],
        ans: 'हाँ, उदाहरण के लिए एक खोखले छल्ले (ring), खोखले गोले या घोड़े की नाल में द्रव्यमान केंद्र खोखले स्थान में स्थित होता है',
        sol: 'द्रव्यमान केंद्र द्रव्यमान वितरण का ज्यामितीय भारित केंद्र है और यह पदार्थ के बाहर खोखले भाग में हो सकता है।',
        exp: 'द्रव्यमान केंद्र एक गणितीय बिंदु है। वलय (ring) या खोखले गोले जैसी वस्तुओं में द्रव्यमान केंद्र केंद्र में खाली जगह में होता है जहाँ कोई भौतिक पदार्थ नहीं होता।'
      },
      21: {
        q: '2 kg और 10 kg के दो द्रव्यमान दूरी L पर रखे हैं। यदि 2 kg द्रव्यमान को 10 kg द्रव्यमान से d दूरी और दूर ले जाया जाए, तो निकाय का द्रव्यमान केंद्र किस प्रकार विस्थापित होगा?',
        opts: [
          'यह 2 kg द्रव्यमान की ओर [2 / (2 + 10)] * d विस्थापित होता है',
          'यह 10 kg द्रव्यमान की ओर विस्थापित होता है क्योंकि 10 kg भारी है',
          'यह बिल्कुल नहीं चलता क्योंकि 10 kg स्थिर है',
          'यह 2 kg द्रव्यमान की ओर पूरी दूरी d से विस्थापित होता है'
        ],
        ans: 'यह 2 kg द्रव्यमान की ओर [2 / (2 + 10)] * d विस्थापित होता है',
        sol: 'Δx_cm = (m1 * d)/(m1 + m2) = (2/12)*d = d/6 उस द्रव्यमान की गति की दिशा में।',
        exp: 'जब कोई घटक द्रव्यमान विस्थापित होता है, तो द्रव्यमान केंद्र उसी दिशा में Δx_cm = (m1*d)/M से विस्थापित होता है।'
      },
      22: {
        q: 'किस स्थिति में किसी विस्तृत पिंड का द्रव्यमान केंद्र (COM) उसके गुरुत्व केंद्र (COG) के पूर्णतः संपाती होता है?',
        opts: [
          'वे ब्रह्मांड की सभी वस्तुओं के लिए बिना किसी शर्त के सदैव संपाती होते हैं',
          'केवल तभी जब पिंड एक समान गुरुत्वाकर्षण क्षेत्र में हो जहाँ प्रत्येक बिंदु पर g का परिमाण और दिशा समान हो',
          'केवल तभी जब पिंड पूर्णतः सममित और गोलाकार हो',
          'केवल तभी जब पिंड पूर्णतः निर्वात में हो'
        ],
        ans: 'केवल तभी जब पिंड एक समान गुरुत्वाकर्षण क्षेत्र में हो जहाँ प्रत्येक बिंदु पर g का परिमाण और दिशा समान हो',
        sol: 'एक समान गुरुत्वाकर्षण क्षेत्र में गुरुत्वीय आघूर्ण का केंद्र द्रव्यमान केंद्र के ठीक संपाती होता है।',
        exp: 'द्रव्यमान केंद्र केवल द्रव्यमान वितरण पर निर्भर करता है, जबकि गुरुत्व केंद्र गुरुत्वाकर्षण बल के बिंदु पर। ये दोनों केवल तभी संपाती होते हैं जब g पूरे पिंड में पूर्णतः एक समान हो।'
      },
      23: {
        q: '50 kg और 80 kg द्रव्यमान के दो स्केटर घर्षण रहित बर्फ पर आमने-सामने खड़े हैं। 50 kg वाला स्केटर 80 kg वाले स्केटर को 100 N के बल से धक्का देता है। धक्के के दौरान दोनों के संयुक्त द्रव्यमान केंद्र के बारे में कौन सा कथन सही है?',
        opts: [
          'द्रव्यमान केंद्र 80 kg स्केटर की ओर त्वरित होता है',
          'द्रव्यमान केंद्र 50 kg स्केटर की ओर त्वरित होता है',
          'द्रव्यमान केंद्र पूरी तरह स्थिर रहता है क्योंकि धक्का देने वाला बल निकाय का आंतरिक बल है',
          'द्रव्यमान केंद्र a = 100 / (50 + 80) m/s² से त्वरित होता है'
        ],
        ans: 'द्रव्यमान केंद्र पूरी तरह स्थिर रहता है क्योंकि धक्का देने वाला बल निकाय का आंतरिक बल है',
        sol: 'स्केटरों के बीच का बल आंतरिक क्रिया-प्रतिक्रिया बल है। बाह्य बल F_ext = 0, अतः a_cm = 0।',
        exp: 'चूंकि बर्फ घर्षण रहित है और कोई क्षैतिज बाह्य बल नहीं लग रहा है (Σ F_ext = 0), इसलिए दोनों स्केटर्स का द्रव्यमान केंद्र पूरी तरह स्थिर रहेगा।'
      },
      24: {
        q: 'यदि निर्देशांक अक्षों के मूल बिंदु को बिंदु O से O\' पर स्थानांतरित कर दिया जाए, तो भौतिक स्थान में कणों के निकाय के द्रव्यमान केंद्र की वास्तविक स्थिति पर क्या प्रभाव पड़ता है?',
        opts: [
          'इसकी अंतरिक्ष में वास्तविक भौतिक स्थिति मूल बिंदु के स्थानांतरण सदिश के बराबर बदल जाती है',
          'अंतरिक्ष में इसकी वास्तविक स्थिति पूरी तरह अपरिवर्तित रहती है; केवल नए मूल बिंदु के सापेक्ष इसके संख्यात्मक निर्देशांक बदलते हैं',
          'द्रव्यमान केंद्र भारी कण की ओर खिसक जाता है',
          'द्रव्यमान केंद्र कई बिंदुओं में विभाजित हो जाता है'
        ],
        ans: 'अंतरिक्ष में इसकी वास्तविक स्थिति पूरी तरह अपरिवर्तित रहती है; केवल नए मूल बिंदु के सापेक्ष इसके संख्यात्मक निर्देशांक बदलते हैं',
        sol: 'निर्देशांक निकाय केवल मापने का पैमाना है; भौतिक द्रव्यमान केंद्र स्थान में अपरिवर्तनीय रहता है।',
        exp: 'द्रव्यमान केंद्र अंतरिक्ष में एक अद्वितीय भौतिक बिंदु है। निर्देशांक अक्षों को स्थानांतरित करने से केवल उनके संख्यात्मक मान बदलते हैं, वास्तविक बिंदु नहीं बदलता।'
      }
    };

    return englishQuestions.map((eq, idx) => {
      const ov = hindiOverrides[idx];
      if (!ov) return eq;
      return {
        ...eq,
        question: ov.q,
        options: ov.opts,
        correctAnswer: ov.ans,
        solution: ov.sol || eq.solution,
        stepByStepSolution: ov.sol,
        explanation: ov.exp
      };
    });
  }

  // ===================== GUJARATI 25 QUESTIONS =====================
  private static getCenterOfMassQuestionsGujarati(): QuizQuestion[] {
    const englishQuestions = this.getCenterOfMassQuestionsEnglish();
    const gujaratiOverrides: Record<number, { q: string; opts: string[]; ans: string; sol: string; exp: string }> = {
      0: {
        q: '3 kg દળના બે સમાન કણો એક રેખા પર અનુક્રમે x = 0 m અને x = 4 m પર મૂકેલા છે. તેમના દ્રવ્યમાન કેન્દ્ર (Center of Mass) નું સ્થાન શોધો.',
        opts: ['1.0 m', '2.0 m', '3.0 m', '4.0 m'],
        ans: '2.0 m',
        sol: 'x_cm = (m1*x1 + m2*x2)/(m1 + m2) પરથી:\nx_cm = (3×0 + 3×4) / (3 + 3) = 12 / 6 = 2.0 m.',
        exp: 'બે સમાન દળ (m1 = m2 = 3 kg) માટે દ્રવ્યમાન કેન્દ્ર બંનેની બરાબર મધ્યમાં હોય છે: x_cm = (0 + 4) / 2 = 2.0 m.'
      },
      1: {
        q: '4 kg નું દળ x = 2 m પર છે અને એક અજ્ઞાત દળ m x = 8 m પર છે. જો દ્રવ્યમાન કેન્દ્ર x = 6 m પર હોય, તો દળ m શોધો.',
        opts: ['4 kg', '6 kg', '8 kg', '12 kg'],
        ans: '8 kg',
        sol: '6 = (4×2 + m×8) / (4 + m) => 24 + 6m = 8 + 8m => 2m = 16 => m = 8 kg.',
        exp: '6 = (8 + 8m)/(4 + m), ચોકડી ગુણાકારથી 24 + 6m = 8 + 8m, જેથી m = 8 kg મળે છે.'
      },
      2: {
        q: '3 kg નું દળ x = -2 m પર અને 1 kg નું દળ અજ્ઞાત યામ x2 પર છે. જો સમગ્ર તંત્રનું દ્રવ્યમાન કેન્દ્ર ઉગમબિંદુ (x = 0.0 m) પર હોય, તો x2 શોધો.',
        opts: ['-6.0 m', '+2.0 m', '+4.0 m', '+6.0 m'],
        ans: '+6.0 m',
        sol: '0 = [3×(-2) + 1×x2]/4 => -6 + x2 = 0 => x2 = +6.0 m.',
        exp: 'દ્રવ્યમાન કેન્દ્ર ઉગમબિંદુ પર હોવાથી કુલ ચાકમાત્રા શૂન્ય થવી જોઈએ: 3(-2) + 1(x2) = 0 => x2 = +6.0 m.'
      },
      3: {
        q: '2 kg, 3 kg અને 5 kg દળના ત્રણ કણો x-અક્ષ પર અનુક્રમે x = 0 m, x = 4 m અને x = 10 m પર છે. પ્રથમ દ્રવ્યમાન કેન્દ્ર x_cm શોધો અને પછી સૌથી ડાબી બાજુના કણ (x = 0) થી તેનું અંતર શોધો.',
        opts: ['4.7 m', '5.0 m', '6.2 m', '7.1 m'],
        ans: '6.2 m',
        sol: 'કુલ દળ = 10 kg. Σ m_i x_i = 0 + 12 + 50 = 62. x_cm = 62 / 10 = 6.2 m.\nx = 0 થી અંતર = 6.2 m.',
        exp: 'x_cm = Σ(m_i * x_i) / Σ m_i = (0 + 12 + 50)/10 = 62/10 = 6.2 m.'
      },
      4: {
        q: 'તંત્ર A માં 2 kg ના બે સમાન દળ x = 0 m અને x = 6 m પર છે. તંત્ર B માં 1 kg દળ x = 0 m પર અને 3 kg દળ x = 6 m પર છે. તંત્ર B અને તંત્ર A ના દ્રવ્યમાન કેન્દ્ર વચ્ચેનો તફાવત (x_cm(B) - x_cm(A)) કેટલો છે?',
        opts: ['0.0 m', '1.0 m', '1.5 m', '2.0 m'],
        ans: '1.5 m',
        sol: 'તંત્ર A: x_cm(A) = 12/4 = 3.0 m.\nતંત્ર B: x_cm(B) = (0 + 18)/4 = 4.5 m.\nતફાવત = 4.5 m - 3.0 m = 1.5 m.',
        exp: 'તંત્ર A નું COM 3.0 m પર અને B નું 4.5 m પર છે. તફાવત 1.5 m છે.'
      },
      5: {
        q: 'm1 = 2 kg અને m2 = 8 kg દળના તંત્રમાં, m1 ને જમણી બાજુ 10 cm ખસેડવામાં આવે છે. તંત્રનું દ્રવ્યમાન કેન્દ્ર કેટલું ખસશે?',
        opts: ['1.0 cm', '2.0 cm', '5.0 cm', '10.0 cm'],
        ans: '2.0 cm',
        sol: 'Δx_cm = (m1 * Δx1) / M = (2 × 10) / 10 = 2.0 cm.',
        exp: 'દ્રવ્યમાન કેન્દ્રનું સ્થાનાંતર Δx_cm = (2 × 10)/10 = 2.0 cm જમણી બાજુ થશે.'
      },
      6: {
        q: '4 kg અને 12 kg ના બે કણો 60 cm અંતરે છે. 4 kg દળથી દ્રવ્યમાન કેન્દ્રનું અંતર શોધો.',
        opts: ['15 cm', '30 cm', '45 cm', '50 cm'],
        ans: '45 cm',
        sol: 'r1 = [12 / 16] × 60 = 45 cm.',
        exp: '4 kg થી અંતર r1 = (12/16) × 60 = 45 cm થશે.'
      },
      7: {
        q: '2 kg નો કણ (1, 2) m પર અને 3 kg નો કણ (6, 7) m પર છે. તેમના દ્રવ્યમાન કેન્દ્રના યામ (x_cm, y_cm) શોધો.',
        opts: ['(3.5, 4.5) m', '(4.0, 5.0) m', '(4.5, 5.5) m', '(5.0, 4.0) m'],
        ans: '(4.0, 5.0) m',
        sol: 'x_cm = (2×1 + 3×6)/5 = 20/5 = 4.0 m. y_cm = (2×2 + 3×7)/5 = 25/5 = 5.0 m.',
        exp: 'યામ (4.0, 5.0) m મળે છે.'
      },
      8: {
        q: '5 kg અને 15 kg ના બે કણો ઉગમબિંદુની સંમિત બાજુએ x = -4 m અને x = +4 m પર છે. દ્રવ્યમાન કેન્દ્રનું સ્થાન શોધો.',
        opts: ['0.0 m', '+1.0 m', '+2.0 m', '+3.0 m'],
        ans: '+2.0 m',
        sol: 'x_cm = [-20 + 60] / 20 = 40 / 20 = +2.0 m.',
        exp: 'દ્રવ્યમાન કેન્દ્ર +2.0 m પર ભારે દળ તરફ આવેલું છે.'
      },
      9: {
        q: '2 m બાજુવાળા ચોરસના ચાર ખૂણાઓ પર 2 kg ના ચાર સમાન કણો છે. જો (2,2) ખૂણાનો કણ હટાવવામાં આવે, તો બાકીના ત્રણ કણોનું દ્રવ્યમાન કેન્દ્ર ક્યાં હશે?',
        opts: ['(1.00, 1.00) m', '(0.67, 0.67) m', '(0.50, 0.50) m', '(1.33, 1.33) m'],
        ans: '(0.67, 0.67) m',
        sol: 'બાકીનું દળ = 6 kg. x_cm = 4/6 ≈ 0.67 m, y_cm = 4/6 ≈ 0.67 m.',
        exp: 'નવું દ્રવ્યમાન કેન્દ્ર (0.67, 0.67) m પર ખસી જશે.'
      },
      10: {
        q: 'નહિવત દળ ધરાવતા 40 cm લાંબા સળિયાના બંને છેડે 2 kg અને 6 kg ના દળ જોડેલા છે. 6 kg દળથી કેટલા અંતરે સળિયો સમતોલનમાં રહેશે?',
        opts: ['10 cm', '20 cm', '30 cm', '35 cm'],
        ans: '10 cm',
        sol: 'r2 = [2 / (2 + 6)] × 40 = (2/8) × 40 = 10 cm.',
        exp: 'દ્રવ્યમાન કેન્દ્ર પર સમતોલન થાય છે, જે 6 kg દળથી 10 cm દૂર છે.'
      },
      11: {
        q: 'm1 = 3 kg અને m2 = 6 kg દળના બે કણો છે. જો m1 ને 4 m જમણી બાજુ ખસેડવામાં આવે, તો દ્રવ્યમાન કેન્દ્ર સ્થિર રાખવા માટે m2 ને કેટલું અને કઈ દિશામાં ખસેડવું પડશે?',
        opts: ['2 m ડાબી બાજુ', '2 m જમણી બાજુ', '4 m ડાબી બાજુ', '8 m ડાબી બાજુ'],
        ans: '2 m ડાબી બાજુ',
        sol: 'm1*Δx1 + m2*Δx2 = 0 => 3*(+4) + 6*(Δx2) = 0 => Δx2 = -2 m (2 m ડાબી બાજુ).',
        exp: 'દ્રવ્યમાન કેન્દ્ર સ્થિર રાખવા 3(+4) + 6(Δx2) = 0, જેથી Δx2 = -2 m (2 m ડાબી બાજુ).'
      },
      12: {
        q: 'એક વિદ્યાર્થી 2 kg (x = 0 m) અને 6 kg (x = 8 m) માટે દળ ભારિત કર્યા વગર સીધું મધ્યબિંદુ (0+8)/2 = 4.0 m ગણે છે. સાચું દ્રવ્યમાન કેન્દ્ર કેટલું છે અને વિદ્યાર્થીની ભૂલ કેટલી છે?',
        opts: [
          'સાચું COM 4.0 m છે; ગણતરી સાચી હતી',
          'સાચું COM 5.0 m છે; ગણતરી 1.0 m ઓછી હતી',
          'સાચું COM 6.0 m છે; ગણતરી 2.0 m ઓછી હતી',
          'સાચું COM 7.0 m છે; ગણતરી 3.0 m ઓછી હતી'
        ],
        ans: 'સાચું COM 6.0 m છે; ગણતરી 2.0 m ઓછી હતી',
        sol: 'સાચું x_cm = (2×0 + 6×8)/8 = 48/8 = 6.0 m. ભૂલ = 6.0 - 4.0 = 2.0 m.',
        exp: 'દ્રવ્યમાન કેન્દ્ર 6.0 m પર છે, તેથી વિદ્યાર્થીનો અંદાજ 2.0 m ઓછો હતો.'
      },
      13: {
        q: 'x_cm = Σ(m_i x_i)/M સૂત્ર વાપરતી વખતે, નીચેનામાંથી કયું પગલું અમાન્ય ગાણિતિક કે ભૌતિક રીત છે?',
        opts: [
          'દરેક કણના દળને તેના યામ વડે ગુણવું',
          'કુલ ચાકમાત્રાને કુલ દળ M ના બદલે કણોની સંખ્યા N વડે ભાગવી',
          'x અને y અક્ષોને સ્વતંત્ર રીતે ઉકેલવા',
          'ઋણ અક્ષ પરના યામોને ઋણ ચિહ્ન આપવું'
        ],
        ans: 'કુલ ચાકમાત્રાને કુલ દળ M ના બદલે કણોની સંખ્યા N વડે ભાગવી',
        sol: 'છેદમાં હંમેશા કુલ દળ M = Σ m_i હોવું જોઈએ, કણોની સંખ્યા N નહીં.',
        exp: 'N વડે ભાગવું એ પરિમાણીય અને ભૌતિક રીતે ખોટું છે.'
      },
      14: {
        q: '4 kg અને 8 kg ના બે કણો ઘર્ષણ રહિત સપાટી પર 12 m અંતરે સ્થિર છે. પરસ્પર ગુરુત્વાકર્ષણને લીધે ગતિ કરીને અથડાય છે. કઈ પદ્ધતિ સાચી છે અને 4 kg કણથી કેટલા અંતરે તેઓ અથડાશે?',
        opts: [
          '4.0 m, ભારે કણ હળવા કણને ખેંચે છે',
          '6.0 m, સમાન બળથી મધ્યબિંદુ પર મળશે',
          '8.0 m, બાહ્ય બળ શૂન્ય હોવાથી સ્થિર દ્રવ્યમાન કેન્દ્ર પર મળશે',
          '10.0 m, 2:1 પ્રવેગ ગુણોત્તરથી'
        ],
        ans: '8.0 m, બાહ્ય બળ શૂન્ય હોવાથી સ્થિર દ્રવ્યમાન કેન્દ્ર પર મળશે',
        sol: 'બાહ્ય બળ શૂન્ય હોવાથી દ્રવ્યમાન કેન્દ્ર સ્થિર રહે છે. x = (8/12) × 12 = 8.0 m.',
        exp: 'F_ext = 0 હોવાથી તેઓ દ્રવ્યમાન કેન્દ્ર પર મળશે: 8.0 m.'
      },
      15: {
        q: '2 kg નો કણ A +4 m/s ના વેગથી અને 3 kg નો કણ B -1 m/s ના વેગથી ગતિ કરે છે. તેમના દ્રવ્યમાન કેન્દ્રનો વેગ v_cm શોધો.',
        opts: ['+1.0 m/s', '+1.5 m/s', '+2.2 m/s', '-1.0 m/s'],
        ans: '+1.0 m/s',
        sol: 'v_cm = [2×(+4) + 3×(-1)] / 5 = (8 - 3)/5 = +1.0 m/s.',
        exp: 'v_cm = (8 - 3)/5 = +1.0 m/s.'
      },
      16: {
        q: '2.0 m લંબાઈ અને 3.0 kg દળ ધરાવતો સમાન સળિયો x = 0 થી x = 2.0 m પર મૂકેલો છે (COM x = 1.0 m પર છે), અને તેના છેડે x = 2.0 m પર 1.0 kg નો કણ જોડેલ છે. સમગ્ર તંત્રનું દ્રવ્યમાન કેન્દ્ર x_cm શું થશે?',
        opts: ['1.00 m', '1.25 m', '1.50 m', '1.75 m'],
        ans: '1.25 m',
        sol: 'x_cm = (3.0×1.0 + 1.0×2.0)/(3.0 + 1.0) = 5.0 / 4.0 = 1.25 m.',
        exp: 'સળિયાને 1.0 m પર 3 kg બિંદુવત દળ તરીકે ગણતા: x_cm = 1.25 m.'
      },
      17: {
        q: '1 kg અને 3 kg ના બે દળો x = 2 m અને x = 6 m પર છે. જો ઉગમબિંદુ x = +2 m પર ખસેડવામાં આવે, તો નવા યામ પદ્ધતિમાં દ્રવ્યમાન કેન્દ્રનો યામ શું થશે?',
        opts: ['1.5 m', '3.0 m', '5.0 m', '7.0 m'],
        ans: '3.0 m',
        sol: "મૂળ x_cm = 5.0 m. નવા ઉગમબિંદુ માટે x'_cm = 5.0 - 2.0 = 3.0 m.",
        exp: "નવી યામ પદ્ધતિમાં x' = 3.0 m થશે."
      },
      18: {
        q: 'હવામાં પરવલય ગતિ કરતો પદાર્થ તેના ઉચ્ચતમ બિંદુએ આંતરિક વિસ્ફોટથી ત્રણ ટુકડામાં વહેંચાઈ જાય છે. વિસ્ફોટ પછી ટુકડાઓનું દ્રવ્યમાન કેન્દ્ર કયા પથ પર ગતિ કરશે?',
        opts: [
          'તે જ મૂળ પરવલય પથ પર જે પથ પર મૂળ પદાર્થ ગતિ કરવાનો હતો',
          'હવામાં તરત જ અટકી જશે',
          'સીધું નીચે પડી જશે',
          'વિસ્ફોટના બળથી ઉપર તરફ પ્રવેગિત થશે'
        ],
        ans: 'તે જ મૂળ પરવલય પથ પર જે પથ પર મૂળ પદાર્થ ગતિ કરવાનો હતો',
        sol: 'વિસ્ફોટ આંતરિક બળોને લીધે થયો છે. બાહ્ય બળ માત્ર ગુરુત્વાકર્ષણ હોવાથી દ્રવ્યમાન કેન્દ્રનો પથ બદલાતો નથી.',
        exp: 'આંતરિક બળો દ્રવ્યમાન કેન્દ્રની ગતિ બદલી શકતા નથી. તેથી તે મૂળ પરવલય પથ પર જ ગતિ ચાલુ રાખશે.'
      },
      19: {
        q: 'અસમાન દળ m1 અને m2 (જ્યાં m2 > m1) ધરાવતા તંત્રમાં દ્રવ્યમાન કેન્દ્ર હંમેશા ક્યાં આવેલું હોય છે?',
        opts: [
          'દળને ધ્યાને લીધા વિના બરાબર મધ્યબિંદુ પર',
          'ભારે દળ m2 ની વધુ નજીક, કારણ કે અંતર દળના વ્યસ્ત પ્રમાણમાં હોય છે (m1*r1 = m2*r2)',
          'હળવા દળ m1 ની વધુ નજીક',
          'બંને કણોની બહારની બાજુ'
        ],
        ans: 'ભારે દળ m2 ની વધુ નજીક, કારણ કે અંતર દળના વ્યસ્ત પ્રમાણમાં હોય છે (m1*r1 = m2*r2)',
        sol: 'm1*r1 = m2*r2 હોવાથી દ્રવ્યમાન કેન્દ્ર હંમેશા ભારે દળની નજીક હોય છે.',
        exp: 'દ્રવ્યમાન કેન્દ્રથી અંતર દળના વ્યસ્ત પ્રમાણમાં હોવાથી તે ભારે પદાર્થની નજીક હોય છે.'
      },
      20: {
        q: 'શું કોઈ ભૌતિક પદાર્થનું દ્રવ્યમાન કેન્દ્ર એવા બિંદુએ હોઈ શકે જ્યાં પદાર્થનું કોઈ દ્રવ્ય જ હાજર ન હોય?',
        opts: [
          'ના, દ્રવ્યમાન કેન્દ્ર પદાર્થના ભૌતિક કણ પર જ હોવું જોઈએ',
          'હા, દાખલા તરીકે પાતળી રીંગ (રીંગ), પોલો ગોળો કે ઘોડાની નાળમાં દ્રવ્યમાન કેન્દ્ર પોલાણવાળા ભાગમાં હોય છે',
          'માત્ર શૂન્ય ગુરુત્વાકર્ષણમાં જ શક્ય છે',
          'માત્ર પ્રકાશની ગતિથી ફરતા પદાર્થો માટે'
        ],
        ans: 'હા, દાખલા તરીકે પાતળી રીંગ (રીંગ), પોલો ગોળો કે ઘોડાની નાળમાં દ્રવ્યમાન કેન્દ્ર પોલાણવાળા ભાગમાં હોય છે',
        sol: 'દ્રવ્યમાન કેન્દ્ર એક ભૌમિતિક ભારિત બિંદુ છે જે પદાર્થની બહાર ખાલી જગ્યામાં પણ હોઈ શકે છે.',
        exp: 'રીંગ અથવા પોલા ગોળામાં દ્રવ્યમાન કેન્દ્ર કેન્દ્રના ખાલી ભાગમાં હોય છે જ્યાં કોઈ દ્રવ્ય હોતું નથી.'
      },
      21: {
        q: '2 kg અને 10 kg ના દળો L અંતરે છે. જો 2 kg દળને 10 kg થી વધુ દૂર d અંતરે ખસેડવામાં આવે, તો દ્રવ્યમાન કેન્દ્ર કેવી રીતે બદલાશે?',
        opts: [
          'તે 2 kg દળ તરફ [2 / (2 + 10)] * d જેટલું ખસશે',
          'તે 10 kg દળ તરફ ખસશે કારણ કે તે ભારે છે',
          'તે બિલકુલ ખસશે નહીં',
          'તે પૂરેપૂરા d અંતર જેટલું ખસશે'
        ],
        ans: 'તે 2 kg દળ તરફ [2 / (2 + 10)] * d જેટલું ખસશે',
        sol: 'Δx_cm = (m1 * d) / M = (2/12)*d = d/6.',
        exp: 'દ્રવ્યમાન કેન્દ્ર 2 kg દળ તરફ (2/12)d અંતરે ખસશે.'
      },
      22: {
        q: 'કઈ સ્થિતિમાં પદાર્થનું દ્રવ્યમાન કેન્દ્ર (COM) તેના ગુરુત્વ કેન્દ્ર (COG) સાથે ચોક્કસ રીતે સંપાતી થાય છે?',
        opts: [
          'વિશ્વના તમામ પદાર્થો માટે હંમેશા કોઈપણ શરત વિના સંપાતી હોય છે',
          'જ્યારે પદાર્થ સમાન ગુરુત્વાકર્ષી ક્ષેત્રમાં હોય જ્યાં તમામ બિંદુઓએ g નું મૂલ્ય અને દિશા સમાન હોય',
          'માત્ર ત્યારે જ્યારે પદાર્થ ગોળાકાર હોય',
          'માત્ર શૂન્યાવકાશમાં જ'
        ],
        ans: 'જ્યારે પદાર્થ સમાન ગુરુત્વાકર્ષી ક્ષેત્રમાં હોય જ્યાં તમામ બિંદુઓએ g નું મૂલ્ય અને દિશા સમાન હોય',
        sol: 'સમાન ગુરુત્વાકર્ષી ક્ષેત્ર g = અચળ હોય ત્યારે જ COM અને COG સંપાતી થાય છે.',
        exp: 'જ્યાં સુધી સમગ્ર પદાર્થ પર ગુરુત્વપ્રવેગ g એકસમાન રહે ત્યાં સુધી જ COM અને COG એક જ બિંદુ પર રહે છે.'
      },
      23: {
        q: '50 kg અને 80 kg ના બે સ્કેટર ઘર્ષણ રહિત બરફ પર ઊભા છે. 50 kg વાળો સ્કેટર 80 kg વાળાને 100 N બળથી ધક્કો મારે છે. ધક્કો મારવા દરમિયાન તેમના સંયુક્ત દ્રવ્યમાન કેન્દ્રનું શું થશે?',
        opts: [
          'દ્રવ્યમાન કેન્દ્ર 80 kg સ્કેટર તરફ પ્રવેગિત થશે',
          'દ્રવ્યમાન કેન્દ્ર 50 kg સ્કેટર તરફ પ્રવેગિત થશે',
          'દ્રવ્યમાન કેન્દ્ર સંપૂર્ણ સ્થિર રહેશે કારણ કે ધક્કો આંતરિક બળ છે',
          'દ્રવ્યમાન કેન્દ્ર a = 100 / 130 m/s² થી પ્રવેગિત થશે'
        ],
        ans: 'દ્રવ્યમાન કેન્દ્ર સંપૂર્ણ સ્થિર રહેશે કારણ કે ધક્કો આંતરિક બળ છે',
        sol: 'F_ext = 0 હોવાથી a_cm = 0. દ્રવ્યમાન કેન્દ્ર સ્થિર રહે છે.',
        exp: 'સ્કેટર વચ્ચેનું બળ આંતરિક ક્રિયા-પ્રતિક્રિયા બળ છે. કોઈ બાહ્ય બળ ન હોવાથી દ્રવ્યમાન કેન્દ્ર સ્થિર રહે છે.'
      },
      24: {
        q: 'જો યામાક્ષોના ઉગમબિંદુને O પરથી O\' પર ખસેડવામાં આવે, તો અવકાશમાં કણોના તંત્રના દ્રવ્યમાન કેન્દ્રના વાસ્તવિક સ્થાન પર શું અસર થાય છે?',
        opts: [
          'તેનું ભૌતિક સ્થાન ઉગમબિંદુ જેટલું જ બદલાઈ જશે',
          'અવકાશમાં તેનું ભૌતિક સ્થાન સંપૂર્ણ અપરિવર્તિત રહે છે; માત્ર નવા ઉગમબિંદુ સાપેક્ષે તેના યામો બદલાય છે',
          'દ્રવ્યમાન કેન્દ્ર ભારે કણ તરફ ખસી જાય છે',
          'દ્રવ્યમાન કેન્દ્ર વિભાજીત થઈ જાય છે'
        ],
        ans: 'અવકાશમાં તેનું ભૌતિક સ્થાન સંપૂર્ણ અપરિવર્તિત રહે છે; માત્ર નવા ઉગમબિંદુ સાપેક્ષે તેના યામો બદલાય છે',
        sol: 'યામ પદ્ધતિ બદલાવાથી માત્ર ગાણિતિક યામો બદલાય છે, ભૌતિક બિંદુ અચળ રહે છે.',
        exp: 'દ્રવ્યમાન કેન્દ્ર અવકાશમાં નિશ્ચિત ભૌતિક બિંદુ છે. યામ પદ્ધતિ બદલવાથી માત્ર તેના આંકડાકીય મૂલ્યો બદલાય છે, વાસ્તવિક સ્થાન નહીં.'
      }
    };

    return englishQuestions.map((eq, idx) => {
      const ov = gujaratiOverrides[idx];
      if (!ov) return eq;
      return {
        ...eq,
        question: ov.q,
        options: ov.opts,
        correctAnswer: ov.ans,
        solution: ov.sol || eq.solution,
        stepByStepSolution: ov.sol,
        explanation: ov.exp
      };
    });
  }

  // ===================== SPANISH 25 QUESTIONS =====================
  private static getCenterOfMassQuestionsSpanish(): QuizQuestion[] {
    const englishQuestions = this.getCenterOfMassQuestionsEnglish();
    const spanishOverrides: Record<number, { q: string; opts: string[]; ans: string; sol: string; exp: string }> = {
      0: {
        q: 'Dos partículas idénticas, cada una de 3 kg, se colocan en una línea en x = 0 m y x = 4 m respectivamente. Calcule la posición de su centro de masa.',
        opts: ['1.0 m', '2.0 m', '3.0 m', '4.0 m'],
        ans: '2.0 m',
        sol: 'Usando x_cm = (m1*x1 + m2*x2)/(m1 + m2): x_cm = (3*0 + 3*4) / 6 = 2.0 m.',
        exp: 'Para masas iguales, el centro de masa se encuentra exactamente en el punto medio: 2.0 m.'
      },
      1: {
        q: 'Una masa de 4 kg está en x = 2 m y una masa desconocida m está en x = 8 m. Si el centro de masa está en x = 6 m, determine m.',
        opts: ['4 kg', '6 kg', '8 kg', '12 kg'],
        ans: '8 kg',
        sol: '6 = (4*2 + m*8)/(4 + m) => 24 + 6m = 8 + 8m => 2m = 16 => m = 8 kg.',
        exp: 'Aplicando el momento ponderado, la masa desconocida es m = 8 kg.'
      },
      2: {
        q: 'Una masa de 3 kg se ubica en x = -2 m y una masa de 1 kg en x2 desconocida. Si el centro de masa está en el origen (0.0 m), encuentre x2.',
        opts: ['-6.0 m', '+2.0 m', '+4.0 m', '+6.0 m'],
        ans: '+6.0 m',
        sol: '3*(-2) + 1*x2 = 0 => x2 = +6.0 m.',
        exp: 'Para que el centro de masa esté en el origen, el momento neto debe anularse: x2 = +6.0 m.'
      },
      19: {
        q: 'En cualquier sistema de dos partículas con masas desiguales m1 y m2 (donde m2 > m1), ¿dónde se encuentra siempre el centro de masa?',
        opts: [
          'Exactamente en el punto medio geométrico',
          'Más cerca de la masa más pesada m2, porque la distancia es inversamente proporcional a la masa (m1*r1 = m2*r2)',
          'Más cerca de la masa más ligera',
          'Fuera del segmento en el lado de la masa pesada'
        ],
        ans: 'Más cerca de la masa más pesada m2, porque la distancia es inversamente proporcional a la masa (m1*r1 = m2*r2)',
        sol: 'm1*r1 = m2*r2 demuestra que el centro de masa siempre está más próximo a la masa mayor.',
        exp: 'La distancia desde el centro de masa es inversamente proporcional a la masa: r1/r2 = m2/m1.'
      }
    };

    return englishQuestions.map((eq, idx) => {
      const ov = spanishOverrides[idx];
      if (!ov) return eq;
      return {
        ...eq,
        question: ov.q,
        options: ov.opts,
        correctAnswer: ov.ans,
        solution: ov.sol || eq.solution,
        stepByStepSolution: ov.sol,
        explanation: ov.exp
      };
    });
  }
}
