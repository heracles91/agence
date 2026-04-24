import { useState } from 'react';
import type { ModerationPrompt } from 'agence-shared';

interface Props {
  prompt: ModerationPrompt;
  onSubmit: (content: Record<string, unknown>) => Promise<void>;
  submitting: boolean;
}

type Decision = 'approve' | 'reject' | 'flag';

const DECISION_LABELS: Record<Decision, string> = {
  approve: 'PUBLIER',
  flag: 'SIGNALER',
  reject: 'SUPPRIMER',
};

const DECISION_COLORS: Record<Decision, string> = {
  approve: '#34C759',
  flag: '#FF9500',
  reject: '#FF3B30',
};

const RISK_BADGE: Record<string, { label: string; color: string }> = {
  low: { label: 'FAIBLE', color: '#34C759' },
  medium: { label: 'MOYEN', color: '#FF9500' },
  high: { label: 'ÉLEVÉ', color: '#FF3B30' },
};

export function ModerationMinigame({ prompt, onSubmit, submitting }: Props) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  const allDecided = prompt.posts.every((p) => decisions[p.id]);

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 p-4">
        <p className="text-zinc-300 text-[13px]">{prompt.agencyContext}</p>
      </div>

      <div className="space-y-4">
        {prompt.posts.map((post) => {
          const risk = RISK_BADGE[post.riskLevel] ?? RISK_BADGE.medium;
          const current = decisions[post.id];
          return (
            <div key={post.id} className="border border-zinc-800 bg-zinc-900">
              <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-800">
                <span className="material-symbols-outlined text-zinc-500 text-base">
                  {post.platform === 'LinkedIn' ? 'work' : post.platform === 'Instagram' ? 'photo_camera' : 'chat'}
                </span>
                <span className="font-['Space_Grotesk'] text-[11px] tracking-widest text-zinc-500 uppercase">
                  {post.platform}
                </span>
                <span
                  className="ml-auto font-['Space_Grotesk'] text-[10px] tracking-widest font-bold px-2 py-0.5"
                  style={{ color: risk.color, border: `1px solid ${risk.color}40` }}
                >
                  RISQUE {risk.label}
                </span>
              </div>
              <div className="px-4 py-3">
                <p className="text-[14px] text-white leading-relaxed">{post.content}</p>
              </div>
              <div className="flex border-t border-zinc-800">
                {(['approve', 'flag', 'reject'] as Decision[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDecisions((prev) => ({ ...prev, [post.id]: d }))}
                    className={`flex-1 py-2 font-['Space_Grotesk'] text-[10px] tracking-widest font-bold transition-colors ${
                      current === d ? 'text-black' : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                    style={current === d ? { backgroundColor: DECISION_COLORS[d] } : {}}
                  >
                    {DECISION_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => onSubmit({ decisions })}
        disabled={!allDecided || submitting}
        className="w-full py-3 font-['Space_Grotesk'] text-[12px] tracking-widest font-bold uppercase bg-white text-black hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'SOUMISSION...' : 'VALIDER LA MODÉRATION'}
      </button>
    </div>
  );
}
