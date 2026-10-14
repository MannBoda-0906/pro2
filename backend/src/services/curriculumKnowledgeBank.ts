import { ConceptMap, QuizQuestion } from '../types/index.js';

export class CurriculumKnowledgeBank {
  /**
   * Returns expert prompt training directives, cognitive rubrics, and few-shot exemplars
   * used to train the Gemini models for deep concept analysis and rigorous exam construction.
   */
  static getPedagogicalTrainingPrompt(): string {
    return `
EXPERT PEDAGOGICAL DECONSTRUCTION & EXAM COMMISSIONER TRAINING DIRECTIVES:

1. BLOOM'S REVISED TAXONOMY & WEBB'S DEPTH OF KNOWLEDGE (DOK) SCAFFOLDING:
   - DOK 1 (Recall & Terminology):
     Test foundational definitions, universal constants, standard units (SI), and core equations.
     Example: "What is the SI unit of gravitational constant G?" -> "N·m²/kg²".
   - DOK 2 (Conceptual Mechanism & Causality):
     Test the underlying "Why" and "How". Why does altering parameter X produce consequence Y?
     Example: "Why does light bend toward the normal when entering an optically denser medium?" -> "Because phase velocity decreases while wave frequency remains strictly invariant."
   - DOK 3 (Numerical Calculation & Proportional Reasoning):
     Test quantitative problem-solving, formula substitutions, or multi-variable proportional scaling.
     Example: "In F = G * (m1 * m2) / r^2, if distance r is doubled while m1 is quadrupled, how does F' compare to F?" -> "F' = F (the factor of 4 cancels 2^2=4)."
   - DOK 4 (Analytical Traps & Limiting Factor Shifts):
     Test equilibrium shifts, limiting factors, boundary conditions, and comparative relationships.
     Example: "According to Le Chatelier's principle, how does increasing pressure shift the Haber process N2(g) + 3H2(g) <=> 2NH3(g)?" -> "Shifts toward products because 4 gas moles decrease to 2 gas moles."
   - DOK 5 (Exam-Style Reasoning & Misconception Diagnostics):
     Subtle traps designed to diagnose specific student errors and conceptual confusion.

2. DISTRACTOR DESIGN DOCTRINE (ZERO-JOKE RULE):
   - EVERY distractor MUST be diagnostic: an incorrect choice should map directly to a recognized student cognitive fallacy (e.g. neglected square, inverted ratio, confused rate with amount, confused sign, boundary misapplication).
   - NEVER use absurd, silly, or giveaway choices like 'Nothing happens', 'The plant explodes', 'Random guessing'. All 4 choices MUST read like credible textbook assertions.

3. PEDAGOGICAL EXPLANATION STANDARD:
   - "explanation": Must teach the governing scientific/mathematical mechanism and proof step-by-step.
   - "misconceptionExploration": Must explicitly dissect why each distractor was tempting and what cognitive trap it represents in standardized examinations.

4. MULTILINGUAL DISCIPLINE:
   - In Hindi and Gujarati, preserve technical scientific terms in English within parentheses (e.g., 'પ્રકાશસંશ્લેષણ (Photosynthesis)', 'જડત્વ (Inertia)', 'વિદ્યુતચુંબકીય પ્રેરણ (Electromagnetic Induction)').
   - Preserve all mathematical formulas and chemical equations intact across all languages.
`;
  }

  /**
   * Attempts to match recognized curriculum subjects for local synthesis fallback.
   */
  static getSpecializedConceptMap(title: string, videoId?: string): ConceptMap | null {
    const t = title.toLowerCase();

    // 1. Gravitation & Classical Mechanics
    if (t.includes('gravitation') || t.includes('गुरुत्वाकर्षण') || t.includes('gravity') || t.includes('newton')) {
      return {
        mainTopic: "Newton's Universal Law of Gravitation & Radial Fields",
        subjectCategory: 'physics',
        subtopics: [
          'Universal Gravitation Principle & Point Masses',
          'Inverse-Square Law & Geometric Flux Scaling',
          'Universal Constant G vs Surface Acceleration g',
          'Action-Reaction Symmetry & Gravitational Interactions'
        ],
        concepts: [
          {
            id: 'grav_1',
            name: "Newton's Universal Law of Gravitation",
            simpleExplanation: 'Every particle in the universe attracts every other particle with a force proportional to their mass product and inversely proportional to the square of their separation distance.',
            detailedExplanation: 'Isaac Newton established that mutual gravitational attraction between masses m1 and m2 at distance r is given by F = G * (m1 * m2) / r^2, directed along the line joining their centers.',
            relatedConcepts: ['Inverse Square Law', 'Gravitational Constant G', 'Central Force'],
            examples: ['Planetary orbits, apple falling toward Earth'],
            terminology: ['Gravitational Constant G', 'Point Mass', 'Radial Vector'],
            formula: 'F = G * (m1 * m2) / r^2',
            commonMisconceptions: ['Thinking gravity is zero in space; orbital weightlessness is free fall, not zero gravity.'],
            examImportance: 'essential',
            approximateTimestamp: { startSeconds: 25, timestamp: '00:25' }
          },
          {
            id: 'grav_2',
            name: 'Inverse-Square Law Dependency',
            simpleExplanation: 'Doubling the distance between two masses reduces their gravitational pull by a factor of 4.',
            detailedExplanation: 'Because gravitational field lines radiate through spherical surface area 4*pi*r^2, field density falls off as 1/r^2.',
            relatedConcepts: ['Radial Flux', 'Field Density'],
            examples: ['Comparing low-Earth orbit force with high-altitude satellite pull'],
            terminology: ['Inverse-Square', 'Field Strength'],
            formula: 'F_new = F_old / (distance_multiplier)^2',
            commonMisconceptions: ['Assuming force decreases linearly with distance (confusing 1/r with 1/r^2).'],
            examImportance: 'essential',
            approximateTimestamp: { startSeconds: 60, timestamp: '01:00' }
          },
          {
            id: 'grav_3',
            name: 'Universal Constant G vs Local Acceleration g',
            simpleExplanation: 'G is an invariant scalar constant across the cosmos, whereas g depends on the mass and radius of the planet.',
            detailedExplanation: 'G = 6.674e-11 N*m^2/kg^2 everywhere, while g = G * M / R^2 varies from 9.8 m/s^2 on Earth to 1.62 m/s^2 on the Moon.',
            relatedConcepts: ['Gravitational Field', 'Weight vs Mass'],
            examples: ['An astronaut having identical mass on the Moon but weighing one-sixth as much'],
            terminology: ['Scalar Invariant', 'Gravitational Field Strength'],
            formula: 'g = G * M / R^2',
            commonMisconceptions: ['Confusing big G with little g or thinking G changes in outer space.'],
            examImportance: 'essential',
            approximateTimestamp: { startSeconds: 110, timestamp: '01:50' }
          }
        ],
        relationships: [
          {
            sourceConcept: "Newton's Universal Law of Gravitation",
            targetConcept: 'Inverse-Square Law Dependency',
            relationshipType: 'causes',
            description: 'Three-dimensional spherical geometry enforces the 1/r^2 force decay.'
          },
          {
            sourceConcept: "Newton's Universal Law of Gravitation",
            targetConcept: 'Universal Constant G vs Local Acceleration g',
            relationshipType: 'prerequisite_for',
            description: 'Local surface acceleration g is derived directly from universal gravitation F = m*g.'
          }
        ],
        definitions: [
          {
            term: "Newton's Universal Law of Gravitation",
            definition: 'A universal law of classical mechanics asserting attractive force proportional to mass product and inversely proportional to distance squared.',
            simpleExplanation: 'Every mass attracts every other mass according to mass product divided by distance squared.'
          },
          {
            term: 'Gravitational Constant (G)',
            definition: 'An empirical physical scalar constant of proportionality relating gravitational force to mass and distance (6.67430 × 10^-11 N·m²/kg²).',
            simpleExplanation: 'The universal conversion factor that measures the intrinsic strength of gravity.'
          }
        ],
        formulas: [
          {
            name: 'Law of Universal Gravitation',
            formula: 'F = G * (m1 * m2) / r^2',
            variables: [
              { symbol: 'F', meaning: 'Gravitational Force', unit: 'Newtons (N)' },
              { symbol: 'G', meaning: 'Gravitational Constant (6.674e-11)', unit: 'N*m^2/kg^2' },
              { symbol: 'm1, m2', meaning: 'Interacting Masses', unit: 'Kilograms (kg)' },
              { symbol: 'r', meaning: 'Distance between centers of mass', unit: 'Meters (m)' }
            ],
            applicability: 'Classical mechanics, non-relativistic regimes'
          },
          {
            name: 'Surface Gravitational Acceleration',
            formula: 'g = G * M / R^2',
            variables: [
              { symbol: 'g', meaning: 'Local gravitational field strength', unit: 'm/s^2 (or N/kg)' },
              { symbol: 'M', meaning: 'Celestial body mass', unit: 'Kilograms (kg)' },
              { symbol: 'R', meaning: 'Celestial body radius', unit: 'Meters (m)' }
            ],
            applicability: 'Spherical planetary surface'
          }
        ],
        processes: [],
        examples: [],
        misconceptions: [
          {
            misconception: 'Gravitational attraction decreases linearly with distance.',
            correction: 'Gravitational attraction follows the inverse square law: doubling distance decreases force by a factor of four.',
            concept: "Newton's Universal Law of Gravitation"
          },
          {
            misconception: 'Astronauts float in orbit because gravity is zero in space.',
            correction: 'Astronauts float because both they and their spacecraft are in perpetual free fall around Earth where gravity is still ~89% of surface value.',
            concept: 'Universal Constant G vs Local Acceleration g'
          }
        ],
        examImportantPoints: [
          'Be prepared for simultaneous mass and distance changes in proportional reasoning questions.',
          'Distinguish G (universal scalar constant) from g (local vector acceleration).',
          "Newton's Third Law applies symmetrically: Earth attracts the Moon with the exact same magnitude of force that the Moon attracts Earth."
        ]
      };
    }

    // 2. Wave Optics & Snell's Law
    if (t.includes('refraction') || t.includes('વક્રીભવન') || t.includes('snell') || t.includes('optics')) {
      return {
        mainTopic: "Wave Optics, Refraction & Snell's Law",
        subjectCategory: 'physics',
        subtopics: [
          'Refractive Index & Speed of Light in Media',
          "Snell's Law of Refraction",
          'Wave Invariants: Frequency vs Velocity & Wavelength',
          'Critical Angle & Total Internal Reflection'
        ],
        concepts: [
          {
            id: 'opt_1',
            name: "Refraction of Light & Snell's Law",
            simpleExplanation: 'When light transitions across a boundary between media with differing optical densities, wave speed changes cause the beam to bend.',
            detailedExplanation: "Snell's Law states n1 * sin(theta1) = n2 * sin(theta2). When entering an optically denser medium (n2 > n1), light slows down and bends toward the normal line.",
            relatedConcepts: ['Refractive Index', 'Wave Speed', 'Normal Line'],
            examples: ['Light ray entering water from air, a pencil appearing bent in a glass of water'],
            terminology: ['Angle of Incidence', 'Angle of Refraction', 'Refractive Index'],
            formula: 'n1 * sin(theta1) = n2 * sin(theta2)',
            commonMisconceptions: ['Thinking light frequency changes upon refraction; frequency remains strictly invariant.'],
            examImportance: 'essential',
            approximateTimestamp: { startSeconds: 32, timestamp: '00:32' }
          },
          {
            id: 'opt_2',
            name: 'Wave Invariant Properties across Boundaries',
            simpleExplanation: 'Light frequency is fixed by the source, while wavelength and phase velocity change proportionally (v = f * lambda).',
            detailedExplanation: 'Because photon energy E = h*f must be conserved at the interface, frequency f is invariant. In medium with index n, velocity v = c/n and wavelength lambda = lambda0/n.',
            relatedConcepts: ['Photon Energy', 'Dispersion', 'Wavelength Compression'],
            examples: ['Color of a laser beam remaining red underwater even though its wavelength shortens'],
            terminology: ['Optical Invariant', 'Phase Velocity', 'Vacuum Wavelength'],
            formula: 'v = c / n, lambda = lambda_0 / n',
            commonMisconceptions: ['Thinking color shifts underwater due to wavelength change; retinal absorption depends on frequency.'],
            examImportance: 'essential',
            approximateTimestamp: { startSeconds: 75, timestamp: '01:15' }
          }
        ],
        relationships: [
          {
            sourceConcept: "Refraction of Light & Snell's Law",
            targetConcept: 'Wave Invariant Properties across Boundaries',
            relationshipType: 'causes',
            description: 'Phase velocity reduction is the fundamental microscopic cause of wave bending.'
          }
        ],
        definitions: [
          {
            term: 'Refraction of Light',
            definition: 'The deviation of a wave propagating obliquely across a boundary separating media of different phase velocities.',
            simpleExplanation: 'Bending of light due to a change in speed in a new medium.'
          },
          {
            term: 'Refractive Index (n)',
            definition: 'The dimensionless ratio of the speed of light in vacuum (c) to its phase velocity in the medium (v): n = c / v.',
            simpleExplanation: 'How much a material slows down light compared to empty space.'
          }
        ],
        formulas: [
          {
            name: "Snell's Law",
            formula: 'n1 * sin(theta1) = n2 * sin(theta2)',
            variables: [
              { symbol: 'n1, n2', meaning: 'Indices of refraction', unit: 'dimensionless' },
              { symbol: 'theta1, theta2', meaning: 'Angles relative to normal', unit: 'degrees' }
            ],
            applicability: 'Isotropic transparent optical media'
          }
        ],
        processes: [],
        examples: [],
        misconceptions: [
          {
            misconception: 'The frequency of light changes during refraction.',
            correction: 'Frequency is determined by the source and is invariant; velocity and wavelength change proportionally (v = f * lambda).',
            concept: "Refraction of Light & Snell's Law"
          }
        ],
        examImportantPoints: [
          'Ray bends toward the normal in denser media (n2 > n1).',
          'Frequency is constant across all optical boundaries.',
          'Angles must always be measured relative to the normal line, not the interface surface.'
        ]
      };
    }

    // 3. Differential Calculus
    if (t.includes('calculus') || t.includes('derivative') || t.includes('power rule') || t.includes('rate of change')) {
      return {
        mainTopic: 'Differential Calculus: Derivatives & Rate of Change',
        subjectCategory: 'mathematics',
        subtopics: [
          'Instantaneous Rate of Change & Tangent Slope',
          'Power Rule Differentiation',
          'Polynomial Differentiation Rules',
          'Kinematic Applications: Velocity & Acceleration'
        ],
        concepts: [
          {
            id: 'calc_1',
            name: 'Derivative & The Power Rule',
            simpleExplanation: 'The derivative represents the instantaneous slope of a function, and the power rule differentiates x^n into n * x^(n - 1).',
            detailedExplanation: 'For any power function f(x) = x^n, d/dx[x^n] = n * x^(n - 1). By linearity, d/dx[c * f(x)] = c * f\'(x) and d/dx[f(x) + g(x)] = f\'(x) + g\'(x).',
            relatedConcepts: ['Instantaneous Rate of Change', 'Tangent Slope', 'Power Rule'],
            examples: ['Derivative of 3*x^2 is 6*x; evaluated at x=2 yields slope 12'],
            terminology: ['Derivative', 'Power Rule', 'Instantaneous Rate of Change'],
            formula: 'd/dx[x^n] = n * x^(n - 1)',
            commonMisconceptions: ['Confusing the derivative with the function value or forgetting constant multiplier rules.'],
            examImportance: 'essential',
            approximateTimestamp: { startSeconds: 20, timestamp: '00:20' }
          }
        ],
        relationships: [],
        definitions: [
          {
            term: 'Derivative',
            definition: 'The limiting value of the difference quotient [f(x+h) - f(x)] / h as h approaches zero.',
            simpleExplanation: 'The instantaneous rate of change and slope of the curve at a point.'
          }
        ],
        formulas: [
          {
            name: 'Power Rule of Differentiation',
            formula: 'd/dx[x^n] = n * x^(n - 1)',
            variables: [
              { symbol: 'n', meaning: 'Exponent power', unit: 'real number' },
              { symbol: 'x', meaning: 'Independent variable', unit: 'dimensionless' }
            ],
            applicability: 'All differentiable power functions'
          }
        ],
        processes: [],
        examples: [],
        misconceptions: [
          {
            misconception: 'Derivative of a constant multiple c * x is zero.',
            correction: 'Derivative of a constant alone is 0 (d/dx[c]=0), but d/dx[c*x] = c.',
            concept: 'Derivative & The Power Rule'
          }
        ],
        examImportantPoints: [
          'Power rule: Multiply by exponent, decrement exponent by 1.',
          'Derivative represents instantaneous slope at a point.',
          'The derivative of a constant term is zero.'
        ]
      };
    }

    // 4. Thermodynamics & Entropy
    if (t.includes('termodinámica') || t.includes('thermodynamics') || t.includes('entrop')) {
      return {
        mainTopic: 'Laws of Thermodynamics & Entropy',
        subjectCategory: 'physics',
        subtopics: [
          'First Law: Conservation of Energy (Delta U = Q - W)',
          'Second Law: Direction of Spontaneous Processes & Entropy',
          'Heat Engines, Thermal Efficiency & Carnot Limit',
          'Microscopic Disorder & Statistical Mechanics'
        ],
        concepts: [
          {
            id: 'thermo_1',
            name: 'First and Second Laws of Thermodynamics',
            simpleExplanation: 'Energy is conserved (Delta U = Q - W) and the total entropy of an isolated system always increases over time.',
            detailedExplanation: 'The first law establishes internal energy as a state function. The second law establishes the thermodynamic arrow of time: spontaneous natural processes produce net positive entropy (Delta S >= 0).',
            relatedConcepts: ['Internal Energy', 'Entropy', 'Heat vs Work'],
            examples: ['Heat flowing spontaneously from hot coffee to cooler room air'],
            terminology: ['Internal Energy (U)', 'Heat (Q)', 'Work (W)', 'Entropy (S)'],
            formula: 'Delta U = Q - W, Delta S_isolated >= 0',
            commonMisconceptions: ['Believing that local decreases in entropy (e.g. freezing water) violate the Second Law.'],
            examImportance: 'essential',
            approximateTimestamp: { startSeconds: 20, timestamp: '00:20' }
          }
        ],
        relationships: [],
        definitions: [
          {
            term: 'Entropy',
            definition: 'A state function that quantifies the number of microscopic configurations accessible to a thermodynamic system.',
            simpleExplanation: 'The fundamental measure of molecular disorder and energetic dispersion.'
          }
        ],
        formulas: [
          {
            name: 'First Law of Thermodynamics',
            formula: 'Delta U = Q - W',
            variables: [
              { symbol: 'Delta U', meaning: 'Change in internal energy', unit: 'Joules (J)' },
              { symbol: 'Q', meaning: 'Heat added to system', unit: 'Joules (J)' },
              { symbol: 'W', meaning: 'Work done by system', unit: 'Joules (J)' }
            ],
            applicability: 'Closed thermodynamic systems'
          }
        ],
        processes: [],
        examples: [],
        misconceptions: [
          {
            misconception: 'The Second Law forbids any entropy reduction.',
            correction: 'Entropy of a subsystem can decrease as long as the entropy of the surroundings increases by an equal or greater amount.',
            concept: 'First and Second Laws of Thermodynamics'
          }
        ],
        examImportantPoints: [
          'Delta U = Q - W: Be meticulous with sign conventions for heat absorbed vs work done.',
          'Second Law forbids 100% efficient cyclical conversion of heat into work.'
        ]
      };
    }

    // 5. Chemical Equilibrium & Le Chatelier's Principle
    if (t.includes('equilibrium') || t.includes('le chatelier') || t.includes('chemistry') || t.includes('रसायन')) {
      return {
        mainTopic: "Chemical Equilibrium & Le Chatelier's Principle",
        subjectCategory: 'chemistry',
        subtopics: [
          'Dynamic Nature of Chemical Equilibrium (rf = rr)',
          'Equilibrium Constant Expression (Kc and Kp)',
          "Le Chatelier's Principle: Stress Response",
          'Temperature, Pressure, and Concentration Shifts'
        ],
        concepts: [
          {
            id: 'chem_1',
            name: "Le Chatelier's Principle",
            simpleExplanation: 'When a chemical system at equilibrium is subjected to an external change in concentration, temperature, or pressure, it shifts to counteract the disturbance.',
            detailedExplanation: 'Dynamic equilibrium exists when forward and reverse reaction rates are equal (rf = rr). Adding reactants or removing products shifts equilibrium toward products. In exothermic reactions (Delta H < 0), heating acts like adding a product, shifting equilibrium toward reactants.',
            relatedConcepts: ['Dynamic Equilibrium', 'Haber Process', 'Equilibrium Constant Kc'],
            examples: ['Industrial ammonia synthesis: N2(g) + 3H2(g) <=> 2NH3(g) under high pressure'],
            terminology: ['Dynamic Equilibrium', 'Reaction Quotient Q', 'Le Chatelier Shift'],
            formula: 'Kc = [C]^c * [D]^d / ([A]^a * [B]^b)',
            commonMisconceptions: ['Thinking adding a catalyst shifts the equilibrium position; catalysts only speed up reaching equilibrium without altering Kc.'],
            examImportance: 'essential',
            approximateTimestamp: { startSeconds: 30, timestamp: '00:30' }
          }
        ],
        relationships: [],
        definitions: [
          {
            term: 'Dynamic Chemical Equilibrium',
            definition: 'The state of a reversible reaction where forward and reverse rates are equal and reactant and product concentrations remain constant over time.',
            simpleExplanation: 'Both forward and backward reactions proceed at the exact same speed.'
          }
        ],
        formulas: [
          {
            name: 'Equilibrium Constant Expression',
            formula: 'Kc = [Products]^coefficients / [Reactants]^coefficients',
            variables: [
              { symbol: 'Kc', meaning: 'Equilibrium constant', unit: 'dimensionless or M^(delta n)' }
            ],
            applicability: 'Reversible chemical reactions at constant temperature'
          }
        ],
        processes: [],
        examples: [],
        misconceptions: [
          {
            misconception: 'Catalysts change the yield of products at equilibrium.',
            correction: 'Catalysts lower activation energy equally for forward and reverse directions; they accelerate the approach to equilibrium but do not shift equilibrium composition or change Kc.',
            concept: "Le Chatelier's Principle"
          }
        ],
        examImportantPoints: [
          'Catalysts do NOT shift equilibrium; they only decrease the time required to reach it.',
          'Only temperature changes alter the numerical value of the equilibrium constant Kc.'
        ]
      };
    }

    return null;
  }

  /**
   * Generates expert domain questions for Gravitation, Optics, Calculus, Thermodynamics, and Equilibrium.
   */
  static getSpecializedQuizQuestions(params: {
    title: string;
    conceptMap: ConceptMap;
    difficulty: string;
    langCode: 'en' | 'hi' | 'gu' | 'es';
    count: number;
  }): QuizQuestion[] | null {
    const { title, difficulty, langCode } = params;
    const t = title.toLowerCase();

    // 1. Gravitation
    if (t.includes('gravitation') || t.includes('गुरुत्वाकर्षण') || t.includes('gravity') || t.includes('newton')) {
      if (langCode === 'hi') {
        return [
          {
            id: 'q_grav_hi_1',
            type: 'mcq',
            cognitiveLevel: 'level_3_application',
            conceptName: 'न्यूटन का सार्वत्रिक गुरुत्वाकर्षण नियम (Universal Gravitation)',
            question: 'दो बिंदु-द्रव्यमान m1 और m2 एक दूसरे से r दूरी पर स्थित हैं और उनके बीच आकर्षण बल F है। यदि उनके बीच की दूरी को दोगुना (2r) कर दिया जाए और m1 के द्रव्यमान को चार गुना (4m1) कर दिया जाए, तो नया गुरुत्वाकर्षण बल F\' कितना होगा?',
            options: [
              'गुरुत्वाकर्षण बल अपरिवर्तित रहेगा (F\' = F)',
              'गुरुत्वाकर्षण बल दोगुना हो जाएगा (F\' = 2F)',
              'गुरुत्वाकर्षण बल चार गुना हो जाएगा (F\' = 4F)',
              'गुरुत्वाकर्षण बल एक-चौथाई रह जाएगा (F\' = F/4)'
            ],
            correctAnswer: 'गुरुत्वाकर्षण बल अपरिवर्तित रहेगा (F\' = F)',
            explanation: 'न्यूटन के सूत्र F = G * (m1 * m2) / r^2 के अनुसार: F\' = G * (4m1 * m2) / (2r)^2 = G * 4(m1 * m2) / (4r^2) = F। अंश का 4 और हर का 2^2=4 एक दूसरे को निरस्त कर देते हैं।',
            misconceptionExploration: 'जो छात्र 2F उत्तर देते हैं वे भूल जाते हैं कि दूरी का वर्ग (r^2) होता है, रेखीय संबंध नहीं। जो 4F उत्तर देते हैं वे दूरी में वृद्धि की उपेक्षा करते हैं।',
            difficulty: 'medium',
            timestampSeconds: 25,
            timestampFormatted: '00:25'
          },
          {
            id: 'q_grav_hi_2',
            type: 'mcq',
            cognitiveLevel: 'level_2_understanding',
            conceptName: 'व्युत्क्रम वर्ग नियम (Inverse-Square Law)',
            question: 'मेज पर रखी दो 1 किग्रा की पुस्तकों के बीच गुरुत्वाकर्षण बल दृश्यमान रूप से क्यों महसूस नहीं होता है?',
            options: [
              'सार्वत्रिक गुरुत्वाकर्षण स्थिरांक G (लगभग 6.674e-11) अत्यंत सूक्ष्म है, जिससे बल घर्षण बल की तुलना में नगण्य हो जाता है',
              'गुरुत्वाकर्षण केवल अंतरिक्ष में आकाशीय पिंडों के बीच कार्य करता है',
              'मेज की सतह गुरुत्वाकर्षण विरोधी ढाल उत्पन्न करती है',
              'दैनिक वस्तुओं का गुरुत्वीय द्रव्यमान शून्य होता है'
            ],
            correctAnswer: 'सार्वत्रिक गुरुत्वाकर्षण स्थिरांक G (लगभग 6.674e-11) अत्यंत सूक्ष्म है, जिससे बल घर्षण बल की तुलना में नगण्य हो जाता है',
            explanation: 'G का मान 10^-11 क्रम का होने के कारण दो सामान्य वस्तुओं के बीच बल 10^-10 N से भी कम होता है, जो स्थैतिक घर्षण द्वारा आसानी से संतुलित हो जाता है।',
            misconceptionExploration: 'छात्र यह मान लेते हैं कि गुरुत्वाकर्षण केवल बड़े ग्रहों में होता है। वास्तव में यह प्रत्येक द्रव्यमान वाले कण में होता है, लेकिन G का मान अत्यंत छोटा होने के कारण सामान्य वस्तुओं में नगण्य होता है।',
            difficulty: 'easy',
            timestampSeconds: 40,
            timestampFormatted: '00:40'
          },
          {
            id: 'q_grav_hi_3',
            type: 'mcq',
            cognitiveLevel: 'level_4_analysis',
            conceptName: 'न्यूटन का तीसरा नियम और गुरुत्वाकर्षण',
            question: 'न्यूटन के गति के तीसरे नियम के अनुसार, यदि पृथ्वी किसी उपग्रह पर F परिमाण का गुरुत्वाकर्षण बल लगाती है, तो उपग्रह द्वारा पृथ्वी पर लगाया गया बल कितना होगा?',
            options: [
              'सटीक रूप से F परिमाण का, उपग्रह की दिशा में',
              'F से बहुत कम क्योंकि पृथ्वी का द्रव्यमान उपग्रह से अत्यधिक बड़ा है',
              'शून्य क्योंकि उपग्रह स्वतंत्र रूप से गिर रहा है',
              'पृथ्वी के द्रव्यमान के वर्ग के समानुपाती'
            ],
            correctAnswer: 'सटीक रूप से F परिमाण का, उपग्रह की दिशा में',
            explanation: 'गुरुत्वाकर्षण बल एक पारस्परिक क्रिया-प्रतिक्रिया युग्म (action-reaction pair) है। दोनों पिंड एक दूसरे पर समान परिमाण और विपरीत दिशा में बल लगाते हैं। पृथ्वी का त्वरण नगण्य होता है क्योंकि a = F/M (विशाल द्रव्यमान)।',
            misconceptionExploration: 'अधिकांश छात्र भ्रमित हो जाते हैं और सोचते हैं कि अधिक द्रव्यमान वाला पिंड अधिक बल लगाता है। बल समान होता है, केवल त्वरण भिन्न होता है।',
            difficulty: 'hard',
            timestampSeconds: 55,
            timestampFormatted: '00:55'
          }
        ];
      }

      if (langCode === 'gu') {
        return [
          {
            id: 'q_grav_gu_1',
            type: 'mcq',
            cognitiveLevel: 'level_3_application',
            conceptName: 'ન્યૂટનનો સાર્વત્રિક ગુરુત્વાકર્ષણનો નિયમ (Universal Gravitation)',
            question: 'બે બિંદુવત દળ m1 અને m2 વચ્ચેનું અંતર r હોય ત્યારે ગુરુત્વાકર્ષણ બળ F છે. જો તેમની વચ્ચેનું અંતર બમણું (2r) કરવામાં આવે અને m1 નું દળ ચાર ગણું (4m1) કરવામાં આવે, તો નવું ગુરુત્વાકર્ષણ બળ F\' કેટલું થશે?',
            options: [
              'બળ અપરિવર્તિત રહેશે (F\' = F)',
              'બળ બમણું થશે (F\' = 2F)',
              'બળ ચાર ગણું થશે (F\' = 4F)',
              'બળ ચોથા ભાગનું થશે (F\' = F/4)'
            ],
            correctAnswer: 'બળ અપરિવર્તિત રહેશે (F\' = F)',
            explanation: 'ન્યૂટનના સૂત્ર F = G * (m1 * m2) / r^2 મુજબ: F\' = G * (4m1 * m2) / (2r)^2 = G * 4(m1 * m2) / (4r^2) = F. અંશનો 4 અને છેદનો 2^2=4 એકબીજાને રદ કરે છે.',
            misconceptionExploration: 'વિદ્યાર્થીઓ અંતરના વર્ગ (r^2) ને બદલે સીધું અંતર વિચારીને 2F ભૂલ કરે છે.',
            difficulty: 'medium',
            timestampSeconds: 25,
            timestampFormatted: '00:25'
          }
        ];
      }

      if (langCode === 'es') {
        return [
          {
            id: 'q_grav_es_1',
            type: 'mcq',
            cognitiveLevel: 'level_3_application',
            conceptName: 'Ley de Gravitación Universal de Newton',
            question: 'Dos masas puntuales m1 y m2 separadas por una distancia r experimentan una fuerza gravitatoria mutua F. Si la distancia de separación se duplica (2r) y la masa m1 se cuadruplica (4m1), ¿cómo se compara la nueva fuerza F\' con F?',
            options: [
              'La fuerza gravitatoria permanece inalterada (F\' = F)',
              'La fuerza gravitatoria se duplica (F\' = 2F)',
              'La fuerza gravitatoria se cuadruplica (F\' = 4F)',
              'La fuerza gravitatoria se reduce a la cuarta parte (F\' = F/4)'
            ],
            correctAnswer: 'La fuerza gravitatoria permanece inalterada (F\' = F)',
            explanation: 'De acuerdo con F = G * (m1 * m2) / r^2: F\' = G * (4m1 * m2) / (2r)^2 = G * 4(m1 * m2) / (4r^2) = F. El factor 4 del numerador se cancela exactamente con 2^2=4 en el denominador.',
            misconceptionExploration: 'Los estudiantes que eligen 2F olvidan que la distancia está elevada al cuadrado en la ley del inverso del cuadrado.',
            difficulty: 'medium',
            timestampSeconds: 25,
            timestampFormatted: '00:25'
          }
        ];
      }

      // Default English
      return [
        {
          id: 'q_grav_en_1',
          type: 'mcq',
          cognitiveLevel: 'level_3_application',
          conceptName: "Newton's Universal Law of Gravitation",
          question: "Two point masses m1 and m2 separated by distance r exert a mutual gravitational force F. If separation distance is doubled (2r) and m1 is quadrupled (4m1), how does the new gravitational force F' compare to F?",
          options: [
            "The gravitational force remains unchanged (F' = F)",
            "The gravitational force doubles (F' = 2F)",
            "The gravitational force is quadrupled (F' = 4F)",
            "The gravitational force is reduced to one-fourth (F' = F/4)"
          ],
          correctAnswer: "The gravitational force remains unchanged (F' = F)",
          explanation: "According to F = G * (m1 * m2) / r^2: F' = G * (4m1 * m2) / (2r)^2 = G * 4(m1 * m2) / (4r^2) = F. The factor of 4 in numerator exactly cancels 2^2=4 in denominator.",
          misconceptionExploration: "Students who pick 2F forget that distance is squared (r^2). Students who pick 4F ignore the increase in distance entirely.",
          difficulty: 'medium',
          timestampSeconds: 25,
          timestampFormatted: '00:25'
        },
        {
          id: 'q_grav_en_2',
          type: 'mcq',
          cognitiveLevel: 'level_2_understanding',
          conceptName: 'Magnitude of Universal Constant G',
          question: 'Why is the mutual gravitational attraction between two 1 kg textbooks on a table not visibly apparent?',
          options: [
            'The universal constant G (~6.674e-11 N*m^2/kg^2) is extraordinarily small, making the force negligible compared to static friction',
            'Gravity ceases to operate inside enclosed rooms',
            'Solid wooden tables produce anti-gravitational shielding',
            'Kilogram-scale objects possess zero gravitational mass'
          ],
          correctAnswer: 'The universal constant G (~6.674e-11 N*m^2/kg^2) is extraordinarily small, making the force negligible compared to static friction',
          explanation: 'Because G is on the order of 10^-11, the gravitational force between 1 kg masses at 1 meter is approximately 6.67e-11 N, easily overcome by normal contact friction.',
          difficulty: 'easy',
          timestampSeconds: 40,
          timestampFormatted: '00:40'
        },
        {
          id: 'q_grav_en_3',
          type: 'mcq',
          cognitiveLevel: 'level_4_analysis',
          conceptName: 'Action-Reaction Symmetry in Gravity',
          question: "According to Newton's Third Law, if Earth exerts gravitational force F on an orbiting satellite, what is the magnitude of the force exerted by the satellite on Earth?",
          options: [
            'Exactly equal to F, directed toward the satellite',
            'Far smaller than F because Earth has vastly greater inertial mass',
            'Zero, because the satellite is in state of free-fall',
            'Inversely proportional to Earth radius'
          ],
          correctAnswer: 'Exactly equal to F, directed toward the satellite',
          explanation: 'Gravitational attraction is a mutual interaction pair: |F_Earth_on_Satellite| = |F_Satellite_on_Earth| = F. Earth simply experiences negligible acceleration due to its massive inertia (a = F/M).',
          difficulty: 'hard',
          timestampSeconds: 55,
          timestampFormatted: '00:55'
        }
      ];
    }

    // 2. Optics & Snell's Law
    if (t.includes('refraction') || t.includes('વક્રીભવન') || t.includes('snell') || t.includes('optics')) {
      if (langCode === 'gu') {
        return [
          {
            id: 'q_opt_gu_1',
            type: 'mcq',
            cognitiveLevel: 'level_3_application',
            conceptName: 'પ્રકાશનું વક્રીભવન અને સ્નેલનો નિયમ (Refraction of Light)',
            question: 'જ્યારે એકવર્ણી પ્રકાશનું કિરણ હવામાંથી (n1 ≈ 1.0) પાણીમાં (n2 ≈ 1.33) પ્રવેશે છે, ત્યારે સ્નેલના નિયમ મુજબ કયું પરિબળ સંપૂર્ણપણે અપરિવર્તિત રહે છે?',
            options: [
              'પ્રકાશના તરંગની આવૃત્તિ (Frequency)',
              'પ્રકાશની તરંગલંબાઈ (Wavelength)',
              'માધ્યમમાં પ્રકાશની ઝડપ (Wave velocity)',
              'લંબ સાથેનો ખૂણો (Angle with normal)'
            ],
            correctAnswer: 'પ્રકાશના તરંગની આવૃત્તિ (Frequency)',
            explanation: 'તરંગની આવૃત્તિ માત્ર ઉદ્ગમ સ્થાન (source) પર આધાર રાખે છે અને માધ્યમ બદલાતા ક્યારેય બદલાતી નથી. ઝડપ ઘટે છે (v = c/n) અને તરંગલંબાઈ સંકોચાય છે, જેથી કિરણ લંબ તરફ વળે છે.',
            difficulty: 'medium',
            timestampSeconds: 32,
            timestampFormatted: '00:32'
          }
        ];
      }

      if (langCode === 'hi') {
        return [
          {
            id: 'q_opt_hi_1',
            type: 'mcq',
            cognitiveLevel: 'level_3_application',
            conceptName: 'प्रकाश का अपवर्तन और स्नेल का नियम (Snell\'s Law)',
            question: 'जब एक प्रकाश किरण विरल माध्यम (हवा, n1 ≈ 1.0) से सघन माध्यम (कांच, n2 ≈ 1.5) में प्रवेश करती है, तो तरंग का कौन सा गुणधर्म पूर्णतः अपरिवर्तित रहता है?',
            options: [
              'प्रकाश तरंग की आवृत्ति (Frequency)',
              'माध्यम में तरंग की चाल (Speed)',
              'प्रकाश की तरंगदैर्घ्य (Wavelength)',
              'अभिलंब के साथ आपतन कोण'
            ],
            correctAnswer: 'प्रकाश तरंग की आवृत्ति (Frequency)',
            explanation: 'आवृत्ति (Frequency) स्रोत द्वारा निर्धारित होती है और अपवर्तन के दौरान कभी नहीं बदलती। सघन माध्यम में चाल (v = c/n) और तरंगदैर्घ्य घट जाती है, जिससे किरण अभिलंब की ओर झुकती है।',
            misconceptionExploration: 'छात्र अक्सर सोचते हैं कि माध्यम बदलने पर रंग या आवृत्ति बदल जाती है, जबकि केवल चाल और तरंगदैर्घ्य बदलते हैं।',
            difficulty: 'medium',
            timestampSeconds: 32,
            timestampFormatted: '00:32'
          }
        ];
      }

      return [
        {
          id: 'q_opt_en_1',
          type: 'mcq',
          cognitiveLevel: 'level_3_application',
          conceptName: "Snell's Law of Refraction",
          question: 'When a monochromatic light beam travels from an optically rarer medium (air, n1 ≈ 1.0) into an optically denser medium (water, n2 ≈ 1.33), which wave property remains strictly invariant?',
          options: [
            'Frequency of the light wave',
            'Wavelength of the light in the medium',
            'Phase velocity of propagation',
            'Angle of the ray with respect to the normal'
          ],
          correctAnswer: 'Frequency of the light wave',
          explanation: 'Wave frequency is determined solely by the emitter and is invariant across boundaries. In denser media, speed decreases (v = c/n) and wavelength compresses proportionally (lambda = lambda0/n), causing the ray to bend toward the normal.',
          difficulty: 'medium',
          timestampSeconds: 32,
          timestampFormatted: '00:32'
        }
      ];
    }

    // 3. Calculus
    if (t.includes('calculus') || t.includes('derivative') || t.includes('power rule') || t.includes('rate of change')) {
      return [
        {
          id: 'q_calc_en_1',
          type: 'mcq',
          cognitiveLevel: 'level_3_application',
          conceptName: 'The Power Rule of Differentiation',
          question: 'Given the polynomial function f(x) = 3*x^2 - 4*x + 5, evaluate the instantaneous rate of change f\'(2) at x = 2 using the power rule:',
          options: [
            '8',
            '12',
            '16',
            '4'
          ],
          correctAnswer: '8',
          explanation: 'Applying the power rule d/dx[x^n] = n*x^(n-1): f\'(x) = 3*(2*x) - 4*(1) + 0 = 6*x - 4. Substituting x = 2 gives f\'(2) = 6*(2) - 4 = 12 - 4 = 8.',
          misconceptionExploration: 'Students answering 12 forgot to differentiate and subtract the linear term -4x. Students answering 16 mistakenly added 4.',
          difficulty: 'hard',
          timestampSeconds: 20,
          timestampFormatted: '00:20'
        }
      ];
    }

    // 4. Thermodynamics
    if (t.includes('termodinámica') || t.includes('thermodynamics') || t.includes('entrop')) {
      if (langCode === 'hi') {
        return [
          {
            id: 'q_thermo_hi_1',
            type: 'mcq',
            cognitiveLevel: 'level_3_application',
            conceptName: 'ऊष्मागतिकी का प्रथम एवं द्वितीय नियम (Thermodynamics)',
            question: 'ऊष्मागतिकी के प्रथम नियम (Delta U = Q - W) के अनुसार, यदि एक प्रणाली 50 J का यांत्रिक कार्य (W = 50 J) करती है और वातावरण से कोई ऊष्मा नहीं लेती (Q = 0), तो आंतरिक ऊर्जा (Delta U) में क्या परिवर्तन होगा?',
            options: [
              'आंतरिक ऊर्जा में 50 J की कमी होगी (Delta U = -50 J)',
              'आंतरिक ऊर्जा 50 J बढ़ जाएगी (Delta U = +50 J)',
              'आंतरिक ऊर्जा शून्य हो जाएगी',
              'आंतरिक ऊर्जा अपरिवर्तित रहेगी'
            ],
            correctAnswer: 'आंतरिक ऊर्जा में 50 J की कमी होगी (Delta U = -50 J)',
            explanation: 'प्रथम नियम सूत्र Delta U = Q - W के अनुसार: Delta U = 0 - 50 = -50 J। प्रणाली द्वारा किया गया कार्य उसकी आंतरिक ऊर्जा की लागत पर होता है।',
            difficulty: 'hard',
            timestampSeconds: 25,
            timestampFormatted: '00:25'
          }
        ];
      }

      if (langCode === 'es') {
        return [
          {
            id: 'q_thermo_es_1',
            type: 'mcq',
            cognitiveLevel: 'level_3_application',
            conceptName: 'Primera y Segunda Ley de la Termodinámica',
            question: 'De acuerdo con la Primera Ley de la Termodinámica (Delta U = Q - W), si un sistema cerrado realiza un trabajo de expansión de 50 J (W = 50 J) de manera adiabática (Q = 0), ¿cuál es la variación en su energía interna (Delta U)?',
            options: [
              'Disminuye en 50 J (Delta U = -50 J)',
              'Aumenta en 50 J (Delta U = +50 J)',
              'Permanece inalterada (Delta U = 0)',
              'Se duplica la energía total'
            ],
            correctAnswer: 'Disminuye en 50 J (Delta U = -50 J)',
            explanation: 'Aplicando Delta U = Q - W con Q = 0: Delta U = 0 - 50 J = -50 J. El trabajo es realizado a expensas de la energía interna del sistema.',
            misconceptionExploration: 'Confundir el signo del trabajo realizado por el sistema versus sobre el sistema es el error más recurrente en exámenes de física térmica.',
            difficulty: 'hard',
            timestampSeconds: 25,
            timestampFormatted: '00:25'
          }
        ];
      }
    }

    // 5. Chemical Equilibrium
    if (t.includes('equilibrium') || t.includes('le chatelier') || t.includes('chemistry') || t.includes('रसायन')) {
      return [
        {
          id: 'q_chem_en_1',
          type: 'mcq',
          cognitiveLevel: 'level_4_analysis',
          conceptName: "Le Chatelier's Principle & Catalysis",
          question: "For an exothermic gas-phase synthesis at equilibrium, what is the precise effect of introducing a heterogeneous solid catalyst on the equilibrium constant Kc and equilibrium product yield?",
          options: [
            "Neither Kc nor the equilibrium yield changes; only the rate of reaching equilibrium increases",
            "Kc increases because the activation energy barrier is reduced",
            "The equilibrium yield shifts toward products to minimize activation energy",
            "Kc decreases because the reverse reaction is suppressed"
          ],
          correctAnswer: "Neither Kc nor the equilibrium yield changes; only the rate of reaching equilibrium increases",
          explanation: "A catalyst accelerates both forward and reverse reaction rates equally by providing an alternative pathway with lower activation energy. It does not alter the thermodynamic state function Delta G° or the equilibrium constant Kc.",
          misconceptionExploration: "A major exam trap is assuming catalysts enhance equilibrium yield; catalysts only reduce time-to-equilibrium without altering the equilibrium position.",
          difficulty: 'hard',
          timestampSeconds: 30,
          timestampFormatted: '00:30'
        }
      ];
    }

    return null;
  }
}
