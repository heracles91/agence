import cron from 'node-cron';
import prisma from '../prisma';
import { runDailyUpdate } from '../services/daily.service';
import { GamePhase } from 'agence-shared';

export function initDailyCron() {
  // Vérifie toutes les heures si c'est l'heure de la mise à jour quotidienne
  cron.schedule('0 * * * *', async () => {
    try {
      const config = await prisma.gameConfig.findUnique({ where: { id: 1 } });
      if (!config || config.phase !== GamePhase.PLAYING) return;

      const now = new Date();
      if (now.getHours() !== config.dailyUpdateHour) return;

      console.log(`[cron] Déclenchement de la mise à jour quotidienne (heure: ${config.dailyUpdateHour}h)`);
      await runDailyUpdate();
    } catch (err) {
      console.error('[cron] Erreur lors de la mise à jour quotidienne:', err);
    }
  });

  console.log('[cron] Planificateur quotidien initialisé');
}
