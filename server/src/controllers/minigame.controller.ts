import { Request, Response } from 'express';
import prisma from '../prisma';
import { MiniGameType, SubmissionStatus } from 'agence-shared';

// Mini-jeux Sprint 7 : auto-approuvés (arbitrage, budget, planning, modération, rédaction)
const AUTO_APPROVE_TYPES: MiniGameType[] = [
  MiniGameType.ARBITRAGE,
  MiniGameType.BUDGET,
  MiniGameType.PLANNING,
  MiniGameType.MODERATION,
  MiniGameType.REDACTION,
];

export async function getMyMinigame(req: Request, res: Response): Promise<void> {
  const user = (req as Request & { user: { id: string; role: string | null } }).user;
  const dayNumber = parseInt(req.params.day, 10);

  if (isNaN(dayNumber)) {
    res.status(400).json({ error: 'Numéro de jour invalide' });
    return;
  }

  if (!user.role) {
    res.status(403).json({ error: 'Aucun rôle assigné' });
    return;
  }

  const minigame = await prisma.minigame.findFirst({
    where: { dayNumber, role: user.role as import('@prisma/client').Role },
    include: {
      submissions: {
        where: { userId: user.id },
        orderBy: { submittedAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!minigame) {
    res.status(404).json({ error: 'Aucun mini-jeu pour ce jour' });
    return;
  }

  res.json({
    id: minigame.id,
    dayNumber: minigame.dayNumber,
    role: minigame.role,
    type: minigame.type,
    title: minigame.title,
    prompt: minigame.prompt,
    deadline: minigame.deadline.toISOString(),
    requiresValidationFrom: minigame.requiresValidationFrom,
    scoreImpactSuccess: minigame.scoreImpactSuccess,
    scoreImpactFailure: minigame.scoreImpactFailure,
    createdAt: minigame.createdAt.toISOString(),
    submission: minigame.submissions[0]
      ? {
          id: minigame.submissions[0].id,
          content: minigame.submissions[0].content,
          submittedAt: minigame.submissions[0].submittedAt.toISOString(),
          status: minigame.submissions[0].status,
          validatedById: minigame.submissions[0].validatedById,
          validatedAt: minigame.submissions[0].validatedAt?.toISOString() ?? null,
          validatorComment: minigame.submissions[0].validatorComment,
        }
      : undefined,
  });
}

export async function submitMinigame(req: Request, res: Response): Promise<void> {
  const user = (req as Request & { user: { id: string } }).user;
  const { id } = req.params;
  const { content } = req.body as { content: Record<string, unknown> };

  if (!content || typeof content !== 'object') {
    res.status(400).json({ error: 'Contenu manquant' });
    return;
  }

  const minigame = await prisma.minigame.findUnique({ where: { id } });
  if (!minigame) {
    res.status(404).json({ error: 'Mini-jeu introuvable' });
    return;
  }

  // Vérifier si une soumission existe déjà
  const existing = await prisma.minigameSubmission.findFirst({
    where: { minigameId: id, userId: user.id },
  });
  if (existing) {
    res.status(409).json({ error: 'Déjà soumis' });
    return;
  }

  const autoApprove = AUTO_APPROVE_TYPES.includes(minigame.type as MiniGameType);
  const status = autoApprove ? SubmissionStatus.APPROVED : SubmissionStatus.PENDING_VALIDATION;

  const submission = await prisma.minigameSubmission.create({
    data: {
      minigameId: id,
      userId: user.id,
      content: content as import('@prisma/client').Prisma.InputJsonValue,
      status,
    },
  });

  res.status(201).json({
    id: submission.id,
    status: submission.status,
    submittedAt: submission.submittedAt.toISOString(),
  });
}
