import { GenerationJob, GenerationJobStatus, QuizData } from '../types/index.js';

export const STAGE_PROGRESS: Record<GenerationJobStatus, number> = {
  QUEUED: 0,
  FETCHING_VIDEO: 5,
  FETCHING_TRANSCRIPT: 12,
  ANALYZING_VIDEO: 25,
  EXTRACTING_CONCEPTS: 40,
  UNDERSTANDING_CONCEPTS: 50,
  BUILDING_CONCEPT_MAP: 58,
  BUILDING_COVERAGE_PLAN: 64,
  BUILDING_QUESTION_BLUEPRINT: 70,
  GENERATING_QUESTIONS: 75,
  VALIDATING_QUESTIONS: 82,
  REPAIRING_QUESTIONS: 92,
  FINAL_VALIDATION: 95,
  SAVING_QUIZ: 98,
  COMPLETED: 100,
  FAILED: 0,
  CANCELLED: 0,
  STALLED: 0
};

export const STAGE_DESCRIPTIONS: Record<GenerationJobStatus, string> = {
  QUEUED: 'Queued for educational analysis',
  FETCHING_VIDEO: 'Fetching video details and metadata',
  FETCHING_TRANSCRIPT: 'Retrieving captions and lecture transcript',
  ANALYZING_VIDEO: 'Analyzing video lecture and educational structure',
  EXTRACTING_CONCEPTS: 'Extracting taught curriculum concepts',
  UNDERSTANDING_CONCEPTS: 'Verifying concept evidence and mathematical formulas',
  BUILDING_CONCEPT_MAP: 'Constructing knowledge map with prerequisite relationships',
  BUILDING_COVERAGE_PLAN: 'Calculating optimal concept coverage matrix',
  BUILDING_QUESTION_BLUEPRINT: 'Designing examination question blueprint',
  GENERATING_QUESTIONS: 'Drafting grounded candidate questions',
  VALIDATING_QUESTIONS: 'Validating questions, mathematical derivations, and formulas',
  REPAIRING_QUESTIONS: 'Repairing and salvaging non-compliant question slots',
  FINAL_VALIDATION: 'Performing whole-quiz quality gate & coverage verification',
  SAVING_QUIZ: 'Persisting verified exam quiz to isolated storage',
  COMPLETED: '25-Question Exam Quiz Ready',
  FAILED: 'Quiz generation failed',
  CANCELLED: 'Generation cancelled',
  STALLED: 'Generation stalled due to inactivity'
};

export class GenerationJobService {
  private static jobs = new Map<string, GenerationJob>();
  private static activeSessionJobs = new Map<string, string>(); // sessionId -> jobId

  /**
   * Creates a new generation job with initial QUEUED status.
   */
  public static createJob(params: {
    generationJobId: string;
    analysisSessionId: string;
    generationAttemptId: string;
    videoId: string;
    sourceUrl: string;
    totalQuestionCount?: number;
    metadata?: any;
  }): GenerationJob {
    const now = Date.now();
    const job: GenerationJob = {
      generationJobId: params.generationJobId,
      analysisSessionId: params.analysisSessionId,
      generationAttemptId: params.generationAttemptId,
      videoId: params.videoId,
      sourceUrl: params.sourceUrl,
      status: 'QUEUED',
      stage: 'queued',
      stageDescription: STAGE_DESCRIPTIONS.QUEUED,
      progress: 0,
      totalQuestionCount: params.totalQuestionCount || 25,
      validQuestionCount: 0,
      invalidQuestionCount: 0,
      repairAttemptsCount: 0,
      conceptCount: 0,
      allowedConceptCount: 0,
      createdAt: now,
      updatedAt: now,
      error: null,
      quiz: null,
      metadata: params.metadata || null
    };

    this.jobs.set(params.generationJobId, job);
    this.activeSessionJobs.set(params.analysisSessionId, params.generationJobId);

    console.log(`[JOB_STATE_MACHINE] [${job.generationJobId}] CREATED | Video: ${job.videoId} | Session: ${job.analysisSessionId} | Attempt: ${job.generationAttemptId}`);
    return job;
  }

  /**
   * Retrieves a job by ID with automatic heartbeat and stall detection.
   */
  public static getJob(jobId: string): GenerationJob | null {
    if (!jobId) return null;
    const job = this.jobs.get(jobId);
    if (!job) return null;

    // Heartbeat check: If in-flight for > 150 seconds without any update, mark STALLED
    const isTerminal = ['COMPLETED', 'FAILED', 'CANCELLED', 'STALLED'].includes(job.status);
    if (!isTerminal && Date.now() - job.updatedAt > 150_000) {
      console.warn(`[JOB_STATE_MACHINE] [${jobId}] Detected STALLED job (no update for ${Math.round((Date.now() - job.updatedAt) / 1000)}s)`);
      job.status = 'STALLED';
      job.error = {
        code: 'GENERATION_STALLED',
        stage: job.stage || 'pipeline',
        message: `Generation stalled at '${job.stageDescription || job.stage}'. Please retry.`,
        refId: `stall_${Date.now().toString(36)}`,
        retryable: true
      };
      job.updatedAt = Date.now();
    }

    return job;
  }

  /**
   * Updates job stage, status, progress, and counts.
   */
  public static updateJob(
    jobId: string,
    updates: Partial<Omit<GenerationJob, 'generationJobId' | 'analysisSessionId' | 'videoId' | 'createdAt'>>
  ): GenerationJob | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    // If cancelled, do not allow subsequent work to overwrite terminal cancellation
    if (job.status === 'CANCELLED' && updates.status !== 'CANCELLED') {
      return job;
    }

    const previousStatus = job.status;
    const nextStatus = updates.status || job.status;

    // Calculate dynamic progress if validating questions
    let nextProgress = updates.progress ?? (STAGE_PROGRESS[nextStatus] ?? job.progress);
    if (nextStatus === 'VALIDATING_QUESTIONS' && updates.validQuestionCount !== undefined) {
      const total = updates.totalQuestionCount || job.totalQuestionCount || 25;
      const ratio = Math.min(1, Math.max(0, updates.validQuestionCount / total));
      // Interpolate progress between 80% and 94%
      nextProgress = Math.round(80 + ratio * 14);
    }

    const nextDescription = updates.stageDescription || STAGE_DESCRIPTIONS[nextStatus] || job.stageDescription;

    Object.assign(job, {
      ...updates,
      status: nextStatus,
      progress: nextProgress,
      stageDescription: nextDescription,
      updatedAt: Date.now()
    });

    if (previousStatus !== nextStatus || updates.validQuestionCount !== undefined) {
      console.log(
        `[JOB_STATE_MACHINE] [${job.generationJobId}] STATUS: ${job.status} (${job.progress}%) | Stage: ${job.stage} | ${job.stageDescription}` +
        (job.validQuestionCount > 0 ? ` | Valid: ${job.validQuestionCount}/${job.totalQuestionCount}` : '')
      );
    }

    return job;
  }

  /**
   * Marks a job as cancelled.
   */
  public static cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    job.status = 'CANCELLED';
    job.stage = 'cancelled';
    job.stageDescription = 'Generation cancelled by user';
    job.updatedAt = Date.now();
    console.log(`[JOB_STATE_MACHINE] [${jobId}] CANCELLED`);
    return true;
  }

  /**
   * Cancels any active jobs associated with an analysis session.
   */
  public static cancelSessionJobs(analysisSessionId: string): void {
    const jobId = this.activeSessionJobs.get(analysisSessionId);
    if (jobId) {
      this.cancelJob(jobId);
      this.activeSessionJobs.delete(analysisSessionId);
    }
  }

  /**
   * Checks if a job has been cancelled.
   */
  public static isCancelled(jobId?: string): boolean {
    if (!jobId) return false;
    const job = this.jobs.get(jobId);
    return Boolean(job && job.status === 'CANCELLED');
  }

  /**
   * Marks a job as failed with full diagnostic details.
   */
  public static failJob(
    jobId: string,
    error: {
      code: string;
      stage: string;
      message: string;
      refId?: string;
      retryable?: boolean;
    }
  ): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'FAILED';
    job.stage = error.stage || job.stage;
    job.stageDescription = `Failed at ${error.stage}: ${error.message}`;
    job.error = {
      code: error.code || 'UNKNOWN_ERROR',
      stage: error.stage || 'pipeline',
      message: error.message || 'An unexpected error occurred.',
      refId: error.refId,
      retryable: error.retryable ?? true
    };
    job.updatedAt = Date.now();

    console.error(`[JOB_STATE_MACHINE] [${jobId}] FAILED at stage '${job.stage}': ${error.message} [Code: ${error.code}]`);
  }

  /**
   * Marks a job as COMPLETED and attaches the validated final quiz.
   */
  public static completeJob(jobId: string, quiz: QuizData): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    // Rule 30: Final Source Validation
    if (quiz.videoId !== job.videoId) {
      throw new Error(`CRITICAL_ASSERTION_FAILED: Quiz videoId '${quiz.videoId}' does not match job videoId '${job.videoId}'`);
    }
    if (quiz.analysisSessionId !== job.analysisSessionId) {
      throw new Error(`CRITICAL_ASSERTION_FAILED: Quiz analysisSessionId '${quiz.analysisSessionId}' does not match job analysisSessionId '${job.analysisSessionId}'`);
    }
    if ((quiz.questions || []).length !== job.totalQuestionCount) {
      throw new Error(`CRITICAL_ASSERTION_FAILED: Quiz questions length (${quiz.questions?.length}) does not match required ${job.totalQuestionCount}`);
    }

    job.status = 'COMPLETED';
    job.stage = 'completed';
    job.stageDescription = STAGE_DESCRIPTIONS.COMPLETED;
    job.progress = 100;
    job.validQuestionCount = quiz.questions.length;
    job.quiz = quiz;
    job.updatedAt = Date.now();

    console.log(`[JOB_STATE_MACHINE] [${jobId}] COMPLETED | 100% | Validated Quiz attached with ${quiz.questions.length} questions`);
  }
}
