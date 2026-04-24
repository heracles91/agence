import { useQuery } from '@tanstack/react-query';
import { gameApi } from '@/services/api';
import { useGame } from '@/contexts/GameContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

function satisfactionColor(score: number) {
  if (score >= 70) return '#34C759';
  if (score >= 40) return '#FF9500';
  return '#FF3B30';
}

export function Dashboard() {
  const { currentDay } = useGame();

  const { data: scores } = useQuery({
    queryKey: ['game-scores'],
    queryFn: () => gameApi.getScores(),
    staleTime: 60_000,
  });

  const { data: news } = useQuery({
    queryKey: ['game-news'],
    queryFn: () => gameApi.getNews(),
    staleTime: 60_000,
  });

  const lastScore = scores?.[scores.length - 1];
  const prevScore = scores?.[scores.length - 2];
  const score = lastScore?.score ?? null;
  const color = score !== null ? satisfactionColor(score) : '#52525b';

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white">
      <Sidebar />
      <TopBar />

      <main className="ml-64 mt-16 flex-1 p-8 pb-12">
        <div className="max-w-[1200px] mx-auto">

          {/* Context header */}
          <div className="mb-8 flex justify-between items-end border-b border-zinc-800 pb-4">
            <div>
              <h2 className="font-['Space_Grotesk'] text-[72px] font-bold leading-none tracking-tighter text-white">
                JOUR {currentDay}/30
              </h2>
              <p className="font-['Space_Grotesk'] uppercase tracking-widest text-xs text-zinc-500 mt-2">
                OPÉRATION EN COURS
              </p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">

            {/* Satisfaction gauge — full width */}
            <div className="col-span-12 bg-[#141414] border border-zinc-800 p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-['Space_Grotesk'] text-[32px] font-semibold text-white uppercase">
                  Satisfaction Client
                </h3>
                {score !== null ? (
                  <span
                    className="font-['Space_Grotesk'] text-[72px] font-bold leading-none tracking-tighter"
                    style={{ color }}
                  >
                    {score}%
                  </span>
                ) : (
                  <span className="font-['Space_Grotesk'] text-[48px] font-bold text-zinc-700">—</span>
                )}
              </div>

              <div className="relative h-4 bg-zinc-900 overflow-hidden mb-4">
                {score !== null && (
                  <div
                    className="absolute top-0 left-0 h-full transition-all duration-700"
                    style={{
                      width: `${score}%`,
                      backgroundColor: color,
                      boxShadow: `0 0 10px ${color}80`,
                    }}
                  />
                )}
                {prevScore && (
                  <div
                    className="absolute top-0 h-full w-0.5 bg-[#0A0A0A] opacity-50"
                    style={{ left: `${prevScore.score}%` }}
                  />
                )}
              </div>

              <div className="flex justify-between items-start text-sm">
                <div className="flex items-center gap-2 text-zinc-500">
                  <span className="material-symbols-outlined text-base">history</span>
                  {prevScore ? (
                    <span>Hier : {prevScore.score}%</span>
                  ) : (
                    <span>Aucun historique</span>
                  )}
                </div>
                {lastScore?.aiComment && (
                  <div
                    className="flex items-start gap-2 max-w-md text-right bg-zinc-900 p-3 border-l-2"
                    style={{ borderColor: color }}
                  >
                    <span className="material-symbols-outlined" style={{ color }}>smart_toy</span>
                    <p className="text-sm text-white italic">{lastScore.aiComment}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Left col — 8/12 */}
            <div className="col-span-8 flex flex-col gap-6">

              {/* News feed */}
              <div className="bg-[#141414] border border-zinc-800 p-6">
                <h3 className="font-['Space_Grotesk'] text-[12px] tracking-widest font-bold text-zinc-500 uppercase mb-6 border-b border-zinc-800 pb-2">
                  L'AGENCE AUJOURD'HUI
                </h3>
                {!news || news.length === 0 ? (
                  <p className="text-zinc-600 text-sm italic">Aucune actualité pour ce jour.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {news.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-4 p-4 bg-zinc-900/50 hover:bg-zinc-900 transition-colors border-l-2 border-zinc-700"
                      >
                        <span className="material-symbols-outlined text-zinc-500 mt-0.5 shrink-0">visibility</span>
                        <div>
                          <span className="font-['Space_Grotesk'] text-[10px] text-zinc-500 block mb-1 uppercase tracking-widest">
                            INTELLIGENCE
                          </span>
                          <p className="text-white text-sm leading-relaxed">{item.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Crisis placeholder */}
              <div className="bg-[#141414] border border-dashed border-zinc-800 p-8 flex flex-col items-center justify-center gap-3 text-center">
                <span className="material-symbols-outlined text-zinc-700 text-4xl">crisis_alert</span>
                <p className="font-['Space_Grotesk'] text-[11px] tracking-widest text-zinc-700 uppercase">
                  Gestion des crises — Sprint 6
                </p>
              </div>
            </div>

            {/* Right col — 4/12 */}
            <div className="col-span-4 flex flex-col gap-6">

              {/* Quick KPIs — placeholders */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: 'account_balance', label: 'BUDGET' },
                  { icon: 'trending_up', label: 'RÉPUTATION' },
                ].map(({ icon, label }) => (
                  <div
                    key={label}
                    className="bg-[#141414] border border-zinc-800 p-4 flex flex-col justify-between aspect-square opacity-30"
                  >
                    <span className="material-symbols-outlined text-zinc-500">{icon}</span>
                    <div>
                      <span className="font-['Space_Grotesk'] text-[10px] text-zinc-500 block mb-1 uppercase">{label}</span>
                      <span className="font-['Space_Grotesk'] text-lg font-medium text-white">—</span>
                    </div>
                  </div>
                ))}
                <div className="col-span-2 bg-[#141414] border border-zinc-800 p-4 flex justify-between items-center opacity-30">
                  <div>
                    <span className="font-['Space_Grotesk'] text-[10px] text-zinc-500 block mb-1 uppercase">MORAL ÉQUIPE</span>
                    <span className="font-['Space_Grotesk'] text-lg font-medium text-white">—</span>
                  </div>
                  <span className="material-symbols-outlined text-zinc-500 text-3xl">sentiment_neutral</span>
                </div>
              </div>

              {/* Private mission placeholder */}
              <div className="bg-[#141414] border border-dashed border-zinc-800 p-8 flex flex-col items-center justify-center gap-3 text-center">
                <span className="material-symbols-outlined text-zinc-700 text-4xl">enhanced_encryption</span>
                <p className="font-['Space_Grotesk'] text-[11px] tracking-widest text-zinc-700 uppercase">
                  Mission privée — Sprint 4
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
