import { Router } from 'express';
import { AssistantController } from '../controllers/assistantController.js';
import { validateQuestionRequired, validateTranscriptRequired } from '../middleware/validation.js';

export const assistantRouter = Router();

// POST /api/assistant/ask - answers grounded questions
assistantRouter.post('/ask', validateTranscriptRequired, validateQuestionRequired, AssistantController.askQuestion);
