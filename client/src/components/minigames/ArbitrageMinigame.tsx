import { useState } from 'react';
import type { ArbitragePrompt } from 'agence-shared';

interface Props {
  prompt: ArbitragePrompt;
  ceReport?: string;
  onSubmit: (content: Record<string, unknown>) => Promise<void>;
  submitting: boolean;
}

export function ArbitrageMinigame({ prompt, ceReport, onSubmit, submitting }: Props) {
  const [choice, setChoice] = useState<'A' | 'B' | null>(null);

  return (
    <div className="space-y-6">
      {ceReport && (
        <div className="bg-blue-950/30 border border-blue-800/40 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-blue-400 text-base">description</span>
            <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-blue-400 uppercase font-bold">
              Rapport du Consultant Externe
            </span>
          </div>
          <p className="text-[13px] text-blue-100/70 leading-relaxed whitespace-pre-wrap">{ceReport}</p>
        </div>
      )}
      <div className="bg-zinc-900 border border-zinc-800 p-4">
        <p className="text-zinc-300 text-[14px] leading-relaxed">{prompt.context}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(['A', 'B'] as const).map((key) => {
          const option = key === 'A' ? prompt.propositionA : prompt.propositionB;
          const selected = choice === key;
          return (
            <button
              key={key}
              onClick={() => setChoice(key)}
              className={`text-left p-5 border transition-all ${
                selected
                  ? 'border-white bg-zinc-800'
                  : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`font-['Space_Grotesk'] text-[11px] tracking-widest font-bold px-2 py-0.5 ${
                    selected ? 'bg-white text-black' : 'bg-zinc-700 text-zinc-300'
                  }`}
                >
                  OPTION {key}
                </span>
                <span className="font-['Space_Grotesk'] text-[13px] font-semibold text-white">
                  {option.title}
                </span>
              </div>
              <p className="text-zinc-400 text-[13px] leading-relaxed">{option.description}</p>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => choice && onSubmit({ choice })}
        disabled={!choice || submitting}
        className="w-full py-3 font-['Space_Grotesk'] text-[12px] tracking-widest font-bold uppercase bg-white text-black hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'SOUMISSION...' : 'VALIDER L\'ARBITRAGE'}
      </button>
    </div>
  );
}
