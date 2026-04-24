import prisma from '../prisma';
import { NotificationType } from 'agence-shared';

function broadcastToUser(userId: string, event: string, payload: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { io } = require('../index') as { io: import('socket.io').Server };
  (io.to(`user:${userId}`) as unknown as { emit: (e: string, p: unknown) => void }).emit(event, payload);
}

export async function sendNotification(
  userId: string,
  type: NotificationType,
  content: string
): Promise<void> {
  const notification = await prisma.notification.create({
    data: { userId, type, content },
  });

  broadcastToUser(userId, 'notification', {
    id: notification.id,
    type: notification.type,
    content: notification.content,
    isRead: false,
    createdAt: notification.createdAt.toISOString(),
  });
}
