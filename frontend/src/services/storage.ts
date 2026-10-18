import { HistoryItem } from '../types';

export const STUDYTUBE_STORAGE_VERSION = '2.1.0';

const STORAGE_KEYS = {
  HISTORY: 'studytube_history_v1',
  API_KEY: 'studytube_gemini_key',
  THEME: 'studytube_theme',
  STORAGE_VERSION: 'studytube_storage_version',
  HISTORY_CLEARED_AT: 'studytube_history_cleared_at',
};

// Broadcast channel for multi-tab synchronization
let historyBroadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    historyBroadcastChannel = new BroadcastChannel('studytube_history_sync');
  }
} catch {
  historyBroadcastChannel = null;
}

export class StorageService {
  private static isClearing = false;

  public static setClearingGuard(active: boolean): void {
    this.isClearing = active;
  }

  public static isClearingActive(): boolean {
    return this.isClearing;
  }

  public static getHistoryClearedAt(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.HISTORY_CLEARED_AT);
      return val ? parseInt(val, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  public static setHistoryClearedAt(timestamp: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY_CLEARED_AT, timestamp.toString());
    } catch (e) {
      console.error('Failed to save historyClearedAt:', e);
    }
  }

  /**
   * Initializes versioned storage and purges incompatible legacy keys
   */
  public static initStorage(): void {
    try {
      const storedVersion = localStorage.getItem(STORAGE_KEYS.STORAGE_VERSION);
      if (storedVersion !== STUDYTUBE_STORAGE_VERSION) {
        console.log(`[StorageService] Upgrading storage version from ${storedVersion || 'legacy'} to ${STUDYTUBE_STORAGE_VERSION}`);
        
        // Purge legacy unscoped keys
        const legacyKeys = ['studytube_quiz_cache', 'latestQuiz', 'activeTab'];
        legacyKeys.forEach(k => {
          try {
            localStorage.removeItem(k);
          } catch {}
        });

        localStorage.setItem(STORAGE_KEYS.STORAGE_VERSION, STUDYTUBE_STORAGE_VERSION);
      }
    } catch (e) {
      console.warn('Storage version check failed:', e);
    }
  }

  static getHistory(): HistoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (!data) return [];
      const items = JSON.parse(data) as HistoryItem[];
      const clearedAt = this.getHistoryClearedAt();
      if (clearedAt > 0) {
        return items.filter(h => new Date(h.createdAt || 0).getTime() >= clearedAt);
      }
      return items;
    } catch (e) {
      console.error('Failed to read history from local storage:', e);
      return [];
    }
  }

  static saveHistoryItem(item: HistoryItem): HistoryItem[] {
    if (this.isClearing) {
      console.warn('[StorageService] Write rejected: clear in progress');
      return [];
    }

    const clearedAt = this.getHistoryClearedAt();
    const itemTime = new Date(item.createdAt || 0).getTime();
    if (clearedAt > 0 && itemTime < clearedAt) {
      console.warn('[StorageService] Write rejected: item was created before clear marker');
      return this.getHistory();
    }

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

  /**
   * Centralized client-side wipe across all storage layers
   */
  static clearAllClientStorage(): void {
    this.isClearing = true;
    try {
      // 1. Remove history array
      localStorage.removeItem(STORAGE_KEYS.HISTORY);

      // 2. Remove all session-scoped quiz data, answers, and legacy keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith('studyTubeQuiz:') ||
            k.startsWith('studyTubeQuizAnswers:') ||
            k === 'studytube_quiz_cache' ||
            k === 'latestQuiz' ||
            k === 'activeTab')
        ) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));

      // 3. Set persistent historyClearedAt timestamp & storage version
      const now = Date.now();
      localStorage.setItem(STORAGE_KEYS.HISTORY_CLEARED_AT, now.toString());
      localStorage.setItem(STORAGE_KEYS.STORAGE_VERSION, STUDYTUBE_STORAGE_VERSION);

      // 4. Wipe sessionStorage
      try {
        sessionStorage.clear();
      } catch {}

      // 5. Invalidate Cache Storage / Service Worker caches if present
      if (typeof window !== 'undefined' && 'caches' in window) {
        window.caches.keys().then(names => {
          names.forEach(name => window.caches.delete(name));
        }).catch(() => {});
      }

      // 6. Broadcast clear to all other open tabs
      this.broadcastClear(now);
    } catch (e) {
      console.error('Failed to clear client storage:', e);
    } finally {
      this.isClearing = false;
    }
  }

  public static broadcastClear(clearedAt: number): void {
    try {
      if (historyBroadcastChannel) {
        historyBroadcastChannel.postMessage({ type: 'CLEAR_ALL', clearedAt });
      }
      // Also dispatch storage event for older browsers
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_KEYS.HISTORY_CLEARED_AT,
          newValue: clearedAt.toString()
        })
      );
    } catch (e) {
      console.warn('Broadcast clear failed:', e);
    }
  }

  public static onHistorySync(callback: (clearedAt: number) => void): () => void {
    const channelHandler = (ev: MessageEvent) => {
      if (ev.data?.type === 'CLEAR_ALL') {
        callback(ev.data.clearedAt || Date.now());
      }
    };

    const storageHandler = (ev: StorageEvent) => {
      if (ev.key === STORAGE_KEYS.HISTORY_CLEARED_AT && ev.newValue) {
        callback(parseInt(ev.newValue, 10));
      }
    };

    if (historyBroadcastChannel) {
      historyBroadcastChannel.addEventListener('message', channelHandler);
    }
    window.addEventListener('storage', storageHandler);

    return () => {
      if (historyBroadcastChannel) {
        historyBroadcastChannel.removeEventListener('message', channelHandler);
      }
      window.removeEventListener('storage', storageHandler);
    };
  }

  /**
   * Phase 2: Session-scoped storage for quiz and analysis
   */
  static saveQuizSession(videoId: string, sessionId: string, data: any): void {
    if (this.isClearing) return;
    try {
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
        if (k && (k.startsWith('studyTubeQuiz:') || k.startsWith('studyTubeQuizAnswers:') || k === 'studytube_quiz_cache' || k === 'latestQuiz')) {
          if (exceptVideoId && exceptSessionId && (k === `studyTubeQuiz:${exceptVideoId}:${exceptSessionId}` || k === `studyTubeQuizAnswers:${exceptVideoId}:${exceptSessionId}`)) {
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

  static saveQuizAnswers(videoId: string, sessionId: string, answers: Record<string, string>): void {
    if (this.isClearing) return;
    try {
      if (!videoId || !sessionId) return;
      const key = `studyTubeQuizAnswers:${videoId}:${sessionId}`;
      const cleanAnswers: Record<string, string> = {};
      Object.entries(answers).forEach(([qId, ans]) => {
        if (typeof ans === 'string' && ans.trim().length > 0) {
          cleanAnswers[qId] = ans;
        }
      });
      localStorage.setItem(key, JSON.stringify(cleanAnswers));
    } catch (e) {
      console.error('Failed to save quiz answers to localStorage:', e);
    }
  }

  static getQuizAnswers(videoId: string, sessionId: string): Record<string, string> {
    try {
      if (!videoId || !sessionId) return {};
      const key = `studyTubeQuizAnswers:${videoId}:${sessionId}`;
      const item = localStorage.getItem(key);
      if (!item) return {};
      const parsed = JSON.parse(item);
      if (parsed && typeof parsed === 'object') {
        const clean: Record<string, string> = {};
        Object.entries(parsed).forEach(([qId, ans]) => {
          if (typeof ans === 'string' && ans.trim().length > 0) {
            clean[qId] = ans;
          }
        });
        return clean;
      }
      return {};
    } catch {
      return {};
    }
  }

  static clearQuizAnswers(videoId: string, sessionId: string): void {
    try {
      if (!videoId || !sessionId) return;
      const key = `studyTubeQuizAnswers:${videoId}:${sessionId}`;
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Failed to clear quiz answers from localStorage:', e);
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
