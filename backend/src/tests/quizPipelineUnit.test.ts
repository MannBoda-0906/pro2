import assert from 'assert';
import { S3_CoverageClassifier } from '../services/quizPipeline/S3_coverageClassifier.js';
import { S8_BlueprintValidator } from '../services/quizPipeline/S8_blueprintValidator.js';
import { S10_QuestionValidator } from '../services/quizPipeline/S10_questionValidator.js';
import { S13_EvaluationService } from '../services/quizPipeline/S13_evaluationService.js';
import {
  ConceptHierarchyItem,
  PersistedKnowledgeMap,
  QuizBlueprint,
  QuizCoveragePlan,
  QuizQuestion,
  StructuredEvidence
} from '../types/index.js';

console.log('======================================================================');
console.log('STUDYTUBE AI — UNIT TEST SUITE: CONCEPT-FIRST VALIDATED QUIZ ENGINE');
console.log('======================================================================\n');

async function runAllUnitTests() {
// -----------------------------------------------------------------------------
// TEST 1: Coverage-Status Rules (S3)
// -----------------------------------------------------------------------------
console.log('[UNIT TEST 1] Coverage-Status Rules (FULLY, MOSTLY, PARTIALLY, MENTIONED, NOT_COVERED)');
{
  const concepts: ConceptHierarchyItem[] = [
    { id: 'C1', name: 'Center of Mass Definition', subconcepts: ['Mass-weighted position'], chapter: 'Mechanics', orderIndex: 1 },
    { id: 'C2', name: 'Two-Particle System', subconcepts: ['Formula x_cm = (m1x1+m2x2)/(m1+m2)'], chapter: 'Mechanics', orderIndex: 2 },
    { id: 'C3', name: 'Rolling Motion', subconcepts: ['Rolling friction'], chapter: 'Mechanics', orderIndex: 3 }
  ];

  const transcript = [
    { text: 'In this lecture we define center of mass as the mass-weighted average position.', start: 0, duration: 10 },
    { text: 'The center of mass definition allows us to treat a complex body as a single point mass.', start: 10, duration: 15 },
    { text: 'For a two-particle system, the position x_cm is calculated with masses m1 and m2.', start: 25, duration: 20 },
    { text: 'And rolling is cool.', start: 45, duration: 5 } // Short mention (< 60 chars)
  ];

  const evidence: StructuredEvidence = {
    subject: 'Physics',
    academicLevel: 'High School',
    chapter: 'Center of Mass',
    topic: 'System of Particles',
    definitions: [{ term: 'Center of Mass', definition: 'Weighted position', timestamp: '00:00' }],
    laws: [],
    formulas: [{ name: 'Two Particle System', formula: 'x_cm = (m1*x1 + m2*x2)/(m1 + m2)', variables: ['m1', 'm2'] }],
    variables: [],
    conditions: [],
    examples: [],
    solvingMethods: [],
    applications: [],
    commonMistakes: []
  };

  const classifications = S3_CoverageClassifier.classifyCoverage({ concepts, transcript, evidence });

  assert.strictEqual(classifications['C1'].isAllowedForQuiz, true, 'C1 with multiple segments & def must be allowed');
  assert.ok(classifications['C1'].status === 'FULLY_COVERED' || classifications['C1'].status === 'MOSTLY_COVERED', 'C1 status must be FULLY or MOSTLY');

  assert.strictEqual(classifications['C2'].isAllowedForQuiz, true, 'C2 with segment & formula must be allowed');

  assert.strictEqual(classifications['C3'].status, 'MENTIONED_ONLY', 'C3 short mention must be MENTIONED_ONLY');
  assert.strictEqual(classifications['C3'].isAllowedForQuiz, false, 'MENTIONED_ONLY must be strictly excluded from quiz');

  console.log('  => PASS: Coverage rules correctly categorize and gate concepts.\n');
}

// -----------------------------------------------------------------------------
// TEST 2: Distribution & Format Validator (S8)
// -----------------------------------------------------------------------------
console.log('[UNIT TEST 2] Blueprint Distribution Validator (25 Qs, All 5 Formats, 30% Max Rule)');
{
  const mockKnowledgeMap: PersistedKnowledgeMap = {
    subject: 'Physics',
    academicLevel: 'Grade 11',
    chapter: 'Center of Mass',
    topic: 'System of Particles',
    concepts: {
      C1: { conceptName: 'Center of Mass' } as any,
      C2: { conceptName: 'Two-Particle System' } as any,
      C3: { conceptName: 'Multi-Particle Discrete System' } as any,
      C4: { conceptName: 'External Force Invariance' } as any
    },
    conceptList: [],
    coverageClassifications: {},
    allowedConceptIds: ['C1', 'C2', 'C3', 'C4'],
    untaughtChapterConcepts: ['Moment of Inertia'],
    relationshipsGraph: []
  };

  const coveragePlan: QuizCoveragePlan = {
    allocations: [
      { conceptId: 'C1', conceptName: 'Center of Mass', questionCount: 7, percentage: 28, importance: 'essential', coverageStatus: 'FULLY_COVERED' },
      { conceptId: 'C2', conceptName: 'Two-Particle System', questionCount: 6, percentage: 24, importance: 'high', coverageStatus: 'MOSTLY_COVERED' },
      { conceptId: 'C3', conceptName: 'Multi-Particle Discrete System', questionCount: 6, percentage: 24, importance: 'high', coverageStatus: 'MOSTLY_COVERED' },
      { conceptId: 'C4', conceptName: 'External Force Invariance', questionCount: 6, percentage: 24, importance: 'high', coverageStatus: 'MOSTLY_COVERED' }
    ],
    totalQuestions: 25
  };

  // Case A: Missing match_columns format -> Must fail
  const invalidBlueprint: QuizBlueprint = {
    slots: Array(25).fill(null).map((_, i) => ({
      slotIndex: i + 1,
      conceptId: 'C1',
      subconcept: 'Sub',
      questionFormat: i < 18 ? 'numerical' : i < 22 ? 'true_false' : i < 24 ? 'fill_blank' : 'theoretical',
      methodId: `METHOD_${i}`,
      procedureSignature: `proc_${i}`,
      cognitiveLevel: 'level_3_application',
      difficulty: 'medium',
      expectedAnswerFormat: 'MCQ',
      videoCoverage: 'FULLY_COVERED'
    })),
    formatCounts: { numerical: 18, true_false: 4, fill_blank: 2, match_columns: 0, theoretical: 1 },
    numericalMethodCounts: {},
    validated: false
  };

  const resA = S8_BlueprintValidator.validateBlueprint(invalidBlueprint, coveragePlan, mockKnowledgeMap);
  assert.strictEqual(resA.valid, false, 'Blueprint missing match_columns must fail');
  assert.ok(resA.errors.some(e => e.includes('match_columns')), 'Must cite missing match_columns');

  // Case B: Valid blueprint with all 5 formats and exact 25 slots
  const validBlueprint: QuizBlueprint = {
    slots: Array(25).fill(null).map((_, i) => ({
      slotIndex: i + 1,
      conceptId: ['C1', 'C2', 'C3', 'C4'][i % 4],
      subconcept: 'Sub',
      questionFormat: i < 18 ? 'numerical' : i < 21 ? 'true_false' : i < 23 ? 'fill_blank' : i === 23 ? 'match_columns' : 'theoretical',
      taskFamily: `TF_${i % 12}`,
      unknownType: `type_${i}`,
      methodId: `METHOD_${i % 12}`,
      procedureSignature: `proc_unique_sig_${i}`,
      cognitiveLevel: 'level_3_application',
      difficulty: 'medium',
      expectedAnswerFormat: 'standard',
      videoCoverage: 'FULLY_COVERED'
    })),
    formatCounts: { numerical: 18, true_false: 3, fill_blank: 2, match_columns: 1, theoretical: 1 },
    numericalMethodCounts: {},
    validated: false
  };

  const resB = S8_BlueprintValidator.validateBlueprint(validBlueprint, coveragePlan, mockKnowledgeMap);
  if (!resB.valid) {
    console.error('resB errors:', resB.errors);
  }
  assert.strictEqual(resB.valid, true, 'Valid blueprint meeting all 8 criteria must pass');

  console.log('  => PASS: Blueprint distribution and format checks enforced successfully.\n');
}

// -----------------------------------------------------------------------------
// TEST 3: Duplicate & Procedure Signature Detector (including changed-number copies)
// -----------------------------------------------------------------------------
console.log('[UNIT TEST 3] Procedural Duplicate & Changed-Number Copy Rejection (S10)');
{
  const mockKnowledgeMap: PersistedKnowledgeMap = {
    subject: 'Physics',
    academicLevel: 'Grade 11',
    chapter: 'Center of Mass',
    topic: 'System of Particles',
    concepts: {
      C1: {
        conceptId: 'C1',
        conceptName: 'Two-Particle Center of Mass',
        definition: 'Position coordinate x_cm = (m1*x1 + m2*x2)/(m1+m2)',
        formula: 'x_cm = (m1*x1 + m2*x2)/(m1+m2)',
        variables: ['m1', 'm2', 'x1', 'x2'],
        principle: 'Weighted average of coordinates',
        solvingMethods: ['weighted_average_coord_summation'],
        evidence: [{ text: 'Center of mass position is calculated using particle coordinates', start: 0, duration: 10, timestamp: '00:00' }]
      } as any
    },
    conceptList: [],
    coverageClassifications: {},
    allowedConceptIds: ['C1'],
    untaughtChapterConcepts: [],
    relationshipsGraph: []
  };

  const slot = {
    slotIndex: 2,
    conceptId: 'C1',
    subconcept: 'Sub',
    questionFormat: 'numerical' as const,
    taskFamily: 'DIRECT_CALC' as const,
    unknownType: 'coordinate_center_of_mass',
    methodId: 'DIRECT_CALC',
    procedureSignature: 'weighted_average_coord_summation',
    cognitiveLevel: 'level_3_application' as const,
    difficulty: 'medium' as const,
    expectedAnswerFormat: 'MCQ',
    videoCoverage: 'FULLY_COVERED' as const
  };

  const evidenceRef = {
    conceptId: 'C1',
    sourceSegments: [{ text: 'Center of mass position is calculated using particle coordinates', start: 0, duration: 10, timestamp: '00:00' }],
    sourceVideoId: 'v_unit_test'
  };

  const existingQ: QuizQuestion = {
    id: 'q1',
    type: 'numerical',
    questionFormat: 'numerical',
    conceptId: 'C1',
    taskFamily: 'DIRECT_CALC',
    unknownType: 'coordinate_center_of_mass',
    evidenceRef,
    methodId: 'DIRECT_CALC',
    procedureSignature: 'weighted_average_coord_summation',
    difficulty: 'medium',
    question: 'Two particles of masses 2 kg and 4 kg are at x = 0 m and x = 6 m. Find x_cm.',
    options: ['4 m', '3 m', '2 m', '5 m'],
    correctAnswer: '4 m',
    structuredSolution: {
      format: 'numerical',
      numerical: { given: 'm1=2, m2=4', required: 'x_cm', relationship: 'x_cm = (m1*x1 + m2*x2)/(m1+m2)', substitution: '(2*0 + 4*6)/(2+4)', calculation: '(2*0 + 4*6)/(2+4) = 24/6 = 4', finalAnswer: '4 m', unit: 'm' },
      fullText: '4 m'
    },
    explanation: '4 m'
  };

  // Changed-number copy of same procedure: masses 3 kg and 6 kg at x = 0 m and x = 9 m
  const changedNumberCopyQ: QuizQuestion = {
    id: 'q2',
    type: 'numerical',
    questionFormat: 'numerical',
    conceptId: 'C1',
    taskFamily: 'DIRECT_CALC',
    unknownType: 'coordinate_center_of_mass',
    evidenceRef,
    methodId: 'DIRECT_CALC',
    procedureSignature: 'weighted_average_coord_summation', // SAME procedure!
    difficulty: 'medium',
    question: 'Two particles of masses 3 kg and 6 kg are at x = 0 m and x = 9 m. Find x_cm.',
    options: ['6 m', '4 m', '5 m', '7 m'],
    correctAnswer: '6 m',
    structuredSolution: {
      format: 'numerical',
      numerical: { given: 'm1=3, m2=6', required: 'x_cm', relationship: 'x_cm = (m1*x1 + m2*x2)/(m1+m2)', substitution: '(3*0 + 6*9)/(3+6)', calculation: '(3*0 + 6*9)/(3+6) = 54/9 = 6', finalAnswer: '6 m', unit: 'm' },
      fullText: '6 m'
    },
    explanation: '6 m'
  };

  const valRes = await S10_QuestionValidator.validateQuestion({
    question: changedNumberCopyQ,
    slot,
    knowledgeMap: mockKnowledgeMap,
    earlierQuestions: [existingQ]
  });

  assert.strictEqual(valRes.valid, false, 'Changed-number copy with identical procedure signature must be rejected');
  assert.ok(
    valRes.validatorType === 'PROCEDURAL_DUPLICATE_CHECK' || valRes.validatorType === 'TRIPLE_DUPLICATE_CHECK',
    `Expected procedural duplicate or triple duplicate rejection, got ${valRes.validatorType}`
  );
  console.log('  => PASS: Changed-number copy with duplicate procedure correctly REJECTED.\n');
}

// -----------------------------------------------------------------------------
// TEST 4: Numerical Validator (Mathjs Independent Verification)
// -----------------------------------------------------------------------------
console.log('[UNIT TEST 4] Numerical Validator with Mathjs Independent Recomputation');
{
  const mockKnowledgeMap: PersistedKnowledgeMap = {
    subject: 'Physics',
    academicLevel: 'Grade 11',
    chapter: 'Center of Mass',
    topic: 'System of Particles',
    concepts: {
      C1: {
        conceptId: 'C1',
        conceptName: 'Center of Mass',
        definition: 'Position coordinate x_cm = (m1*x1 + m2*x2)/(m1+m2)',
        formula: 'x_cm = (m1*x1 + m2*x2)/(m1+m2)',
        variables: ['m1', 'm2', 'x1', 'x2'],
        principle: 'Weighted average of particle coordinates',
        solvingMethods: ['DIRECT_CALC'],
        evidence: [{ text: 'Calculated using center of mass formula', start: 0, duration: 10, timestamp: '00:00' }]
      } as any
    },
    conceptList: [],
    coverageClassifications: {},
    allowedConceptIds: ['C1'],
    untaughtChapterConcepts: [],
    relationshipsGraph: []
  };

  const slot = {
    slotIndex: 1,
    conceptId: 'C1',
    subconcept: 'Sub',
    questionFormat: 'numerical' as const,
    methodId: 'DIRECT_CALC',
    procedureSignature: 'unique_calc_sig_01',
    cognitiveLevel: 'level_3_application' as const,
    difficulty: 'medium' as const,
    expectedAnswerFormat: 'MCQ',
    videoCoverage: 'FULLY_COVERED' as const
  };

  const evidenceRef = {
    conceptId: 'C1',
    sourceSegments: [{ text: 'Calculated using center of mass formula', start: 0, duration: 10, timestamp: '00:00' }],
    sourceVideoId: 'v_unit_test'
  };

  // Case A: Correct calculation (2*0 + 6*4)/(2 + 6) = 24/8 = 3.0 m
  const validNumQ: QuizQuestion = {
    id: 'q_good',
    type: 'numerical',
    questionFormat: 'numerical',
    conceptId: 'C1',
    evidenceRef,
    methodId: 'DIRECT_CALC',
    procedureSignature: 'unique_calc_sig_01',
    difficulty: 'medium',
    question: 'Two particles m1 = 2 kg and m2 = 6 kg at x1 = 0 m and x2 = 4 m. Find x_cm.',
    options: ['3 m', '2 m', '4 m', '5 m'],
    correctAnswer: '3 m',
    structuredSolution: {
      format: 'numerical',
      numerical: {
        given: 'm1=2, x1=0, m2=6, x2=4',
        required: 'x_cm',
        relationship: 'x_cm = (m1*x1 + m2*x2)/(m1+m2)',
        substitution: '(2*0 + 6*4)/(2+6)',
        calculation: '= (2*0 + 6*4)/(2+6) = 3',
        finalAnswer: '3 m',
        unit: 'm'
      },
      fullText: '3 m'
    },
    explanation: '3 m'
  };

  const resValid = await S10_QuestionValidator.validateQuestion({
    question: validNumQ,
    slot,
    knowledgeMap: mockKnowledgeMap,
    earlierQuestions: []
  });
  assert.strictEqual(resValid.valid, true, 'Valid calculation must pass');

  // Case B: Flawed arithmetic calculation (claims answer is 5 m when math evaluates to 3 m)
  const flawedNumQ: QuizQuestion = {
    ...validNumQ,
    id: 'q_bad',
    correctAnswer: '5 m', // Discrepancy!
    options: ['5 m', '2 m', '4 m', '6 m']
  };

  const resFlawed = await S10_QuestionValidator.validateQuestion({
    question: flawedNumQ,
    slot,
    knowledgeMap: mockKnowledgeMap,
    earlierQuestions: []
  });
  assert.strictEqual(resFlawed.valid, false, 'Arithmetic mismatch must be rejected by mathjs validator');
  assert.strictEqual(resFlawed.validatorType, 'INDEPENDENT_MATH_VERIFICATION');

  console.log('  => PASS: Mathjs independent recomputation accurately validates and rejects flawed math.\n');
}

// -----------------------------------------------------------------------------
// TEST 5: Match Columns Validator
// -----------------------------------------------------------------------------
console.log('[UNIT TEST 5] Match Columns Validator (>= 4 Pairs, Distractors, Unambiguous Key)');
{
  const mockKnowledgeMap: PersistedKnowledgeMap = {
    subject: 'Biology',
    academicLevel: 'High School',
    chapter: 'Photosynthesis',
    topic: 'Chloroplast Mechanisms',
    concepts: {
      C1: {
        conceptId: 'C1',
        conceptName: 'Chloroplast Structures',
        definition: 'Organelles responsible for photosynthesis reactions',
        principle: 'Chloroplast structures partition light and dark reactions',
        solvingMethods: ['match_chloroplast_pairs'],
        evidence: [{ text: 'Chloroplast thylakoids and stroma partition reactions', start: 0, duration: 10, timestamp: '00:00' }]
      } as any
    },
    conceptList: [],
    coverageClassifications: {},
    allowedConceptIds: ['C1'],
    untaughtChapterConcepts: [],
    relationshipsGraph: []
  };

  const slot = {
    slotIndex: 24,
    conceptId: 'C1',
    subconcept: 'Match',
    questionFormat: 'match_columns' as const,
    methodId: 'METHOD_SELECTION',
    procedureSignature: 'match_chloroplast_pairs',
    cognitiveLevel: 'level_3_application' as const,
    difficulty: 'medium' as const,
    expectedAnswerFormat: 'Match',
    videoCoverage: 'FULLY_COVERED' as const
  };

  const evidenceRef = {
    conceptId: 'C1',
    sourceSegments: [{ text: 'Chloroplast thylakoids and stroma partition reactions', start: 0, duration: 10, timestamp: '00:00' }],
    sourceVideoId: 'v_unit_test'
  };

  // Case A: Valid 4-pair question
  const validMatchQ: QuizQuestion = {
    id: 'q_match_good',
    type: 'match_columns',
    questionFormat: 'match_columns',
    conceptId: 'C1',
    evidenceRef,
    methodId: 'METHOD_SELECTION',
    procedureSignature: 'match_chloroplast_pairs',
    difficulty: 'medium',
    question: 'Match chloroplast organelles and structures to their verified functions:',
    options: ['1-B, 2-A, 3-C, 4-D'],
    correctAnswer: '1-B, 2-A, 3-C, 4-D',
    columnA: ['1. Thylakoid', '2. Stroma', '3. PS II', '4. RuBisCO'],
    columnB: ['A. Dark reactions', 'B. Light absorption', 'C. Water photolysis', 'D. Carbon fixation'],
    matchPairs: [
      { left: '1', right: 'B' },
      { left: '2', right: 'A' },
      { left: '3', right: 'C' },
      { left: '4', right: 'D' }
    ],
    structuredSolution: {
      format: 'match_columns',
      match: {
        pairs: [
          { itemA: '1', itemB: 'B' },
          { itemA: '2', itemB: 'A' },
          { itemA: '3', itemB: 'C' },
          { itemA: '4', itemB: 'D' }
        ],
        explanationPerPair: [{ pair: '1-B', explanation: 'Thylakoid absorbs light' }]
      },
      fullText: '1-B, 2-A, 3-C, 4-D'
    },
    explanation: 'Matched'
  };

  const resMatchGood = await S10_QuestionValidator.validateQuestion({
    question: validMatchQ,
    slot,
    knowledgeMap: mockKnowledgeMap,
    earlierQuestions: []
  });
  if (!resMatchGood.valid) {
    console.error('resMatchGood error:', resMatchGood.reason, resMatchGood.validatorType);
  }
  assert.strictEqual(resMatchGood.valid, true, 'Valid 4-pair match must pass');

  // Case B: Insufficient pairs (< 4 pairs)
  const invalidMatchQ: QuizQuestion = {
    ...validMatchQ,
    matchPairs: [{ left: '1', right: 'A' }, { left: '2', right: 'B' }]
  };
  const resMatchBad = await S10_QuestionValidator.validateQuestion({
    question: invalidMatchQ,
    slot,
    knowledgeMap: mockKnowledgeMap,
    earlierQuestions: []
  });
  assert.strictEqual(resMatchBad.valid, false, 'Match question with < 4 pairs must be rejected');

  console.log('  => PASS: Match Columns validator strictly requires >= 4 distinct pairs.\n');
}

// -----------------------------------------------------------------------------
// TEST 6: Concept Performance & Revision Calculation (S13)
// -----------------------------------------------------------------------------
console.log('[UNIT TEST 6] Submission Scoring, Unanswered Handling & Concept Performance (S13)');
{
  const mockQuiz: any = {
    language: 'en',
    questions: [
      { id: 'q1', conceptId: 'C1', conceptName: 'Center of Mass Definition', correctAnswer: '4 m', questionFormat: 'numerical', explanation: 'Sol 1', timestampFormatted: '00:15', timestampSeconds: 15 },
      { id: 'q2', conceptId: 'C1', conceptName: 'Center of Mass Definition', correctAnswer: '3 m', questionFormat: 'numerical', explanation: 'Sol 2', timestampFormatted: '00:20', timestampSeconds: 20 },
      { id: 'q3', conceptId: 'C2', conceptName: 'Conservation of Momentum', correctAnswer: 'True', questionFormat: 'true_false', explanation: 'Sol 3', timestampFormatted: '01:10', timestampSeconds: 70 },
      { id: 'q4', conceptId: 'C2', conceptName: 'Conservation of Momentum', correctAnswer: 'conserved', questionFormat: 'fill_blank', explanation: 'Sol 4', timestampFormatted: '01:30', timestampSeconds: 90 }
    ]
  };

  // Student answered q1 correctly, q2 incorrectly, q3 correctly, left q4 UNANSWERED
  const userAnswers: Record<string, string> = {
    q1: '4 m',
    q2: '10 m', // incorrect
    q3: 'True'
    // q4 unanswered
  };

  const evalResult = S13_EvaluationService.evaluateSubmission({
    quiz: mockQuiz,
    userAnswers
  });

  assert.strictEqual(evalResult.total, 4, 'Total must be 4');
  assert.strictEqual(evalResult.correct, 2, 'Correct answers count must be 2');
  assert.strictEqual(evalResult.incorrect, 2, 'Incorrect (including unanswered) must be 2');
  assert.strictEqual(evalResult.percentage, 50, 'Score percentage must be 50%');

  // Verify unanswered question is recorded as "Not answered" and marked incorrect
  const q4Result = evalResult.questionResults.find(r => r.questionId === 'q4');
  assert.ok(q4Result, 'q4 result must exist');
  assert.strictEqual(q4Result.isCorrect, false, 'Unanswered question must be marked false/incorrect');
  assert.strictEqual(q4Result.userAnswer, 'Not answered', 'Unanswered question must display "Not answered"');

  // Concept C1: 1/2 = 50%
  // Concept C2: 1/2 = 50%
  assert.strictEqual(evalResult.conceptCoverageTable.length, 2, 'Must have 2 concepts in table');

  console.log('  => PASS: Concept performance, unanswered handling, and evaluation logic verified.\n');
}

console.log('======================================================================');
console.log('ALL 6 UNIT TESTS PASSED WITH 100% SUCCESS!');
console.log('======================================================================\n');
}

runAllUnitTests().catch(err => {
  console.error('Unit tests failed:', err);
  process.exit(1);
});
