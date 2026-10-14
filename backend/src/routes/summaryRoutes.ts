import { Router } from 'express';
import { SummaryController } from '../controllers/summaryController.js';
import { validateTranscriptRequired } from '../middleware/validation.js';

export const summaryRouter = Router();

// POST /api/summaries/generate - generates full summary from transcript
summaryRouter.post('/generate', validateTranscriptRequired, SummaryController.generateSummary);
