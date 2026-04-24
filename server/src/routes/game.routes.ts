import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as game from '../controllers/game.controller';

const router = Router();

router.get('/config', authMiddleware, game.getConfig);
router.get('/client', authMiddleware, game.getClientProfile);
router.get('/news', authMiddleware, game.getNews);
router.get('/scores', authMiddleware, game.getScores);

export default router;
