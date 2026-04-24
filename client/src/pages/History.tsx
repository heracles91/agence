import { useQuery } from '@tanstack/react-query';
import { gameApi } from '@/services/api';
import type { HistoryDay } from '@/services/api';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { CrisisType } from 'agence-shared';

function scoreColor(score: number): string {
  if (score >= 70) return '#34C759';
  if (score >= 40) return '#FF9500';
  return '#FF3B30';
}

function dotColor(day: HistoryDay): string {
  if (day.crises.some((c) => !c.winningOption)) return '#FF3B30';
  if (day.crises.length > 0) return '#FF9500';
  if (day.score !== null && day.score >= 70) return '#34C759';
  if (day.score !== null && day.score < 40) return '#FF3B30';
  return '#8E8E93';
}

function accentColor(day: HistoryDay): string {
  if (day.crises.some((c) => c.type === CrisisType.VOTE_COLLECTIF)) return '#FF3B30';
  if (day.crises.some((c) => c.type === CrisisType.SUBI)) return '#FF9500';
  return 'transparent';
}

function DayCard({ day }: { day: HistoryDay }) {
  const hasActiveCrisis = day.crises.length > 0;
  const accent = accentColor(day);
  const dot = dotColor(day);

  return (
    <div className="relative z-10 flex gap-8 mb-12 group">
      {/* Timeline dot */}
      <div
        className="w-4 h-4 rounded-full mt-6 ring-4 ring-[#0A0A0A] z-10 relative flex-shrink-0 ml-px"
        style={{ backgroundColor: dot, boxShadow: `0 0 10px ${dot}60` }}
      />

      {/* Card */}
      <div
        className="flex-1 bg-[#141414] border border-zinc-800 p-8 relative overflow-hidden transition-colors group-hover:border-zinc-600"
        style={hasActiveCrisis ? { borderColor: '#FF3B3030' } : {}}
      >
        {/* Accent bar gauche */}
        {accent !== 'transparent' && (
          <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: accent }} />
        )}

        {/* Header */}
        <div className="flex justify-between items-start mb-6 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="font-['Space_Grotesk'] text-[32px] font-semibold text-white leading-none">
              JOUR {String(day.dayNumber).padStart(2, '0')}
            </h3>
            <span
              className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase font-bold mt-1 block"
              style={{ color: hasActiveCrisis ? '#FF3B30' : '#8E8E93' }}
            >
              {day.crises.some((c) => c.type === CrisisType.VOTE_COLLECTIF)
                ? 'VOTE COLLECTIF'
                : day.crises.some((c) => c.type === CrisisType.SUBI)
                ? 'CRISE SUBIE'
                : 'JOURNÉE OPÉRATIONNELLE'}
            </span>
          </div>

          {day.score !== null && (
            <div className="text-right">
              <span className="font-['Space_Grotesk'] text-[11px] tracking-widest text-zinc-500 uppercase block mb-1">
                SATISFACTION
              </span>
              <span
                className="font-['Space_Grotesk'] text-[36px] font-bold leading-none"
                style={{ color: scoreColor(day.score) }}
              >
                {day.score}%
              </span>
              {day.delta !== null && (
                <span
                  className="font-['Space_Grotesk'] text-[11px] font-bold block mt-1"
                  style={{ color: (day.delta ?? 0) >= 0 ? '#34C759' : '#FF3B30' }}
                >
                  {(day.delta ?? 0) >= 0 ? '+' : ''}{day.delta}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* News */}
        {day.news.length > 0 && (
          <div className="mb-6">
            {day.news.map((n, i) => (
              <p key={i} className="text-[16px] text-zinc-400 leading-relaxed mb-2">
                {n}
              </p>
            ))}
          </div>
        )}

        {/* AI comment */}
        {day.aiComment && (
          <div className="flex items-start gap-3 bg-zinc-900 border-l-2 border-zinc-700 p-3 mb-6">
            <span className="material-symbols-outlined text-zinc-500 text-sm mt-0.5 shrink-0">smart_toy</span>
            <p className="text-sm text-zinc-500 italic">{day.aiComment}</p>
          </div>
        )}

        {/* Crises */}
        {day.crises.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 p-4">
            <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-500 uppercase block mb-3 border-b border-zinc-800 pb-2">
              DÉCISION COLLECTIVE ARCHIVÉE
            </span>
            {day.crises.map((c) => (
              <div key={c.id} className="mb-3 last:mb-0">
                <div className="flex items-start gap-3">
                  <span
                    className="material-symbols-outlined text-base mt-0.5 shrink-0"
                    style={{
                      color: c.winningOption ? '#34C759' : '#FF3B30',
                      fontVariationSettings: "'FILL' 1",
                    }}
                  >
                    {c.winningOption ? 'check_circle' : 'cancel'}
                  </span>
                  <div>
                    <p className="font-['Space_Grotesk'] text-[13px] font-semibold text-white uppercase">
                      {c.title}
                    </p>
                    {c.winningOption && c.winningOption !== 'subi' && (
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Vote : {c.winningOption}
                      </p>
                    )}
                    {c.aiConsequence && (
                      <p className="text-[13px] text-zinc-400 italic mt-1">{c.aiConsequence}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function History() {
  const { data: days = [], isLoading } = useQuery<HistoryDay[]>({
    queryKey: ['game-history'],
    queryFn: () => gameApi.getHistory(),
    staleTime: 60_000,
  });

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white">
      <Sidebar />
      <TopBar />

      <main className="ml-64 mt-16 flex-1 p-8 pb-16">
        <div className="max-w-[900px] mx-auto">

          {/* Header */}
          <div className="border-b border-zinc-800 pb-6 mb-12 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-zinc-500">
              <span className="material-symbols-outlined text-sm">folder_open</span>
              <span className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase">
                / ARCHIVES SECRÈTES / HISTORIQUE_OPÉRATIONNEL
              </span>
            </div>
            <h2 className="font-['Space_Grotesk'] text-[72px] font-bold leading-none tracking-tighter text-white">
              SYSTEM LOGS
            </h2>
          </div>

          {/* Timeline */}
          {isLoading ? (
            <div className="space-y-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-8 animate-pulse">
                  <div className="w-4 h-4 rounded-full bg-zinc-800 mt-6 flex-shrink-0" />
                  <div className="flex-1 bg-[#141414] border border-zinc-800 p-8 h-40" />
                </div>
              ))}
            </div>
          ) : days.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <span className="material-symbols-outlined text-zinc-700 text-5xl">history</span>
              <p className="font-['Space_Grotesk'] text-[12px] tracking-widest text-zinc-700 uppercase">
                Aucun historique disponible
              </p>
            </div>
          ) : (
            <div className="relative pl-8">
              {/* Ligne verticale */}
              <div className="absolute left-[39px] top-4 bottom-0 w-px bg-zinc-800" />
              {days.map((day) => (
                <DayCard key={day.dayNumber} day={day} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
