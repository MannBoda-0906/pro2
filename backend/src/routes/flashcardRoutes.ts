import { Router } from 'express';
import { FlashcardController } from '../controllers/flashcardController.js';
import { validateTranscriptRequired } from '../middleware/validation.js';

export const flashcardRouter = Router();

// POST /api/flashcards/generate - generates flashcards
flashcardRouter.post('/generate', validateTranscriptRequired, FlashcardController.generateFlashcards);
