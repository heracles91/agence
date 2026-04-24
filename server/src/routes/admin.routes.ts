import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as admin from '../controllers/admin.controller';
import * as crisis from '../controllers/crisis.controller';

const router = Router();

// Toutes les routes admin nécessitent authMiddleware + isAdmin (vérifié par AdminGuard côté client,
// mais on double-vérifie ici)
function requireAdmin(req: Parameters<typeof authMiddleware>[0], res: Parameters<typeof authMiddleware>[1], next: Parameters<typeof authMiddleware>[2]) {
  authMiddleware(req, res, () => {
    if (!req.isAdmin) return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    next();
  });
}

router.get('/users', requireAdmin, admin.listUsers);
router.post('/users', requireAdmin, admin.createUserHandler);
router.delete('/users/:id', requireAdmin, admin.deleteUserHandler);
router.put('/users/:id/role', requireAdmin, admin.assignRoleHandler);
router.post('/launch', requireAdmin, admin.launchGame);
router.post('/daily-update', requireAdmin, admin.triggerDailyUpdate);
router.post('/crisis', requireAdmin, crisis.createCrisis);
router.post('/crisis/:id/resolve', requireAdmin, crisis.resolveCrisis);

export default router;
