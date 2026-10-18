import { QuizPipelineOrchestrator } from '../services/quizPipeline/quizPipelineOrchestrator.js';
import { YouTubeService } from '../services/youtubeService.js';
import { TranscriptService } from '../services/transcriptService.js';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/MANN/Desktop/mando/backend/.env' });

async function testUncachedPipeline() {
  // Let's test on a real video that is not in the cache or test with skipCache: true
  // For instance, let's test a short educational video, e.g. Khan Academy or 3Blue1Brown or Newton's Laws with skipCache: true
  const videoId = 'aPwqkZCBouU'; // Or another video ID
  console.log(`Testing uncached pipeline on video ${videoId}...`);

  const metadata = await YouTubeService.fetchMetadata(videoId, `https://www.youtube.com/watch?v=${videoId}`);
  console.log(`Fetched metadata: title="${metadata.title}"`);

  const fetchResult = await YouTubeService.fetchTranscript(videoId, metadata.title, metadata.author, 'en');
  console.log(`Fetched transcript: ${fetchResult.transcript.length} segments`);

  const cleanSegments = TranscriptService.cleanSegments(fetchResult.transcript);

  try {
    const quiz = await QuizPipelineOrchestrator.executePipeline({
      videoId,
      title: metadata.title,
      transcript: cleanSegments,
      difficulty: 'medium',
      count: 25,
      language: 'en',
      skipCache: true, // Forces uncached pipeline run through all stages
      apiKey: process.env.GEMINI_API_KEY
    });
    console.log('SUCCESS: Quiz generated with', quiz.questions.length, 'questions');
  } catch (err: any) {
    console.error('FAILED AT STAGE:', err.stage, 'CODE:', err.code);
    console.error('MESSAGE:', err.message);
    console.error('DETAILS:', JSON.stringify(err.details, null, 2));
    console.error('STACK:', err.stack);
  }
}

testUncachedPipeline();
