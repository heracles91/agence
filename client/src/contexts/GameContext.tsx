import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GamePhase, type GameConfig } from 'agence-shared';
import { gameApi } from '@/services/api';

interface GameContextValue {
  phase: GamePhase;
  currentDay: number;
  loading: boolean;
}

const GameContext = createContext<GameContextValue>({
  phase: GamePhase.PRELAUNCH,
  currentDay: 1,
  loading: true,
});

export function GameProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery<GameConfig>({
    queryKey: ['game-config'],
    queryFn: () => gameApi.getConfig(),
    refetchInterval: 30_000,
    staleTime: 30_000,
  });

  return (
    <GameContext.Provider
      value={{
        phase: data?.phase ?? GamePhase.PRELAUNCH,
        currentDay: data?.currentDay ?? 1,
        loading: isLoading,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
