import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CrisisType, type Crisis, type CrisisOption } from 'agence-shared';

interface Props {
  crisis: Crisis;
  onVote: (crisisId: string, optionId: string) => Promise<unknown>;
}

function countdown(deadline: string | null): string | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'Délai expiré';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

export function CrisisCard({ crisis, onVote }: Props) {
  const queryClient = useQueryClient();
  const isTypeA = crisis.type === CrisisType.VOTE_COLLECTIF;
  const isResolved = !!crisis.winningOption;
  const options = (crisis.options ?? []) as CrisisOption[];
  const totalVotes = Object.values(crisis.voteCount ?? {}).reduce((a, b) => a + b, 0);
  const timer = countdown(crisis.deadline);

  const voteMutation = useMutation({
    mutationFn: (optionId: string) => onVote(crisis.id, optionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crises'] }),
  });

  return (
    <div className={`bg-[#141414] border-2 p-6 relative overflow-hidden ${isResolved ? 'border-zinc-700' : 'border-[#FF3B30]'}`}>
      {!isResolved && (
        <div className="absolute inset-0 bg-[#FF3B30]/5 pointer-events-none" />
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`font-['Space_Grotesk'] text-[10px] tracking-widest font-bold uppercase px-2 py-1 ${
                isResolved
                  ? 'bg-zinc-800 text-zinc-500'
                  : `bg-[#FF3B30] text-white ${!isResolved ? 'animate-pulse' : ''}`
              }`}
            >
              {isTypeA ? 'VOTE COLLECTIF' : 'CRISE SUBIE'}
            </span>
            {timer && !isResolved && (
              <span className="font-['Space_Grotesk'] text-[10px] text-zinc-500 tracking-widest uppercase">
                {timer}
              </span>
            )}
          </div>
          {isResolved && (
            <span className="font-['Space_Grotesk'] text-[10px] text-zinc-600 tracking-widest uppercase whitespace-nowrap">
              RÉSOLU
            </span>
          )}
        </div>

        <h4 className="font-['Space_Grotesk'] text-[20px] font-semibold text-white mb-2">
          {crisis.title}
        </h4>
        <p className="text-sm text-zinc-400 leading-relaxed mb-6">{crisis.content}</p>

        {/* Options de vote (Type A) */}
        {isTypeA && options.length > 0 && !isResolved && (
          <div className="flex flex-col gap-3 mb-4">
            {options.map((opt) => {
              const votes = crisis.voteCount?.[opt.id] ?? 0;
              const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
              const isMyVote = crisis.userVote === opt.id;

              return (
                <button
                  key={opt.id}
                  onClick={() => voteMutation.mutate(opt.id)}
                  disabled={voteMutation.isPending}
                  className={`relative w-full text-left px-4 py-3 border transition-all overflow-hidden ${
                    isMyVote
                      ? 'border-white text-white'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-400 hover:text-white'
                  } disabled:opacity-40`}
                >
                  {/* Vote bar en arrière-plan */}
                  {totalVotes > 0 && (
                    <div
                      className="absolute left-0 top-0 h-full bg-white/5 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  )}
                  <div className="relative flex justify-between items-center">
                    <span className="font-['Space_Grotesk'] text-[12px] font-semibold uppercase tracking-widest">
                      {opt.label}
                    </span>
                    <span className="font-['Space_Grotesk'] text-[11px] text-zinc-500">
                      {votes > 0 ? `${votes} vote${votes > 1 ? 's' : ''} · ${pct}%` : ''}
                      {isMyVote && <span className="text-white ml-2">✓</span>}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Type B résolu ou conséquence */}
        {isResolved && crisis.aiConsequence && (
          <div className="flex items-start gap-3 bg-zinc-900 border-l-2 border-zinc-600 p-3 mt-2">
            <span className="material-symbols-outlined text-zinc-500 text-sm mt-0.5 shrink-0">smart_toy</span>
            <p className="text-sm text-zinc-400 italic">{crisis.aiConsequence}</p>
          </div>
        )}

        {/* Option gagnante */}
        {isResolved && isTypeA && crisis.winningOption && (
          <div className="mt-4 flex items-center gap-2">
            <span className="font-['Space_Grotesk'] text-[10px] text-zinc-600 tracking-widest uppercase">Résultat :</span>
            <span className="font-['Space_Grotesk'] text-[12px] text-white font-semibold">
              {options.find((o) => o.id === crisis.winningOption)?.label ?? crisis.winningOption}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
