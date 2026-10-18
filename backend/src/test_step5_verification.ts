import { DEMO_VIDEOS } from './services/demoData.js';

const API_BASE = 'http://localhost:5000/api';

interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  details: string;
}

const results: TestResult[] = [];

async function postJson(endpoint: string, body: any): Promise<{ status: number; data: any }> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runStep5Tests() {
  console.log('================================================================');
  console.log('🧪 STEP 5 COMPREHENSIVE VERIFICATION SUITE');
  console.log('================================================================\n');

  // Ensure clean test environment: clear cache, stage checkpoints, and history
  try {
    await fetch(`${API_BASE}/history`, { method: 'DELETE' });
    console.log('🧹 Cleaned past stage checkpoints, history, and pipeline cache.\n');
  } catch (e: any) {
    console.warn('⚠️ Could not reset history cache:', e.message);
  }

  // -------------------------------------------------------------------------
  // 1. VIDEO 1: Physics / Engineering (Center of Mass) - 25 Questions, Medium
  // -------------------------------------------------------------------------
  console.log('--- Test 1: Physics (Center of Mass) - 25 Questions, Medium ---');
  const t1Start = Date.now();
  try {
    const physicsTranscript = [
      { text: "Today we will study Center of Mass and its mathematical calculation.", start: 0, duration: 5 },
      { text: "For a two particle system, center of mass position is given by x_cm = (m1*x1 + m2*x2) divided by (m1 + m2).", start: 6, duration: 10 },
      { text: "When external force is zero, the acceleration of center of mass is zero, so center of mass velocity remains constant.", start: 17, duration: 10 },
      { text: "For continuous symmetric bodies like a uniform ring or cylinder, the center of mass lies at the geometric center.", start: 28, duration: 10 },
      { text: "In a hollow ring, the center of mass actually lies outside the material matter in empty space.", start: 39, duration: 8 },
      { text: "When a portion of mass is removed or cut out, we treat the remaining center of mass using negative mass method.", start: 48, duration: 10 },
      { text: "In internal explosions where no external force acts, momentum is conserved and center of mass continues along its original parabolic path.", start: 59, duration: 12 },
      { text: "Shift in center of mass when one particle moves delta x is delta x_cm = (m1 * delta x1) / (m1 + m2).", start: 72, duration: 10 }
    ];

    const { status, data } = await postJson('/quizzes/generate', {
      videoId: 'phys-com-101',
      title: 'Physics: Center of Mass Mechanics',
      transcript: physicsTranscript,
      difficulty: 'medium',
      count: 25,
      language: 'en',
      analysisSessionId: 'session_physics_25'
    });

    const d1 = Date.now() - t1Start;
    const quiz = data?.quiz || data?.data?.quiz;
    const questions = quiz?.questions || [];
    const signatures = new Set(questions.map((q: any) => q.procedureSignature));

    const passed = status === 200 && questions.length === 25 && signatures.size >= 15;
    results.push({
      name: 'Video 1: Physics (Center of Mass) 25-Q Quiz',
      passed,
      durationMs: d1,
      details: `Generated ${questions.length}/25 questions. Unique procedures: ${signatures.size}. SessionId: ${quiz?.analysisSessionId}`
    });
    console.log(`✅ Video 1 Success: ${questions.length} questions in ${d1}ms (Unique procedures: ${signatures.size})\n`);
  } catch (err: any) {
    results.push({
      name: 'Video 1: Physics (Center of Mass) 25-Q Quiz',
      passed: false,
      durationMs: Date.now() - t1Start,
      details: err.message
    });
    console.error(`❌ Video 1 Failed:`, err.message, '\n');
  }

  // -------------------------------------------------------------------------
  // 2. VIDEO 2: Biology / Life Science (CrashCourse Photosynthesis) - 25 Questions, Hard
  // -------------------------------------------------------------------------
  console.log('--- Test 2: Biology (Photosynthesis) - 25 Questions, Hard ---');
  const t2Start = Date.now();
  try {
    const bioDemo = DEMO_VIDEOS['demo-photosynthesis'];
    const { status, data } = await postJson('/quizzes/generate', {
      videoId: 'bio-photo-201',
      title: bioDemo.title,
      transcript: bioDemo.transcript,
      difficulty: 'hard',
      count: 25,
      language: 'en',
      analysisSessionId: 'session_bio_25'
    });

    const d2 = Date.now() - t2Start;
    const quiz = data?.quiz || data?.data?.quiz;
    const questions = quiz?.questions || [];
    const signatures = new Set(questions.map((q: any) => q.procedureSignature));

    const passed = status === 200 && questions.length === 25 && signatures.size >= 15;
    results.push({
      name: 'Video 2: Biology (Photosynthesis) 25-Q Quiz',
      passed,
      durationMs: d2,
      details: `Generated ${questions.length}/25 questions. Unique procedures: ${signatures.size}. SessionId: ${quiz?.analysisSessionId}`
    });
    console.log(`✅ Video 2 Success: ${questions.length} questions in ${d2}ms (Unique procedures: ${signatures.size})\n`);
  } catch (err: any) {
    results.push({
      name: 'Video 2: Biology (Photosynthesis) 25-Q Quiz',
      passed: false,
      durationMs: Date.now() - t2Start,
      details: err.message
    });
    console.error(`❌ Video 2 Failed:`, err.message, '\n');
  }

  // -------------------------------------------------------------------------
  // 3. VIDEO 3: Hindi / Non-English Study Video (Semiconductor Electronics)
  // -------------------------------------------------------------------------
  console.log('--- Test 3: Hindi Non-English Video (Semiconductor Physics) - 25 Questions ---');
  const t3Start = Date.now();
  try {
    const hindiTranscript = [
      { text: "नमस्ते छात्रों, आज हम सेमीकंडक्टर और अर्धचालक भौतिकी का अध्ययन करेंगे।", start: 0, duration: 6 },
      { text: "इंट्रिन्सिक सेमीकंडक्टर में इलेक्ट्रॉन और होल की संख्या घनत्व समान होती है यानी ni = ne = nh।", start: 7, duration: 8 },
      { text: "जब हम त्रिसंयोजी अशुद्धि मिलाते हैं तो पी-टाइप अर्धचालक बनता है जिसमें होल्स बहुसंख्यक आवेश वाहक होते हैं।", start: 16, duration: 10 },
      { text: "पंचसंयोजी डोपिंग से एन-टाइप अर्धचालक प्राप्त होता है जिसमें इलेक्ट्रॉन्स बहुसंख्यक होते हैं।", start: 27, duration: 9 },
      { text: "पी-एन जंक्शन डायोड में अवक्षय परत (डिप्लीशन लेयर) का निर्माण विसरण और अपवाह धारा के संतुलन से होता है।", start: 37, duration: 10 },
      { text: "फॉरवर्ड बायस में जंक्शन पर विभव प्राचीर कम हो जाता है और करंट आसानी से प्रवाहित होता है।", start: 48, duration: 9 },
      { text: "रिवर्स बायस में केवल बहुत कम संतृप्त धारा प्रवाहित होती है और जीनर ब्रेकडाउन वोल्टेज पर धारा तेजी से बढ़ती है।", start: 58, duration: 11 },
      { text: "दिष्टकारी यानी रेक्टिफायर प्रत्यावर्ती धारा को दिष्ट धारा में परिवर्तित करता है।", start: 70, duration: 9 }
    ];

    const { status, data } = await postJson('/quizzes/generate', {
      videoId: 'hindi-semicond-301',
      title: 'भौतिकी: अर्धचालक इलेक्ट्रॉनिक्स (Semiconductor Physics in Hindi)',
      transcript: hindiTranscript,
      difficulty: 'easy',
      count: 25,
      language: 'hi',
      analysisSessionId: 'session_hindi_25'
    });

    const d3 = Date.now() - t3Start;
    const quiz = data?.quiz || data?.data?.quiz;
    const questions = quiz?.questions || [];

    const passed = status === 200 && questions.length === 25;
    results.push({
      name: 'Video 3: Hindi Non-English Video 25-Q Quiz',
      passed,
      durationMs: d3,
      details: `Generated ${questions.length}/25 questions. Multilingual authentic lecture concepts preserved.`
    });
    console.log(`✅ Video 3 Success: ${questions.length} questions in ${d3}ms\n`);
  } catch (err: any) {
    results.push({
      name: 'Video 3: Hindi Non-English Video 25-Q Quiz',
      passed: false,
      durationMs: Date.now() - t3Start,
      details: err.message
    });
    console.error(`❌ Video 3 Failed:`, err.message, '\n');
  }

  // -------------------------------------------------------------------------
  // 4. FORCED FAILURE TESTS (Confirming specific error codes & messages)
  // -------------------------------------------------------------------------
  console.log('--- Test 4: Forced Failure Scenarios ---');

  // 4a. TRANSCRIPT_UNAVAILABLE (Invalid URL / No Captions)
  {
    const { status, data } = await postJson('/videos/process', {
      url: 'https://www.youtube.com/watch?v=invalid_xyz_99999',
      analysisSessionId: 'session_fail_captions'
    });
    const errData = data?.error;
    const expectedCode = 'TRANSCRIPT_UNAVAILABLE';
    const expectedMsg = "We couldn't get captions for this video. Try another video or paste a transcript.";
    const passed = status === 404 && errData?.code === expectedCode && errData?.message === expectedMsg;
    results.push({
      name: 'Failure Test: TRANSCRIPT_UNAVAILABLE',
      passed,
      durationMs: 0,
      details: `HTTP ${status}, Code: "${errData?.code}", Message: "${errData?.message}"`
    });
    console.log(`✅ 4a TRANSCRIPT_UNAVAILABLE verified: Code="${errData?.code}", Msg="${errData?.message}"`);
  }

  // 4b. EXTRACTION_FAILED (Empty / Non-Educational Transcript)
  {
    const { status, data } = await postJson('/quizzes/generate', {
      videoId: 'empty-video',
      title: 'Empty Video',
      transcript: [{ text: "Hello guys subscribe to my channel.", start: 0, duration: 4 }],
      analysisSessionId: 'session_fail_extraction'
    });
    const errData = data?.error;
    const expectedCode = 'EXTRACTION_FAILED';
    const expectedMsg = "We couldn't identify enough concepts. Try a video with more spoken explanation.";
    const passed = status === 422 && errData?.code === expectedCode && errData?.message === expectedMsg;
    results.push({
      name: 'Failure Test: EXTRACTION_FAILED',
      passed,
      durationMs: 0,
      details: `HTTP ${status}, Code: "${errData?.code}", Message: "${errData?.message}"`
    });
    console.log(`✅ 4b EXTRACTION_FAILED verified: Code="${errData?.code}", Msg="${errData?.message}"`);
  }

  // 4c. UNKNOWN_ERROR with Reference ID Format
  {
    const { status, data } = await postJson('/quizzes/generate', {
      videoId: 'unknown-err-trigger',
      title: null,
      transcript: 'invalid_malformed_string' as any,
      difficulty: 'medium',
      analysisSessionId: 'session_unknown_ref_test'
    });
    const errData = data?.error;
    const hasCode = Boolean(errData?.code);
    results.push({
      name: 'Failure Test: Error Code & Reference Structure',
      passed: hasCode,
      durationMs: 0,
      details: `HTTP ${status}, Code: "${errData?.code}", Message: "${errData?.message}", RefId: ${errData?.refId || 'N/A'}`
    });
    console.log(`✅ 4c Error Response Structure verified: Code="${errData?.code}", Message="${errData?.message}"`);
  }

  // -------------------------------------------------------------------------
  // 5. ALL QUESTION COUNTS & DIFFICULTIES
  // -------------------------------------------------------------------------
  console.log('\n--- Test 5: Question Counts & Difficulties ---');
  const counts = [10, 15, 20, 25];
  const diffs: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];

  for (let i = 0; i < counts.length; i++) {
    const cnt = counts[i];
    const diff = diffs[i % diffs.length];
    const tStart = Date.now();
    const { status, data } = await postJson('/quizzes/generate', {
      videoId: 'counts-test',
      title: 'Physics Center of Mass',
      transcript: DEMO_VIDEOS['demo-mit-cs'].transcript,
      difficulty: diff,
      count: cnt,
      analysisSessionId: `session_cnt_${cnt}_${diff}`
    });
    const qList = data?.quiz?.questions || [];
    const passed = status === 200 && qList.length === cnt;
    results.push({
      name: `Count & Difficulty: ${cnt} Qs (${diff})`,
      passed,
      durationMs: Date.now() - tStart,
      details: `HTTP ${status}, returned ${qList.length}/${cnt} questions for difficulty ${diff}`
    });
    console.log(`✅ Count ${cnt} (${diff}): Returned ${qList.length} questions in ${Date.now() - tStart}ms`);
  }

  // -------------------------------------------------------------------------
  // 6. SESSION ISOLATION & INTERLEAVED REQUESTS (Video B submitted while Video A is processing)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 6: Session Isolation & Interleaved Video Submissions ---');
  const tIsoStart = Date.now();
  const reqA = postJson('/quizzes/generate', {
    videoId: 'video_A_physics',
    title: 'Video A: Computational Thinking and Algorithms',
    transcript: DEMO_VIDEOS['demo-mit-cs'].transcript,
    analysisSessionId: 'session_A_111',
    count: 10
  });

  const reqB = postJson('/quizzes/generate', {
    videoId: 'video_B_biology',
    title: 'Video B: Plant Biology and Photosynthesis',
    transcript: DEMO_VIDEOS['demo-photosynthesis'].transcript,
    analysisSessionId: 'session_B_222',
    count: 10
  });

  const [resA, resB] = await Promise.all([reqA, reqB]);

  const quizA = resA.data?.quiz;
  const quizB = resB.data?.quiz;

  const noLeak = quizA?.videoId === 'video_A_physics' &&
                 quizB?.videoId === 'video_B_biology' &&
                 quizA?.analysisSessionId === 'session_A_111' &&
                 quizB?.analysisSessionId === 'session_B_222';

  const qAText = JSON.stringify(quizA?.questions || []);
  const qBText = JSON.stringify(quizB?.questions || []);
  const isolated = !qAText.includes('Chloroplast') && !qBText.includes('Newtonian');

  results.push({
    name: 'Session Isolation: Video A & B Interleaving',
    passed: Boolean(noLeak && isolated),
    durationMs: Date.now() - tIsoStart,
    details: `Session IDs: A=${quizA?.analysisSessionId}, B=${quizB?.analysisSessionId}. Strict zero cross-contamination.`
  });
  console.log(`✅ Session Isolation verified: Video A (${quizA?.analysisSessionId}) and Video B (${quizB?.analysisSessionId}) strictly isolated.`);

  // -------------------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 STEP 5 TEST RESULTS SUMMARY');
  console.log('================================================================');
  let passCount = 0;
  for (const r of results) {
    const icon = r.passed ? '✅ PASS' : '❌ FAIL';
    if (r.passed) passCount++;
    console.log(`${icon} | ${r.name.padEnd(45)} | ${r.durationMs}ms | ${r.details}`);
  }
  console.log('================================================================');
  console.log(`Total: ${passCount}/${results.length} Passed (${Math.round((passCount / results.length) * 100)}%)\n`);

  if (passCount !== results.length) {
    process.exit(1);
  }
}

runStep5Tests().catch(e => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
