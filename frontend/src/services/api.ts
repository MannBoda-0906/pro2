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
    videoUrl?: string;
    title: string;
    transcript: TranscriptSegment[];
    difficulty?: 'easy' | 'medium' | 'hard';
    count?: number;
    language?: string;
    analysisSessionId?: string;
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
      throw new Error(getErrorMessage(data.error || data || 'Failed to generate quiz.'));
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
   * Fetch history list
   */
  static async fetchHistory(): Promise<HistoryItem[]> {
    try {
      const res = await fetch(`${API_BASE}/history`);
      if (res.ok) {
        const data = await res.json();
        if (data.history && Array.isArray(data.history)) {
          return data.history;
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
      });
    } catch {
      // Ignore network fail, delete locally
    }
    StorageService.deleteHistoryItem(id);
  }
}
