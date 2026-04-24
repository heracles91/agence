import { useState } from 'react';
import type { NegociationPrompt, NegociationOption } from 'agence-shared';

interface Props {
  prompt: NegociationPrompt;
  onSubmit: (content: Record<string, unknown>) => Promise<void>;
  submitting: boolean;
}

export function NegociationMinigame({ prompt, onSubmit, submitting }: Props) {
  const [choices, setChoices] = useState<Record<number, string>>({});
  const [step, setStep] = useState(0);

  const constraints = prompt.budgetConstraints ?? {};
  const allAnswered = prompt.exchanges.every((_, i) => choices[i] !== undefined);

  function isLocked(option: NegociationOption): boolean {
    if (!option.requiresBudgetItem) return false;
    return !constraints[option.requiresBudgetItem];
  }

  function choose(exchangeIdx: number, optionId: string) {
    setChoices((prev) => ({ ...prev, [exchangeIdx]: optionId }));
    if (exchangeIdx === step && step < prompt.exchanges.length - 1) {
      setTimeout(() => setStep((s) => s + 1), 400);
    }
  }

  return (
    <div className="space-y-6">
      {/* Contexte */}
      <div className="bg-zinc-900 border border-zinc-800 p-4">
        <p className="text-zinc-300 text-[14px] leading-relaxed">{prompt.context}</p>
        <p className="text-[12px] text-zinc-500 mt-2 italic">
          Style client : {prompt.clientPersonality}
        </p>
      </div>

      {/* Budget unlocked pills */}
      {Object.keys(constraints).length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-600 uppercase self-center">
            Budget disponible :
          </span>
          {Object.entries(constraints).map(([key, val]) =>
            val === 1 ? (
              <span
                key={key}
                className="font-['Space_Grotesk'] text-[10px] tracking-widest font-bold px-2 py-0.5 border border-green-800 text-green-400 uppercase"
              >
                {key} ✓
              </span>
            ) : null
          )}
          {Object.entries(constraints).every(([, v]) => v !== 1) && (
            <span className="text-[12px] text-zinc-600 italic">Aucun axe débloqué</span>
          )}
        </div>
      )}

      {/* Exchanges */}
      <div className="space-y-6">
        {prompt.exchanges.map((exchange, idx) => {
          const isPast = idx < step;
          const isCurrent = idx === step;
          const isFuture = idx > step;
          const chosen = choices[idx];

          return (
            <div
              key={idx}
              className={`border transition-all ${
                isFuture
                  ? 'border-zinc-900 opacity-40 pointer-events-none'
                  : isCurrent
                  ? 'border-zinc-600'
                  : 'border-zinc-800 opacity-75'
              }`}
            >
              {/* Client message */}
              <div className="flex items-start gap-3 bg-zinc-900/50 px-5 py-4 border-b border-zinc-800">
                <span className="material-symbols-outlined text-zinc-500 text-base mt-0.5 shrink-0">person</span>
                <div>
                  <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-500 uppercase block mb-1">
                    {prompt.clientPersonality.split(' ')[0]} — Échange {idx + 1}
                  </span>
                  <p className="text-[14px] text-white leading-relaxed">{exchange.clientMessage}</p>
                </div>
              </div>

              {/* Options */}
              <div className="p-4 space-y-2">
                {exchange.options.map((option) => {
                  const locked = isLocked(option);
                  const selected = chosen === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => !locked && !isPast && choose(idx, option.id)}
                      disabled={locked || isPast}
                      title={locked ? `Budget "${option.requiresBudgetItem}" insuffisant` : undefined}
                      className={`w-full text-left px-4 py-3 border text-[13px] transition-all flex items-center gap-3 ${
                        locked
                          ? 'border-zinc-900 text-zinc-700 cursor-not-allowed'
                          : selected
                          ? 'border-white bg-zinc-800 text-white'
                          : isPast
                          ? 'border-zinc-800 text-zinc-600 cursor-default'
                          : 'border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white cursor-pointer'
                      }`}
                    >
                      {locked && (
                        <span className="material-symbols-outlined text-zinc-800 text-sm shrink-0">lock</span>
                      )}
                      {selected && !locked && (
                        <span className="material-symbols-outlined text-green-400 text-sm shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                          check_circle
                        </span>
                      )}
                      {!locked && !selected && (
                        <span className="w-4 shrink-0" />
                      )}
                      <span>{option.label}</span>
                      {locked && option.requiresBudgetItem && (
                        <span className="ml-auto font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-700 uppercase shrink-0">
                          Budget {option.requiresBudgetItem}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => onSubmit({ choices })}
        disabled={!allAnswered || submitting}
        className="w-full py-3 font-['Space_Grotesk'] text-[12px] tracking-widest font-bold uppercase bg-white text-black hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'SOUMISSION...' : 'CLÔTURER LA NÉGOCIATION'}
      </button>
    </div>
  );
}
