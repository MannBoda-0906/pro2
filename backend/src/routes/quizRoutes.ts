import { Router } from 'express';
import { QuizController } from '../controllers/quizController.js';

export const quizRouter = Router();

// POST /api/quizzes/generate - Generates concept-level, 13-stage validated quiz
quizRouter.post('/generate', QuizController.generateQuiz);

// POST /api/quizzes/evaluate - Evaluates completed quiz submission and computes concept performance
quizRouter.post('/evaluate', QuizController.evaluateQuiz);

// POST /api/quizzes/practice - Generates targeted adaptive practice questions for weak concepts
quizRouter.post('/practice', QuizController.generatePracticeQuestions);
