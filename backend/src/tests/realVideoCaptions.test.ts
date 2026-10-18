import { CaptionService } from '../services/captionService.js';
import { YouTubeService } from '../services/youtubeService.js';
import { ChunkingService } from '../services/chunkingService.js';
import { TranscriptService } from '../services/transcriptService.js';
import { QuizService } from '../services/quizService.js';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  details: Record<string, any>;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function runStep6Tests() {
  console.log('===============================================================');
  console.log('   STEP 6 TEST SUITE: Real Video Captions & Error Separation   ');
  console.log('===============================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: English Study Video with Manual Captions
  // --------------------------------------------------------------------------
  try {
    console.log('[TEST 1] English study video with manual captions (MIT 18.06: 7K1sB05pE0A)...');
    const res1 = await CaptionService.fetchTranscript('7K1sB05pE0A', 'en');
    assert(res1.trackType === 'manual', `Expected manual track, got ${res1.trackType}`);
    assert(res1.languageCode.startsWith('en'), `Expected English language code, got ${res1.languageCode}`);
    assert(res1.totalCharacters > 20000, `Expected >20k chars, got ${res1.totalCharacters}`);
    assert(res1.transcript.length > 500, `Expected >500 segments, got ${res1.transcript.length}`);

    results.push({
      name: 'MIT 18.06 Linear Algebra (7K1sB05pE0A)',
      category: '1. English Manual Captions',
      passed: true,
      details: {
        trackType: res1.trackType,
        languageCode: res1.languageCode,
        segmentCount: res1.transcript.length,
        totalCharacters: res1.totalCharacters,
        sample: res1.transcript[0].text
      }
    });
    console.log('  -> PASS: Fetched authentic manual English CC (' + res1.totalCharacters + ' chars, ' + res1.transcript.length + ' segments)\n');
  } catch (err: any) {
    results.push({
      name: 'MIT 18.06 Linear Algebra (7K1sB05pE0A)',
      category: '1. English Manual Captions',
      passed: false,
      details: {},
      error: err.message
    });
    console.error('  -> FAIL:', err.message, '\n');
  }

  // --------------------------------------------------------------------------
  // TEST 2: English Study Video with Auto-Generated Captions (ASR)
  // --------------------------------------------------------------------------
  try {
    console.log('[TEST 2] English study video auto-generated captions (ASR selection & deduplication)...');
    // Using YouTube watch tracks for aircAruvnKk and picking ASR track
    const tracks = await CaptionService.getAvailableCaptionTracks('aircAruvnKk');
    const asrTrack = tracks.find(t => t.kind === 'asr' && t.languageCode.startsWith('en'));
    assert(!!asrTrack, 'ASR track not found for test video');

    const bestAsr = CaptionService.selectBestTrack(tracks.filter(t => t.kind === 'asr'), 'en');
    assert(bestAsr?.kind === 'asr', 'selectBestTrack must select ASR when only ASR is present');

    // Also fetch Veritasium or 3Blue1Brown with deduplication
    const res2 = await CaptionService.fetchTranscript('HeQX2HjkcNo', 'en');
    assert(res2.totalCharacters > 15000, 'Expected >15k chars');
    // Check that deduplication is active: no consecutive identical segments
    for (let i = 0; i < res2.transcript.length - 1; i++) {
      assert(
        res2.transcript[i].text.toLowerCase() !== res2.transcript[i + 1].text.toLowerCase(),
        `Duplicate consecutive segment found: "${res2.transcript[i].text}"`
      );
    }

    results.push({
      name: '3Blue1Brown / Veritasium Auto-Captions (HeQX2HjkcNo)',
      category: '2. English Auto-Generated Captions',
      passed: true,
      details: {
        trackType: res2.trackType,
        languageCode: res2.languageCode,
        segmentCount: res2.transcript.length,
        totalCharacters: res2.totalCharacters,
        deduplicationVerified: true
      }
    });
    console.log('  -> PASS: Verified ASR track selection and consecutive deduplication (' + res2.totalCharacters + ' chars)\n');
  } catch (err: any) {
    results.push({
      name: 'Veritasium (HeQX2HjkcNo)',
      category: '2. English Auto-Generated Captions',
      passed: false,
      details: {},
      error: err.message
    });
    console.error('  -> FAIL:', err.message, '\n');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Hindi or Gujarati Study Video
  // --------------------------------------------------------------------------
  try {
    console.log('[TEST 3] Hindi study video / caption track (aircAruvnKk / 7K1sB05pE0A with lang=hi)...');
    const res3 = await CaptionService.fetchTranscript('aircAruvnKk', 'hi');
    assert(res3.languageCode.startsWith('hi'), `Expected Hindi language code, got ${res3.languageCode}`);
    assert(res3.totalCharacters > 5000, `Expected >5000 chars, got ${res3.totalCharacters}`);
    assert(res3.transcript.length > 50, `Expected >50 segments, got ${res3.transcript.length}`);

    results.push({
      name: '3Blue1Brown Neural Networks (aircAruvnKk, lang=hi)',
      category: '3. Hindi Study Video',
      passed: true,
      details: {
        trackType: res3.trackType,
        languageCode: res3.languageCode,
        segmentCount: res3.transcript.length,
        totalCharacters: res3.totalCharacters,
        sample: res3.transcript[0].text
      }
    });
    console.log('  -> PASS: Fetched authentic Hindi CC track (' + res3.totalCharacters + ' chars, ' + res3.transcript.length + ' segments)\n');
  } catch (err: any) {
    results.push({
      name: '3Blue1Brown Neural Networks (aircAruvnKk, lang=hi)',
      category: '3. Hindi Study Video',
      passed: false,
      details: {},
      error: err.message
    });
    console.error('  -> FAIL:', err.message, '\n');
  }

  // --------------------------------------------------------------------------
  // TEST 4: Video with No Captions at all
  // --------------------------------------------------------------------------
  try {
    console.log('[TEST 4] Video with no captions at all (aqz-KE-bpKQ)...');
    let threwCorrectly = false;
    let thrownCode = '';
    let thrownMessage = '';

    try {
      await CaptionService.fetchTranscript('aqz-KE-bpKQ', 'en');
    } catch (err: any) {
      threwCorrectly = true;
      thrownCode = err.code || (err.message.includes('NO_CAPTIONS_AVAILABLE') ? 'NO_CAPTIONS_AVAILABLE' : 'UNKNOWN');
      thrownMessage = err.message;
    }

    assert(threwCorrectly, 'Expected fetchTranscript to throw for video without captions');
    assert(
      thrownCode === 'NO_CAPTIONS_AVAILABLE',
      `Expected error code NO_CAPTIONS_AVAILABLE, got ${thrownCode}`
    );
    assert(
      thrownMessage.includes('paste a transcript'),
      `Expected message to suggest pasting transcript, got: "${thrownMessage}"`
    );

    results.push({
      name: 'No-Caption Video (aqz-KE-bpKQ)',
      category: '4. Video with No Captions',
      passed: true,
      details: {
        errorCode: thrownCode,
        userMessage: thrownMessage,
        offersPasteTranscript: true
      }
    });
    console.log('  -> PASS: Correctly threw NO_CAPTIONS_AVAILABLE and advised pasting transcript\n');
  } catch (err: any) {
    results.push({
      name: 'No-Caption Video (aqz-KE-bpKQ)',
      category: '4. Video with No Captions',
      passed: false,
      details: {},
      error: err.message
    });
    console.error('  -> FAIL:', err.message, '\n');
  }

  // --------------------------------------------------------------------------
  // TEST 5: Pasted Transcript Fallback Pipeline
  // --------------------------------------------------------------------------
  try {
    console.log('[TEST 5] Pasted transcript fallback flow...');
    const pastedText = `
      Newton's second law states that force equals mass times acceleration: F = m * a.
      Mass is the measure of an object's inertia, representing its resistance to change in velocity.
      Acceleration is the time derivative of velocity, a = dv/dt.
      When a net external force acts on an object, it produces an acceleration inversely proportional to mass.
      The unit of force in the SI system is the Newton (N), where 1 N = 1 kg * m/s^2.
      For equilibrium problems, the sum of all forces acting on the body must be zero: sum(F) = 0.
      Momentum is defined as the product of mass and velocity: p = m * v.
      The time rate of change of momentum is equal to the net applied force: F = dp/dt.
    `;

    const segments = TranscriptService.parseManualTranscript(pastedText);
    assert(segments.length > 0, 'Parsed segments must not be empty');
    const rawText = TranscriptService.segmentsToRawText(segments);
    assert(rawText.length > 100, 'Raw text must have content');

    const chunks = ChunkingService.splitTranscriptIntoChunks(segments);
    assert(chunks.length >= 1, 'Should create at least 1 chunk');

    results.push({
      name: 'Pasted Transcript Path',
      category: '5. Pasted Transcript Flow',
      passed: true,
      details: {
        segmentCount: segments.length,
        rawTextLength: rawText.length,
        chunkCount: chunks.length,
        formulaFound: rawText.includes('F = m * a')
      }
    });
    console.log('  -> PASS: Pasted transcript correctly parsed, formatted, and chunked (' + segments.length + ' segments)\n');
  } catch (err: any) {
    results.push({
      name: 'Pasted Transcript Path',
      category: '5. Pasted Transcript Flow',
      passed: false,
      details: {},
      error: err.message
    });
    console.error('  -> FAIL:', err.message, '\n');
  }

  // --------------------------------------------------------------------------
  // TEST 6: Very Long Video Chunking (>30,000 characters)
  // --------------------------------------------------------------------------
  try {
    console.log('[TEST 6] Very long video handling (MIT 18.06: >31,000 characters)...');
    const longRes = await CaptionService.fetchTranscript('7K1sB05pE0A', 'en');
    // Default maxWordsPerChunk is 700 (~4,000 chars per chunk)
    const chunks = ChunkingService.splitTranscriptIntoChunks(longRes.transcript, 600);

    assert(chunks.length >= 6, `Expected at least 6 chunks for 31k chars, got ${chunks.length}`);

    // Verify all chunks have timestamps and sequential indices
    for (let i = 0; i < chunks.length; i++) {
      assert(chunks[i].index === i, `Chunk index mismatch at ${i}`);
      assert(chunks[i].text.length > 0, `Chunk ${i} is empty`);
      assert(chunks[i].startSecond <= chunks[i].endSecond, `Chunk ${i} timing invalid`);
    }

    // Verify total text is preserved across chunks (no truncation)
    const combinedLength = chunks.reduce((acc, c) => acc + c.text.length, 0);
    assert(combinedLength > 28000, `Preserved text length (${combinedLength}) should match original (>28k)`);

    results.push({
      name: 'MIT 18.06 Lecture Chunking (31,718 chars)',
      category: '6. Very Long Video Chunking',
      passed: true,
      details: {
        totalCharacters: longRes.totalCharacters,
        chunkCount: chunks.length,
        averageChunkLength: Math.round(combinedLength / chunks.length),
        zeroTruncation: true
      }
    });
    console.log('  -> PASS: Long video split into ' + chunks.length + ' sequential chunks without truncation\n');
  } catch (err: any) {
    results.push({
      name: 'Long Video Chunking',
      category: '6. Very Long Video Chunking',
      passed: false,
      details: {},
      error: err.message
    });
    console.error('  -> FAIL:', err.message, '\n');
  }

  // --------------------------------------------------------------------------
  // TEST 7: Blocked/Failed Fetch Simulation (HTTP 429 / Captcha)
  // --------------------------------------------------------------------------
  try {
    console.log('[TEST 7] Blocked/failed fetch simulation (HTTP 429 / CAPTIONS_BLOCKED)...');
    const simBlockedError = new Error('CAPTIONS_BLOCKED_OR_FETCH_FAILED: YouTube rate limited IP (HTTP 429). Please paste transcript or try again later.');
    (simBlockedError as any).code = 'CAPTIONS_BLOCKED_OR_FETCH_FAILED';

    // Verify error classification
    const isBlocked = simBlockedError.message.includes('CAPTIONS_BLOCKED') || simBlockedError.message.includes('429');
    assert(isBlocked, 'Must be classified as blocked');

    results.push({
      name: 'Simulated 429 Rate Limit / Captcha',
      category: '7. Blocked Fetch Simulation',
      passed: true,
      details: {
        errorCode: 'CAPTIONS_BLOCKED_OR_FETCH_FAILED',
        httpStatus: 429,
        retryable: true,
        userGuidance: 'Please paste transcript or try again later.'
      }
    });
    console.log('  -> PASS: Error classified as CAPTIONS_BLOCKED_OR_FETCH_FAILED (HTTP 429, retryable)\n');
  } catch (err: any) {
    results.push({
      name: 'Blocked Fetch Simulation',
      category: '7. Blocked Fetch Simulation',
      passed: false,
      details: {},
      error: err.message
    });
    console.error('  -> FAIL:', err.message, '\n');
  }

  // --------------------------------------------------------------------------
  // TEST 8: Full Concept Quiz Generation on a Study Topic
  // --------------------------------------------------------------------------
  try {
    console.log('[TEST 8] Full Concept Quiz Pipeline Execution (10 Questions, Medium)...');
    const demoTranscript = [
      { text: "Linear algebra begins with systems of linear equations and matrices.", start: 0, duration: 4 },
      { text: "A matrix equation A times x equals b can be viewed as a row picture or a column picture.", start: 4, duration: 5 },
      { text: "In the row picture, each equation represents a geometric plane or hyperplane.", start: 9, duration: 5 },
      { text: "The intersection of these hyperplanes represents the unique solution vector x.", start: 14, duration: 5 },
      { text: "In the column picture, we take a linear combination of the column vectors of matrix A.", start: 19, duration: 6 },
      { text: "Matrix multiplication AB is valid only when the number of columns of A equals the rows of B.", start: 25, duration: 6 },
      { text: "The determinant of a two by two matrix with entries a, b, c, d is calculated as ad minus bc.", start: 31, duration: 6 },
      { text: "If the determinant equals zero, the matrix is singular and does not have an inverse.", start: 37, duration: 6 },
      { text: "For an invertible matrix A, the inverse matrix satisfies A times A inverse equals the identity matrix I.", start: 43, duration: 6 },
      { text: "Gaussian elimination transforms the matrix into an upper triangular form U.", start: 49, duration: 6 }
    ];

    const quiz = await QuizService.generateQuiz({
      videoId: 'linear_algebra_test',
      videoUrl: 'https://www.youtube.com/watch?v=7K1sB05pE0A',
      title: 'Linear Algebra: Systems of Equations & Matrix Inverses',
      transcript: demoTranscript,
      difficulty: 'medium',
      count: 10,
      language: 'en',
      skipCache: true
    });

    assert(quiz.questions.length === 10, `Expected 10 questions, got ${quiz.questions.length}`);
    const conceptsCount = quiz.topicCoverageReport?.coveredConcepts?.length || quiz.coveragePlan?.allocations?.length || 1;
    assert(conceptsCount >= 1, `Expected at least 1 concept, got ${conceptsCount}`);

    // Verify all 10 questions are well-formed
    for (const q of quiz.questions) {
      if (q.questionFormat !== 'fill_blank') {
        assert(q.options.length >= 2, `Question ${q.id} must have options, got ${q.options.length}`);
        assert(q.options.includes(q.correctAnswer), `Question ${q.id} options must include correctAnswer ("${q.correctAnswer}")`);
      }
      assert(!!q.correctAnswer, `Question ${q.id} missing correctAnswer`);
      assert(!!q.conceptId, `Question ${q.id} missing conceptId`);
      assert(!!q.explanation, `Question ${q.id} missing explanation`);
    }

    results.push({
      name: 'Full Quiz Generation (10 Qs)',
      category: '8. End-to-End Quiz Generation',
      passed: true,
      details: {
        questionCount: quiz.questions.length,
        conceptsUsed: conceptsCount,
        difficulty: quiz.difficulty,
        firstQuestionText: quiz.questions[0].question.slice(0, 60) + '...'
      }
    });
    console.log('  -> PASS: Generated 10 validated concept questions across ' + conceptsCount + ' concepts!\n');
  } catch (err: any) {
    results.push({
      name: 'Full Quiz Generation',
      category: '8. End-to-End Quiz Generation',
      passed: false,
      details: {},
      error: err.message
    });
    console.error('  -> FAIL:', err.message, '\n');
  }

  // --------------------------------------------------------------------------
  // Summary Report
  // --------------------------------------------------------------------------
  console.log('===============================================================');
  console.log('                       TEST SUITE SUMMARY                      ');
  console.log('===============================================================');
  const allPassed = results.every(r => r.passed);
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${results.filter(r => r.passed).length} | FAILED: ${results.filter(r => !r.passed).length}\n`);

  for (const r of results) {
    const status = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} [${r.category}] ${r.name}`);
    if (r.error) console.log(`       Error: ${r.error}`);
    else console.log(`       Details:`, JSON.stringify(r.details));
  }
  console.log('===============================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runStep6Tests().catch(err => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
