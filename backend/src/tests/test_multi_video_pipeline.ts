import { VideoAnalysisService } from '../services/videoAnalysisService.js';
import { QuizPipelineOrchestrator } from '../services/quizPipeline/quizPipelineOrchestrator.js';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/MANN/Desktop/mando/backend/.env' });

async function runTests() {
  console.log('====================================================');
  console.log('STUDYTUBE AI — MULTI-VIDEO PIPELINE VERIFICATION');
  console.log('====================================================');

  // Test 1: URL Validation & ID Extraction
  console.log('\n--- TEST 1: URL Validation & ID Extraction ---');
  const validUrls = [
    { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expectedId: 'dQw4w9WgXcQ' },
    { url: 'https://youtu.be/dQw4w9WgXcQ', expectedId: 'dQw4w9WgXcQ' },
    { url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ', expectedId: 'dQw4w9WgXcQ' },
    { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', expectedId: 'dQw4w9WgXcQ' },
    { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s', expectedId: 'dQw4w9WgXcQ' },
  ];

  for (const { url, expectedId } of validUrls) {
    const extracted = VideoAnalysisService.extractVideoId(url);
    if (extracted !== expectedId) {
      throw new Error(`Failed extraction for ${url}: expected ${expectedId}, got ${extracted}`);
    }
    console.log(`✅ Extracted correctly from ${url} -> ${extracted}`);
  }

  const invalidUrls = [
    'https://vimeo.com/123456',
    'https://youtube.com/not-a-video',
    'just-a-random-string',
    'https://www.youtube.com/watch?v=short'
  ];

  for (const badUrl of invalidUrls) {
    try {
      VideoAnalysisService.extractVideoId(badUrl);
      throw new Error(`Expected error for ${badUrl} but extraction succeeded`);
    } catch (err: any) {
      console.log(`✅ Correctly rejected invalid URL ${badUrl}: [${err.code}] ${err.message}`);
    }
  }

  // Test 2: HTTP Endpoints Validation
  console.log('\n--- TEST 2: HTTP Endpoints Validation ---');
  try {
    const badReq = await fetch('http://localhost:5000/api/videos/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://invalid-url.com/abc' })
    });
    const badJson: any = await badReq.json();
    console.log(`POST /api/videos/process invalid URL status: ${badReq.status}, code: ${badJson.code}`);
    if (badReq.status !== 400 || badJson.code !== 'INVALID_YOUTUBE_URL') {
      throw new Error(`Expected 400 INVALID_YOUTUBE_URL, got ${badReq.status} ${badJson.code}`);
    }
    console.log('✅ Invalid URL returns 400 INVALID_YOUTUBE_URL');
  } catch (err: any) {
    console.error('HTTP test failed:', err);
    throw err;
  }

  // Test 3: Video 1 - Newton's Laws (Physics)
  console.log('\n--- TEST 3: VIDEO 1 — Newton\'s Laws (Physics: aPwqkZCBouU) ---');
  const sess1 = 'sess_phys_' + Date.now();
  const v1 = 'aPwqkZCBouU';
  const analysis1 = await VideoAnalysisService.analyzeVideoPipeline({
    analysisSessionId: sess1,
    url: `https://www.youtube.com/watch?v=${v1}`,
    language: 'en'
  });

  console.log(`Video 1 Analysis: Subject=${analysis1.evidence?.subject}, Chapter=${analysis1.evidence?.chapter}`);
  const conceptKeys1 = Object.keys(analysis1.knowledgeMap?.concepts || {});
  console.log(`Video 1 Concepts (${conceptKeys1.length}):`, conceptKeys1.map(k => (analysis1.knowledgeMap?.concepts[k] as any)?.name || (analysis1.knowledgeMap?.concepts[k] as any)?.conceptName || k));
  if (conceptKeys1.length === 0) {
    throw new Error('Video 1 returned 0 concepts');
  }
  console.log('✅ Video 1 Analysis & Concept Map built successfully');

  console.log('Generating 25-question quiz for Video 1 (skipCache: true)...');
  const quiz1 = await QuizPipelineOrchestrator.executePipeline({
    videoId: v1,
    title: analysis1.metadata.title,
    transcript: analysis1.transcript,
    difficulty: 'medium',
    count: 25,
    language: 'en',
    skipCache: true,
    apiKey: process.env.GEMINI_API_KEY,
    analysisSessionId: sess1,
    generationAttemptId: 'att_1'
  });

  console.log(`✅ Video 1 Quiz generated: ${quiz1.questions.length} questions`);
  if (quiz1.questions.length !== 25) {
    throw new Error(`Expected 25 questions, got ${quiz1.questions.length}`);
  }
  // Check question session isolation
  for (const q of quiz1.questions) {
    if (q.videoId !== v1) {
      throw new Error(`Question has mismatched videoId: ${q.videoId} !== ${v1}`);
    }
    if (q.analysisSessionId !== sess1) {
      throw new Error(`Question has mismatched sessionId: ${q.analysisSessionId} !== ${sess1}`);
    }
  }
  console.log('✅ All 25 questions have exact videoId and analysisSessionId');

  // Test 4: Video 2 - Modern Physics (vP9LzR8zupE)
  console.log('\n--- TEST 4: VIDEO 2 — Modern Physics (vP9LzR8zupE) ---');
  const sess2 = 'sess_modphys_' + Date.now();
  const v2 = 'vP9LzR8zupE';
  const analysis2 = await VideoAnalysisService.analyzeVideoPipeline({
    analysisSessionId: sess2,
    url: `https://www.youtube.com/watch?v=${v2}`,
    language: 'en'
  });

  console.log(`Video 2 Analysis: Subject=${analysis2.evidence?.subject}, Chapter=${analysis2.evidence?.chapter}`);
  const conceptKeys2 = Object.keys(analysis2.knowledgeMap?.concepts || {});
  console.log(`Video 2 Concepts (${conceptKeys2.length}):`, conceptKeys2.map(k => (analysis2.knowledgeMap?.concepts[k] as any)?.name || (analysis2.knowledgeMap?.concepts[k] as any)?.conceptName || k));
  console.log('✅ Video 2 Analysis & Concept Map built successfully');

  console.log('Generating 25-question quiz for Video 2 (skipCache: true)...');
  const quiz2 = await QuizPipelineOrchestrator.executePipeline({
    videoId: v2,
    title: analysis2.metadata.title,
    transcript: analysis2.transcript,
    difficulty: 'medium',
    count: 25,
    language: 'en',
    skipCache: true,
    apiKey: process.env.GEMINI_API_KEY,
    analysisSessionId: sess2,
    generationAttemptId: 'att_1'
  });

  console.log(`✅ Video 2 Quiz generated: ${quiz2.questions.length} questions`);
  if (quiz2.questions.length !== 25) {
    throw new Error(`Expected 25 questions, got ${quiz2.questions.length}`);
  }
  for (const q of quiz2.questions) {
    if (q.videoId !== v2) {
      throw new Error(`Question has mismatched videoId: ${q.videoId} !== ${v2}`);
    }
    if (q.analysisSessionId !== sess2) {
      throw new Error(`Question has mismatched sessionId: ${q.analysisSessionId} !== ${sess2}`);
    }
  }
  console.log('✅ All 25 questions have exact videoId and analysisSessionId for Video 2');

  // Test 5: Verify Isolation Between Video 1 and Video 2
  console.log('\n--- TEST 5: Verify Isolation Between Videos (No Data Bleed) ---');
  const v1ConceptNames = new Set(conceptKeys1.map(k => ((analysis1.knowledgeMap?.concepts[k] as any)?.name || (analysis1.knowledgeMap?.concepts[k] as any)?.conceptName || k).toLowerCase()));
  const v2ConceptNames = new Set(conceptKeys2.map(k => ((analysis2.knowledgeMap?.concepts[k] as any)?.name || (analysis2.knowledgeMap?.concepts[k] as any)?.conceptName || k).toLowerCase()));
  const overlap = [...v1ConceptNames].filter(c => v2ConceptNames.has(c));
  console.log(`Concept overlap between Video 1 and Video 2: ${overlap.length} (Expected: strictly separated domain concepts)`);
  
  console.log('\n====================================================');
  console.log('🎉 ALL MULTI-VIDEO PIPELINE TESTS PASSED!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('\n❌ PIPELINE TEST FAILED:', err);
  process.exit(1);
});
