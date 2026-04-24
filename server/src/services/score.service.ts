import prisma from '../prisma';
import { ContentType, CrisisType, GamePhase } from 'agence-shared';
import { generateScoreComment } from './claude.service';

function broadcast(event: string, payload: unknown) {
  // Import tardif pour éviter la dépendance circulaire
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { io } = require('../index') as { io: import('socket.io').Server };
  (io.to('game') as unknown as { emit: (e: string, p: unknown) => void }).emit(event, payload);
}

export async function calculateDailyScore(dayNumber: number): Promise<void> {
  const [previousScore, missions, crises, profile, minigames] = await Promise.all([
    prisma.satisfactionScore.findUnique({ where: { dayNumber: dayNumber - 1 } }),
    prisma.privateContent.findMany({ where: { dayNumber, type: ContentType.MISSION } }),
    prisma.crisis.findMany({ where: { dayNumber } }),
    prisma.clientProfile.findFirst({
      select: { toleranceThreshold: true, name: true, companyName: true, personality: true },
    }),
    prisma.minigame.findMany({
      where: { dayNumber },
      include: {
        submissions: {
          where: { appliedToScore: false },
          orderBy: { submittedAt: 'asc' },
          take: 1,
        },
      },
    }),
  ]);

  const baseScore = previousScore?.score ?? 100;
  let delta = -2; // légère détérioration naturelle chaque jour

  // Missions privées complétées / manquées
  const completed = missions.filter((m) => m.missionCompleted).length;
  const missed = missions.filter((m) => !m.missionCompleted).length;
  delta += completed * 5;
  delta -= missed * 3;

  // Crises
  for (const crisis of crises) {
    if (!crisis.resultApplied) {
      delta -= 10; // crise ignorée = très mauvais
    } else if (crisis.type === CrisisType.SUBI) {
      delta -= 8; // crise subie = impact négatif inévitable
    }
    // crise Type A résolue = les joueurs ont géré → impact neutre
  }

  // Mini-jeux
  const submissionIds: string[] = [];
  for (const mg of minigames) {
    const sub = mg.submissions[0];
    if (sub && (sub.status === 'approved' || sub.status === 'pending_validation')) {
      delta += mg.scoreImpactSuccess;
      submissionIds.push(sub.id);
    } else if (!sub) {
      delta += mg.scoreImpactFailure; // négatif : mini-jeu manqué
    }
  }
  if (submissionIds.length > 0) {
    await prisma.minigameSubmission.updateMany({
      where: { id: { in: submissionIds } },
      data: { appliedToScore: true },
    });
  }

  const newScore = Math.max(0, Math.min(100, baseScore + delta));

  // Commentaire narratif Claude
  const aiComment = await generateScoreComment({
    dayNumber,
    previousScore: baseScore,
    newScore,
    delta,
    completedMissions: completed,
    missedMissions: missed,
    crises: crises.map((c) => ({ type: c.type, resolved: c.resultApplied, title: c.title })),
    clientName: profile?.companyName ?? 'Client',
  }).catch(() => delta >= 0
    ? 'La situation reste stable. Le client observe.'
    : 'La satisfaction du client s\'érode. Des efforts sont nécessaires.'
  );

  await prisma.satisfactionScore.upsert({
    where: { dayNumber },
    update: { score: newScore, delta, aiComment },
    create: { dayNumber, score: newScore, delta, aiComment },
  });

  console.log(`[score] Jour ${dayNumber} — ${baseScore}% → ${newScore}% (${delta >= 0 ? '+' : ''}${delta}%)`);

  // Vérification game over
  if (profile && newScore < profile.toleranceThreshold) {
    await prisma.gameConfig.update({ where: { id: 1 }, data: { phase: GamePhase.DEFEAT } });
    broadcast('game_phase_change', GamePhase.DEFEAT);
    console.log(`[score] GAME OVER — score ${newScore}% < seuil ${profile.toleranceThreshold}%`);
    return;
  }

  broadcast('score_update', {
    id: `score-day-${dayNumber}`,
    dayNumber,
    score: newScore,
    delta,
    aiComment,
    calculatedAt: new Date().toISOString(),
  });
}
