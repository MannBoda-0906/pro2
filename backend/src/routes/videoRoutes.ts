import { Router } from 'express';
import { VideoController } from '../controllers/videoController.js';
import { validateProcessVideo } from '../middleware/validation.js';

export const videoRouter = Router();

// GET /api/videos/demos - returns list of pre-configured demo videos
videoRouter.get('/demos', VideoController.getDemos);

// POST /api/videos/process - extracts ID, fetches metadata & transcript
videoRouter.post('/process', validateProcessVideo, VideoController.processVideo);
