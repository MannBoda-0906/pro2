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

  static getTheme(): 'light' | 'dark' {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME);
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }

  static setTheme(theme: 'light' | 'dark'): void {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.error('Failed to set theme:', e);
    }
  }
}
