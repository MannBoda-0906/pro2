import { VideoIdentity } from '../utils/videoIdentity.js';
import { QuizPersistenceService } from '../services/quizPipeline/quizPersistenceService.js';
import { QuizPipelineOrchestrator } from '../services/quizPipeline/quizPipelineOrchestrator.js';

async function reproduceLeak() {
  console.log('=== REPRODUCING VIDEO DATA LEAK ===');

  // Video A: Newton's Laws
  const videoAId = 'aPwqkZCBouU';
  const urlA = `https://www.youtube.com/watch?v=${videoAId}`;

  // Video B: Modern Physics
  const videoBId = 'vP9LzR8zupE';
  const urlB = `https://www.youtube.com/watch?v=${videoBId}`;

  console.log('Scenario: Client sends request where videoId is defaulted or missing authoritative validation');

  const clientSentVideoId: string = 'video';
  // If client sends { videoId: 'video', videoUrl: urlA }
  const canonicalA = VideoIdentity.parseCanonicalVideoId(clientSentVideoId || urlA) || 'video';
  console.log(`Video A canonical extracted by server: ${canonicalA}`);

  // Suppose Video A is cached under 'video'
  QuizPersistenceService.cacheQuiz({
    videoId: 'video',
    transcriptHash: 'empty_transcript_hash',
    language: 'en',
    difficulty: 'medium',
    count: 25,
    quiz: {
      id: 'quiz_videoA',
      videoId: 'video',
      title: "Video A Quiz (Newton's Laws)",
      questions: [
        {
          id: 'q1',
          question: 'What is Newton first law?',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
          explanation: 'Inertia',
          conceptId: 'C1',
          difficulty: 'medium',
          taskFamily: 'DIRECT_CALC',
          methodId: 'DIRECT_CALC',
          procedureSignature: 'proc_1',
          videoId: 'video',
          analysisSessionId: 'sess_A'
        } as any
      ],
      difficulty: 'medium',
      createdAt: new Date().toISOString()
    } as any
  });

  // Now user submits Video B, but client sends { videoId: 'video', videoUrl: urlB }
  // or client's stale state sent videoId='video'
  const canonicalB = VideoIdentity.parseCanonicalVideoId(clientSentVideoId || urlB) || 'video';
  console.log(`Video B canonical extracted by server: ${canonicalB}`);

  // Server checks cache for Video B:
  const leakedQuiz = QuizPersistenceService.getCachedQuiz({
    videoId: canonicalB,
    transcriptHash: 'empty_transcript_hash',
    language: 'en',
    difficulty: 'medium',
    count: 25
  });

  console.log(`Leaked quiz title for Video B: "${leakedQuiz?.title}"`);
  if (leakedQuiz?.title?.includes('Video A')) {
    console.log('🚨 REPRODUCED: Video B received Video A quiz because the server trusted client videoId and used weak cache fallback!');
  }

  // Clear test cache
  QuizPersistenceService.clearCache();
}

reproduceLeak();
