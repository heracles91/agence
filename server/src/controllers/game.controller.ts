import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../prisma';

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
