import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { ServerToClientEvents, ClientToServerEvents } from 'agence-shared';

type AgenceSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type AgenceServer = Server<ClientToServerEvents, ServerToClientEvents>;

function extractTokenFromCookie(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(';').find((c) => c.trim().startsWith('token='));
  return match ? match.split('=')[1].trim() : null;
}

export function setupSocket(io: AgenceServer) {
  io.use((socket: AgenceSocket, next) => {
    const token =
      (socket.handshake.auth as Record<string, string>).token ||
      extractTokenFromCookie(socket.handshake.headers.cookie);

    if (!token) return next(new Error('Non authentifié'));

    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as {
        userId: string;
        role: string;
        isAdmin: boolean;
      };
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      socket.data.isAdmin = payload.isAdmin;
      next();
    } catch {
      next(new Error('Token invalide'));
    }
  });

  io.on('connection', (socket: AgenceSocket) => {
    const { userId, role } = socket.data as { userId: string; role: string };

    socket.join(`user:${userId}`);
    socket.join(`role:${role}`);
    socket.join('game');

    socket.on('join_game', () => {
      socket.join('game');
    });

    socket.on('disconnect', () => {
      // cleanup si nécessaire
    });
  });
}

// Helpers exportés pour émettre depuis les services
export function emitToAll(io: AgenceServer, event: keyof ServerToClientEvents, ...args: unknown[]) {
  (io.to('game') as unknown as { emit: (...a: unknown[]) => void }).emit(event, ...args);
}

export function emitToUser(io: AgenceServer, userId: string, event: keyof ServerToClientEvents, ...args: unknown[]) {
  (io.to(`user:${userId}`) as unknown as { emit: (...a: unknown[]) => void }).emit(event, ...args);
}

export function emitToRole(io: AgenceServer, role: string, event: keyof ServerToClientEvents, ...args: unknown[]) {
  (io.to(`role:${role}`) as unknown as { emit: (...a: unknown[]) => void }).emit(event, ...args);
}
