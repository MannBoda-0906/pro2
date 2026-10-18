import { Request, Response } from 'express';
import { HistoryService } from '../services/historyService.js';
import { HistoryItem } from '../types/index.js';

export class HistoryController {
  static getHistory(_req: Request, res: Response): void {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const history = HistoryService.getAll();
    res.json({ success: true, history, historyClearedAt: HistoryService.getHistoryClearedAt() });
  }

  static saveHistory(req: Request, res: Response): void {
    const item: HistoryItem = req.body;
    if (!item || !item.videoId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_HISTORY_ITEM',
          message: 'Invalid history item data.'
        }
      });
      return;
    }

    const saved = HistoryService.upsert(item);
    if (!saved) {
      res.status(409).json({
        success: false,
        error: {
          code: 'STALE_HISTORY_ITEM',
          message: 'Item rejected because history was cleared after this item was created.'
        }
      });
      return;
    }
    res.json({ success: true, item: saved });
  }

  static getHistoryById(req: Request, res: Response): void {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const { id } = req.params;
    const found = HistoryService.getById(id);

    if (!found) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'History item not found.'
        }
      });
      return;
    }

    res.json({ success: true, item: found });
  }

  static deleteHistoryItem(req: Request, res: Response): void {
    const { id } = req.params;
    const deleted = HistoryService.deleteById(id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'History item not found.'
        }
      });
      return;
    }
    res.json({ success: true, message: 'Item deleted successfully.' });
  }

  static clearAllHistory(_req: Request, res: Response): void {
    try {
      const result = HistoryService.clearAll();
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.json({
        success: true,
        message: 'All history and cached quiz sessions cleared successfully.',
        clearedAt: result.clearedAt,
        itemsRemoved: result.itemsRemoved
      });
    } catch (err: any) {
      console.error('Error clearing history:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'CLEAR_HISTORY_FAILED',
          message: err.message || 'Failed to clear history on backend.'
        }
      });
    }
  }
}
