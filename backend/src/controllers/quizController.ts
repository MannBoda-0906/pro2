import { Request, Response } from 'express';
import { QuizService } from '../services/quizService.js';
import { VideoIdentity } from '../utils/videoIdentity.js';
import { PipelineLogger } from '../utils/pipelineLogger.js';
import { GenerationJobService } from '../services/generationJobService.js';

const activeSessions = new Set<string>();

export class QuizController {
  /**
   * Creates a tracked generation job and starts pipeline processing asynchronously.
   * Client polls GET /api/quizzes/jobs/:jobId until COMPLETED or FAILED.
   */
  static async createGenerationJob(req: Request, res: Response): Promise<void> {
    const { videoId, videoUrl, sourceUrl, title, transcript, difficulty, count, language, skipCache, analysisSessionId, generationAttemptId } = req.body;
    const apiKey = (req.headers['x-gemini-key'] as string) || undefined;

    const rawUrl = (sourceUrl || videoUrl || '').trim();
    const authoritativeFromUrl = rawUrl ? VideoIdentity.parseCanonicalVideoId(rawUrl) : null;
    const clientVideoId = (videoId || '').trim();

    if (authoritativeFromUrl && clientVideoId && authoritativeFromUrl !== clientVideoId) {
      res.status(400).json({
        ok: false,
        success: false,
        stage: 'VALIDATE_URL',
        code: 'VIDEO_ID_MISMATCH',
        message: `Mismatched video identification. URL resolves to '${authoritativeFromUrl}', but client provided '${clientVideoId}'.`,
        retryable: false
      });
      return;
    }

    const canonicalVideoId = authoritativeFromUrl || (clientVideoId && clientVideoId !== 'video' ? VideoIdentity.parseCanonicalVideoId(clientVideoId) : null);

    if (!canonicalVideoId || canonicalVideoId === 'video') {
      res.status(400).json({
        ok: false,
        success: false,
        stage: 'VALIDATE_URL',
        code: 'INVALID_VIDEO_ID',
        message: 'A valid YouTube video URL or ID is required. Generic or empty IDs are rejected.',
        retryable: false
      });
      return;
    }

    const sessionId = (typeof analysisSessionId === 'string' && analysisSessionId.trim())
      ? analysisSessionId.trim()
      : VideoIdentity.createSessionId();
    const attemptId = (typeof generationAttemptId === 'string' && generationAttemptId.trim())
      ? generationAttemptId.trim()
      : VideoIdentity.createAttemptId();

    const segments = Array.isArray(transcript) ? transcript : [];
    if (segments.length === 0) {
      res.status(400).json({
        ok: false,
        success: false,
        stage: 'FETCH_TRANSCRIPT',
        code: 'TRANSCRIPT_UNAVAILABLE',
        message: "We couldn't read this video's content, so a quiz can't be built. Try another video or paste a transcript.",
        retryable: false,
        videoId: canonicalVideoId,
        analysisSessionId: sessionId,
        generationAttemptId: attemptId
      });
      return;
    }

    const computedHash = VideoIdentity.computeTranscriptHash(segments);
    if (!computedHash) {
      res.status(400).json({
        ok: false,
        success: false,
        stage: 'NORMALIZE_CONTENT',
        code: 'INSUFFICIENT_VIDEO_CONTENT',
        message: "We couldn't read this video's content, so a quiz can't be built. Try another video or paste a transcript.",
        retryable: false,
        videoId: canonicalVideoId,
        analysisSessionId: sessionId,
        generationAttemptId: attemptId
      });
      return;
    }

    // Cancel any previous jobs running on this session
    GenerationJobService.cancelSessionJobs(sessionId);

    const parsedCount = Number(count);
    const normalizedCount = [10, 15, 20, 25].includes(parsedCount) ? parsedCount : 25;
    const normalizedDifficulty: 'easy' | 'medium' | 'hard' =
      ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';
    const normLanguage = typeof language === 'string' && language.trim() ? language.trim() : 'en';

    const jobId = VideoIdentity.createJobId();
    const job = GenerationJobService.createJob({
      generationJobId: jobId,
      analysisSessionId: sessionId,
      generationAttemptId: attemptId,
      videoId: canonicalVideoId,
      sourceUrl: VideoIdentity.getCanonicalUrl(canonicalVideoId),
      totalQuestionCount: normalizedCount
    });

    // Start background execution asynchronously
    QuizService.generateQuiz({
      videoId: canonicalVideoId,
      videoUrl: VideoIdentity.getCanonicalUrl(canonicalVideoId),
      title: title || 'Educational Video',
      transcript: segments,
      difficulty: normalizedDifficulty,
      count: normalizedCount,
      language: normLanguage,
      apiKey,
      skipCache: Boolean(skipCache),
      analysisSessionId: sessionId,
      generationAttemptId: attemptId,
      generationJobId: jobId,
      transcriptHash: computedHash
    }).catch(err => {
      console.error(`[Job ${jobId}] Background quiz execution unhandled error:`, err);
    });

    res.status(202).json({
      ok: true,
      success: true,
      job,
      generationJobId: jobId,
      videoId: canonicalVideoId,
      analysisSessionId: sessionId,
      generationAttemptId: attemptId
    });
  }

  /**
   * Returns current status of a generation job.
   */
  static async getGenerationJob(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;
    const job = GenerationJobService.getJob(jobId);
    if (!job) {
      res.status(404).json({
        ok: false,
        success: false,
        code: 'JOB_NOT_FOUND',
        message: `Generation job ${jobId} not found.`
      });
      return;
    }

    res.json({
      ok: true,
      success: true,
      job
    });
  }

  /**
   * Cancels an active generation job.
   */
  static async cancelGenerationJob(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;
    const cancelled = GenerationJobService.cancelJob(jobId);
    res.json({
      ok: true,
      success: true,
      cancelled,
      message: cancelled ? `Job ${jobId} cancelled.` : `Job ${jobId} could not be cancelled or not found.`
    });
  }

  static async generateQuiz(req: Request, res: Response): Promise<void> {
    const { videoId, videoUrl, sourceUrl, title, transcript, difficulty, count, language, skipCache, analysisSessionId, generationAttemptId, generationJobId } = req.body;
    const apiKey = (req.headers['x-gemini-key'] as string) || undefined;

    // Phase 2 Rule 3: The server is authoritative. It re-parses sourceUrl itself,
    // derives its own videoId, and rejects if client's videoId differs. Never fallback to 'video'.
    const rawUrl = (sourceUrl || videoUrl || '').trim();
    const authoritativeFromUrl = rawUrl ? VideoIdentity.parseCanonicalVideoId(rawUrl) : null;
    const clientVideoId = (videoId || '').trim();

    if (authoritativeFromUrl && clientVideoId && authoritativeFromUrl !== clientVideoId) {
      res.status(400).json({
        ok: false,
        success: false,
        stage: 'VALIDATE_URL',
        code: 'VIDEO_ID_MISMATCH',
        message: `Mismatched video identification. URL resolves to '${authoritativeFromUrl}', but client provided '${clientVideoId}'.`,
        retryable: false,
        error: {
          code: 'VIDEO_ID_MISMATCH',
          message: 'Mismatched video identification.',
          stage: 'VALIDATE_URL',
          retryable: false
        }
      });
      return;
    }

    const canonicalVideoId = authoritativeFromUrl || (clientVideoId && clientVideoId !== 'video' ? VideoIdentity.parseCanonicalVideoId(clientVideoId) : null);

    if (!canonicalVideoId || canonicalVideoId === 'video') {
      res.status(400).json({
        ok: false,
        success: false,
        stage: 'VALIDATE_URL',
        code: 'INVALID_VIDEO_ID',
        message: 'A valid YouTube video URL or ID is required. Generic or empty IDs are rejected.',
        retryable: false,
        error: {
          code: 'INVALID_VIDEO_ID',
          message: 'Invalid video ID.',
          stage: 'VALIDATE_URL',
          retryable: false
        }
      });
      return;
    }

    const sessionId = (typeof analysisSessionId === 'string' && analysisSessionId.trim())
      ? analysisSessionId.trim()
      : VideoIdentity.createSessionId();
    const attemptId = (typeof generationAttemptId === 'string' && generationAttemptId.trim())
      ? generationAttemptId.trim()
      : 'att_1';

    // Verify transcript is valid and non-empty
    const segments = Array.isArray(transcript) ? transcript : [];
    if (segments.length === 0) {
      res.status(400).json({
        ok: false,
        success: false,
        stage: 'FETCH_TRANSCRIPT',
        code: 'TRANSCRIPT_UNAVAILABLE',
        message: "We couldn't read this video's content, so a quiz can't be built. Try another video or paste a transcript.",
        retryable: false,
        videoId: canonicalVideoId,
        analysisSessionId: sessionId,
        generationAttemptId: attemptId,
        error: {
          code: 'TRANSCRIPT_UNAVAILABLE',
          message: "We couldn't read this video's content, so a quiz can't be built. Try another video or paste a transcript.",
          stage: 'FETCH_TRANSCRIPT',
          retryable: false
        }
      });
      return;
    }

    const computedHash = VideoIdentity.computeTranscriptHash(segments);
    if (!computedHash) {
      res.status(400).json({
        ok: false,
        success: false,
        stage: 'NORMALIZE_CONTENT',
        code: 'INSUFFICIENT_VIDEO_CONTENT',
        message: "We couldn't read this video's content, so a quiz can't be built. Try another video or paste a transcript.",
        retryable: false,
        videoId: canonicalVideoId,
        analysisSessionId: sessionId,
        generationAttemptId: attemptId,
        error: {
          code: 'INSUFFICIENT_VIDEO_CONTENT',
          message: "We couldn't read this video's content, so a quiz can't be built. Try another video or paste a transcript.",
          stage: 'NORMALIZE_CONTENT',
          retryable: false
        }
      });
      return;
    }

    // Phase 3 item 9: Reject concurrent generation jobs on the same analysis session
    if (activeSessions.has(sessionId)) {
      res.status(409).json({
        ok: false,
        success: false,
        stage: 'pipeline',
        code: 'CONCURRENT_GENERATION',
        message: 'Quiz generation is already in progress for this session. Please wait for it to complete.',
        retryable: false,
        analysisSessionId: sessionId,
        generationAttemptId: attemptId,
        videoId: canonicalVideoId,
        error: {
          code: 'CONCURRENT_GENERATION',
          message: 'Quiz generation is already in progress for this session.',
          stage: 'pipeline',
          retryable: false
        }
      });
      return;
    }

    activeSessions.add(sessionId);

    try {
      const normalizedDifficulty: 'easy' | 'medium' | 'hard' =
        ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';
      const parsedCount = Number(count);
      const normalizedCount = [10, 15, 20, 25].includes(parsedCount) ? parsedCount : 25;

      const quiz = await QuizService.generateQuiz({
        videoId: canonicalVideoId,
        videoUrl: VideoIdentity.getCanonicalUrl(canonicalVideoId),
        title: title || 'Educational Video',
        transcript: segments,
        difficulty: normalizedDifficulty,
        count: normalizedCount,
        language: typeof language === 'string' && language.trim() ? language.trim() : 'en',
        apiKey,
        skipCache: Boolean(skipCache),
        analysisSessionId: sessionId,
        generationAttemptId: attemptId,
        generationJobId,
        transcriptHash: computedHash
      });

      // Strict guarantee: All questions carry current session envelope
      const finalizedQuestions = (quiz.questions || []).map((q, idx) => ({
        ...q,
        slotIndex: q.slotIndex ?? idx,
        videoId: canonicalVideoId,
        analysisSessionId: sessionId,
        generationAttemptId: attemptId,
        generationJobId
      }));

      const finalizedQuiz = {
        ...quiz,
        videoId: canonicalVideoId,
        analysisSessionId: sessionId,
        generationAttemptId: attemptId,
        generationJobId,
        isValidated: true,
        transcriptHash: computedHash,
        questions: finalizedQuestions
      };

      res.json({
        ok: true,
        success: true,
        sourceUrl: VideoIdentity.getCanonicalUrl(canonicalVideoId),
        analysisSessionId: sessionId,
        generationAttemptId: attemptId,
        videoId: canonicalVideoId,
        status: 'success',
        data: { quiz: finalizedQuiz },
        quiz: finalizedQuiz
      });
    } catch (err: any) {
      console.error('Error in QuizController.generateQuiz:', err);
      const rawCode = err.code || '';
      const rawMsg = err.message || '';
      const errStage = err.stage || 'pipeline';

      let statusCode = 500;
      let code = 'BACKEND_500';
      let message = 'An unexpected error occurred while analyzing this video. Please try again.';
      let retryable = false;
      const refId = PipelineLogger.getLastErrorRef(sessionId) || `ref_${Date.now().toString(36)}`;

      // Phase 5: Structured Error Mapping
      if (rawCode === 'NO_CAPTIONS_AVAILABLE' || rawCode === 'TRANSCRIPT_UNAVAILABLE' || rawCode === 'VIDEO_TRANSCRIPT_UNAVAILABLE' || rawMsg.includes('NO_CAPTIONS')) {
        statusCode = 404;
        code = 'TRANSCRIPT_UNAVAILABLE';
        message = "We couldn't get captions for this video. Try another video or paste a transcript.";
        retryable = false;
      } else if (rawCode === 'ANALYSIS_TIMEOUT' || rawCode === 'GENERATION_TIMEOUT' || rawCode === 'AI_TIMEOUT' || err.code === 'ETIMEDOUT' || rawMsg.includes('timeout') || rawMsg.includes('timed out')) {
        statusCode = 408;
        code = 'AI_TIMEOUT';
        message = "Quiz generation took too long. Please try again.";
        retryable = true;
      } else if (rawCode === 'RATE_LIMITED' || rawCode === 'RATE_LIMIT_EXCEEDED' || err.status === 429 || rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('429')) {
        statusCode = 503;
        code = 'RATE_LIMITED';
        message = "Quiz generation is temporarily unavailable due to rate limits. Please try again in a moment.";
        retryable = true;
      } else if (rawCode === 'AI_INVALID_RESPONSE' || rawCode === 'MALFORMED_AI_RESPONSE') {
        statusCode = 502;
        code = 'AI_INVALID_RESPONSE';
        message = "The AI model returned an unparseable response. Please retry.";
        retryable = true;
      } else if (rawCode === 'INSUFFICIENT_CONCEPT_EVIDENCE' || rawCode === 'EXTRACTION_FAILED' || rawCode === 'INSUFFICIENT_EDUCATIONAL_CONTENT' || rawCode === 'VIDEO_TOO_THIN' || rawMsg.includes('identify enough concepts') || rawMsg.includes("couldn't read this video's content")) {
        statusCode = 422;
        code = 'EXTRACTION_FAILED';
        message = "We couldn't read this video's content, so a quiz can't be built. Try another video or paste a transcript.";
        retryable = false;
      } else if (rawCode === 'QUESTION_BLUEPRINT_INVALID' || rawCode === 'BLUEPRINT_VALIDATION_FAILED' || errStage === 'blueprint_validation') {
        statusCode = 422;
        code = 'QUESTION_BLUEPRINT_INVALID';
        message = "Quiz plan could not be balanced for this video. Please retry.";
        retryable = true;
      } else if (rawCode === 'QUESTION_VALIDATION_EXHAUSTED' || rawCode === 'QUIZ_VALIDATION_FAILED' || rawCode === 'QUALITY_GATE_FAILED' || errStage === 'question_generation_and_validation' || errStage === 'quality_gate') {
        statusCode = 422;
        code = 'QUESTION_VALIDATION_EXHAUSTED';
        message = `We couldn't build a high-quality quiz this time. (Ref: ${refId}) Please try again.`;
        retryable = true;
      } else {
        statusCode = 500;
        code = 'BACKEND_500';
        message = `An internal error occurred. (Ref: ${refId}) Please try again.`;
        retryable = true;
      }

      console.error(
        `[ANALYSIS ERROR]\n` +
        `REF=${refId}\n` +
        `SESSION=${sessionId}\n` +
        `VIDEO=${canonicalVideoId}\n` +
        `STAGE=${errStage}\n` +
        `CODE=${code}\n` +
        `MESSAGE=${message}\n` +
        `CAUSE=${rawMsg || String(err)}\n` +
        `TIMESTAMP=${new Date().toISOString()}`
      );

      res.status(statusCode).json({
        ok: false,
        success: false,
        stage: errStage,
        code,
        message,
        retryable,
        analysisSessionId: sessionId,
        generationAttemptId: attemptId,
        videoId: canonicalVideoId,
        referenceId: refId,
        error: {
          code,
          message,
          stage: errStage,
          retryable,
          refId
        }
      });
    } finally {
      activeSessions.delete(sessionId);
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
