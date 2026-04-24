import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../prisma';
import { createUser } from '../services/auth.service';
import { runDailyUpdate } from '../services/daily.service';
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

  await prisma.gameConfig.update({
    where: { id: 1 },
    data: {
      phase: GamePhase.PLAYING,
      launchDate: new Date(),
      currentDay: 1,
    },
  });

  res.json({ data: null, message: 'Jeu lancé ! Bonne chance à tous.' });
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
