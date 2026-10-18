import {
  DemoSample,
  Flashcard,
  HistoryItem,
  QuizData,
  QuizQuestion,
  SummaryData,
  TranscriptSegment,
  VideoMetadata
} from '../types';
import { StorageService } from './storage';
import { getErrorMessage } from '../utils';

const API_BASE = '/api';

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const userKey = StorageService.getApiKey();
  if (userKey) {
    headers['x-gemini-key'] = userKey;
  }
  return headers;
}

export class ApiService {
  /**
   * Health check
   */
  static async checkHealth(): Promise<{ status: string; geminiConfigured: boolean; model: string }> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return await res.json();
    } catch {
      return { status: 'offline', geminiConfigured: false, model: 'local' };
    }
  }

  /**
   * Retrieve list of sample demo videos
   */
  static async getDemos(): Promise<DemoSample[]> {
    try {
      const res = await fetch(`${API_BASE}/videos/demos`);
      const data = await res.json();
      return data.demos || [];
    } catch (e) {
      console.error('Failed to fetch demos:', e);
      return [];
    }
  }

  /**
   * Validate and extract video metadata + transcript
   */
  static async processVideo(params: {
    url?: string;
    manualTranscript?: string;
    demoId?: string;
    language?: string;
    analysisSessionId?: string;
    signal?: AbortSignal;
  }): Promise<{
    analysisSessionId?: string;
    videoId?: string;
    status?: string;
    metadata: VideoMetadata;
    transcript: TranscriptSegment[];
    rawText: string;
    chunkCount: number;
    source: string;
  }> {
    const { signal, ...bodyParams } = params;
    const res = await fetch(`${API_BASE}/videos/process`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(bodyParams),
      signal
    });

    const data = await res.json();

    if (!res.ok || !data.success || data.ok === false) {
      const error: any = new Error(getErrorMessage(data.error || data || 'Failed to process video.'));
      error.code = data.error?.code || data.code;
      error.needsManualTranscript =
        data.needsManualTranscript ||
        data.error?.code === 'NO_CAPTIONS_AVAILABLE' ||
        data.error?.code === 'CAPTIONS_BLOCKED_OR_FETCH_FAILED';
      error.metadata = data.metadata;
      throw error;
    }

    return data;
  }

  /**
   * Generate Summary & Notes
   */
  static async generateSummary(params: {
    videoId: string;
    videoUrl?: string;
    title: string;
    transcript: TranscriptSegment[];
    language?: string;
    analysisSessionId?: string;
    signal?: AbortSignal;
  }): Promise<SummaryData> {
    const { signal, ...bodyParams } = params;
    const res = await fetch(`${API_BASE}/summaries/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(bodyParams),
      signal
    });

    const data = await res.json();
    if (!res.ok || !data.success || data.ok === false) {
      throw new Error(getErrorMessage(data.error || data || 'Failed to generate summary.'));
    }
    return data.summary;
  }

  /**
   * Generate Concept-Level, Exam-Oriented Quiz
   */
  static async generateQuiz(params: {
    videoId: string;
    sourceUrl?: string;
    videoUrl?: string;
    title: string;
    transcript: TranscriptSegment[];
    difficulty?: 'easy' | 'medium' | 'hard';
    count?: number;
    language?: string;
    analysisSessionId?: string;
    generationAttemptId?: string;
    signal?: AbortSignal;
  }): Promise<QuizData> {
    const { signal, ...bodyParams } = params;
    const res = await fetch(`${API_BASE}/quizzes/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(bodyParams),
      signal
    });

    const data = await res.json();
    if (!res.ok || !data.success || data.ok === false) {
      const errorPayload = data.error || data || {};
      const errorMsg = getErrorMessage(errorPayload);
      const error: any = new Error(errorMsg);
      error.code = errorPayload.code || data.code || 'UNKNOWN_ERROR';
      error.stage = errorPayload.stage || data.stage;
      error.retryable = typeof errorPayload.retryable === 'boolean' ? errorPayload.retryable : (typeof data.retryable === 'boolean' ? data.retryable : true);
      error.refId = errorPayload.refId || data.referenceId;
      error.analysisSessionId = data.analysisSessionId || params.analysisSessionId;
      error.generationAttemptId = data.generationAttemptId || params.generationAttemptId;
      error.videoId = data.videoId || params.videoId;
      throw error;
    }
    return data.quiz;
  }

  /**
   * Evaluate Completed Quiz Submission & Compute Detailed Concept Performance
   */
  static async evaluateQuiz(params: {
    quiz: QuizData;
    userAnswers: Record<string, string>;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/quizzes/evaluate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok || !data.success || data.ok === false) {
      throw new Error(getErrorMessage(data.error || data || 'Failed to evaluate quiz.'));
    }
    return data.result;
  }

  /**
   * Generate Adaptive Practice Questions for Weak Concepts
   */
  static async generatePracticeQuestions(params: {
    videoId?: string;
    title: string;
    weakConcepts: string[];
    difficulty?: 'easy' | 'medium' | 'hard';
    language?: string;
  }): Promise<QuizQuestion[]> {
    const res = await fetch(`${API_BASE}/quizzes/practice`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok || !data.success || data.ok === false) {
      throw new Error(getErrorMessage(data.error || data || 'Failed to generate practice questions.'));
    }
    return data.questions;
  }

  /**
   * Generate Flashcards
   */
  static async generateFlashcards(params: {
    videoId: string;
    title: string;
    transcript: TranscriptSegment[];
    count?: number;
  }): Promise<Flashcard[]> {
    const res = await fetch(`${API_BASE}/flashcards/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok || !data.success || data.ok === false) {
      throw new Error(getErrorMessage(data.error || data || 'Failed to generate flashcards.'));
    }
    return data.flashcards;
  }

  /**
   * Grounded AI Chat Assistant
   */
  static async askAssistant(params: {
    title: string;
    transcript: TranscriptSegment[];
    question: string;
    chatHistory?: { role: 'user' | 'assistant'; content: string }[];
  }): Promise<{ answer: string; groundedInVideo: boolean }> {
    const res = await fetch(`${API_BASE}/assistant/ask`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok || !data.success || data.ok === false) {
      throw new Error(getErrorMessage(data.error || data || 'Failed to get answer from assistant.'));
    }
    return data;
  }

  /**
   * Save history item to backend (and local storage)
   */
  static async saveHistory(item: HistoryItem): Promise<void> {
    try {
      await fetch(`${API_BASE}/history`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(item),
      });
    } catch {
      // Offline fallback: handled by StorageService
    }
    StorageService.saveHistoryItem(item);
  }

  /**
   * Fetch history list with explicit cache-busting
   */
  static async fetchHistory(): Promise<HistoryItem[]> {
    try {
      const res = await fetch(`${API_BASE}/history?_t=${Date.now()}`, {
        headers: getHeaders(),
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.history && Array.isArray(data.history)) {
          // If server provided historyClearedAt, synchronize it
          if (typeof data.historyClearedAt === 'number' && data.historyClearedAt > 0) {
            StorageService.setHistoryClearedAt(data.historyClearedAt);
          }
          const clearedAt = StorageService.getHistoryClearedAt();
          const validHistory = clearedAt > 0
            ? data.history.filter((h: HistoryItem) => new Date(h.createdAt || 0).getTime() >= clearedAt)
            : data.history;
          return validHistory;
        }
      }
    } catch {
      // Fallback to local storage
    }
    return StorageService.getHistory();
  }

  /**
   * Delete history item
   */
  static async deleteHistory(id: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/history/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
        cache: 'no-store'
      });
    } catch {
      // Ignore network fail, delete locally
    }
    StorageService.deleteHistoryItem(id);
  }

  /**
   * Permanently clears all history records and cached analysis on the backend
   */
  static async clearAllHistory(): Promise<{ success: boolean; clearedAt: number; itemsRemoved: number }> {
    const res = await fetch(`${API_BASE}/history`, {
      method: 'DELETE',
      headers: getHeaders(),
      cache: 'no-store'
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data?.error?.message || 'Failed to clear history on backend server.');
    }

    if (typeof data.clearedAt === 'number') {
      StorageService.setHistoryClearedAt(data.clearedAt);
    }
    return data;
  }
}
