import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as votes from '../controllers/votes.controller';

const router = Router();

router.get('/roles', authMiddleware, votes.getRoleVotes);
router.post('/roles', authMiddleware, votes.castRoleVote);
router.delete('/roles', authMiddleware, votes.cancelRoleVote);

export default router;
