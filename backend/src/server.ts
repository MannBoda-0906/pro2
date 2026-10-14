import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { initDatabase } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';

import { videoRouter } from './routes/videoRoutes.js';
import { summaryRouter } from './routes/summaryRoutes.js';
import { quizRouter } from './routes/quizRoutes.js';
import { flashcardRouter } from './routes/flashcardRoutes.js';
import { assistantRouter } from './routes/assistantRoutes.js';
import { historyRouter } from './routes/historyRoutes.js';

// Initialize storage / database directory
initDatabase();

export const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-gemini-key', 'Authorization']
}));

app.use(rateLimiter);
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'StudyTube AI Server',
    geminiConfigured: Boolean(config.geminiApiKey && !config.geminiApiKey.startsWith('your_')),
    model: config.geminiModel,
    timestamp: new Date().toISOString()
  });
});

// Routes (supporting both plural and singular routes for maximum compatibility)
app.use('/api/videos', videoRouter);
app.use('/api/video', videoRouter);

app.use('/api/summaries', summaryRouter);
app.use('/api/summary', summaryRouter);

app.use('/api/quizzes', quizRouter);
app.use('/api/quiz', quizRouter);

app.use('/api/flashcards', flashcardRouter);
app.use('/api/flashcard', flashcardRouter);

app.use('/api/assistant', assistantRouter);
app.use('/api/history', historyRouter);

// Centralized Global Error Handler
app.use(errorHandler);

// Server startup if run directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`🚀 StudyTube AI Server running on http://localhost:${config.port}`);
    console.log(`🤖 AI Provider: Google Gemini (${config.geminiModel}) + Adaptive Local Synthesizer`);
  });
}
