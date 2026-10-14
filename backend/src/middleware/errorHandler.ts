import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error occurred.';
  const code = err.code || (statusCode === 400 ? 'BAD_REQUEST' : statusCode === 404 ? 'NOT_FOUND' : 'SERVER_ERROR');

  console.error(`[ErrorHandler] ${code} (${statusCode}):`, err);

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message
    }
  });
}
