import { Router } from 'express';
import { authMiddleware as requireAuth } from '../middleware/auth.middleware';
import { getMyMinigame, submitMinigame } from '../controllers/minigame.controller';

const router = Router();

router.get('/:day', requireAuth, getMyMinigame);
router.post('/:id/submit', requireAuth, submitMinigame);

export default router;
