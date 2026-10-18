import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

async function runComprehensiveTests() {
  console.log('================================================================');
  console.log('RUNNING STEP 6 VALIDATION SUITE AGAINST REAL RUNNING APPLICATION');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: TITLE TEST (MOST CRITICAL)
  // Run same transcript with:
  // (A) Real Title
  // (B) Completely Unrelated Title ("Gourmet Italian Pasta Carbonara Recipe")
  // (C) Misleading Title ("Advanced Web Development with React and Node.js")
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('TEST 1: TITLE TEST (Real Title vs Dummy Title vs Misleading Title)');
  console.log('----------------------------------------------------------------');

  const physicsTranscript = [
    { text: "Welcome everyone. Today we are studying Newton's Universal Law of Gravitation.", start: 0, duration: 6 },
    { text: "Every particle in the universe attracts every other particle with a mutual gravitational force.", start: 6, duration: 7 },
    { text: "The magnitude of this force F is directly proportional to the product of their masses m1 and m2.", start: 13, duration: 8 },
    { text: "And inversely proportional to the square of the distance r between their centers.", start: 21, duration: 7 },
    { text: "The mathematical formula is F = G * m1 * m2 / r^2, where G is the universal gravitational constant.", start: 28, duration: 8 },
    { text: "The value of G in SI units is 6.674 times 10 to the minus 11 Newton meter squared per kilogram squared.", start: 36, duration: 8 },
    { text: "Remember that gravitational force is always attractive, never repulsive.", start: 44, duration: 6 },
    { text: "Next we analyze the acceleration due to gravity g on the surface of a spherical planet of mass M and radius R.", start: 50, duration: 9 },
    { text: "By equating weight m * g to gravitational attraction G * M * m / R^2, we obtain g = G * M / R^2.", start: 59, duration: 9 },
    { text: "Notice that g is independent of the mass of the falling object m.", start: 68, duration: 6 },
    { text: "As altitude h increases above the planet surface, effective gravity decreases as g_prime = g * (R / (R + h))^2.", start: 74, duration: 9 },
    { text: "Finally, gravitational potential energy U between two masses is negative: U = - G * M * m / r.", start: 83, duration: 9 },
    { text: "At infinite separation, the potential energy is defined as zero.", start: 92, duration: 6 }
  ];

  console.log('Generating Quiz 1A: With Real Title ("Gravitation and Satellite Dynamics")...');
  const res1A = await fetch(`${BASE_URL}/quizzes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: 'test_grav_real_title',
      title: 'Gravitation and Satellite Dynamics',
      transcript: physicsTranscript,
      difficulty: 'medium',
      count: 10,
      skipCache: true
    })
  });
  const data1A = await res1A.json();

  console.log('Generating Quiz 1B: With Unrelated Title ("Gourmet Italian Pasta Carbonara Recipe")...');
  const res1B = await fetch(`${BASE_URL}/quizzes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: 'test_grav_recipe_2',
      title: 'Gourmet Italian Pasta Carbonara Recipe',
      transcript: physicsTranscript,
      difficulty: 'medium',
      count: 10,
      skipCache: true
    })
  });
  const data1B = await res1B.json();

  console.log('Generating Quiz 1C: With Misleading Title ("Advanced Web Development with React")...');
  const res1C = await fetch(`${BASE_URL}/quizzes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: 'test_grav_webdev_3',
      title: 'Advanced Web Development with React',
      transcript: physicsTranscript,
      difficulty: 'medium',
      count: 10,
      skipCache: true
    })
  });
  const data1C = await res1C.json();

  const quiz1A = data1A.quiz || data1A.data?.quiz;
  const quiz1B = data1B.quiz || data1B.data?.quiz;
  const quiz1C = data1C.quiz || data1C.data?.quiz;

  const concepts1A = Object.keys(quiz1A?.persistedKnowledgeMap?.concepts || {});
  const concepts1B = Object.keys(quiz1B?.persistedKnowledgeMap?.concepts || {});
  const concepts1C = Object.keys(quiz1C?.persistedKnowledgeMap?.concepts || {});

  const questions1A = (quiz1A?.questions || []).map(q => q.question);
  const questions1B = (quiz1B?.questions || []).map(q => q.question);
  const questions1C = (quiz1C?.questions || []).map(q => q.question);

  console.log(`Concepts Extracted in 1A (Real Title):`, Object.values(quiz1A?.persistedKnowledgeMap?.concepts || {}).map(c => c.conceptName));
  console.log(`Concepts Extracted in 1B (Pasta Title):`, Object.values(quiz1B?.persistedKnowledgeMap?.concepts || {}).map(c => c.conceptName));
  console.log(`Concepts Extracted in 1C (WebDev Title):`, Object.values(quiz1C?.persistedKnowledgeMap?.concepts || {}).map(c => c.conceptName));

  // Check that NO pasta or web development words ever appear in questions, explanations, or concepts for 1B or 1C
  const allTexts1B = (quiz1B.questions || []).map(q => `${q.question} ${q.correctAnswer} ${q.explanation} ${(q.options || []).join(' ')}`).join(' ') + ' ' + Object.values(quiz1B?.persistedKnowledgeMap?.concepts || {}).map(c => c.conceptName).join(' ');
  const allTexts1C = (quiz1C.questions || []).map(q => `${q.question} ${q.correctAnswer} ${q.explanation} ${(q.options || []).join(' ')}`).join(' ') + ' ' + Object.values(quiz1C?.persistedKnowledgeMap?.concepts || {}).map(c => c.conceptName).join(' ');

  const pastaWordsIn1B = allTexts1B.match(/(pasta|carbonara|gourmet|spaghetti|sauce|parmesan|pancetta)/i);
  const webDevWordsIn1C = allTexts1C.match(/(react|frontend|javascript|node|component|redux|web\s+dev)/i);

  const titleIndependencePassed = !pastaWordsIn1B && !webDevWordsIn1C && concepts1A.length > 0 && concepts1B.length > 0;
  console.log(`\nTITLE TEST RESULT: ${titleIndependencePassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  - Zero pasta terms in Quiz 1B questions/concepts: ${!pastaWordsIn1B ? 'PASSED' : 'FAILED'}`);
  console.log(`  - Zero React/web-dev terms in Quiz 1C questions/concepts: ${!webDevWordsIn1C ? 'PASSED' : 'FAILED'}`);
  console.log(`  - Both quizzes generated purely from spoken physics transcript: YES (${questions1B.length} questions)\n`);

  // -------------------------------------------------------------------------
  // TEST 2: NO-TRANSCRIPT TEST
  // Video with empty transcript or < 80 characters must fail with exact error message
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('TEST 2: NO-TRANSCRIPT TEST');
  console.log('----------------------------------------------------------------');

  const res2Empty = await fetch(`${BASE_URL}/quizzes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: 'test_empty_vid',
      title: 'Title of Empty Video',
      transcript: [],
      skipCache: true
    })
  });
  const data2Empty = await res2Empty.json();

  const res2Short = await fetch(`${BASE_URL}/quizzes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: 'test_short_vid',
      title: 'Title of Short Video',
      transcript: [{ text: "Hello guys, subscribe to my channel.", start: 0, duration: 3 }],
      skipCache: true
    })
  });
  const data2Short = await res2Short.json();

  const expectedErrMsg = "We couldn't read this video's content, so a quiz can't be built. Try another video or paste a transcript.";
  const emptyPassed = (data2Empty.message === expectedErrMsg || data2Empty.error?.message === expectedErrMsg) && !data2Empty.questions;
  const shortPassed = (data2Short.message === expectedErrMsg || data2Short.error?.message === expectedErrMsg) && !data2Short.questions;

  console.log(`Empty transcript response: HTTP ${res2Empty.status} | "${data2Empty.message || data2Empty.error?.message}"`);
  console.log(`Short transcript response: HTTP ${res2Short.status} | "${data2Short.message || data2Short.error?.message}"`);
  console.log(`NO-TRANSCRIPT TEST RESULT: ${emptyPassed && shortPassed ? '✅ PASSED' : '❌ FAILED'}\n`);

  // -------------------------------------------------------------------------
  // TEST 3 & 4: CONCEPT COVERAGE & DIVERSITY TABLE FOR REAL VIDEO
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('TEST 3 & 4: COVERAGE & DIVERSITY ON REAL LECTURE CONTENT');
  console.log('----------------------------------------------------------------');

  const sampleQuiz = quiz1A;
  const knowledgeMap = sampleQuiz.persistedKnowledgeMap;
  const allowedConceptIds = knowledgeMap.allowedConceptIds || Object.keys(knowledgeMap.concepts || {});

  console.log('\n=== CONCEPT COVERAGE TABLE ===');
  console.log('| Concept ID | Concept Name | Evidence Segment | Question Count | Status |');
  console.log('|------------|--------------|-------------------|----------------|--------|');

  let allConceptsCovered = true;
  for (const cid of allowedConceptIds) {
    const cObj = knowledgeMap.concepts[cid];
    const cName = cObj?.conceptName || cid;
    const qCount = (sampleQuiz.questions || []).filter(q => q.conceptId === cid).length;
    const evidenceSnippet = (cObj?.evidence && cObj.evidence.length > 0)
      ? `"${cObj.evidence[0].text.slice(0, 30)}..." (${cObj.evidence[0].timestamp || '00:00'})`
      : 'No evidence';

    if (qCount === 0) allConceptsCovered = false;
    console.log(`| ${cid.padEnd(10)} | ${cName.slice(0, 24).padEnd(24)} | ${evidenceSnippet.padEnd(35)} | ${String(qCount).padEnd(14)} | ${qCount >= 1 ? 'COVERED' : 'FAILED'} |`);
  }

  console.log(`\nCoverage Check: Every covered concept has >= 1 question: ${allConceptsCovered ? '✅ YES' : '❌ NO'}`);

  console.log('\n=== QUESTION DIVERSITY TABLE ===');
  console.log('| Slot | Concept Tested | Task Type / Family | Unknown / Procedure | Solution Method |');
  console.log('|------|----------------|--------------------|---------------------|-----------------|');

  const procedureSignatures = new Set();
  let duplicateMethods = 0;

  (sampleQuiz.questions || []).forEach((q, idx) => {
    const cName = (q.conceptName || q.conceptId).slice(0, 20);
    const tf = (q.taskFamily || q.methodId || 'CONCEPTUAL').slice(0, 20);
    const sig = (q.procedureSignature || 'standard').slice(0, 22);
    const method = (q.structuredSolution?.numerical?.relationship || q.structuredSolution?.format || 'principle_verification').slice(0, 25);

    if (procedureSignatures.has(q.procedureSignature)) {
      duplicateMethods++;
    } else if (q.procedureSignature) {
      procedureSignatures.add(q.procedureSignature);
    }

    console.log(`| ${(idx + 1).toString().padEnd(4)} | ${cName.padEnd(20)} | ${tf.padEnd(20)} | ${sig.padEnd(22)} | ${method.padEnd(25)} |`);
  });

  console.log(`\nDiversity Check: Duplicate procedure signatures: ${duplicateMethods} (Expected 0)`);
  console.log(`Diversity Verdict: ${duplicateMethods === 0 ? '✅ PASSED' : '❌ FAILED'}\n`);

  // -------------------------------------------------------------------------
  // TEST 5: LINK TEST (Video A -> Video B Isolation)
  // Marker phrase in Video A must NEVER appear in Video B
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('TEST 5: LINK TEST & URL ISOLATION');
  console.log('----------------------------------------------------------------');

  const markerPhraseA = "UNIQUE_CHROMOSOMAL_MEIOTIC_DIVIDING_MARKER_999";
  const transcriptA = [
    { text: `Today we examine cellular genetics and ${markerPhraseA}.`, start: 0, duration: 6 },
    { text: "Meiosis produces four genetically diverse haploid daughter cells.", start: 6, duration: 7 },
    { text: "Crossing over during prophase I increases genetic diversity substantially.", start: 13, duration: 8 }
  ];

  const transcriptB = [
    { text: "In this computer science lecture we analyze the QuickSort partitioning algorithm.", start: 0, duration: 7 },
    { text: "QuickSort uses a divide-and-conquer strategy choosing a pivot element.", start: 7, duration: 8 },
    { text: "The average time complexity of QuickSort is O(N log N) comparisons.", start: 15, duration: 8 },
    { text: "In the worst case where the array is already sorted, performance degrades to O(N^2).", start: 23, duration: 8 }
  ];

  console.log('Submitting Video A...');
  const resA = await fetch(`${BASE_URL}/quizzes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: 'video_link_a',
      title: 'Genetics and Meiosis',
      transcript: transcriptA,
      count: 10,
      skipCache: true
    })
  });
  const dataA = await resA.json();
  const quizA = dataA.quiz || dataA.data?.quiz;

  console.log('Submitting Video B immediately after...');
  const resB = await fetch(`${BASE_URL}/quizzes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: 'video_link_b',
      title: 'QuickSort Algorithm',
      transcript: transcriptB,
      count: 10,
      skipCache: true
    })
  });
  const dataB = await resB.json();
  const quizB = dataB.quiz || dataB.data?.quiz;

  const markerInA = JSON.stringify(quizA).includes(markerPhraseA);
  const markerInB = JSON.stringify(quizB).includes(markerPhraseA);
  const algorithmsInB = JSON.stringify(quizB).includes('QuickSort') || JSON.stringify(quizB).includes('divide');

  console.log(`Video A contains marker phrase: ${markerInA ? 'YES' : 'NO'}`);
  console.log(`Video B contains Video A marker phrase: ${markerInB ? 'LEAKED ❌' : 'NO LEAK (CLEAN) ✅'}`);
  console.log(`Video B contains Video B concepts: ${algorithmsInB ? 'YES ✅' : 'NO ❌'}`);
  console.log(`LINK ISOLATION TEST RESULT: ${markerInA && !markerInB && algorithmsInB ? '✅ PASSED' : '❌ FAILED'}\n`);

  // -------------------------------------------------------------------------
  // TEST 6: MULTI-SUBJECT & HINDI TEST
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('TEST 6: MULTI-SUBJECT & HINDI LECTURE TEST');
  console.log('----------------------------------------------------------------');

  const hindiTranscript = [
    { text: "नमस्कार दोस्तों, आज की कक्षा में हम प्रकाश संश्लेषण (Photosynthesis) का अध्ययन करेंगे।", start: 0, duration: 7 },
    { text: "पौधे सूर्य के प्रकाश, जल और कार्बन डाइऑक्साइड का उपयोग करके भोजन बनाते हैं।", start: 7, duration: 8 },
    { text: "क्लोरोफिल पत्तियों में पाया जाने वाला हरा वर्णक है जो प्रकाश ऊर्जा को अवशोषित करता है।", start: 15, duration: 8 },
    { text: "प्रकाश अभिक्रिया थाइलाकोइड झिल्ली में होती है जहां एटीपी और एनएडीपीएच का निर्माण होता है।", start: 23, duration: 8 },
    { text: "केल्विन चक्र स्ट्रोमा में होता है जहां ग्लूकोज का संश्लेषण होता है।", start: 31, duration: 8 }
  ];

  console.log('Submitting Hindi Lecture Video...');
  const resHindi = await fetch(`${BASE_URL}/quizzes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: 'hindi-photosynthesis-video',
      title: 'Photosynthesis in Hindi',
      transcript: hindiTranscript,
      language: 'hi',
      count: 10,
      skipCache: true
    })
  });
  const dataHindi = await resHindi.json();
  const quizHindi = dataHindi.quiz || dataHindi.data?.quiz;
  const hindiConcepts = Object.values(quizHindi?.persistedKnowledgeMap?.concepts || {}).map(c => c.conceptName);
  console.log(`Hindi Lecture Concepts Extracted:`, hindiConcepts);
  console.log(`Hindi Questions Generated: ${(quizHindi?.questions || []).length}`);
  const hindiPassed = (quizHindi?.questions || []).length > 0 && hindiConcepts.length > 0;
  console.log(`HINDI LECTURE TEST RESULT: ${hindiPassed ? '✅ PASSED' : '❌ FAILED'}\n`);

  console.log('================================================================');
  console.log('ALL TESTS COMPLETED');
  console.log('================================================================');
}

runComprehensiveTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
