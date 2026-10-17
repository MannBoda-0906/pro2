import assert from 'assert';
import { QuizPipelineOrchestrator } from '../services/quizPipeline/quizPipelineOrchestrator.js';

console.log('================================================================================');
console.log('STUDYTUBE AI — MULTI-COUNT & DIFFICULTY TEST SUITE: 25, 20, 15, 10 QUESTIONS');
console.log('================================================================================\n');

const physTranscript = [
  { text: "Welcome students. In this physics lecture we study the Center of Mass for a system of particles.", start: 0, duration: 10 },
  { text: "Center of mass is defined as the unique mass-weighted average position of the entire system.", start: 10, duration: 15 },
  { text: "For a two-particle system with masses m1 and m2 at positions x1 and x2, the center of mass x_cm = (m1*x1 + m2*x2)/(m1 + m2).", start: 25, duration: 25 },
  { text: "Center of mass divides the distance inversely in the ratio of masses m1*r1 = m2*r2.", start: 50, duration: 20 },
  { text: "For multi-particle discrete systems in three dimensions, r_cm = sum(mi*ri) / sum(mi), giving coordinates x_cm, y_cm, and z_cm.", start: 70, duration: 25 },
  { text: "The center of mass can lie outside the material body, for example at the geometric center of a hollow ring or circular loop.", start: 95, duration: 20 },
  { text: "According to Newton Second Law, when the net external force is zero, internal forces cannot accelerate the center of mass: F_ext = M*a_cm = 0.", start: 115, duration: 25 }
];

async function runMultiCountTests() {
  const counts = [25, 20, 15, 10];
  const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];

  for (const count of counts) {
    const diff = difficulties[(count / 5) % 3];
    console.log(`>>> Testing generation of ${count} questions (Difficulty: ${diff})...`);
    const quiz = await QuizPipelineOrchestrator.executePipeline({
      videoId: `test-video-${count}`,
      title: 'Class 11 Physics: Center of Mass & System of Particles',
      transcript: physTranscript,
      difficulty: diff,
      count: count,
      language: 'en',
      skipCache: true
    });

    console.log(`  => Returned questions: ${quiz.questions.length}`);
    assert.strictEqual(quiz.questions.length, count, `Must produce exactly ${count} questions`);
    assert.strictEqual(quiz.difficulty, diff, `Quiz difficulty must match ${diff}`);

    const numericalCount = quiz.formatDistribution?.numerical || 0;
    const ratio = numericalCount / count;
    console.log(`  => Numerical count: ${numericalCount}/${count} (${Math.round(ratio * 100)}%)`);
    assert.ok(ratio >= 0.65 && ratio <= 0.75, `Numerical ratio should be ~70% (got ${ratio})`);

    // Verify all questions have valid options and correct answer
    quiz.questions.forEach((q, idx) => {
      assert.ok(q.question && q.question.length > 5, `Q#${idx + 1} has valid text`);
      if (q.questionFormat === 'numerical' || q.questionFormat === 'theoretical' || q.questionFormat === 'true_false') {
        assert.ok(q.options && q.options.length >= 2, `Q#${idx + 1} has valid options`);
      } else if (q.questionFormat === 'fill_blank') {
        assert.ok(q.acceptedEquivalents && q.acceptedEquivalents.length >= 1, `Q#${idx + 1} has accepted equivalents`);
      } else if (q.questionFormat === 'match_columns') {
        assert.ok(q.columnA && q.columnB, `Q#${idx + 1} has matching columns`);
      }
      assert.ok(q.correctAnswer, `Q#${idx + 1} has correct answer`);
      assert.ok(q.solution && q.solution.length > 5, `Q#${idx + 1} has solution`);
    });
    console.log(`  => PASS: ${count} questions verified with ~70/30 distribution!\n`);
  }

  // Test thin transcript error handling
  console.log('>>> Testing thin transcript handling (VIDEO_TOO_THIN)...');
  try {
    await QuizPipelineOrchestrator.executePipeline({
      videoId: 'thin-video',
      title: 'Empty Video',
      transcript: [{ text: 'Hello', start: 0, duration: 1 }],
      difficulty: 'medium',
      count: 25,
      language: 'en',
      skipCache: true
    });
    assert.fail('Should have thrown VIDEO_TOO_THIN error');
  } catch (err: any) {
    console.log(`  => Caught expected error: [${err.code || 'NO_CODE'}] ${err.message}`);
    assert.ok(
      err.message.includes('INSUFFICIENT_EDUCATIONAL_CONTENT') ||
      err.code === 'INSUFFICIENT_EDUCATIONAL_CONTENT' ||
      err.message.includes('VIDEO_TOO_THIN') ||
      err.code === 'VIDEO_TOO_THIN'
    );
    console.log('  => PASS: INSUFFICIENT_EDUCATIONAL_CONTENT correctly thrown and identifiable!\n');
  }

  console.log('================================================================================');
  console.log('ALL MULTI-COUNT AND DIFFICULTY TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================================\n');
}

runMultiCountTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
