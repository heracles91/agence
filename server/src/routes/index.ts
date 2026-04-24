import { Router } from 'express';
import authRoutes from './auth.routes';
import votesRoutes from './votes.routes';
import adminRoutes from './admin.routes';
import gameRoutes from './game.routes';
import crisisRoutes from './crisis.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/votes', votesRoutes);
router.use('/admin', adminRoutes);
router.use('/game', gameRoutes);
router.use('/crises', crisisRoutes);

// Les routes suivantes seront ajoutées au fil des sprints :
// router.use('/minigames', minigameRoutes);
// router.use('/uploads', uploadRoutes);

export default router;
