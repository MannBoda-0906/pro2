import fs from 'fs';
import { HistoryItem } from '../types/index.js';
import { HISTORY_FILE, HISTORY_CLEARED_FILE, initDatabase } from '../config/database.js';
import { QuizPersistenceService } from './quizPipeline/quizPersistenceService.js';
import { StageCheckpointService } from './quizPipeline/stageCheckpointService.js';

export class HistoryService {
  public static getHistoryClearedAt(): number {
    try {
      initDatabase();
      if (fs.existsSync(HISTORY_CLEARED_FILE)) {
        const raw = fs.readFileSync(HISTORY_CLEARED_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return typeof parsed?.clearedAt === 'number' ? parsed.clearedAt : 0;
      }
    } catch {
      // ignore
    }
    return 0;
  }

  public static setHistoryClearedAt(timestamp: number): void {
    try {
      initDatabase();
      fs.writeFileSync(
        HISTORY_CLEARED_FILE,
        JSON.stringify({ clearedAt: timestamp, iso: new Date(timestamp).toISOString() }, null, 2),
        'utf-8'
      );
    } catch (err) {
      console.error('Error saving history_cleared marker:', err);
    }
  }

  static loadHistory(): HistoryItem[] {
    try {
      initDatabase();
      if (fs.existsSync(HISTORY_FILE)) {
        const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
        const items = JSON.parse(data) as HistoryItem[];
        const clearedAt = this.getHistoryClearedAt();
        if (clearedAt > 0) {
          return items.filter(item => {
            const itemTime = item.createdAt ? new Date(item.createdAt).getTime() : 0;
            return itemTime >= clearedAt;
          });
        }
        return items;
      }
    } catch (err) {
      console.error('Error reading history file:', err);
    }
    return [];
  }

  static saveHistory(items: HistoryItem[]): void {
    try {
      initDatabase();
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(items, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving history file:', err);
    }
  }

  static getAll(): HistoryItem[] {
    return this.loadHistory();
  }

  static getById(id: string): HistoryItem | null {
    if (!id || id === 'video') return null;
    const list = this.loadHistory();
    return list.find(h => h.id === id || h.videoId === id) || null;
  }

  static upsert(item: HistoryItem): HistoryItem | null {
    if (!item.videoId || item.videoId === 'video') {
      console.warn(`[HistoryService] Rejecting upsert of item with invalid videoId: ${item.videoId}`);
      return null;
    }
    const clearedAt = this.getHistoryClearedAt();
    const itemTime = item.createdAt ? new Date(item.createdAt).getTime() : Date.now();
    if (clearedAt > 0 && itemTime < clearedAt) {
      console.warn(`[HistoryService] Rejecting upsert of stale item created before clear marker: ${item.videoId}`);
      return null;
    }

    const history = this.loadHistory();
    const existingIdx = history.findIndex(h => h.id === item.id || h.videoId === item.videoId);

    const updatedItem: HistoryItem = {
      ...item,
      id: item.id || `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: item.createdAt || new Date().toISOString()
    };

    if (existingIdx >= 0) {
      history[existingIdx] = { ...history[existingIdx], ...updatedItem };
    } else {
      history.unshift(updatedItem);
    }

    const capped = history.slice(0, 50);
    this.saveHistory(capped);
    return updatedItem;
  }

  static deleteById(id: string): boolean {
    const history = this.loadHistory();
    const existing = history.find(h => h.id === id || h.videoId === id);
    if (!existing) {
      return false;
    }
    const filtered = history.filter(h => h.id !== id && h.videoId !== id);
    this.saveHistory(filtered);
    return true;
  }

  static clearAll(): { success: boolean; clearedAt: number; itemsRemoved: number } {
    initDatabase();
    const items = this.loadHistory();
    const itemsRemoved = items.length;
    const clearedAt = Date.now();

    // 1. Wipe history records
    this.saveHistory([]);

    // 2. Set backend persistent cleared marker
    this.setHistoryClearedAt(clearedAt);

    // 3. Wipe underlying quiz pipeline cache, checkpoints, and recorded attempts
    QuizPersistenceService.clearCache();
    QuizPersistenceService.clearAttempts();
    StageCheckpointService.clearAll();

    console.log(`[HistoryService] Cleared all history (${itemsRemoved} items), cache, checkpoints, and attempts. ClearedAt=${clearedAt}`);
    return { success: true, clearedAt, itemsRemoved };
  }
}
