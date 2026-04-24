import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as crisis from '../controllers/crisis.controller';

const router = Router();

router.get('/', authMiddleware, crisis.getCrises);
router.post('/:id/vote', authMiddleware, crisis.castCrisisVote);

export default router;
