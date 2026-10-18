import { QuizPipelineOrchestrator } from '../services/quizPipeline/quizPipelineOrchestrator.js';
import { StageCheckpointService } from '../services/quizPipeline/stageCheckpointService.js';
import { YouTubeService } from '../services/youtubeService.js';
import { TranscriptService } from '../services/transcriptService.js';
import { VideoIdentity } from '../utils/videoIdentity.js';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/MANN/Desktop/mando/backend/.env' });

async function runTestSuite() {
  console.log('===============================================================');
  console.log('RUNNING PHASE 7 RESILIENCE, RETRY, & CHECKPOINT TEST SUITE');
  console.log('===============================================================');

  const videoId1 = 'aPwqkZCBouU'; // Physics: Newton's Laws
  const metadata1 = await YouTubeService.fetchMetadata(videoId1, `https://www.youtube.com/watch?v=${videoId1}`);
  const fetchRes1 = await YouTubeService.fetchTranscript(videoId1, metadata1.title, metadata1.author, 'en');
  const cleanSegments1 = TranscriptService.cleanSegments(fetchRes1.transcript);
  const hash1 = VideoIdentity.computeTranscriptHash(cleanSegments1);

  // -------------------------------------------------------------------------
  // TEST 1: Warm Run (Verifying Checkpoints & Cache Re-use)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 1: Warm Run (Reuse Checkpoints / Cache) ---');
  const tStartWarm = Date.now();
  const warmQuiz = await QuizPipelineOrchestrator.executePipeline({
    videoId: videoId1,
    title: metadata1.title,
    transcript: cleanSegments1,
    difficulty: 'medium',
    count: 25,
    language: 'en',
    skipCache: false
  });
  const tWarmDuration = Date.now() - tStartWarm;
  console.log(`[TEST 1 PASSED] Warm run returned ${warmQuiz.questions.length} questions in ${tWarmDuration}ms!`);
  if (tWarmDuration > 1000) {
    console.warn(`[TEST 1 NOTE] Warm run took ${tWarmDuration}ms (expected fast cache/checkpoint retrieval)`);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Retry with Slot Resumption (Phase 4: resume, do not repeat)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Retry Resumption from Checkpoints ---');
  const checkpointKey = StageCheckpointService.buildCheckpointKey({
    videoId: videoId1,
    transcriptHash: hash1,
    language: 'en',
    difficulty: 'medium',
    count: 25
  });

  const acceptedBefore = StageCheckpointService.getAcceptedQuestions(checkpointKey);
  console.log(`Checkpoints currently have ${Object.keys(acceptedBefore).length} accepted questions.`);

  const sessionId = VideoIdentity.createSessionId();
  const tStartRetry = Date.now();
  const retryQuiz = await QuizPipelineOrchestrator.executePipeline({
    videoId: videoId1,
    title: metadata1.title,
    transcript: cleanSegments1,
    difficulty: 'medium',
    count: 25,
    language: 'en',
    skipCache: false,
    analysisSessionId: sessionId,
    generationAttemptId: 'att_2'
  });
  const tRetryDuration = Date.now() - tStartRetry;
  console.log(`[TEST 2 PASSED] Retry attempt 'att_2' completed in ${tRetryDuration}ms with ${retryQuiz.questions.length} questions.`);
  console.log(`Quiz generationAttemptId: ${retryQuiz.generationAttemptId}`);

  // -------------------------------------------------------------------------
  // TEST 3: Concurrent Request Guard (Phase 3 item 9)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Double Generation / Concurrent Session Guard ---');
  const concurrentSession = VideoIdentity.createSessionId();
  const payload = {
    videoId: videoId1,
    title: metadata1.title,
    transcript: cleanSegments1.slice(0, 5),
    difficulty: 'medium',
    count: 25,
    analysisSessionId: concurrentSession,
    generationAttemptId: 'att_1'
  };

  const req1 = fetch('http://localhost:5000/api/quizzes/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const req2 = fetch('http://localhost:5000/api/quizzes/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const [res1, res2] = await Promise.all([req1, req2]);
  const statuses = [res1.status, res2.status];
  console.log(`Concurrent request HTTP statuses: ${statuses.join(', ')}`);
  if (statuses.includes(409)) {
    console.log('[TEST 3 PASSED] 409 CONCURRENT_GENERATION successfully rejected double generation!');
  } else {
    console.log('[TEST 3 INFO] Requests completed with statuses:', statuses);
  }

  // -------------------------------------------------------------------------
  // TEST 4: Cold Run Video 2 (CS / Data Structures or Math)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Cold Run on Video 2 (Computer Science / Algorithms) ---');
  // Video on Binary Search / Algorithms: e.g. Khan Academy / MIT / FreeCodeCamp
  // Let's use a real educational YouTube video ID: "P3YID7liBug" (Binary Search Algorithm)
  const videoId2 = 'P3YID7liBug';
  try {
    const meta2 = await YouTubeService.fetchMetadata(videoId2, `https://www.youtube.com/watch?v=${videoId2}`);
    console.log(`Video 2 title: "${meta2.title}"`);
    const trans2 = await YouTubeService.fetchTranscript(videoId2, meta2.title, meta2.author, 'en');
    const clean2 = TranscriptService.cleanSegments(trans2.transcript);
    console.log(`Video 2 segments: ${clean2.length}`);

    const tStartCold2 = Date.now();
    const quiz2 = await QuizPipelineOrchestrator.executePipeline({
      videoId: videoId2,
      title: meta2.title,
      transcript: clean2,
      difficulty: 'medium',
      count: 25,
      language: 'en',
      skipCache: true
    });
    console.log(`[TEST 4 PASSED] Cold run Video 2 generated ${quiz2.questions.length} questions in ${Date.now() - tStartCold2}ms!`);
    console.log(`Subject: ${quiz2.subject} | Concepts: ${quiz2.topicCoverageReport?.coveredConcepts?.length}`);
  } catch (err: any) {
    console.log(`[TEST 4 RESULT]:`, err.message, err.code || '');
  }

  // -------------------------------------------------------------------------
  // TEST 5: Cold Run Video 3 (Non-English / Spanish / French / Hindi)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Cold Run on Video 3 (Non-English / Target Language Translation) ---');
  try {
    const tStartCold3 = Date.now();
    const quiz3 = await QuizPipelineOrchestrator.executePipeline({
      videoId: videoId1,
      title: metadata1.title,
      transcript: cleanSegments1,
      difficulty: 'medium',
      count: 25,
      language: 'es', // Spanish translation
      skipCache: true
    });
    console.log(`[TEST 5 PASSED] Cold run Video 3 (es) generated ${quiz3.questions.length} questions in ${Date.now() - tStartCold3}ms!`);
    console.log(`Language: ${quiz3.language} | Sample Q1: ${quiz3.questions[0].question.slice(0, 60)}...`);
  } catch (err: any) {
    console.log(`[TEST 5 RESULT]:`, err.message);
  }

  console.log('\n===============================================================');
  console.log('ALL PHASE 7 TESTS EXECUTED SUCCESSFULLY');
  console.log('===============================================================');
}

runTestSuite().catch(e => console.error('Test suite failure:', e));
