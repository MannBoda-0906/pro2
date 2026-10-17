import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { QuizData, QuizSubmissionResult } from '../../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../../data');
const CACHE_FILE = path.join(DATA_DIR, 'quiz_pipeline_cache.json');
const ATTEMPTS_FILE = path.join(DATA_DIR, 'quiz_attempts.json');

export class QuizPersistenceService {
  private static init(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(CACHE_FILE)) {
      fs.writeFileSync(CACHE_FILE, JSON.stringify({}, null, 2), 'utf-8');
    }
    if (!fs.existsSync(ATTEMPTS_FILE)) {
      fs.writeFileSync(ATTEMPTS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  public static readonly ANALYSIS_VERSION = '2.0.0';
  public static readonly QUIZ_VERSION = 'v1';

  /**
   * Generates a fully qualified isolated cache key:
   * videoId + transcriptHash + analysisVersion + language + quizVersion + difficulty + count
   */
  public static buildCacheKey(params: {
    videoId: string;
    transcriptHash: string;
    language: string;
    difficulty: string;
    count: number;
  }): string {
    const { videoId, transcriptHash, language, difficulty, count } = params;
    return `${videoId}:${transcriptHash}:${this.ANALYSIS_VERSION}:${language.toLowerCase()}:${this.QUIZ_VERSION}:${difficulty.toLowerCase()}:${count}`;
  }

  /**
   * Caches a generated quiz keyed strictly by videoId, transcriptHash, version, language, count, and difficulty.
   */
  public static cacheQuiz(params: {
    videoId: string;
    transcriptHash: string;
    language: string;
    quiz: QuizData;
    count?: number;
    difficulty?: string;
  }): void {
    const {
      videoId,
      transcriptHash,
      language,
      quiz,
      count = 25,
      difficulty = 'medium'
    } = params;

    try {
      this.init();
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      const cache = JSON.parse(raw);
      const specificKey = this.buildCacheKey({
        videoId,
        transcriptHash,
        language,
        difficulty,
        count
      });

      cache[specificKey] = {
        cachedAt: new Date().toISOString(),
        videoId,
        transcriptHash,
        analysisVersion: this.ANALYSIS_VERSION,
        quizVersion: this.QUIZ_VERSION,
        language: language.toLowerCase(),
        difficulty: difficulty.toLowerCase(),
        count,
        quiz
      };

      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
      console.log(`[QuizPersistenceService] Successfully cached quiz under isolated key: ${specificKey}`);
    } catch (err) {
      console.warn('[QuizPersistenceService] Failed to cache quiz:', err);
    }
  }

  /**
   * Retrieves cached quiz matching videoId, transcriptHash, language, count, and difficulty.
   * Zero cross-video or stale hits allowed.
   */
  public static getCachedQuiz(params: {
    videoId: string;
    transcriptHash: string;
    language: string;
    count?: number;
    difficulty?: string;
  }): QuizData | null {
    const {
      videoId,
      transcriptHash,
      language,
      count = 25,
      difficulty = 'medium'
    } = params;

    try {
      this.init();
      if (!fs.existsSync(CACHE_FILE)) return null;
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      const cache = JSON.parse(raw);
      const specificKey = this.buildCacheKey({
        videoId,
        transcriptHash,
        language,
        difficulty,
        count
      });

      const entry = cache[specificKey];
      if (!entry || !entry.quiz) {
        return null;
      }

      // Strict validation: every dimension must match
      if (
        entry.videoId === videoId &&
        entry.transcriptHash === transcriptHash &&
        entry.analysisVersion === this.ANALYSIS_VERSION &&
        entry.quizVersion === this.QUIZ_VERSION &&
        entry.language === language.toLowerCase() &&
        entry.difficulty === difficulty.toLowerCase() &&
        entry.count === count &&
        entry.quiz.videoId === videoId
      ) {
        console.log(`[QuizPersistenceService] Cache hit: valid verified quiz for ${videoId} (${transcriptHash.slice(0, 8)})`);
        return entry.quiz;
      }

      console.warn(`[QuizPersistenceService] Cache entry rejected due to parameter mismatch for ${videoId}`);
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Clears the cache completely to ensure zero stale leakage
   */
  public static clearCache(): void {
    try {
      this.init();
      fs.writeFileSync(CACHE_FILE, JSON.stringify({}, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[QuizPersistenceService] Failed to clear cache:', err);
    }
  }

  /**
   * Records a user's quiz attempt
   */
  public static saveAttempt(attempt: {
    quizId: string;
    videoId: string;
    userAnswers: Record<string, string>;
    result: QuizSubmissionResult;
  }): void {
    try {
      this.init();
      const raw = fs.readFileSync(ATTEMPTS_FILE, 'utf-8');
      const attempts = JSON.parse(raw);
      attempts.unshift({
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        ...attempt
      });
      fs.writeFileSync(ATTEMPTS_FILE, JSON.stringify(attempts.slice(0, 100), null, 2), 'utf-8');
    } catch (err) {
      console.warn('[QuizPersistenceService] Failed to save attempt:', err);
    }
  }
}
