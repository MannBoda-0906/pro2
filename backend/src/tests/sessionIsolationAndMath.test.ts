import { VideoIdentity } from '../utils/videoIdentity.js';
import { MathNormalizer } from '../utils/mathNormalizer.js';
import { QuizPersistenceService } from '../services/quizPipeline/quizPersistenceService.js';
import { S11_QualityGate } from '../services/quizPipeline/S11_qualityGate.js';
import { QuizPipelineOrchestrator } from '../services/quizPipeline/quizPipelineOrchestrator.js';
import { S13_EvaluationService } from '../services/quizPipeline/S13_evaluationService.js';
import {
  PersistedKnowledgeMap,
  QuizBlueprint,
  QuizQuestion,
  TranscriptSegment
} from '../types/index.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    console.error(`  ✗ [FAIL] ${testName}${details ? ` - ${details}` : ''}`);
    throw new Error(`Test assertion failed: ${testName} - ${details || ''}`);
  }
}

async function runTestSuite() {
  console.log('\n=============================================================');
  console.log('STUDYTUBE AI: ARCHITECTURE-LEVEL ISOLATION & MATH TEST SUITE');
  console.log('=============================================================\n');

  // =========================================================================
  // TEST 1: URL Normalization Across Supported Formats
  // =========================================================================
  console.log('--- TEST GROUP 1: Canonical URL & Video ID Parsing ---');
  const urlCases = [
    { input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=45s&feature=shared', expected: 'dQw4w9WgXcQ' },
    { input: 'https://youtu.be/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { input: 'https://youtu.be/dQw4w9WgXcQ?t=10', expected: 'dQw4w9WgXcQ' },
    { input: 'https://www.youtube.com/embed/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { input: 'https://www.youtube.com/shorts/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { input: 'https://www.youtube.com/live/dQw4w9WgXcQ?feature=share', expected: 'dQw4w9WgXcQ' },
    { input: 'https://m.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { input: 'dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { input: 'demo-center-of-mass', expected: 'demo-center-of-mass' }
  ];

  for (const tc of urlCases) {
    const parsed = VideoIdentity.parseCanonicalVideoId(tc.input);
    assert(parsed === tc.expected, `Parse URL: "${tc.input}" -> "${tc.expected}"`);
  }

  // =========================================================================
  // TEST 2: Strict Cache Key Isolation
  // =========================================================================
  console.log('\n--- TEST GROUP 2: Cache Key Isolation ---');
  const transcriptA: TranscriptSegment[] = [
    { start: 0, duration: 10, text: 'Welcome to modern physics and center of mass calculation.' },
    { start: 10, duration: 10, text: 'Mass weighted average determines the system center.' }
  ];
  const transcriptB: TranscriptSegment[] = [
    { start: 0, duration: 10, text: 'Welcome to computer science binary search algorithms.' },
    { start: 10, duration: 10, text: 'Divide and conquer log n time complexity.' }
  ];

  const hashA = VideoIdentity.computeTranscriptHash(transcriptA);
  const hashB = VideoIdentity.computeTranscriptHash(transcriptB);
  assert(hashA !== hashB, 'Different transcripts produce distinct hashes');

  const key1 = QuizPersistenceService.buildCacheKey({
    videoId: 'videoA',
    transcriptHash: hashA,
    language: 'en',
    difficulty: 'medium',
    count: 25
  });

  const key2 = QuizPersistenceService.buildCacheKey({
    videoId: 'videoB',
    transcriptHash: hashA, // same transcript, different videoId
    language: 'en',
    difficulty: 'medium',
    count: 25
  });

  const key3 = QuizPersistenceService.buildCacheKey({
    videoId: 'videoA',
    transcriptHash: hashB, // same videoId, different transcript
    language: 'en',
    difficulty: 'medium',
    count: 25
  });

  const key4 = QuizPersistenceService.buildCacheKey({
    videoId: 'videoA',
    transcriptHash: hashA,
    language: 'es', // different language
    difficulty: 'medium',
    count: 25
  });

  assert(key1 !== key2, 'Cache key isolates distinct videoIds even with identical content');
  assert(key1 !== key3, 'Cache key isolates different transcripts for the same video');
  assert(key1 !== key4, 'Cache key isolates language variations');

  // Verify getCachedQuiz returns null for non-matching hash
  const missResult = QuizPersistenceService.getCachedQuiz({
    videoId: 'non_existent_video_12345',
    transcriptHash: 'some_random_hash',
    language: 'en',
    count: 25,
    difficulty: 'medium'
  });
  assert(missResult === null, 'Cache miss safely returns null without fallback');

  // =========================================================================
  // TEST 3: Quality Gate (S11) Cross-Video & Malformed Math Rejection
  // =========================================================================
  console.log('\n--- TEST GROUP 3: Quality Gate Source & Topic Isolation ---');

  const mockKnowledgeMap: PersistedKnowledgeMap = {
    subject: 'Computer Science',
    academicLevel: 'Undergraduate',
    chapter: 'Binary Search',
    topic: 'Binary Search',
    conceptList: [],
    coverageClassifications: {},
    relationshipsGraph: [],
    allowedConceptIds: ['C1', 'C2'],
    untaughtChapterConcepts: [],
    concepts: {
      C1: {
        conceptId: 'C1',
        conceptName: 'Divide and Conquer',
        meaning: 'Splitting search space in half each iteration',
        definition: 'An algorithmic paradigm based on multi-branched recursion.',
        purpose: 'Reduce search complexity from linear to logarithmic.',
        principle: 'Partition search interval by half at each step.',
        videoCoverage: 'FULLY_COVERED',
        applications: ['Search in sorted array'],
        examples: ['Finding key in 1024 elements'],
        commonMistakes: ['Off-by-one in mid calculation'],
        misconceptions: ['Requires unsorted array'],
        solvingMethods: ['Iterative binary search', 'Recursive binary search'],
        examRelevance: 'High',
        formula: 'T(n) = O(log n)',
        testableTasks: { calculate: ['Iterations required'], apply: ['Binary search on sorted list'] }
      },
      C2: {
        conceptId: 'C2',
        conceptName: 'Logarithmic Complexity',
        meaning: 'Log base 2 steps',
        definition: 'Time complexity that increases logarithmically with input size.',
        purpose: 'Characterize efficient search algorithms.',
        principle: 'Halving problem size successively.',
        videoCoverage: 'FULLY_COVERED',
        applications: ['Tree traversal', 'Divide and conquer analysis'],
        examples: ['log2(1024) = 10'],
        commonMistakes: ['Confusing log with linear time'],
        misconceptions: ['Logarithmic grows as fast as linear'],
        solvingMethods: ['Recurrence relations'],
        examRelevance: 'High',
        formula: 'k = log_2(n)',
        testableTasks: { calculate: ['Compute log2'], apply: ['Recurrence tree depth'] }
      }
    }
  };

  const mockBlueprint: QuizBlueprint = {
    slots: [],
    formatCounts: {
      numerical: 7,
      true_false: 1,
      fill_blank: 1,
      match_columns: 0,
      theoretical: 1
    },
    numericalMethodCounts: {},
    validated: true
  };

  // Base valid questions for targetCount = 10
  const createBaseQuestions = (sessId: string, vid: string): QuizQuestion[] => {
    const formats: Array<'numerical' | 'true_false' | 'fill_blank' | 'theoretical'> = [
      'numerical', 'numerical', 'numerical', 'numerical', 'numerical', 'numerical', 'numerical',
      'true_false', 'fill_blank', 'theoretical'
    ];

    return formats.map((fmt, i) => ({
      id: `q_${i}`,
      analysisSessionId: sessId,
      videoId: vid,
      slotIndex: i + 1,
      conceptId: i % 2 === 0 ? 'C1' : 'C2',
      conceptName: i % 2 === 0 ? 'Divide and Conquer' : 'Logarithmic Complexity',
      questionFormat: fmt,
      questionCategory: fmt === 'numerical' ? 'numerical' : 'conceptual',
      type: fmt,
      question: `Question ${i + 1} regarding binary search with math $O(\\log n)$?`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      solution: 'Valid thorough explanation of the binary search algorithm.',
      explanation: 'Detailed concept explanation of binary search mechanism.',
      difficulty: 'medium',
      cognitiveLevel: 'level_3_application',
      methodId: `METHOD_${i % 4}`,
      procedureSignature: `proc_sig_${i}`,
      structuredSolution: {
        format: fmt,
        fullText: 'Valid thorough explanation of binary search.',
        numerical: {
          given: 'n = 1024',
          required: 'iterations',
          relationship: 'k = \\log_2(n)',
          substitution: 'k = \\log_2(1024)',
          calculation: 'k = 10',
          finalAnswer: '10',
          unit: 'steps'
        }
      }
    }));
  };

  const validSession = 'session_alpha_123';
  const validVid = 'video_cs_456';
  const baseQuestions = createBaseQuestions(validSession, validVid);

  // 3a. Verify valid set passes quality gate
  const validGateResult = S11_QualityGate.evaluateQuiz({
    questions: baseQuestions,
    blueprint: mockBlueprint,
    knowledgeMap: mockKnowledgeMap,
    targetCount: 10,
    analysisSessionId: validSession,
    videoId: validVid
  });
  assert(validGateResult.passed, 'Clean quiz passes all Quality Gate checks');

  // 3b. Mismatched analysisSessionId in a question
  const taintedSessionQuestions = createBaseQuestions(validSession, validVid);
  taintedSessionQuestions[3].analysisSessionId = 'stale_old_session_999';
  const staleSessionGateResult = S11_QualityGate.evaluateQuiz({
    questions: taintedSessionQuestions,
    blueprint: mockBlueprint,
    knowledgeMap: mockKnowledgeMap,
    targetCount: 10,
    analysisSessionId: validSession,
    videoId: validVid
  });
  assert(!staleSessionGateResult.passed, 'Quality Gate rejects question with stale analysisSessionId');
  assert(
    staleSessionGateResult.failures.some(f => f.includes('analysisSessionId')),
    'Failure reason specifies mismatched analysisSessionId'
  );

  // 3c. Mismatched videoId in a question
  const taintedVideoQuestions = createBaseQuestions(validSession, validVid);
  taintedVideoQuestions[5].videoId = 'old_video_prior';
  const staleVideoGateResult = S11_QualityGate.evaluateQuiz({
    questions: taintedVideoQuestions,
    blueprint: mockBlueprint,
    knowledgeMap: mockKnowledgeMap,
    targetCount: 10,
    analysisSessionId: validSession,
    videoId: validVid
  });
  assert(!staleVideoGateResult.passed, 'Quality Gate rejects question with foreign videoId');

  // 3d. Cross-topic intrusion (Center of Mass question into CS video)
  const contaminatedTopicQuestions = createBaseQuestions(validSession, validVid);
  contaminatedTopicQuestions[2].question = 'Calculate the center of mass coordinate x_cm = (m1*x1 + m2*x2)/(m1+m2)';
  contaminatedTopicQuestions[2].solution = 'Using center of mass formula for two masses.';
  const crossTopicGateResult = S11_QualityGate.evaluateQuiz({
    questions: contaminatedTopicQuestions,
    blueprint: mockBlueprint,
    knowledgeMap: mockKnowledgeMap,
    targetCount: 10,
    analysisSessionId: validSession,
    videoId: validVid
  });
  assert(!crossTopicGateResult.passed, 'Quality Gate rejects foreign Physics/Center of Mass question in CS video');
  assert(
    crossTopicGateResult.failures.some(f => f.includes('Cross-topic contamination')),
    'Quality Gate flags cross-topic contamination reason'
  );

  // 3e. Malformed math (unbalanced braces or stray delimiters)
  const brokenMathQuestions = createBaseQuestions(validSession, validVid);
  brokenMathQuestions[1].question = 'Solve for x: $\\frac{a}{b} + \\text{missing_brace{';
  const brokenMathGateResult = S11_QualityGate.evaluateQuiz({
    questions: brokenMathQuestions,
    blueprint: mockBlueprint,
    knowledgeMap: mockKnowledgeMap,
    targetCount: 10,
    analysisSessionId: validSession,
    videoId: validVid
  });
  assert(!brokenMathGateResult.passed, 'Quality Gate rejects malformed math with unbalanced braces');

  // =========================================================================
  // TEST 4: Math Normalizer & KaTeX Preparation
  // =========================================================================
  console.log('\n--- TEST GROUP 4: Math Normalizer & Delimiter Safety ---');

  // 4a. Unescaping double backslashes from JSON
  const doubleEscaped = 'Calculate \\\\frac{m_1 x_1 + m_2 x_2}{m_1 + m_2}';
  const unescaped = MathNormalizer.normalizeQuestionContent(doubleEscaped);
  assert(unescaped.includes('\\frac'), 'Normalizes double-escaped backslashes (\\\\frac -> \\frac)');

  // 4b. Preserving code blocks
  const codeSnippet = 'Here is the search method:\n```python\ndef binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n```\nFind time complexity:';
  const normalizedCode = MathNormalizer.normalizeQuestionContent(codeSnippet);
  assert(normalizedCode.includes('```python') && normalizedCode.includes('def binary_search'), 'Leaves real programming code blocks untouched');

  // 4c. Conversion of broken or unsupported math to Unicode fallback
  const rawFraction = 'Expression: \\frac{1}{2}(g_n + \\frac{x}{g_n})';
  const plainText = MathNormalizer.toReadablePlainText(rawFraction);
  assert(!plainText.includes('\\frac'), 'Converts raw TeX to readable plain text / Unicode fallback');

  // =========================================================================
  // TEST 5: Race Condition / Stale Response Discard
  // =========================================================================
  console.log('\n--- TEST GROUP 5: Stale Response Discard (Race Condition Test) ---');

  // Simulation of user submitting Video A, then B before A finishes, then C
  let currentActiveSession = {
    analysisSessionId: 'session_init',
    videoId: 'video_init'
  };
  let activeQuizState: any = null;
  let discardedCounter = 0;

  function simulateFrontendSubmit(vid: string) {
    const newSession = VideoIdentity.createSessionId();
    currentActiveSession = {
      analysisSessionId: newSession,
      videoId: vid
    };
    // Immediate reset
    activeQuizState = null;
    return newSession;
  }

  function simulateFrontendReceiveResponse(responseSessionId: string, responseVid: string, data: any) {
    if (
      responseSessionId !== currentActiveSession.analysisSessionId ||
      responseVid !== currentActiveSession.videoId
    ) {
      discardedCounter++;
      // Discarded!
      return false;
    }
    activeQuizState = data;
    return true;
  }

  // Submit Video A
  const sessionA = simulateFrontendSubmit('videoA');
  assert(activeQuizState === null, 'Active quiz state immediately cleared on submitting Video A');

  // Before A returns, submit Video B
  const sessionB = simulateFrontendSubmit('videoB');
  assert(activeQuizState === null, 'Active quiz state immediately cleared on submitting Video B');

  // Before B returns, submit Video C
  const sessionC = simulateFrontendSubmit('videoC');
  assert(activeQuizState === null, 'Active quiz state immediately cleared on submitting Video C');

  // Video A finishes now (delayed)
  const aAccepted = simulateFrontendReceiveResponse(sessionA, 'videoA', { title: 'Quiz A' });
  assert(!aAccepted, 'Delayed response from Video A is discarded');
  assert(activeQuizState === null, 'Old Video A response did NOT populate the UI');

  // Video B finishes now (delayed)
  const bAccepted = simulateFrontendReceiveResponse(sessionB, 'videoB', { title: 'Quiz B' });
  assert(!bAccepted, 'Delayed response from Video B is discarded');
  assert(activeQuizState === null, 'Old Video B response did NOT populate the UI');

  // Video C finishes
  const cAccepted = simulateFrontendReceiveResponse(sessionC, 'videoC', { title: 'Quiz C' });
  assert(cAccepted, 'Response for current Video C is accepted');
  assert(activeQuizState?.title === 'Quiz C', 'Only Video C data appears in the UI');
  assert(discardedCounter === 2, 'Exactly 2 stale responses discarded');

  // =========================================================================
  // TEST 6: Real 3-Video Sequence Across 3 Distinct Subjects
  // =========================================================================
  console.log('\n--- TEST GROUP 6: 3-Video End-to-End Sequence Across Subjects ---');
  console.log('Sequence: Video 1 (Physics) -> Video 2 (Computer Science) -> Video 3 (Mathematics)');

  const testVideos = [
    {
      subject: 'Physics',
      videoId: 'vid_phys_101',
      title: 'Rotational Dynamics and Moment of Inertia',
      transcript: [
        { start: 0, duration: 15, text: 'In rotational motion, moment of inertia measures rotational resistance.' },
        { start: 15, duration: 15, text: 'For a point mass at radius r, inertia I equals m times r squared.' },
        { start: 30, duration: 15, text: 'Rotational kinetic energy is one half I omega squared.' },
        { start: 45, duration: 15, text: 'Torque tau equals moment of inertia times angular acceleration alpha.' },
        { start: 60, duration: 15, text: 'Angular momentum L equals I times omega and is conserved.' }
      ]
    },
    {
      subject: 'Computer Science',
      videoId: 'vid_cs_202',
      title: 'Binary Search Trees and Algorithmic Complexity',
      transcript: [
        { start: 0, duration: 15, text: 'A binary search tree maintains sorted order with left children less than parent.' },
        { start: 15, duration: 15, text: 'Search operations traverse from root comparing keys at each node.' },
        { start: 30, duration: 15, text: 'Average time complexity for search, insertion, and deletion is O of log n.' },
        { start: 45, duration: 15, text: 'In balanced trees like AVL or Red-Black trees, worst-case depth is bounded by log n.' },
        { start: 60, duration: 15, text: 'In-order traversal of a binary search tree visits keys in ascending sorted sequence.' }
      ]
    },
    {
      subject: 'Mathematics',
      videoId: 'vid_math_303',
      title: 'Integral Calculus and Definite Integration by Substitution',
      transcript: [
        { start: 0, duration: 15, text: 'Integration by substitution is the reverse of the differential chain rule.' },
        { start: 15, duration: 15, text: 'Let u equal g of x, so du equals g prime of x dx.' },
        { start: 30, duration: 15, text: 'When computing a definite integral, limits of integration transform from x to u.' },
        { start: 45, duration: 15, text: 'The fundamental theorem of calculus relates the antiderivative to net area under the curve.' },
        { start: 60, duration: 15, text: 'Definite integral of f prime from a to b equals f of b minus f of a.' }
      ]
    }
  ];

  const generatedQuizzes: any[] = [];

  for (let i = 0; i < testVideos.length; i++) {
    const v = testVideos[i];
    const session = VideoIdentity.createSessionId();
    console.log(`\n  Executing Pipeline for Video ${i + 1}/${testVideos.length}: [${v.subject}] "${v.title}"`);
    console.log(`  -> videoId: ${v.videoId} | sessionId: ${session}`);

    const quiz = await QuizPipelineOrchestrator.executePipeline({
      videoId: v.videoId,
      title: v.title,
      transcript: v.transcript,
      difficulty: 'medium',
      count: 10,
      language: 'en',
      skipCache: true,
      analysisSessionId: session
    });

    generatedQuizzes.push({ video: v, session, quiz });

    // Assertions for this video
    assert(quiz.videoId === v.videoId, `Quiz videoId matches current video (${v.videoId})`);
    assert(quiz.analysisSessionId === session, `Quiz analysisSessionId matches current session (${session})`);
    assert(quiz.questions.length === 10, `Quiz has exactly 10 validated questions`);

    const conceptsCovered = quiz.topicCoverageReport?.coveredConcepts || [];
    assert(conceptsCovered.length > 0, `Concepts extracted and grounded (${conceptsCovered.length} concepts)`);
    console.log(`  -> Concept count: ${conceptsCovered.length} [${conceptsCovered.map(c => c.name).join(', ')}]`);

    // Verify every question carries source metadata
    const allHaveMetadata = quiz.questions.every(
      q => q.videoId === v.videoId && q.analysisSessionId === session && Boolean(q.conceptId)
    );
    assert(allHaveMetadata, 'Every question carries source metadata { analysisSessionId, videoId, conceptId }');

    // Verify no malformed math in any question
    const noMalformedMath = quiz.questions.every(
      q => !MathNormalizer.detectMalformedLatex(q.question).malformed
    );
    assert(noMalformedMath, 'Math rendered cleanly without malformed TeX commands');

    // Simulate quiz submission and evaluation
    const simulatedAnswers: Record<string, string> = {};
    quiz.questions.forEach((q, idx) => {
      // simulate alternate correct/incorrect
      simulatedAnswers[q.id] = idx % 2 === 0 ? q.correctAnswer : 'Option Incorrect';
    });

    const evalResult = S13_EvaluationService.evaluateSubmission({
      quiz,
      userAnswers: simulatedAnswers
    });

    assert(typeof evalResult.correct === 'number', 'Evaluation produced numeric score (correct count)');
    assert(evalResult.questionResults.length === 10, 'Evaluation review contains all 10 questions');

    const firstReview = evalResult.questionResults[0];
    assert(firstReview.isCorrect === true, 'Review item 0 correctly evaluated as TRUE');
    assert(firstReview.userAnswer === firstReview.correctAnswer, 'Review shows user answer and correct answer');
    assert(Boolean(firstReview.solution), 'Review shows full solution');
    assert(Boolean(firstReview.conceptTested), 'Review shows concept tested');

    // Ensure evaluation only references concepts from THIS video
    const conceptNamesInReview = new Set(evalResult.questionResults.map(r => r.conceptTested));
    const allowedNamesInMap = new Set(conceptsCovered.map(c => c.name));
    for (const cName of conceptNamesInReview) {
      assert(
        allowedNamesInMap.has(cName),
        `Concept-wise evaluation exclusively tests current lecture concept "${cName}"`
      );
    }
  }

  // Cross-Video Isolation Verification across the 3 consecutive quizzes
  console.log('\n--- VERIFYING ZERO CROSS-VIDEO CONTAMINATION ACROSS RUNS ---');

  const physConcepts = generatedQuizzes[0].quiz.topicCoverageReport.coveredConcepts.map((c: any) => c.name.toLowerCase());
  const csConcepts = generatedQuizzes[1].quiz.topicCoverageReport.coveredConcepts.map((c: any) => c.name.toLowerCase());
  const mathConcepts = generatedQuizzes[2].quiz.topicCoverageReport.coveredConcepts.map((c: any) => c.name.toLowerCase());

  const csQuestionsText = generatedQuizzes[1].quiz.questions.map((q: any) => q.question.toLowerCase()).join(' ');
  const mathQuestionsText = generatedQuizzes[2].quiz.questions.map((q: any) => q.question.toLowerCase()).join(' ');

  // 1. Ensure NO physics concept or question leaked into CS
  for (const physConcept of physConcepts) {
    assert(
      !csConcepts.includes(physConcept),
      `Physics concept "${physConcept}" did NOT leak into Computer Science concepts`
    );
  }
  assert(!csQuestionsText.includes('rotational') && !csQuestionsText.includes('inertia') && !csQuestionsText.includes('moment of inertia'),
    'Computer Science quiz contains ZERO Physics questions or rotational formulas');

  // 2. Ensure NO CS or Physics concept or question leaked into Math
  for (const csConcept of csConcepts) {
    assert(
      !mathConcepts.includes(csConcept),
      `Computer Science concept "${csConcept}" did NOT leak into Mathematics concepts`
    );
  }
  assert(!mathQuestionsText.includes('binary search') && !mathQuestionsText.includes('tree') && !mathQuestionsText.includes('rotation'),
    'Mathematics quiz contains ZERO Computer Science or Physics questions');

  console.log('\n=============================================================');
  console.log(`ALL TESTS PASSED! (${passedTests}/${totalTests} assertions)`);
  console.log('=============================================================\n');
}

runTestSuite().catch(err => {
  console.error('\nTest Suite Failed with Exception:', err);
  process.exit(1);
});
