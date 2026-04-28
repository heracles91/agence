import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gameApi, voteApi } from '@/services/api';
import { CrisisCard } from '@/components/CrisisCard';
import { Sidebar } from '@/components/layout/Sidebar';
import { useGame } from '@/contexts/GameContext';
import { useSocket } from '@/hooks/useSocket';
import type { Crisis } from 'agence-shared';

export function Crisis() {
  useSocket();
  const queryClient = useQueryClient();
  const { currentDay } = useGame();

  const { data: crises = [], isLoading } = useQuery<Crisis[]>({
    queryKey: ['crises'],
    queryFn: () => gameApi.getCrises(),
    refetchInterval: 30_000,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['game-history'],
    queryFn: () => gameApi.getHistory(),
  });

  const voteMutation = useMutation({
    mutationFn: ({ crisisId, optionId }: { crisisId: string; optionId: string }) =>
      voteApi.castCrisisVote(crisisId, optionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crises'] }),
  });

  const active = crises.filter((c) => !c.winningOption);
  const resolvedToday = crises.filter((c) => !!c.winningOption);

  const pastDays = history
    .filter((d) => d.dayNumber < currentDay && d.crises.length > 0)
    .sort((a, b) => b.dayNumber - a.dayNumber);

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white">
      <Sidebar />

      <main className="ml-64 flex-1 min-h-screen p-12">
        {/* Header */}
        <header className="max-w-[900px] mx-auto mb-12 border-b border-zinc-800 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-1 bg-[#141414] border border-zinc-800 font-['Space_Grotesk'] text-[12px] tracking-widest font-bold uppercase text-zinc-500">
              JOUR {currentDay}
            </span>
            <span className="font-['Space_Grotesk'] text-[12px] tracking-widest font-bold uppercase text-white">
              CRISIS MGMT
            </span>
          </div>
          <h2 className="font-['Space_Grotesk'] text-[56px] font-bold text-white leading-none uppercase tracking-tighter">
            Gestion<br />des Crises
          </h2>
        </header>

        <div className="max-w-[900px] mx-auto space-y-12">

          {/* ─── Alertes actives ─────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              {active.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#FF3B30] animate-pulse" />
              )}
              <span className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase text-zinc-500">
                Alertes en cours
              </span>
              {active.length > 0 && (
                <span className="font-['Space_Grotesk'] text-[11px] font-bold text-[#FF3B30]">
                  {active.length}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="py-16 text-center text-zinc-700 font-['Inter'] text-sm">Chargement…</div>
            ) : active.length === 0 ? (
              <div className="border border-zinc-800 bg-[#141414] px-8 py-12 text-center">
                <span className="material-symbols-outlined text-3xl text-zinc-700 block mb-3">shield</span>
                <p className="font-['Space_Grotesk'] text-[12px] tracking-widest uppercase text-zinc-600">
                  Aucune alerte active
                </p>
                <p className="text-[13px] text-zinc-700 mt-2 font-['Inter']">
                  L'agence est au calme. Pour l'instant.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {active.map((c) => (
                  <CrisisCard
                    key={c.id}
                    crisis={c}
                    onVote={(crisisId, optionId) =>
                      voteMutation.mutateAsync({ crisisId, optionId })
                    }
                  />
                ))}
              </div>
            )}
          </section>

          {/* ─── Crises résolues aujourd'hui ─────────────────────────── */}
          {resolvedToday.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase text-zinc-500">
                  Résolu aujourd'hui
                </span>
              </div>
              <div className="space-y-4">
                {resolvedToday.map((c) => (
                  <CrisisCard
                    key={c.id}
                    crisis={c}
                    onVote={(crisisId, optionId) =>
                      voteMutation.mutateAsync({ crisisId, optionId })
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* ─── Archives ────────────────────────────────────────────── */}
          {pastDays.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase text-zinc-500">
                  Archives
                </span>
              </div>
              <div className="space-y-2">
                {pastDays.map((day) => (
                  <div key={day.dayNumber} className="border border-zinc-800 bg-[#141414]">
                    <div className="px-5 py-3 border-b border-zinc-800/60 flex items-center gap-3">
                      <span className="font-['Space_Grotesk'] text-[10px] tracking-widest font-bold uppercase text-zinc-600 border border-zinc-800 px-2 py-0.5">
                        JOUR {day.dayNumber}
                      </span>
                      <span className="font-['Space_Grotesk'] text-[11px] text-zinc-600">
                        {day.crises.length} crise{day.crises.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="divide-y divide-zinc-900">
                      {day.crises.map((c) => (
                        <div key={c.id} className="px-5 py-3 flex items-start gap-4">
                          <span
                            className={`shrink-0 mt-0.5 font-['Space_Grotesk'] text-[9px] tracking-widest font-bold uppercase px-1.5 py-0.5 ${
                              c.type === 'vote_collectif'
                                ? 'bg-zinc-800 text-zinc-500'
                                : 'bg-zinc-800 text-zinc-600'
                            }`}
                          >
                            {c.type === 'vote_collectif' ? 'VOTE' : 'SUBI'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-['Space_Grotesk'] text-[13px] font-semibold text-zinc-300 truncate">
                              {c.title}
                            </p>
                            {c.winningOption && c.winningOption !== 'subi' && (
                              <p className="text-[11px] text-zinc-600 font-['Inter'] mt-0.5">
                                Résultat : {c.winningOption}
                              </p>
                            )}
                            {c.aiConsequence && (
                              <p className="text-[12px] text-zinc-500 font-['Inter'] mt-1 italic leading-snug">
                                {c.aiConsequence}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
