import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../prisma';
import { createUser } from '../services/auth.service';
import { runDailyUpdate, generateAndStoreDay } from '../services/daily.service';
import { calculateDailyScore } from '../services/score.service';
import { GamePhase, GAME_ROLES, Role } from 'agence-shared';

const USER_SAFE_SELECT = {
  id: true,
  username: true,
  email: true,
  role: true,
  isAdmin: true,
  createdAt: true,
} as const;

export async function listUsers(_req: AuthRequest, res: Response) {
  const users = await prisma.user.findMany({
    select: {
      ...USER_SAFE_SELECT,
      roleVotes: { select: { role: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ data: users });
}

export async function createUserHandler(req: AuthRequest, res: Response) {
  try {
    const { username, email, password } = req.body as {
      username: string;
      email: string;
      password: string;
    };
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email et password sont requis' });
    }
    const user = await createUser({ username, email, password });
    res.status(201).json({ data: user, message: 'Utilisateur créé' });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur création' });
  }
}

export async function deleteUserHandler(req: AuthRequest, res: Response) {
  const { id } = req.params;
  if (req.userId === id) {
    return res.status(400).json({ error: 'Tu ne peux pas te supprimer toi-même' });
  }
  try {
    await prisma.user.delete({ where: { id } });
    res.json({ data: null, message: 'Utilisateur supprimé' });
  } catch {
    res.status(404).json({ error: 'Utilisateur introuvable' });
  }
}

export async function assignRoleHandler(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { role } = req.body as { role: string | null };

  if (role !== null && !(GAME_ROLES as ReadonlyArray<string>).includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }

  await prisma.user.update({
    where: { id },
    data: { role: (role ?? null) as Role | null },
  });
  res.json({ data: null, message: 'Rôle assigné' });
}

export async function launchGame(_req: AuthRequest, res: Response) {
  const votes = await prisma.roleVote.findMany();

  // Assigne chaque rôle voté à l'utilisateur
  await Promise.all(
    votes.map((v) =>
      prisma.user.update({ where: { id: v.userId }, data: { role: v.role } })
    )
  );

  const config = await prisma.gameConfig.update({
    where: { id: 1 },
    data: {
      phase: GamePhase.PLAYING,
      launchDate: new Date(),
      currentDay: 1,
    },
  });

  // Générer le contenu du Jour 1 en arrière-plan (appel Claude ~30s)
  generateAndStoreDay(1, config.dailyUpdateHour).catch((err) =>
    console.error('[launch] Erreur génération Jour 1:', err)
  );

  res.json({ data: null, message: 'Jeu lancé ! Génération du Jour 1 en cours…' });
}

export async function triggerDailyUpdate(_req: AuthRequest, res: Response) {
  try {
    await runDailyUpdate();
    res.json({ data: null, message: 'Mise à jour quotidienne effectuée.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
}

export async function triggerScoreCalculation(_req: AuthRequest, res: Response) {
  try {
    const config = await prisma.gameConfig.findUnique({ where: { id: 1 } });
    if (!config) return res.status(404).json({ error: 'Config introuvable' });
    await calculateDailyScore(config.currentDay);
    res.json({ data: null, message: `Score calculé pour le Jour ${config.currentDay}.` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
}

export async function getAiLogs(_req: AuthRequest, res: Response) {
  const logs = await prisma.auditLog.findMany({
    where: { action: { startsWith: 'claude_' } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({
    data: logs.map((l) => ({
      id: l.id,
      action: l.action,
      details: l.details,
      createdAt: l.createdAt.toISOString(),
    })),
  });
}

export async function updateConfig(req: AuthRequest, res: Response) {
  const { dailyUpdateHour } = req.body as { dailyUpdateHour?: number };
  if (dailyUpdateHour !== undefined) {
    if (!Number.isInteger(dailyUpdateHour) || dailyUpdateHour < 0 || dailyUpdateHour > 23) {
      return res.status(400).json({ error: 'dailyUpdateHour doit être un entier entre 0 et 23' });
    }
  }
  const updated = await prisma.gameConfig.update({
    where: { id: 1 },
    data: { ...(dailyUpdateHour !== undefined && { dailyUpdateHour }) },
  });
  res.json({ data: updated, message: 'Configuration mise à jour' });
}

export async function getClientProfile(_req: AuthRequest, res: Response) {
  const profile = await prisma.clientProfile.findFirst();
  res.json({ data: profile ?? null });
}

export async function upsertClientProfile(req: AuthRequest, res: Response) {
  const { name, companyName, sector, personality, initialBrief, toleranceThreshold } = req.body as {
    name: string;
    companyName: string;
    sector: string;
    personality: string;
    initialBrief: string;
    toleranceThreshold: number;
  };

  if (!name || !companyName || !sector || !personality || !initialBrief || toleranceThreshold === undefined) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }
  if (!Number.isInteger(toleranceThreshold) || toleranceThreshold < 1 || toleranceThreshold > 100) {
    return res.status(400).json({ error: 'toleranceThreshold doit être un entier entre 1 et 100' });
  }

  const existing = await prisma.clientProfile.findFirst();
  const data = { name, companyName, sector, personality, initialBrief, toleranceThreshold };

  const profile = existing
    ? await prisma.clientProfile.update({ where: { id: existing.id }, data })
    : await prisma.clientProfile.create({ data });

  res.json({ data: profile, message: 'Profil client sauvegardé' });
}

export async function forcePhase(req: AuthRequest, res: Response) {
  const { phase } = req.body as { phase: string };
  const allowed = ['VICTORY', 'DEFEAT', 'PLAYING', 'PRELAUNCH'];
  if (!allowed.includes(phase)) {
    res.status(400).json({ error: 'Phase invalide' });
    return;
  }
  await prisma.gameConfig.update({ where: { id: 1 }, data: { phase: phase as import('@prisma/client').GamePhase } });

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { io } = require('../index') as { io: import('socket.io').Server };
  (io.to('game') as unknown as { emit: (e: string, p: unknown) => void }).emit('game_phase_change', phase);

  res.json({ data: { phase }, message: `Phase forcée à ${phase}` });
}
