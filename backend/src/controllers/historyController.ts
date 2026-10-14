import { Request, Response } from 'express';
import { HistoryService } from '../services/historyService.js';
import { HistoryItem } from '../types/index.js';

export class HistoryController {
  static getHistory(_req: Request, res: Response): void {
    const history = HistoryService.getAll();
    res.json({ success: true, history });
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
    res.json({ success: true, item: saved });
  }

  static getHistoryById(req: Request, res: Response): void {
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
    HistoryService.deleteById(id);
    res.json({ success: true, message: 'Item deleted successfully.' });
  }
}
