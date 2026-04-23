import { Router } from 'express';
import authRoutes from './auth.routes';

const router = Router();

router.use('/auth', authRoutes);

// Les routes suivantes seront ajoutées au fil des sprints :
// router.use('/game', gameRoutes);
// router.use('/admin', adminRoutes);
// router.use('/minigames', minigameRoutes);
// router.use('/votes', voteRoutes);
// router.use('/uploads', uploadRoutes);

export default router;
