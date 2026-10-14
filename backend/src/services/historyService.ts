import fs from 'fs';
import { HistoryItem } from '../types/index.js';
import { HISTORY_FILE, initDatabase } from '../config/database.js';

export class HistoryService {
  static loadHistory(): HistoryItem[] {
    try {
      initDatabase();
      if (fs.existsSync(HISTORY_FILE)) {
        const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
        return JSON.parse(data) as HistoryItem[];
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
    const list = this.loadHistory();
    return list.find(h => h.id === id || h.videoId === id) || null;
  }

  static upsert(item: HistoryItem): HistoryItem {
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
    const filtered = history.filter(h => h.id !== id && h.videoId !== id);
    this.saveHistory(filtered);
    return true;
  }
}
