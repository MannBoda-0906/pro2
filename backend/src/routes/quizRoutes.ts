import { Router } from 'express';
import { QuizController } from '../controllers/quizController.js';

export const quizRouter = Router();

// Generation Job State Machine endpoints
quizRouter.post('/jobs', QuizController.createGenerationJob);
quizRouter.get('/jobs/:jobId', QuizController.getGenerationJob);
quizRouter.post('/jobs/:jobId/cancel', QuizController.cancelGenerationJob);

// POST /api/quizzes/generate - Generates concept-level, 13-stage validated quiz (supports synchronous execution)
quizRouter.post('/generate', QuizController.generateQuiz);

// POST /api/quizzes/evaluate - Evaluates completed quiz submission and computes concept performance
quizRouter.post('/evaluate', QuizController.evaluateQuiz);

// POST /api/quizzes/practice - Generates targeted adaptive practice questions for weak concepts
quizRouter.post('/practice', QuizController.generatePracticeQuestions);
