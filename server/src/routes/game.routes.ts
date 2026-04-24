import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as game from '../controllers/game.controller';
import * as privateCtrl from '../controllers/private.controller';


const router = Router();

router.get('/config', authMiddleware, game.getConfig);
router.get('/client', authMiddleware, game.getClientProfile);
router.get('/news', authMiddleware, game.getNews);
router.get('/scores', authMiddleware, game.getScores);

router.get('/history', authMiddleware, game.getHistory);
router.get('/private', authMiddleware, privateCtrl.getPrivateContent);
router.put('/private/:id/read', authMiddleware, privateCtrl.markRead);
router.put('/private/:id/complete', authMiddleware, privateCtrl.markMissionComplete);

router.get('/notifications', authMiddleware, game.getNotifications);
router.put('/notifications/:id/read', authMiddleware, game.markNotificationRead);
router.get('/ending', authMiddleware, game.getEnding);

export default router;
