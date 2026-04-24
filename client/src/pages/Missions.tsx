import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { minigameApi } from '@/services/api';
import { useGame } from '@/contexts/GameContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MinigameRenderer } from '@/components/minigames/MinigameRenderer';
import type { Minigame } from 'agence-shared';

export function Missions() {
  const { currentDay } = useGame();
  const queryClient = useQueryClient();

  const { data: minigame, isLoading, isError } = useQuery<Minigame>({
    queryKey: ['minigame', currentDay],
    queryFn: () => minigameApi.getMyMinigame(currentDay),
    staleTime: 60_000,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: (content: Record<string, unknown>) =>
      minigameApi.submit(minigame!.id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['minigame', currentDay] });
    },
  });

  const handleSubmit = async (content: Record<string, unknown>) => {
    await submitMutation.mutateAsync(content);
  };

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white">
      <Sidebar />
      <TopBar />

      <main className="ml-64 mt-16 flex-1 p-8 pb-16">
        <div className="max-w-[860px] mx-auto">

          {/* Header */}
          <div className="border-b border-zinc-800 pb-6 mb-10 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-zinc-500">
              <span className="material-symbols-outlined text-sm">assignment</span>
              <span className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase">
                / OPÉRATIONS / JOUR {String(currentDay).padStart(2, '0')}
              </span>
            </div>
            <h2 className="font-['Space_Grotesk'] text-[72px] font-bold leading-none tracking-tighter text-white">
              MISSIONS
            </h2>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-8 bg-zinc-800 w-1/3" />
              <div className="h-40 bg-zinc-900 border border-zinc-800" />
            </div>
          ) : isError || !minigame ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <span className="material-symbols-outlined text-zinc-700 text-5xl">assignment_late</span>
              <p className="font-['Space_Grotesk'] text-[12px] tracking-widest text-zinc-700 uppercase">
                Aucune mission assignée pour ce jour
              </p>
            </div>
          ) : (
            <div>
              {/* Mini-jeu header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-500 uppercase block mb-1">
                    {minigame.type.replace('_', ' ')}
                  </span>
                  <h3 className="font-['Space_Grotesk'] text-[24px] font-semibold text-white">
                    {minigame.title}
                  </h3>
                </div>
                <DeadlineCounter deadline={minigame.deadline} />
              </div>

              {/* Score info */}
              <div className="flex gap-4 mb-8">
                <div className="flex items-center gap-2 text-[12px] text-green-500">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    trending_up
                  </span>
                  Succès : +{minigame.scoreImpactSuccess}%
                </div>
                <div className="flex items-center gap-2 text-[12px] text-red-500">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    trending_down
                  </span>
                  Échec : {minigame.scoreImpactFailure}%
                </div>
              </div>

              <MinigameRenderer
                minigame={minigame}
                onSubmit={handleSubmit}
                submitting={submitMutation.isPending}
              />

              {submitMutation.isError && (
                <p className="text-red-400 text-[13px] mt-4">
                  Erreur lors de la soumission. Réessayez.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function DeadlineCounter({ deadline }: { deadline: string }) {
  const end = new Date(deadline).getTime();
  const now = Date.now();
  const diff = Math.max(0, end - now);
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);

  const urgent = diff < 3_600_000;

  return (
    <div className={`text-right ${urgent ? 'text-red-400' : 'text-zinc-500'}`}>
      <span className="font-['Space_Grotesk'] text-[10px] tracking-widest uppercase block mb-1">
        Deadline
      </span>
      <span className="font-['Space_Grotesk'] text-[16px] font-bold">
        {diff === 0 ? 'EXPIRÉ' : `${String(hours).padStart(2, '0')}h${String(minutes).padStart(2, '0')}`}
      </span>
    </div>
  );
}
