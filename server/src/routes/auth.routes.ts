import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', auth.login);
router.post('/logout', auth.logout);
router.get('/me', authMiddleware, auth.me);
router.put('/password', authMiddleware, auth.changePassword);

export default router;
