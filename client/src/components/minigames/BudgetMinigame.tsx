import { useState, useMemo } from 'react';
import type { BudgetPrompt } from 'agence-shared';

interface Props {
  prompt: BudgetPrompt;
  onSubmit: (content: Record<string, unknown>) => Promise<void>;
  submitting: boolean;
}

export function BudgetMinigame({ prompt, onSubmit, submitting }: Props) {
  const [allocations, setAllocations] = useState<Record<string, number>>(
    Object.fromEntries(prompt.items.map((item) => [item.id, item.recommended]))
  );

  const total = useMemo(
    () => Object.values(allocations).reduce((a, b) => a + b, 0),
    [allocations]
  );
  const remaining = prompt.totalBudget - total;
  const isValid = Math.abs(remaining) < 1;

  const formatK = (v: number) => `${Math.round(v / 1000)}k€`;

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 p-4">
        <p className="text-zinc-300 text-[13px]">{prompt.constraints}</p>
      </div>

      <div className="flex justify-between items-center py-2 border-b border-zinc-800">
        <span className="font-['Space_Grotesk'] text-[11px] tracking-widest text-zinc-500 uppercase">
          Budget total
        </span>
        <span className="font-['Space_Grotesk'] text-[18px] font-bold text-white">
          {formatK(prompt.totalBudget)}
        </span>
      </div>

      <div className="space-y-5">
        {prompt.items.map((item) => {
          const value = allocations[item.id] ?? item.recommended;
          return (
            <div key={item.id}>
              <div className="flex justify-between mb-2">
                <span className="text-[13px] text-white font-medium">{item.label}</span>
                <span className="font-['Space_Grotesk'] text-[13px] font-bold text-white">
                  {formatK(value)}
                </span>
              </div>
              <input
                type="range"
                min={item.min}
                max={item.max}
                step={1000}
                value={value}
                onChange={(e) =>
                  setAllocations((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))
                }
                className="w-full accent-white"
              />
              <div className="flex justify-between text-[11px] text-zinc-600 mt-1">
                <span>{formatK(item.min)}</span>
                <span className="text-zinc-500">Recommandé : {formatK(item.recommended)}</span>
                <span>{formatK(item.max)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={`flex justify-between items-center p-3 border ${
          isValid ? 'border-green-800 bg-green-950' : remaining < 0 ? 'border-red-800 bg-red-950' : 'border-zinc-700 bg-zinc-900'
        }`}
      >
        <span className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase text-zinc-400">
          {remaining >= 0 ? 'Reste à allouer' : 'Dépassement'}
        </span>
        <span
          className={`font-['Space_Grotesk'] text-[16px] font-bold ${
            isValid ? 'text-green-400' : remaining < 0 ? 'text-red-400' : 'text-white'
          }`}
        >
          {remaining >= 0 ? '' : '-'}{formatK(Math.abs(remaining))}
        </span>
      </div>

      <button
        onClick={() => onSubmit({ allocations })}
        disabled={!isValid || submitting}
        className="w-full py-3 font-['Space_Grotesk'] text-[12px] tracking-widest font-bold uppercase bg-white text-black hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'SOUMISSION...' : 'VALIDER L\'ALLOCATION'}
      </button>
    </div>
  );
}
