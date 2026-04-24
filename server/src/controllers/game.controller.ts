import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../prisma';
import { GamePhase } from 'agence-shared';
import { generateEndingNarrative } from '../services/claude.service';

export async function getConfig(_req: AuthRequest, res: Response) {
  const config = await prisma.gameConfig.findUnique({ where: { id: 1 } });
  if (!config) return res.status(404).json({ error: 'Config introuvable' });

  res.json({
    data: {
      phase: config.phase,
      currentDay: config.currentDay,
      launchDate: config.launchDate?.toISOString() ?? null,
      dailyUpdateHour: config.dailyUpdateHour,
    },
  });
}

export async function getClientProfile(_req: AuthRequest, res: Response) {
  const profile = await prisma.clientProfile.findFirst();
  if (!profile) return res.status(404).json({ error: 'Profil client non configuré' });

  // CRITIQUE : toleranceThreshold n'est JAMAIS inclus dans la réponse
  res.json({
    data: {
      id: profile.id,
      name: profile.name,
      companyName: profile.companyName,
      sector: profile.sector,
      personality: profile.personality,
      initialBrief: profile.initialBrief,
      createdAt: profile.createdAt.toISOString(),
    },
  });
}

export async function getNews(_req: AuthRequest, res: Response) {
  const config = await prisma.gameConfig.findUnique({ where: { id: 1 } });
  const dayNumber = config?.currentDay ?? 1;

  const news = await prisma.dailyNews.findMany({
    where: { dayNumber },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    data: news.map((n) => ({
      id: n.id,
      dayNumber: n.dayNumber,
      content: n.content,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}

export async function getScores(_req: AuthRequest, res: Response) {
  const scores = await prisma.satisfactionScore.findMany({
    orderBy: { dayNumber: 'asc' },
  });

  res.json({
    data: scores.map((s) => ({
      id: s.id,
      dayNumber: s.dayNumber,
      score: s.score,
      delta: s.delta,
      aiComment: s.aiComment,
      calculatedAt: s.calculatedAt.toISOString(),
    })),
  });
}

export async function getEnding(_req: AuthRequest, res: Response) {
  const [config, profile, scores, crises] = await Promise.all([
    prisma.gameConfig.findUnique({ where: { id: 1 } }),
    prisma.clientProfile.findFirst(),
    prisma.satisfactionScore.findMany({ orderBy: { dayNumber: 'asc' } }),
    prisma.crisis.findMany(),
  ]);

  if (!config || (config.phase !== GamePhase.VICTORY && config.phase !== GamePhase.DEFEAT)) {
    res.status(400).json({ error: 'La partie n\'est pas terminée' });
    return;
  }

  // Chercher narrative cachée dans AuditLog
  const cachedLog = await prisma.auditLog.findFirst({
    where: { action: 'claude_ending_narrative' },
    orderBy: { createdAt: 'desc' },
  });

  const scoreValues = scores.map((s) => s.score);
  const finalScore = scoreValues[scoreValues.length - 1] ?? 0;
  const bestScore = Math.max(...scoreValues, 0);
  const worstScore = Math.min(...scoreValues, 100);
  const resolvedCrises = crises.filter((c) => c.resultApplied).length;

  let narrative: string;
  if (cachedLog) {
    narrative = (cachedLog.details as { narrative?: string }).narrative ?? '';
  } else {
    narrative = await generateEndingNarrative({
      phase: config.phase as 'VICTORY' | 'DEFEAT',
      dayNumber: config.currentDay,
      finalScore,
      clientName: profile?.name ?? 'Client',
      companyName: profile?.companyName ?? 'Client',
      totalCrises: crises.length,
      resolvedCrises,
      bestScore,
      worstScore,
    }).catch(() => '');
    // Mettre à jour l'AuditLog avec la narrative
    if (narrative) {
      await prisma.auditLog.create({
        data: { action: 'claude_ending_narrative', details: { narrative, phase: config.phase, dayNumber: config.currentDay } },
      });
    }
  }

  res.json({
    data: {
      phase: config.phase,
      dayNumber: config.currentDay,
      finalScore,
      bestScore,
      worstScore,
      totalCrises: crises.length,
      resolvedCrises,
      narrative,
      scores: scores.map((s) => ({ dayNumber: s.dayNumber, score: s.score, delta: s.delta })),
    },
  });
}

export async function getNotifications(req: AuthRequest, res: Response) {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  res.json({
    data: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      content: n.content,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}

export async function markNotificationRead(req: AuthRequest, res: Response) {
  const { id } = req.params;
  await prisma.notification.updateMany({
    where: { id, userId: req.userId! },
    data: { isRead: true },
  });
  res.json({ data: { ok: true } });
}

export async function getHistory(_req: AuthRequest, res: Response) {
  const [scores, allNews, allCrises] = await Promise.all([
    prisma.satisfactionScore.findMany({ orderBy: { dayNumber: 'desc' } }),
    prisma.dailyNews.findMany({ orderBy: { dayNumber: 'desc' } }),
    prisma.crisis.findMany({ orderBy: { dayNumber: 'desc' } }),
  ]);

  const byDay: Record<number, {
    dayNumber: number;
    score: number | null;
    delta: number | null;
    aiComment: string | null;
    news: string[];
    crises: { id: string; type: string; title: string; winningOption: string | null; aiConsequence: string | null }[];
  }> = {};

  for (const s of scores) {
    byDay[s.dayNumber] = {
      dayNumber: s.dayNumber,
      score: s.score,
      delta: s.delta,
      aiComment: s.aiComment,
      news: [],
      crises: [],
    };
  }

  for (const n of allNews) {
    if (!byDay[n.dayNumber]) {
      byDay[n.dayNumber] = { dayNumber: n.dayNumber, score: null, delta: null, aiComment: null, news: [], crises: [] };
    }
    byDay[n.dayNumber].news.push(n.content);
  }

  for (const c of allCrises) {
    if (!byDay[c.dayNumber]) {
      byDay[c.dayNumber] = { dayNumber: c.dayNumber, score: null, delta: null, aiComment: null, news: [], crises: [] };
    }
    byDay[c.dayNumber].crises.push({
      id: c.id,
      type: c.type,
      title: c.title,
      winningOption: c.winningOption,
      aiConsequence: c.aiConsequence,
    });
  }

  const days = Object.values(byDay).sort((a, b) => b.dayNumber - a.dayNumber);
  res.json({ data: days });
}
