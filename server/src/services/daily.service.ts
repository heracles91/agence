import prisma from '../prisma';
import { generateDailyContent, generateMinigamePrompts } from './claude.service';
import { calculateDailyScore } from './score.service';
import { GamePhase, MiniGameType, Role } from 'agence-shared';

export async function runDailyUpdate(): Promise<void> {
  const config = await prisma.gameConfig.findUnique({ where: { id: 1 } });
  if (!config || config.phase !== GamePhase.PLAYING) {
    throw new Error('Le jeu n\'est pas en phase PLAYING');
  }

  const nextDay = config.currentDay + 1;

  if (nextDay > 30) {
    await prisma.gameConfig.update({
      where: { id: 1 },
      data: { phase: GamePhase.VICTORY },
    });
    console.log('[daily] Jour 30 atteint — phase VICTORY');
    return;
  }

  // 1. Calculer le score du jour qui vient de se terminer
  await calculateDailyScore(config.currentDay);

  // Vérifier si le calcul de score a déclenché un game over
  const updatedConfig = await prisma.gameConfig.findUnique({ where: { id: 1 } });
  if (updatedConfig?.phase !== GamePhase.PLAYING) return;

  console.log(`[daily] Génération du contenu pour le Jour ${nextDay}...`);

  const [profile, recentScores, recentNewsRows, resolvedCrisesRows] = await Promise.all([
    prisma.clientProfile.findFirst(),
    prisma.satisfactionScore.findMany({
      orderBy: { dayNumber: 'desc' },
      take: 3,
    }),
    prisma.dailyNews.findMany({
      orderBy: { dayNumber: 'desc' },
      take: 5,
      select: { content: true },
    }),
    prisma.crisis.findMany({
      where: { dayNumber: config.currentDay, resultApplied: true },
      select: { title: true, winningOption: true, aiConsequence: true },
    }),
  ]);

  if (!profile) throw new Error('Profil client manquant');

  const generated = await generateDailyContent({
    dayNumber: nextDay,
    client: {
      name: profile.name,
      companyName: profile.companyName,
      sector: profile.sector,
      personality: profile.personality,
      initialBrief: profile.initialBrief,
    },
    recentScores: recentScores.reverse().map((s) => ({
      dayNumber: s.dayNumber,
      score: s.score,
      delta: s.delta,
    })),
    recentNews: recentNewsRows.map((n) => n.content),
    resolvedCrises: resolvedCrisesRows.map((c) => ({
      title: c.title,
      winningOption: c.winningOption ?? 'subi',
      aiConsequence: c.aiConsequence,
    })),
  });

  // Stocker les actualités communes
  await prisma.dailyNews.createMany({
    data: generated.news.map((content) => ({ dayNumber: nextDay, content })),
  });

  // Stocker le contenu privé pour chaque joueur avec un rôle assigné
  const players = await prisma.user.findMany({
    where: { isAdmin: false, role: { not: null } },
    select: { id: true, role: true },
  });

  const privateItems = players
    .filter((p) => p.role !== null && generated.privateContent[p.role!] !== undefined)
    .map((p) => {
      const item = generated.privateContent[p.role!]!;
      return {
        userId: p.id,
        dayNumber: nextDay,
        type: item.type,
        content: item.content,
      };
    });

  if (privateItems.length > 0) {
    await prisma.privateContent.createMany({ data: privateItems });
  }

  // Générer les mini-jeux pour les 5 rôles autonomes
  const claudeInput = {
    dayNumber: nextDay,
    client: {
      name: profile.name,
      companyName: profile.companyName,
      sector: profile.sector,
      personality: profile.personality,
      initialBrief: profile.initialBrief,
    },
    recentScores: recentScores.reverse().map((s) => ({
      dayNumber: s.dayNumber,
      score: s.score,
      delta: s.delta,
    })),
    recentNews: recentNewsRows.map((n) => n.content),
  };

  const minigamePrompts = await generateMinigamePrompts(claudeInput).catch((err) => {
    console.error('[daily] Erreur génération mini-jeux:', err);
    return null;
  });

  if (minigamePrompts) {
    const deadline = new Date();
    deadline.setHours(updatedConfig!.dailyUpdateHour, 0, 0, 0);
    deadline.setDate(deadline.getDate() + 1);

    const minigameDefs: Array<{ role: Role; type: MiniGameType; title: string; prompt: object }> = [
      { role: Role.DIRECTEUR_GENERAL, type: MiniGameType.ARBITRAGE, title: 'Arbitrage stratégique', prompt: minigamePrompts.arbitrage },
      { role: Role.DIRECTEUR_FINANCIER, type: MiniGameType.BUDGET, title: 'Allocation budgétaire', prompt: minigamePrompts.budget },
      { role: Role.CHEF_DE_PROJET, type: MiniGameType.PLANNING, title: 'Séquencement des tâches', prompt: minigamePrompts.planning },
      { role: Role.SOCIAL_MEDIA, type: MiniGameType.MODERATION, title: 'Modération des contenus', prompt: minigamePrompts.moderation },
      { role: Role.CONSULTANT_EXTERNE, type: MiniGameType.REDACTION, title: 'Note de synthèse', prompt: minigamePrompts.redaction },
    ];

    await prisma.minigame.createMany({
      data: minigameDefs.map((def) => ({
        dayNumber: nextDay,
        role: def.role,
        type: def.type,
        title: def.title,
        prompt: def.prompt as import('@prisma/client').Prisma.InputJsonValue,
        deadline,
        requiresValidationFrom: null,
        scoreImpactSuccess: 10,
        scoreImpactFailure: -5,
      })),
    });
    console.log(`[daily] ${minigameDefs.length} mini-jeux générés pour le Jour ${nextDay}`);
  }

  // Avancer le jour
  await prisma.gameConfig.update({
    where: { id: 1 },
    data: { currentDay: nextDay },
  });

  console.log(`[daily] Jour ${nextDay} généré — ${generated.news.length} news, ${privateItems.length} contenus privés`);
}
