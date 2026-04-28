import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getInbox, getSent, sendMail, markRead } from '../controllers/mail.controller';

const router = Router();

router.get('/inbox', authMiddleware, getInbox);
router.get('/sent', authMiddleware, getSent);
router.post('/', authMiddleware, sendMail);
router.put('/:id/read', authMiddleware, markRead);

export default router;
