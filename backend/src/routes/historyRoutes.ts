import { Router } from 'express';
import { HistoryController } from '../controllers/historyController.js';

export const historyRouter = Router();

// GET /api/history - list all items
historyRouter.get('/', HistoryController.getHistory);

// POST /api/history - save or update item
historyRouter.post('/', HistoryController.saveHistory);

// GET /api/history/:id - get single item
historyRouter.get('/:id', HistoryController.getHistoryById);

// DELETE /api/history - clear all history
historyRouter.delete('/', HistoryController.clearAllHistory);

// DELETE /api/history/:id - delete item
historyRouter.delete('/:id', HistoryController.deleteHistoryItem);

