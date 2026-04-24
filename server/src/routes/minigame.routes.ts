import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getMyMinigame, submitMinigame, getValidationQueue, validateSubmission } from '../controllers/minigame.controller';

const router = Router();

router.get('/validations', authMiddleware, getValidationQueue);
router.get('/:day', authMiddleware, getMyMinigame);
router.post('/:id/submit', authMiddleware, submitMinigame);
router.put('/submissions/:submissionId/validate', authMiddleware, validateSubmission);

export default router;
