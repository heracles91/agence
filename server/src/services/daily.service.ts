import prisma from '../prisma';
import { generateDailyContent } from './claude.service';
import { GamePhase } from 'agence-shared';

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

  console.log(`[daily] Génération du contenu pour le Jour ${nextDay}...`);

  const [profile, recentScores, recentNewsRows] = await Promise.all([
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

  // Avancer le jour
  await prisma.gameConfig.update({
    where: { id: 1 },
    data: { currentDay: nextDay },
  });

  console.log(`[daily] Jour ${nextDay} généré — ${generated.news.length} news, ${privateItems.length} contenus privés`);
}
