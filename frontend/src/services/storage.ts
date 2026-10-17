import { HistoryItem } from '../types';

const STORAGE_KEYS = {
  HISTORY: 'studytube_history_v1',
  API_KEY: 'studytube_gemini_key',
  THEME: 'studytube_theme',
};

export class StorageService {
  static getHistory(): HistoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to read history from local storage:', e);
      return [];
    }
  }

  static saveHistoryItem(item: HistoryItem): HistoryItem[] {
    try {
      const current = this.getHistory();
      const existingIdx = current.findIndex(h => h.id === item.id || h.videoId === item.videoId);
      
      let updated: HistoryItem[];
      if (existingIdx >= 0) {
        updated = [...current];
        updated[existingIdx] = { ...updated[existingIdx], ...item };
      } else {
        updated = [item, ...current];
      }
      
      const capped = updated.slice(0, 50);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(capped));
      return capped;
    } catch (e) {
      console.error('Failed to save history to local storage:', e);
      return [];
    }
  }

  static deleteHistoryItem(id: string): HistoryItem[] {
    try {
      const current = this.getHistory();
      const filtered = current.filter(h => h.id !== id && h.videoId !== id);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(filtered));
      return filtered;
    } catch (e) {
      console.error('Failed to delete history item:', e);
      return [];
    }
  }

  static clearHistory(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
  }

  /**
   * Phase 2: Session-scoped storage for quiz and analysis
   */
  static saveQuizSession(videoId: string, sessionId: string, data: any): void {
    try {
      // First clean any prior session for this video to prevent memory leaks
      this.clearQuizSessions(videoId);
      const key = `studyTubeQuiz:${videoId}:${sessionId}`;
      localStorage.setItem(key, JSON.stringify({
        videoId,
        analysisSessionId: sessionId,
        savedAt: Date.now(),
        data
      }));
    } catch (e) {
      console.error('Failed to save quiz session to localStorage:', e);
    }
  }

  static getQuizSession(videoId: string, sessionId: string): any | null {
    try {
      const key = `studyTubeQuiz:${videoId}:${sessionId}`;
      const item = localStorage.getItem(key);
      if (!item) return null;
      const parsed = JSON.parse(item);
      if (parsed.videoId === videoId && parsed.analysisSessionId === sessionId) {
        return parsed.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  static clearQuizSessions(exceptVideoId?: string, exceptSessionId?: string): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('studyTubeQuiz:') || k === 'studytube_quiz_cache' || k === 'latestQuiz')) {
          if (exceptVideoId && exceptSessionId && k === `studyTubeQuiz:${exceptVideoId}:${exceptSessionId}`) {
            continue;
          }
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.error('Failed clearing quiz sessions:', e);
    }
  }

  static getApiKey(): string {
    try {
      return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
    } catch {
      return '';
    }
  }

  static setApiKey(key: string): void {
    try {
      if (key) {
        localStorage.setItem(STORAGE_KEYS.API_KEY, key.trim());
      } else {
        localStorage.removeItem(STORAGE_KEYS.API_KEY);
      }
    } catch (e) {
      console.error('Failed to save API key:', e);
    }
  }

  static getThemeMode(): 'light' | 'dark' | 'system' {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME);
      if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
      return 'system';
    } catch {
      return 'system';
    }
  }

  static getEffectiveTheme(mode?: 'light' | 'dark' | 'system'): 'light' | 'dark' {
    const currentMode = mode || this.getThemeMode();
    if (currentMode === 'dark') return 'dark';
    if (currentMode === 'light') return 'light';
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }

  static applyTheme(mode: 'light' | 'dark' | 'system'): 'light' | 'dark' {
    const effective = this.getEffectiveTheme(mode);
    try {
      const root = document.documentElement;
      root.setAttribute('data-theme', effective);
      if (effective === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      root.style.colorScheme = effective;
    } catch (e) {
      console.error('Failed to apply theme to DOM:', e);
    }
    return effective;
  }

  static setThemeMode(mode: 'light' | 'dark' | 'system'): 'light' | 'dark' {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, mode);
    } catch (e) {
      console.error('Failed to save theme to localStorage:', e);
    }
    return this.applyTheme(mode);
  }

  static getTheme(): 'light' | 'dark' {
    return this.getEffectiveTheme();
  }

  static setTheme(theme: 'light' | 'dark'): void {
    this.setThemeMode(theme);
  }
}
