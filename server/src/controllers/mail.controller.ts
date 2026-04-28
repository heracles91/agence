import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../prisma';
import { emitToUser } from '../socket';

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
  const { recipientIds, subject, body } = req.body as {
    recipientIds: string[] | 'all';
    subject: string;
    body: string;
  };

  if (!recipientIds || !subject?.trim() || !body?.trim()) {
    return res.status(400).json({ error: 'recipientIds, subject et body sont requis' });
  }
  if (subject.trim().length > 120) {
    return res.status(400).json({ error: 'Objet trop long (120 caractères max)' });
  }

  const senderId = req.userId!;

  // Resolve recipient IDs
  let ids: string[];
  if (recipientIds === 'all' || (Array.isArray(recipientIds) && recipientIds[0] === 'all')) {
    const everyone = await prisma.user.findMany({
      where: { id: { not: senderId }, isAdmin: false },
      select: { id: true },
    });
    ids = everyone.map((u) => u.id);
  } else {
    ids = (recipientIds as string[]).filter((id) => id !== senderId);
  }

  if (ids.length === 0) {
    return res.status(400).json({ error: 'Aucun destinataire valide' });
  }

  // Verify all recipients exist
  const existing = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, username: true },
  });
  if (existing.length !== ids.length) {
    return res.status(404).json({ error: 'Un ou plusieurs destinataires introuvables' });
  }

  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { username: true },
  });

  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();

  // Fan-out: create one mail per recipient
  const { io } = require('../index') as { io: import('socket.io').Server };

  const created = await Promise.all(
    ids.map(async (recipientId) => {
      const mail = await prisma.internalMail.create({
        data: { senderId, recipientId, subject: trimmedSubject, body: trimmedBody },
        select: MAIL_SELECT,
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: recipientId,
          type: 'mail_new',
          content: `Nouveau message de ${sender?.username ?? 'quelqu\'un'} : ${trimmedSubject}`,
        },
      });

      // Emit real-time event
      emitToUser(io, recipientId, 'mail_new', {
        from: sender?.username ?? '',
        subject: trimmedSubject,
      });

      return mail;
    })
  );

  res.status(201).json({ data: created.map(formatMail) });
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
