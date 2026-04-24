import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import type { ServerToClientEvents, ClientToServerEvents } from 'agence-shared';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    socket = io({ path: '/socket.io', withCredentials: true });
  }
  return socket;
}

export function useSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const s = getSocket();

    s.emit('join_game');

    s.on('crisis_new', () => {
      queryClient.invalidateQueries({ queryKey: ['crises'] });
    });

    s.on('vote_update', () => {
      queryClient.invalidateQueries({ queryKey: ['crises'] });
    });

    s.on('vote_closed', () => {
      queryClient.invalidateQueries({ queryKey: ['crises'] });
    });

    s.on('score_update', () => {
      queryClient.invalidateQueries({ queryKey: ['game-scores'] });
    });

    s.on('game_phase_change', () => {
      queryClient.invalidateQueries({ queryKey: ['game-config'] });
    });

    s.on('notification', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    return () => {
      s.off('crisis_new');
      s.off('vote_update');
      s.off('vote_closed');
      s.off('score_update');
      s.off('game_phase_change');
      s.off('notification');
    };
  }, [queryClient]);
}
