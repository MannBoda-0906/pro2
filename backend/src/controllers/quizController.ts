import { Request, Response } from 'express';
import { QuizService } from '../services/quizService.js';
import { VideoIdentity } from '../utils/videoIdentity.js';

export class QuizController {
  static async generateQuiz(req: Request, res: Response): Promise<void> {
    try {
      const { videoId, videoUrl, title, transcript, difficulty, count, language, skipCache, analysisSessionId } = req.body;
      const apiKey = (req.headers['x-gemini-key'] as string) || undefined;

      const canonicalVideoId = VideoIdentity.parseCanonicalVideoId(videoId || videoUrl || '') || videoId || 'video';
      const sessionId = (typeof analysisSessionId === 'string' && analysisSessionId.trim())
        ? analysisSessionId.trim()
        : VideoIdentity.createSessionId();
      const segments = Array.isArray(transcript) ? transcript : [];
      const computedHash = VideoIdentity.computeTranscriptHash(segments);

      const normalizedDifficulty: 'easy' | 'medium' | 'hard' =
        ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';
      const parsedCount = Number(count);
      const normalizedCount = [10, 15, 20, 25].includes(parsedCount) ? parsedCount : 25;

      const quiz = await QuizService.generateQuiz({
        videoId: canonicalVideoId,
        videoUrl,
        title: title || 'Educational Video',
        transcript: segments,
        difficulty: normalizedDifficulty,
        count: normalizedCount,
        language: typeof language === 'string' && language.trim() ? language.trim() : 'en',
        apiKey,
        skipCache: Boolean(skipCache),
        analysisSessionId: sessionId,
        transcriptHash: computedHash
      });

      res.json({
        ok: true,
        success: true,
        analysisSessionId: quiz.analysisSessionId || sessionId,
        videoId: quiz.videoId || canonicalVideoId,
        status: 'success',
        data: { quiz },
        quiz
      });
    } catch (err: any) {
      console.error('Error in QuizController.generateQuiz:', err);
      const rawCode = err.code || (err.message?.includes('INSUFFICIENT_EDUCATIONAL_CONTENT')
        ? 'INSUFFICIENT_EDUCATIONAL_CONTENT'
        : err.message?.includes('VIDEO_TOO_THIN')
        ? 'INSUFFICIENT_EDUCATIONAL_CONTENT'
        : err.message?.includes('EXTRACTION_FAILED')
        ? 'EXTRACTION_FAILED'
        : 'QUIZ_GENERATION_FAILED');

      const isInsufficientContent = rawCode === 'INSUFFICIENT_EDUCATIONAL_CONTENT' || rawCode === 'VIDEO_TOO_THIN' || err.message?.includes('INSUFFICIENT_EDUCATIONAL_CONTENT');
      const isExtractionFailed = rawCode === 'EXTRACTION_FAILED' || err.message?.includes('EXTRACTION_FAILED');
      const isNoCaptions = rawCode === 'NO_CAPTIONS_AVAILABLE' || err.message?.includes('NO_CAPTIONS_AVAILABLE');
      const isRateLimit = err.status === 429 || err.message?.includes('RESOURCE_EXHAUSTED') || err.message?.includes('429');
      const isTimeout = err.code === 'ETIMEDOUT' || err.message?.includes('timeout') || err.message?.includes('timed out');

      let statusCode = 500;
      let code = rawCode;
      let retryable = false;

      if (isNoCaptions) {
        statusCode = 404;
        code = 'NO_CAPTIONS_AVAILABLE';
        retryable = false;
      } else if (isInsufficientContent) {
        statusCode = 422;
        code = 'INSUFFICIENT_EDUCATIONAL_CONTENT';
        retryable = false;
      } else if (isExtractionFailed) {
        statusCode = 503;
        code = 'EXTRACTION_FAILED';
        retryable = true;
      } else if (isRateLimit) {
        statusCode = 429;
        code = 'RATE_LIMIT_EXCEEDED';
        retryable = true;
      } else if (isTimeout) {
        statusCode = 408;
        code = 'GENERATION_TIMEOUT';
        retryable = true;
      } else if (err.stage === 'blueprint_validation' || err.stage === 'quality_gate') {
        statusCode = 500;
        code = err.code || 'VALIDATION_FAILED';
        retryable = true;
      }

      res.status(statusCode).json({
        ok: false,
        success: false,
        error: {
          code,
          message: err.message || 'Failed to generate concept quiz.',
          stage: err.stage || 'pipeline',
          retryable
        }
      });
    }
  }

  static async evaluateQuiz(req: Request, res: Response): Promise<void> {
    try {
      const { quiz, userAnswers } = req.body;
      if (!quiz || !Array.isArray(quiz.questions)) {
        res.status(400).json({
          ok: false,
          success: false,
          error: {
            code: 'INVALID_QUIZ_DATA',
            message: 'A valid quiz with questions is required for evaluation.',
            stage: 'evaluation',
            retryable: false
          }
        });
        return;
      }

      const result = QuizService.evaluateSubmission({
        quiz,
        userAnswers: userAnswers || {}
      });

      res.json({
        ok: true,
        success: true,
        result
      });
    } catch (err: any) {
      console.error('Error in QuizController.evaluateQuiz:', err);
      res.status(500).json({
        ok: false,
        success: false,
        error: {
          code: 'EVALUATION_FAILED',
          message: err.message || 'Failed to evaluate quiz submission.',
          stage: 'evaluation',
          retryable: false
        }
      });
    }
  }

  static async generatePracticeQuestions(req: Request, res: Response): Promise<void> {
    try {
      const { videoId, title, weakConcepts, difficulty, language } = req.body;
      const apiKey = (req.headers['x-gemini-key'] as string) || undefined;

      if (!Array.isArray(weakConcepts) || weakConcepts.length === 0) {
        res.status(400).json({
          ok: false,
          success: false,
          error: {
            code: 'MISSING_WEAK_CONCEPTS',
            message: 'Please provide at least one weak concept to generate practice questions for.',
            stage: 'practice_generation',
            retryable: false
          }
        });
        return;
      }

      const questions = await QuizService.generatePracticeQuestions({
        videoId,
        title: title || 'Targeted Practice',
        weakConcepts,
        difficulty: difficulty || 'medium',
        language: language || 'en',
        apiKey
      });

      res.json({
        ok: true,
        success: true,
        questions
      });
    } catch (err: any) {
      console.error('Error in QuizController.generatePracticeQuestions:', err);
      res.status(500).json({
        ok: false,
        success: false,
        error: {
          code: 'PRACTICE_GENERATION_FAILED',
          message: err.message || 'Failed to generate adaptive practice questions.',
          stage: 'practice_generation',
          retryable: true
        }
      });
    }
  }
}
