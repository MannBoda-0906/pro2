import { Request, Response, NextFunction } from 'express';

export function validateProcessVideo(req: Request, res: Response, next: NextFunction): void {
  const { url, demoId, manualTranscript } = req.body;
  if (!demoId && (!url || typeof url !== 'string' || url.trim() === '')) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_URL',
        message: 'Please provide a valid YouTube URL, video ID, or select a demo video.'
      }
    });
    return;
  }
  next();
}

export function validateTranscriptRequired(req: Request, res: Response, next: NextFunction): void {
  const { transcript } = req.body;
  if (!Array.isArray(transcript)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_TRANSCRIPT',
        message: 'A valid transcript array is required for this operation.'
      }
    });
    return;
  }
  next();
}

export function validateQuestionRequired(req: Request, res: Response, next: NextFunction): void {
  const { question } = req.body;
  if (!question || typeof question !== 'string' || question.trim() === '') {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_QUESTION',
        message: 'A non-empty question string is required.'
      }
    });
    return;
  }
  next();
}
