import { QuizPipelineOrchestrator } from './services/quizPipeline/quizPipelineOrchestrator.js';

async function inspect() {
  const physTranscript = [
    { text: "Welcome students. In this physics lecture we study the Center of Mass for a system of particles.", start: 0, duration: 10 },
    { text: "Center of mass is defined as the unique mass-weighted average position of the entire system.", start: 10, duration: 15 },
    { text: "For a two-particle system with masses m1 and m2 at positions x1 and x2, the center of mass x_cm = (m1*x1 + m2*x2)/(m1 + m2).", start: 25, duration: 25 },
    { text: "Center of mass divides the distance inversely in the ratio of masses m1*r1 = m2*r2.", start: 50, duration: 20 },
    { text: "For multi-particle discrete systems in three dimensions, r_cm = sum(mi*ri) / sum(mi), giving coordinates x_cm, y_cm, and z_cm.", start: 70, duration: 25 },
    { text: "The center of mass can lie outside the material body, for example at the geometric center of a hollow ring or circular loop.", start: 95, duration: 20 },
    { text: "According to Newton Second Law, when the net external force is zero, internal forces cannot accelerate the center of mass: F_ext = M*a_cm = 0.", start: 115, duration: 25 }
  ];

  const quiz = await QuizPipelineOrchestrator.executePipeline({
    videoId: 'phys-class11-com',
    title: 'Class 11 Physics: Center of Mass & System of Particles',
    transcript: physTranscript,
    difficulty: 'medium',
    language: 'en',
    skipCache: true
  });

  console.log('\n--- DETAILED NUMERICAL QUESTIONS (Q1 - Q18) ---');
  quiz.questions.slice(0, 18).forEach((q, idx) => {
    console.log(`\n[Q${idx + 1}] Format: ${q.questionFormat} | Declared Method: ${q.methodId} | Declared Proc: ${q.procedureSignature}`);
    console.log(`Question: "${q.question}"`);
    console.log(`Options: [${q.options.join(', ')}]`);
    console.log(`Answer: ${q.correctAnswer}`);
    console.log(`Solution Summary: ${q.solution?.slice(0, 100)}...`);
  });
}

inspect().catch(console.error);
