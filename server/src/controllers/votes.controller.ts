import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../prisma';
import { Role, GAME_ROLES } from 'agence-shared';

export async function getRoleVotes(req: AuthRequest, res: Response) {
  const [allVotes, myVote] = await Promise.all([
    prisma.roleVote.findMany({
      include: { user: { select: { id: true, username: true } } },
    }),
    prisma.roleVote.findUnique({ where: { userId: req.userId! } }),
  ]);

  const votes: Record<string, { userId: string; username: string; initials: string }[]> = {};
  for (const v of allVotes) {
    if (!votes[v.role]) votes[v.role] = [];
    votes[v.role].push({
      userId: v.user.id,
      username: v.user.username,
      initials: v.user.username.slice(0, 2).toUpperCase(),
    });
  }

  res.json({ data: { votes, myVote: myVote?.role ?? null } });
}

export async function castRoleVote(req: AuthRequest, res: Response) {
  const { role } = req.body as { role: string };

  if (!(GAME_ROLES as ReadonlyArray<string>).includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }

  await prisma.roleVote.upsert({
    where: { userId: req.userId! },
    update: { role: role as Role },
    create: { userId: req.userId!, role: role as Role },
  });

  res.json({ data: null, message: 'Vote enregistré' });
}

export async function cancelRoleVote(req: AuthRequest, res: Response) {
  await prisma.roleVote.deleteMany({ where: { userId: req.userId! } });
  res.json({ data: null, message: 'Vote annulé' });
}
