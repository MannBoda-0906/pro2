import { Request, Response } from 'express';
import { QuizService } from '../services/quizService.js';

export class QuizController {
  static async generateQuiz(req: Request, res: Response): Promise<void> {
    try {
      const { videoId, videoUrl, title, transcript, difficulty, count, language } = req.body;
      const apiKey = (req.headers['x-gemini-key'] as string) || undefined;

      const quiz = await QuizService.generateQuiz({
        videoId: videoId || 'video',
        videoUrl,
        title: title || 'Educational Video',
        transcript: Array.isArray(transcript) ? transcript : [],
        difficulty: difficulty || 'medium',
        count: parseInt(count, 10) || 10,
        language: language || 'en',
        apiKey
      });

      res.json({
        success: true,
        quiz
      });
    } catch (err: any) {
      console.error('Error in QuizController.generateQuiz:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'QUIZ_GENERATION_FAILED',
          message: err.message || 'Failed to generate concept quiz.'
        }
      });
    }
  }

  static async generatePracticeQuestions(req: Request, res: Response): Promise<void> {
    try {
      const { videoId, title, weakConcepts, difficulty, language } = req.body;
      const apiKey = (req.headers['x-gemini-key'] as string) || undefined;

      if (!Array.isArray(weakConcepts) || weakConcepts.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_WEAK_CONCEPTS',
            message: 'Please provide at least one weak concept to generate practice questions for.'
          }
        });
        return;
      }

      const questions = await QuizService.generatePracticeQuestions({
        videoId,
        title: title || 'Targeted Practice',
        weakConcepts,
        difficulty: difficulty || 'medium',
        language: language || 'en',
        apiKey
      });

      res.json({
        success: true,
        questions
      });
    } catch (err: any) {
      console.error('Error in QuizController.generatePracticeQuestions:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'PRACTICE_GENERATION_FAILED',
          message: err.message || 'Failed to generate adaptive practice questions.'
        }
      });
    }
  }
}
