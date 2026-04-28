import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../prisma';

const MAIL_SELECT = {
  id: true,
  subject: true,
  body: true,
  isRead: true,
  createdAt: true,
  sender: { select: { id: true, username: true, role: true } },
  recipient: { select: { id: true, username: true, role: true } },
} as const;

export async function getInbox(req: AuthRequest, res: Response) {
  const mails = await prisma.internalMail.findMany({
    where: { recipientId: req.userId! },
    select: MAIL_SELECT,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ data: mails.map(formatMail) });
}

export async function getSent(req: AuthRequest, res: Response) {
  const mails = await prisma.internalMail.findMany({
    where: { senderId: req.userId! },
    select: MAIL_SELECT,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ data: mails.map(formatMail) });
}

export async function sendMail(req: AuthRequest, res: Response) {
  const { recipientId, subject, body } = req.body as {
    recipientId: string;
    subject: string;
    body: string;
  };

  if (!recipientId || !subject?.trim() || !body?.trim()) {
    return res.status(400).json({ error: 'recipientId, subject et body sont requis' });
  }
  if (subject.trim().length > 120) {
    return res.status(400).json({ error: 'Objet trop long (120 caractères max)' });
  }
  if (recipientId === req.userId) {
    return res.status(400).json({ error: 'Vous ne pouvez pas vous envoyer un mail à vous-même' });
  }

  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true } });
  if (!recipient) return res.status(404).json({ error: 'Destinataire introuvable' });

  const mail = await prisma.internalMail.create({
    data: {
      senderId: req.userId!,
      recipientId,
      subject: subject.trim(),
      body: body.trim(),
    },
    select: MAIL_SELECT,
  });

  res.status(201).json({ data: formatMail(mail) });
}

export async function markRead(req: AuthRequest, res: Response) {
  const { id } = req.params;
  await prisma.internalMail.updateMany({
    where: { id, recipientId: req.userId! },
    data: { isRead: true },
  });
  res.json({ data: { ok: true } });
}

function formatMail(mail: {
  id: string;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
  sender: { id: string; username: string; role: string | null };
  recipient: { id: string; username: string; role: string | null };
}) {
  return {
    ...mail,
    createdAt: mail.createdAt.toISOString(),
  };
}
