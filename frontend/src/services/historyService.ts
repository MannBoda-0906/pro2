import { ApiService } from './api';
import { HistoryItem } from '../types';

export class HistoryService {
  static async fetchHistory(): Promise<HistoryItem[]> {
    return ApiService.fetchHistory();
  }

  static async saveHistory(item: HistoryItem): Promise<void> {
    return ApiService.saveHistory(item);
  }

  static async deleteHistory(id: string): Promise<void> {
    return ApiService.deleteHistory(id);
  }
}
