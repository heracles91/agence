import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../prisma';
import { CrisisType } from 'agence-shared';
import type { CrisisOption } from 'agence-shared';
import { generateCrisisConsequence } from '../services/claude.service';

function getIo() {
  // Import tardif pour éviter la dépendance circulaire avec index.ts
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { io } = require('../index') as { io: import('socket.io').Server };
  return io;
}

function broadcast(event: string, payload: unknown) {
  (getIo().to('game') as unknown as { emit: (e: string, p: unknown) => void }).emit(event, payload);
}

// ─── Joueurs ──────────────────────────────────────────────────────────────────

export async function getCrises(req: AuthRequest, res: Response) {
  const config = await prisma.gameConfig.findUnique({ where: { id: 1 } });
  const dayNumber = config?.currentDay ?? 1;

  const crises = await prisma.crisis.findMany({
    where: { dayNumber },
    include: {
      crisisVotes: { select: { userId: true, optionId: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const myUserId = req.userId!;

  res.json({
    data: crises.map((c) => {
      const voteCount: Record<string, number> = {};
      for (const v of c.crisisVotes) {
        voteCount[v.optionId] = (voteCount[v.optionId] ?? 0) + 1;
      }
      const userVote = c.crisisVotes.find((v) => v.userId === myUserId)?.optionId ?? null;

      return {
        id: c.id,
        dayNumber: c.dayNumber,
        type: c.type,
        title: c.title,
        content: c.content,
        options: c.options,
        deadline: c.deadline?.toISOString() ?? null,
        winningOption: c.winningOption,
        resultApplied: c.resultApplied,
        aiConsequence: c.aiConsequence,
        createdAt: c.createdAt.toISOString(),
        voteCount,
        userVote,
      };
    }),
  });
}

export async function castCrisisVote(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { optionId } = req.body as { optionId: string };

  const crisis = await prisma.crisis.findUnique({ where: { id } });
  if (!crisis) return res.status(404).json({ error: 'Crise introuvable' });
  if (crisis.type !== CrisisType.VOTE_COLLECTIF) {
    return res.status(400).json({ error: 'Cette crise ne supporte pas les votes' });
  }
  if (crisis.winningOption) {
    return res.status(400).json({ error: 'Vote déjà clôturé' });
  }

  const options = (crisis.options as unknown as CrisisOption[]) ?? [];
  if (!options.find((o) => o.id === optionId)) {
    return res.status(400).json({ error: 'Option invalide' });
  }

  await prisma.crisisVote.upsert({
    where: { crisisId_userId: { crisisId: id, userId: req.userId! } },
    update: { optionId },
    create: { crisisId: id, userId: req.userId!, optionId },
  });

  // Recalcule les résultats et broadcast
  const allVotes = await prisma.crisisVote.findMany({ where: { crisisId: id } });
  const results: Record<string, number> = {};
  for (const v of allVotes) {
    results[v.optionId] = (results[v.optionId] ?? 0) + 1;
  }

  broadcast('vote_update', { crisisId: id, results });

  res.json({ data: null, message: 'Vote enregistré' });
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function createCrisis(req: AuthRequest, res: Response) {
  const { type, title, content, options, deadlineMinutes } = req.body as {
    type: string;
    title: string;
    content: string;
    options?: CrisisOption[];
    deadlineMinutes?: number;
  };

  if (!type || !title || !content) {
    return res.status(400).json({ error: 'type, title et content sont requis' });
  }
  if (type === CrisisType.VOTE_COLLECTIF && (!options || options.length < 2)) {
    return res.status(400).json({ error: 'Une crise Type A nécessite au moins 2 options' });
  }

  const config = await prisma.gameConfig.findUnique({ where: { id: 1 } });
  const dayNumber = config?.currentDay ?? 1;

  const deadline = deadlineMinutes
    ? new Date(Date.now() + deadlineMinutes * 60_000)
    : null;

  const crisis = await prisma.crisis.create({
    data: {
      dayNumber,
      type: type as CrisisType,
      title,
      content,
      options: options ? (options as unknown as import('@prisma/client').Prisma.InputJsonValue) : undefined,
      deadline,
    },
  });

  const payload = {
    id: crisis.id,
    dayNumber: crisis.dayNumber,
    type: crisis.type,
    title: crisis.title,
    content: crisis.content,
    options: crisis.options,
    deadline: crisis.deadline?.toISOString() ?? null,
    winningOption: null,
    resultApplied: false,
    aiConsequence: null,
    createdAt: crisis.createdAt.toISOString(),
  };

  broadcast('crisis_new', payload);

  res.status(201).json({ data: payload });
}

export async function resolveCrisis(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const crisis = await prisma.crisis.findUnique({
    where: { id },
    include: { crisisVotes: true },
  });

  if (!crisis) return res.status(404).json({ error: 'Crise introuvable' });
  if (crisis.winningOption) return res.status(400).json({ error: 'Déjà résolue' });

  let winningOption: string;

  if (crisis.type === CrisisType.SUBI) {
    winningOption = 'subi';
  } else {
    // Majorité simple
    const tally: Record<string, number> = {};
    for (const v of crisis.crisisVotes) {
      tally[v.optionId] = (tally[v.optionId] ?? 0) + 1;
    }
    const options = (crisis.options as unknown as CrisisOption[]) ?? [];
    winningOption = options[0]?.id ?? 'subi';
    let max = 0;
    for (const [opt, count] of Object.entries(tally)) {
      if (count > max) { max = count; winningOption = opt; }
    }
  }

  // Génère la conséquence narrative via Claude
  const aiConsequence = await generateCrisisConsequence({
    type: crisis.type,
    title: crisis.title,
    content: crisis.content,
    options: (crisis.options as unknown as CrisisOption[]) ?? [],
    winningOption,
  }).catch(() => 'Les conséquences de cette décision se feront sentir dans les prochains jours.');

  await prisma.crisis.update({
    where: { id },
    data: { winningOption, aiConsequence, resultApplied: true },
  });

  broadcast('vote_closed', { crisisId: id, winningOption, aiConsequence });

  res.json({ data: null, message: 'Crise résolue' });
}
