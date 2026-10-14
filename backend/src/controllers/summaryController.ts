import { Request, Response } from 'express';
import { SummaryService } from '../services/summaryService.js';

export class SummaryController {
  static async generateSummary(req: Request, res: Response): Promise<void> {
    try {
      const { videoId, videoUrl, title, transcript, language } = req.body;
      const apiKey = (req.headers['x-gemini-key'] as string) || undefined;

      const summary = await SummaryService.generateSummary({
        videoId: videoId || 'video',
        videoUrl,
        title: title || 'Educational Video',
        transcript: Array.isArray(transcript) ? transcript : [],
        language: language || 'en',
        apiKey
      });

      res.json({
        success: true,
        summary
      });
    } catch (err: any) {
      console.error('Error in SummaryController.generateSummary:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'SUMMARY_GENERATION_FAILED',
          message: err.message || 'Failed to generate summary.'
        }
      });
    }
  }
}
