import { Request, Response } from 'express';
import { GeminiService } from '../services/geminiService.js';

export class AssistantController {
  static async askQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { title, transcript, question, chatHistory } = req.body;
      const apiKey = (req.headers['x-gemini-key'] as string) || undefined;

      if (!question || typeof question !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_QUESTION',
            message: 'Question is required.'
          }
        });
        return;
      }

      if (!transcript || !Array.isArray(transcript)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_TRANSCRIPT',
            message: 'Transcript is required to ground the answers.'
          }
        });
        return;
      }

      const { answer, groundedInVideo } = await GeminiService.answerQuestion({
        title: title || 'Educational Video',
        transcript,
        question,
        chatHistory: Array.isArray(chatHistory) ? chatHistory : [],
        apiKey
      });

      res.json({
        success: true,
        answer,
        groundedInVideo
      });
    } catch (err: any) {
      console.error('Error in AssistantController.askQuestion:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'ASSISTANT_FAILED',
          message: err.message || 'Failed to process question.'
        }
      });
    }
  }
}
