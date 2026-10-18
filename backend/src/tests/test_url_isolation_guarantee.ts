import { VideoIdentity } from '../utils/videoIdentity.js';
import { QuizPersistenceService } from '../services/quizPipeline/quizPersistenceService.js';
import { StageCheckpointService } from '../services/quizPipeline/stageCheckpointService.js';
import { QuizPipelineOrchestrator } from '../services/quizPipeline/quizPipelineOrchestrator.js';

async function runIsolationGuaranteeTests() {
  console.log('========================================================');
  console.log('🧪 RUNNING URL ISOLATION GUARANTEE INTEGRATION TESTS');
  console.log('========================================================\n');

  // Test 1: Authoritative URL normalization & derivation
  console.log('--- TEST 1: Authoritative URL normalization ---');
  const rawUrls = [
    'https://www.youtube.com/watch?v=aPwqkZCBouU',
    'https://youtu.be/aPwqkZCBouU?si=xyz123',
    'https://www.youtube.com/embed/aPwqkZCBouU',
    'https://www.youtube.com/shorts/aPwqkZCBouU',
    'https://www.youtube.com/watch?v=aPwqkZCBouU&list=PL123&index=2',
    'aPwqkZCBouU'
  ];

  for (const u of rawUrls) {
    const id = VideoIdentity.parseCanonicalVideoId(u);
    if (id !== 'aPwqkZCBouU') {
      throw new Error(`Failed to extract canonical videoId from ${u}: got ${id}`);
    }
  }
  console.log('✅ All URL formats normalized to canonical videoId aPwqkZCBouU');

  // Test 2: Identity Envelope Creation
  console.log('\n--- TEST 2: Identity Envelope Creation ---');
  const envA = VideoIdentity.createIdentityEnvelope('https://www.youtube.com/watch?v=aPwqkZCBouU');
  const envB = VideoIdentity.createIdentityEnvelope('https://www.youtube.com/watch?v=vP9LzR8zupE');

  if (envA.videoId !== 'aPwqkZCBouU' || envB.videoId !== 'vP9LzR8zupE') {
    throw new Error('IdentityEnvelope has incorrect videoId');
  }
  if (envA.analysisSessionId === envB.analysisSessionId) {
    throw new Error('IdentityEnvelopes must have distinct analysisSessionIds');
  }
  if (!envA.analysisSessionId || !envB.analysisSessionId || envA.analysisSessionId.length < 8) {
    throw new Error('analysisSessionId must be a valid UUID or session string');
  }
  console.log(`✅ IdentityEnvelope A: videoId=${envA.videoId}, session=${envA.analysisSessionId}`);
  console.log(`✅ IdentityEnvelope B: videoId=${envB.videoId}, session=${envB.analysisSessionId}`);

  // Test 3: Rejection of Invalid or Generic 'video' IDs in Storage / Cache
  console.log("\n--- TEST 3: Hardened Rejection of Generic 'video' in Cache ---");
  const badCacheKey = QuizPersistenceService.buildCacheKey({
    videoId: 'video',
    transcriptHash: 'abc',
    language: 'en',
    difficulty: 'medium',
    count: 25
  });
  if (badCacheKey !== null) {
    throw new Error(`Expected null cacheKey for generic 'video', got: ${badCacheKey}`);
  }

  const badTranscriptKey = QuizPersistenceService.buildCacheKey({
    videoId: 'aPwqkZCBouU',
    transcriptHash: '',
    language: 'en',
    difficulty: 'medium',
    count: 25
  });
  if (badTranscriptKey !== null) {
    throw new Error(`Expected null cacheKey for empty transcriptHash, got: ${badTranscriptKey}`);
  }
  console.log("✅ Cache strictly rejects generic 'video' and empty transcriptHash (returns null)");

  // Test 4: Checkpoint Session Scoping
  console.log('\n--- TEST 4: Checkpoint Session Scoping ---');
  const cpKey1 = StageCheckpointService.buildCheckpointKey({
    videoId: 'aPwqkZCBouU',
    transcriptHash: 'hash_123',
    language: 'en',
    difficulty: 'medium',
    count: 25,
    analysisSessionId: 'sess_1'
  });

  const cpKey2 = StageCheckpointService.buildCheckpointKey({
    videoId: 'aPwqkZCBouU',
    transcriptHash: 'hash_123',
    language: 'en',
    difficulty: 'medium',
    count: 25,
    analysisSessionId: 'sess_2'
  });

  if (cpKey1 === cpKey2) {
    throw new Error('Checkpoints for different sessions must never share keys!');
  }
  if (!cpKey1.includes('sess_1') || !cpKey2.includes('sess_2')) {
    throw new Error('Checkpoint keys must include analysisSessionId');
  }
  console.log('✅ Checkpoint keys are strictly scoped by analysisSessionId');

  // Test 5: Cache Isolation between Video A and Video B
  console.log('\n--- TEST 5: Cache Isolation between Video A and Video B ---');
  const transcriptA = [
    { text: "Welcome to this physics lecture covering Newton's laws of motion. Newton's first law states that an object at rest stays at rest unless acted on by a net external force. This property is known as inertia.", start: 0, duration: 15 },
    { text: "Newton's second law quantifies force as the rate of change of momentum, commonly expressed as F = m a. Newton's third law states every action has an equal and opposite reaction.", start: 15, duration: 20 }
  ];
  const hashA = VideoIdentity.computeTranscriptHash(transcriptA);

  // Cache Video A
  QuizPersistenceService.cacheQuiz({
    videoId: 'aPwqkZCBouU',
    transcriptHash: hashA,
    language: 'en',
    difficulty: 'medium',
    count: 25,
    quiz: {
      id: 'quiz_A',
      videoId: 'aPwqkZCBouU',
      title: "Video A Quiz (Newton's Laws)",
      questions: [
        {
          id: 'q1',
          question: "What is Newton's First Law?",
          options: ['Inertia', 'F=ma', 'Action-Reaction', 'Gravity'],
          correctAnswer: 'Inertia',
          explanation: 'Objects in motion remain in motion.',
          conceptId: 'C1',
          difficulty: 'medium',
          taskFamily: 'DIRECT_CALC',
          methodId: 'DIRECT_CALC',
          procedureSignature: 'proc_1',
          videoId: 'aPwqkZCBouU',
          analysisSessionId: envA.analysisSessionId,
          generationAttemptId: envA.generationAttemptId
        } as any
      ],
      difficulty: 'medium',
      createdAt: new Date().toISOString()
    } as any
  });

  // Check that Video A is cached
  const cachedA = QuizPersistenceService.getCachedQuiz({
    videoId: 'aPwqkZCBouU',
    transcriptHash: hashA,
    language: 'en',
    difficulty: 'medium',
    count: 25
  });
  if (!cachedA || cachedA.videoId !== 'aPwqkZCBouU') {
    throw new Error('Failed to retrieve cached quiz for Video A');
  }
  console.log('✅ Video A successfully stored and retrieved from cache');

  // Now query Video B with same difficulty/count/language
  const cachedB = QuizPersistenceService.getCachedQuiz({
    videoId: 'vP9LzR8zupE',
    transcriptHash: 'hash_video_B',
    language: 'en',
    difficulty: 'medium',
    count: 25
  });
  if (cachedB !== null) {
    throw new Error(`CRITICAL LEAK: Video B query returned Video A data: ${JSON.stringify(cachedB)}`);
  }
  console.log('✅ Video B cache query returns null (0 leakage from Video A)');

  // Test 6: Stamping and Identity Guarantee on Retrieved Cached Quizzes
  console.log('\n--- TEST 6: Identity Stamping on Output ---');
  // When executePipeline serves a cached quiz for Video A in session 3, it must stamp the new session!
  const newSessionForA = 'sess_new_A_' + Date.now();
  const newAttemptForA = 'att_2';
  const pipelineResult = await QuizPipelineOrchestrator.executePipeline({
    videoId: 'aPwqkZCBouU',
    title: 'Newton Laws',
    transcript: transcriptA,
    difficulty: 'medium',
    count: 25,
    language: 'en',
    analysisSessionId: newSessionForA,
    generationAttemptId: newAttemptForA
  });

  for (const q of pipelineResult.questions) {
    if (q.videoId !== 'aPwqkZCBouU') {
      throw new Error(`Output question videoId mismatch: ${q.videoId} !== aPwqkZCBouU`);
    }
    if (q.analysisSessionId !== newSessionForA) {
      throw new Error(`Output question analysisSessionId mismatch: ${q.analysisSessionId} !== ${newSessionForA}`);
    }
    if (q.generationAttemptId !== newAttemptForA) {
      throw new Error(`Output question generationAttemptId mismatch: ${q.generationAttemptId} !== ${newAttemptForA}`);
    }
  }
  console.log('✅ Cached quiz questions dynamically stamped with CURRENT analysisSessionId and generationAttemptId');

  console.log('\n========================================================');
  console.log('🎉 ALL URL ISOLATION GUARANTEE TESTS PASSED!');
  console.log('========================================================\n');
}

runIsolationGuaranteeTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
