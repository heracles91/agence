import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../prisma';
import { MiniGameType, NotificationType, Role, SubmissionStatus } from 'agence-shared';
import type { BudgetPrompt } from 'agence-shared';
import { sendNotification } from '../services/notification.service';
import { generateNegociationPrompt } from '../services/claude.service';

const AUTO_APPROVE_TYPES: MiniGameType[] = [
  MiniGameType.ARBITRAGE,
  MiniGameType.BUDGET,
  MiniGameType.PLANNING,
  MiniGameType.MODERATION,
  MiniGameType.REDACTION,
];

function formatMinigame(
  mg: {
    id: string; dayNumber: number; role: string; type: string; title: string;
    prompt: unknown; deadline: Date; requiresValidationFrom: string | null;
    scoreImpactSuccess: number; scoreImpactFailure: number; createdAt: Date;
  },
  submission?: {
    id: string; content: unknown; submittedAt: Date; status: string;
    validatedById: string | null; validatedAt: Date | null; validatorComment: string | null;
  } | null
) {
  return {
    id: mg.id,
    dayNumber: mg.dayNumber,
    role: mg.role,
    type: mg.type,
    title: mg.title,
    prompt: mg.prompt,
    deadline: mg.deadline.toISOString(),
    requiresValidationFrom: mg.requiresValidationFrom,
    scoreImpactSuccess: mg.scoreImpactSuccess,
    scoreImpactFailure: mg.scoreImpactFailure,
    createdAt: mg.createdAt.toISOString(),
    submission: submission
      ? {
          id: submission.id,
          content: submission.content,
          submittedAt: submission.submittedAt.toISOString(),
          status: submission.status,
          validatedById: submission.validatedById,
          validatedAt: submission.validatedAt?.toISOString() ?? null,
          validatorComment: submission.validatorComment,
        }
      : undefined,
  };
}

export async function getMyMinigame(req: AuthRequest, res: Response): Promise<void> {
  const dayNumber = parseInt(req.params.day, 10);

  if (isNaN(dayNumber)) {
    res.status(400).json({ error: 'Numéro de jour invalide' });
    return;
  }

  if (!req.userRole) {
    res.status(403).json({ error: 'Aucun rôle assigné' });
    return;
  }

  const minigame = await prisma.minigame.findFirst({
    where: { dayNumber, role: req.userRole as import('@prisma/client').Role },
    include: {
      submissions: {
        where: { userId: req.userId! },
        orderBy: { submittedAt: 'desc' },
        take: 1,
      },
    },
  });

  // RC : pas encore de mini-jeu → vérifier si DF a soumis
  if (!minigame && req.userRole === Role.COMMERCIAL) {
    const dfMg = await prisma.minigame.findFirst({
      where: { dayNumber, role: Role.DIRECTEUR_FINANCIER as unknown as import('@prisma/client').Role },
      include: {
        submissions: {
          where: { status: { not: SubmissionStatus.REJECTED } },
          take: 1,
        },
      },
    });

    if (!dfMg || dfMg.submissions.length === 0) {
      res.status(202).json({ waitingFor: 'directeur_financier', data: null });
      return;
    }

    // DF a soumis mais RC n'a pas encore de mini-jeu → générer maintenant
    const generated = await generateAndStoreRcMinigame(dayNumber).catch(() => null);
    if (!generated) {
      res.status(503).json({ error: 'Génération du mini-jeu RC échouée' });
      return;
    }

    res.json({ data: formatMinigame(generated, null) });
    return;
  }

  if (!minigame) {
    res.status(404).json({ error: 'Aucun mini-jeu pour ce jour' });
    return;
  }

  // DG : enrichir avec le rapport CE si disponible
  let ceReport: string | undefined;
  if (req.userRole === Role.DIRECTEUR_GENERAL) {
    const ceMg = await prisma.minigame.findFirst({
      where: { dayNumber, role: Role.CONSULTANT_EXTERNE as unknown as import('@prisma/client').Role },
      include: {
        submissions: {
          where: { status: SubmissionStatus.APPROVED },
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
      },
    });
    const ceContent = ceMg?.submissions[0]?.content as { text?: string } | null;
    if (ceContent?.text) ceReport = ceContent.text;
  }

  res.json({ data: { ...formatMinigame(minigame, minigame.submissions[0] ?? null), ceReport } });
}

async function generateAndStoreRcMinigame(dayNumber: number) {
  // Vérifier que RC n'a pas déjà un mini-jeu ce jour
  const existing = await prisma.minigame.findFirst({
    where: { dayNumber, role: Role.COMMERCIAL as unknown as import('@prisma/client').Role },
  });
  if (existing) return existing;

  const [dfMg, profile, recentNewsRows] = await Promise.all([
    prisma.minigame.findFirst({
      where: { dayNumber, role: Role.DIRECTEUR_FINANCIER as unknown as import('@prisma/client').Role },
      include: {
        submissions: {
          where: { status: { not: SubmissionStatus.REJECTED } },
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
      },
    }),
    prisma.clientProfile.findFirst(),
    prisma.dailyNews.findMany({
      where: { dayNumber },
      select: { content: true },
      take: 2,
    }),
  ]);

  if (!dfMg || dfMg.submissions.length === 0 || !profile) return null;

  const dfSubmission = dfMg.submissions[0];
  const dfAllocations = (dfSubmission.content as { allocations?: Record<string, number> }).allocations ?? {};
  const dfPrompt = dfMg.prompt as unknown as BudgetPrompt;

  // Calculer les items débloqués (allocation ≥ recommandé)
  const budgetConstraints: Record<string, number> = {};
  const unlockedItems: string[] = [];
  for (const item of dfPrompt.items ?? []) {
    const allocated = dfAllocations[item.id] ?? 0;
    if (allocated >= item.recommended) {
      budgetConstraints[item.id] = 1;
      unlockedItems.push(item.label);
    }
  }

  const prompt = await generateNegociationPrompt({
    dayNumber,
    client: {
      name: profile.name,
      companyName: profile.companyName,
      sector: profile.sector,
      personality: profile.personality,
      initialBrief: profile.initialBrief,
    },
    unlockedItems,
    budgetConstraints,
    recentNews: recentNewsRows.map((n) => n.content),
  });

  const config = await prisma.gameConfig.findUnique({ where: { id: 1 } });
  const deadline = new Date();
  if (config) {
    deadline.setHours(config.dailyUpdateHour, 0, 0, 0);
    deadline.setDate(deadline.getDate() + 1);
  }

  return prisma.minigame.create({
    data: {
      dayNumber,
      role: Role.COMMERCIAL as unknown as import('@prisma/client').Role,
      type: MiniGameType.NEGOCIATION as unknown as import('@prisma/client').MiniGameType,
      title: 'Négociation client',
      prompt: prompt as unknown as import('@prisma/client').Prisma.InputJsonValue,
      deadline,
      requiresValidationFrom: null,
      scoreImpactSuccess: 10,
      scoreImpactFailure: -5,
    },
  });
}

export async function submitMinigame(req: AuthRequest, res: Response): Promise<void> {
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

  const existing = await prisma.minigameSubmission.findFirst({
    where: { minigameId: id, userId: req.userId! },
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
      userId: req.userId!,
      content: content as import('@prisma/client').Prisma.InputJsonValue,
      status,
    },
  });

  // DF soumet → générer le mini-jeu du RC en arrière-plan
  if (minigame.type === MiniGameType.BUDGET) {
    generateAndStoreRcMinigame(minigame.dayNumber).then(async (rcMg) => {
      if (!rcMg) return;
      const rcUser = await prisma.user.findFirst({
        where: { role: Role.COMMERCIAL as unknown as import('@prisma/client').Role },
      });
      if (rcUser) {
        await sendNotification(
          rcUser.id,
          NotificationType.MISSION_NEW,
          'Le budget a été alloué — votre mission de négociation est disponible.'
        ).catch(() => {/* non-bloquant */});
      }
    }).catch(() => {/* non-bloquant */});
  }

  // Notifier le DC si validation requise
  if (!autoApprove && minigame.requiresValidationFrom) {
    const submitter = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { username: true },
    });
    const dcUser = await prisma.user.findFirst({
      where: { role: minigame.requiresValidationFrom as import('@prisma/client').Role },
    });
    if (dcUser) {
      await sendNotification(
        dcUser.id,
        NotificationType.MISSION_NEW,
        `Nouvelle soumission à valider : "${minigame.title}" par ${submitter?.username ?? 'un joueur'}`
      ).catch(() => {/* non-bloquant */});
    }
  }

  res.status(201).json({
    data: {
      id: submission.id,
      status: submission.status,
      submittedAt: submission.submittedAt.toISOString(),
    },
  });
}

export async function getValidationQueue(req: AuthRequest, res: Response): Promise<void> {
  if (!req.userRole) {
    res.status(403).json({ error: 'Aucun rôle assigné' });
    return;
  }

  const minigames = await prisma.minigame.findMany({
    where: { requiresValidationFrom: req.userRole as import('@prisma/client').Role },
    include: {
      submissions: {
        where: { status: SubmissionStatus.PENDING_VALIDATION },
        include: { user: { select: { id: true, username: true, role: true } } },
        orderBy: { submittedAt: 'asc' },
      },
    },
    orderBy: { dayNumber: 'desc' },
  });

  const items = minigames.flatMap((mg) =>
    mg.submissions.map((sub) => ({
      minigame: formatMinigame(mg),
      submission: {
        id: sub.id,
        content: sub.content,
        submittedAt: sub.submittedAt.toISOString(),
        status: sub.status,
        user: sub.user,
      },
    }))
  );

  res.json({ data: items });
}

export async function validateSubmission(req: AuthRequest, res: Response): Promise<void> {
  const { submissionId } = req.params;
  const { approved, comment } = req.body as { approved: boolean; comment?: string };

  const submission = await prisma.minigameSubmission.findUnique({
    where: { id: submissionId },
    include: {
      minigame: { select: { requiresValidationFrom: true, title: true } },
      user: { select: { id: true } },
    },
  });

  if (!submission) {
    res.status(404).json({ error: 'Soumission introuvable' });
    return;
  }

  if (submission.minigame.requiresValidationFrom !== req.userRole) {
    res.status(403).json({ error: 'Non autorisé à valider ce mini-jeu' });
    return;
  }

  const newStatus = approved ? SubmissionStatus.APPROVED : SubmissionStatus.REJECTED;

  await prisma.minigameSubmission.update({
    where: { id: submissionId },
    data: {
      status: newStatus,
      validatedById: req.userId!,
      validatedAt: new Date(),
      validatorComment: comment ?? null,
    },
  });

  await sendNotification(
    submission.user.id,
    NotificationType.MISSION_VALIDATED,
    approved
      ? `"${submission.minigame.title}" validé par le Directeur Créatif.${comment ? ` Note : ${comment}` : ''}`
      : `"${submission.minigame.title}" refusé.${comment ? ` Motif : ${comment}` : ''}`
  ).catch(() => {/* non-bloquant */});

  res.json({ data: { status: newStatus } });
}
