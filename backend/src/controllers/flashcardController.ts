import { Request, Response } from 'express';
import { FlashcardService } from '../services/flashcardService.js';

export class FlashcardController {
  static async generateFlashcards(req: Request, res: Response): Promise<void> {
    try {
      const { videoId, title, transcript, count } = req.body;
      const apiKey = (req.headers['x-gemini-key'] as string) || undefined;

      if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_TRANSCRIPT',
            message: 'Transcript is required to generate flashcards.'
          }
        });
        return;
      }

      const flashcards = await FlashcardService.generateFlashcards({
        videoId: videoId || 'video',
        title: title || 'Educational Video',
        transcript,
        count: parseInt(count, 10) || 6,
        apiKey
      });

      res.json({
        success: true,
        flashcards
      });
    } catch (err: any) {
      console.error('Error in FlashcardController.generateFlashcards:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'FLASHCARD_GENERATION_FAILED',
          message: err.message || 'Failed to generate flashcards.'
        }
      });
    }
  }
}
