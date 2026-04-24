import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../prisma';

export async function getPrivateContent(req: AuthRequest, res: Response) {
  const content = await prisma.privateContent.findMany({
    where: { userId: req.userId! },
    orderBy: [{ dayNumber: 'desc' }, { createdAt: 'desc' }],
  });

  res.json({
    data: content.map((c) => ({
      id: c.id,
      dayNumber: c.dayNumber,
      type: c.type,
      content: c.content,
      isRead: c.isRead,
      missionCompleted: c.missionCompleted,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

export async function markRead(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const item = await prisma.privateContent.findUnique({ where: { id } });

  if (!item || item.userId !== req.userId) {
    return res.status(404).json({ error: 'Contenu introuvable' });
  }

  await prisma.privateContent.update({ where: { id }, data: { isRead: true } });
  res.json({ data: null });
}

export async function markMissionComplete(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const item = await prisma.privateContent.findUnique({ where: { id } });

  if (!item || item.userId !== req.userId) {
    return res.status(404).json({ error: 'Contenu introuvable' });
  }

  if (item.type !== 'mission') {
    return res.status(400).json({ error: 'Ce contenu n\'est pas une mission' });
  }

  await prisma.privateContent.update({
    where: { id },
    data: { missionCompleted: true, isRead: true },
  });
  res.json({ data: null });
}
