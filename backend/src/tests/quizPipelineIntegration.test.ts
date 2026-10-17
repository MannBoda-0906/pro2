import assert from 'assert';
import { QuizPipelineOrchestrator } from '../services/quizPipeline/quizPipelineOrchestrator.js';
import { S13_EvaluationService } from '../services/quizPipeline/S13_evaluationService.js';
import { DEMO_VIDEOS } from '../services/demoData.js';

console.log('================================================================================');
console.log('STUDYTUBE AI — INTEGRATION TEST SUITE: FULL CONCEPT-FIRST PIPELINE FLOW');
console.log('================================================================================\n');

async function runIntegrationTests() {
  // ---------------------------------------------------------------------------
  // VIDEO 1: Numerical Subject (Class 11 Physics: Center of Mass)
  // ---------------------------------------------------------------------------
  console.log('>>> [INTEGRATION TEST 1] NUMERICAL VIDEO (Physics: Center of Mass) in ENGLISH');
  const physTranscript = [
    { text: "Welcome students. In this physics lecture we study the Center of Mass for a system of particles.", start: 0, duration: 10 },
    { text: "Center of mass is defined as the unique mass-weighted average position of the entire system.", start: 10, duration: 15 },
    { text: "For a two-particle system with masses m1 and m2 at positions x1 and x2, the center of mass x_cm = (m1*x1 + m2*x2)/(m1 + m2).", start: 25, duration: 25 },
    { text: "Center of mass divides the distance inversely in the ratio of masses m1*r1 = m2*r2.", start: 50, duration: 20 },
    { text: "For multi-particle discrete systems in three dimensions, r_cm = sum(mi*ri) / sum(mi), giving coordinates x_cm, y_cm, and z_cm.", start: 70, duration: 25 },
    { text: "The center of mass can lie outside the material body, for example at the geometric center of a hollow ring or circular loop.", start: 95, duration: 20 },
    { text: "According to Newton Second Law, when the net external force is zero, internal forces cannot accelerate the center of mass: F_ext = M*a_cm = 0.", start: 115, duration: 25 }
  ];

  const physQuizEn = await QuizPipelineOrchestrator.executePipeline({
    videoId: 'phys-class11-com',
    title: 'Class 11 Physics: Center of Mass & System of Particles',
    transcript: physTranscript,
    difficulty: 'medium',
    language: 'en',
    skipCache: true
  });

  console.log(`\n--- VIDEO 1 (Physics - English) RESULTS ---`);
  console.log(`Title: ${physQuizEn.title}`);
  console.log(`Questions Count: ${physQuizEn.questions.length} (Target: 25)`);
  assert.strictEqual(physQuizEn.questions.length, 25, 'Quiz must have exactly 25 questions');

  // Print Concepts and Coverage Statuses
  console.log(`\nConcepts Found & Coverage Statuses:`);
  const covPlan = physQuizEn.coveragePlan!;
  covPlan.allocations.forEach(a => {
    console.log(`  - [${a.conceptId}] "${a.conceptName}": ${a.coverageStatus} (Questions Assigned: ${a.questionCount}, Importance: ${a.importance})`);
  });

  // Print Blueprint Table
  console.log(`\nBlueprint Table (Slot, Concept, Format, Method ID, Procedure Signature):`);
  console.log('------------------------------------------------------------------------------------------------------');
  console.log('| Slot | Concept ID | Format        | Method ID               | Procedure Signature                   |');
  console.log('------------------------------------------------------------------------------------------------------');
  physQuizEn.quizBlueprint?.slots.forEach(s => {
    const padSlot = String(s.slotIndex).padEnd(4);
    const padCid = s.conceptId.padEnd(10);
    const padFmt = s.questionFormat.padEnd(13);
    const padMid = s.methodId.padEnd(23);
    const padProc = s.procedureSignature.slice(0, 37).padEnd(37);
    console.log(`| ${padSlot} | ${padCid} | ${padFmt} | ${padMid} | ${padProc} |`);
  });
  console.log('------------------------------------------------------------------------------------------------------');

  // Verify Format Distribution
  const fmtDist = physQuizEn.formatDistribution!;
  console.log(`Format Distribution: Numerical=${fmtDist.numerical}, True/False=${fmtDist.true_false}, FillBlank=${fmtDist.fill_blank}, Match=${fmtDist.match_columns}, Theory=${fmtDist.theoretical}`);
  assert.strictEqual(fmtDist.numerical, 18, 'Numerical must be 18');
  assert.strictEqual(fmtDist.true_false, 3, 'True/False must be 3');
  assert.strictEqual(fmtDist.fill_blank, 2, 'Fill in Blank must be 2');
  assert.strictEqual(fmtDist.match_columns, 1, 'Match columns must be 1');
  assert.strictEqual(fmtDist.theoretical, 1, 'Theoretical must be 1');

  // Simulate Submission Evaluation
  console.log(`\nSimulating Student Submission & Computing Concept Performance (S13):`);
  const simAnswers: Record<string, string> = {};
  // Answer first 20 questions correctly, 3 incorrectly, leave 2 unanswered
  physQuizEn.questions.forEach((q, i) => {
    if (i < 20) {
      simAnswers[q.id] = q.correctAnswer;
    } else if (i < 23) {
      simAnswers[q.id] = 'wrong_distractor_answer';
    }
    // i >= 23 left unanswered
  });

  const evalResultPhys = S13_EvaluationService.evaluateSubmission({
    quiz: physQuizEn,
    userAnswers: simAnswers
  });

  console.log(`Submission Score: ${evalResultPhys.correct}/${evalResultPhys.total} (${evalResultPhys.percentage}%)`);
  console.log(`Correct: ${evalResultPhys.correct}, Incorrect: ${evalResultPhys.incorrect}`);
  assert.strictEqual(evalResultPhys.total, 25);
  assert.strictEqual(evalResultPhys.correct, 20);
  assert.strictEqual(evalResultPhys.incorrect, 5); // 3 wrong + 2 unanswered

  console.log('\nConcept Coverage Table:');
  console.log('---------------------------------------------------------------------------------------------');
  console.log('| Concept Name                             | Qs Total | Correct | Incorrect | Percentage    |');
  console.log('---------------------------------------------------------------------------------------------');
  evalResultPhys.conceptCoverageTable.forEach(c => {
    const padName = c.conceptName.slice(0, 40).padEnd(40);
    const padTot = String(c.questionsCount).padEnd(8);
    const padCor = String(c.correctCount).padEnd(7);
    const padInc = String(c.incorrectCount).padEnd(9);
    const padPct = `${c.percentage}%`.padEnd(13);
    console.log(`| ${padName} | ${padTot} | ${padCor} | ${padInc} | ${padPct} |`);
  });
  console.log('---------------------------------------------------------------------------------------------');

  console.log(`Strong Concepts (>= 75%): [${evalResultPhys.strongConcepts.map(s => `${s.conceptName} (${s.percentage}%)`).join(', ')}]`);
  console.log(`Weak Concepts (< 50%): [${evalResultPhys.weakConcepts.map(w => `${w.conceptName} (${w.percentage}%)`).join(', ')}]`);
  console.log(`Recommended Revision:`);
  evalResultPhys.recommendedRevision.forEach(r => {
    console.log(`  - Concept "${r.conceptName}" (Review at ${r.timestampFormatted}): ${r.summary}`);
  });

  // ---------------------------------------------------------------------------
  // VIDEO 1 in HINDI (Testing Multi-Language Translation with Invariance)
  // ---------------------------------------------------------------------------
  console.log('\n>>> [INTEGRATION TEST 2] NUMERICAL VIDEO (Physics) TRANSLATED TO HINDI');
  const physQuizHi = await QuizPipelineOrchestrator.executePipeline({
    videoId: 'phys-class11-com',
    title: 'Class 11 Physics: Center of Mass & System of Particles',
    transcript: physTranscript,
    difficulty: 'medium',
    language: 'hi',
    skipCache: true
  });

  console.log(`Language: ${physQuizHi.language}`);
  assert.strictEqual(physQuizHi.language, 'hi');
  assert.strictEqual(physQuizHi.questions.length, 25);

  const q1Hi = physQuizHi.questions[0];
  console.log(`Sample Translated Q1: "${q1Hi.question.slice(0, 80)}..."`);
  console.log(`Sample Options: [${q1Hi.options.join(', ')}]`);
  console.log(`Sample Correct Answer: "${q1Hi.correctAnswer}"`);

  // Verify that numbers in numerical answers are strictly preserved!
  const qNumOrig = physQuizEn.questions.find(q => q.questionFormat === 'numerical');
  const qNumHi = physQuizHi.questions.find(q => q.questionFormat === 'numerical');
  if (qNumOrig && qNumHi) {
    const origNum = qNumOrig.correctAnswer.match(/-?\d+(?:\.\d+)?/)?.[0];
    const hiNum = qNumHi.correctAnswer.match(/-?\d+(?:\.\d+)?/)?.[0];
    console.log(`Numerical Invariance Verification: English Answer=${origNum}, Hindi Answer=${hiNum}`);
    assert.strictEqual(origNum, hiNum, 'Numerical values must not change during translation');
  }

  // ---------------------------------------------------------------------------
  // VIDEO 2: Theory-Heavy Subject (CrashCourse Biology: Photosynthesis)
  // ---------------------------------------------------------------------------
  console.log('\n>>> [INTEGRATION TEST 3] THEORY-HEAVY VIDEO (Biology: Photosynthesis) in ENGLISH');
  const bioDemo = DEMO_VIDEOS['demo-photosynthesis'];
  const bioQuizEn = await QuizPipelineOrchestrator.executePipeline({
    videoId: 'demo-photosynthesis',
    title: bioDemo.title,
    transcript: bioDemo.transcript,
    difficulty: 'medium',
    language: 'en',
    skipCache: true
  });

  console.log(`Title: ${bioQuizEn.title}`);
  console.log(`Questions Count: ${bioQuizEn.questions.length} (Target: 25)`);
  assert.strictEqual(bioQuizEn.questions.length, 25);
  console.log(`Format Counts: Numerical=${bioQuizEn.formatDistribution?.numerical}, True/False=${bioQuizEn.formatDistribution?.true_false}, FillBlank=${bioQuizEn.formatDistribution?.fill_blank}, Match=${bioQuizEn.formatDistribution?.match_columns}, Theory=${bioQuizEn.formatDistribution?.theoretical}`);

  // ---------------------------------------------------------------------------
  // VIDEO 2 in SPANISH / GUJARATI
  // ---------------------------------------------------------------------------
  console.log('\n>>> [INTEGRATION TEST 4] THEORY-HEAVY VIDEO (Biology) TRANSLATED TO SPANISH');
  const bioQuizEs = await QuizPipelineOrchestrator.executePipeline({
    videoId: 'demo-photosynthesis',
    title: bioDemo.title,
    transcript: bioDemo.transcript,
    difficulty: 'medium',
    language: 'es',
    skipCache: true
  });

  console.log(`Language: ${bioQuizEs.language}`);
  assert.strictEqual(bioQuizEs.language, 'es');
  console.log(`Sample Spanish Question: "${bioQuizEs.questions[0].question.slice(0, 80)}..."`);
  console.log(`Sample Spanish Explanation: "${bioQuizEs.questions[0].explanation.slice(0, 80)}..."`);

  console.log('\n================================================================================');
  console.log('ALL INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================================\n');
}

runIntegrationTests().catch(err => {
  console.error('INTEGRATION TEST FAILED:', err);
  process.exit(1);
});
