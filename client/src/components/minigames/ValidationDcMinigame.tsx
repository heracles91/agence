import { useState } from 'react';
import type { RedactionPrompt } from 'agence-shared';

interface Props {
  prompt: RedactionPrompt;
  onSubmit: (content: Record<string, unknown>) => Promise<void>;
  submitting: boolean;
}

export function ValidationDcMinigame({ prompt, onSubmit, submitting }: Props) {
  const [text, setText] = useState('');
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-5">
      <div className="bg-amber-950/30 border border-amber-800/40 p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-500 text-base mt-0.5 shrink-0">pending_actions</span>
        <p className="text-amber-300/80 text-[13px]">
          Ce texte sera soumis au <strong>Directeur Créatif</strong> pour validation avant d'être comptabilisé.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-500 uppercase block mb-1">Cible</span>
          <p className="text-[13px] text-white">{prompt.targetAudience}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-500 uppercase block mb-1">Ton</span>
          <p className="text-[13px] text-white">{prompt.tone}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-500 uppercase block mb-1">Format</span>
          <p className="text-[13px] text-white">{prompt.constraints}</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-4">
        <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-500 uppercase block mb-2">Brief copy</span>
        <p className="text-[14px] text-zinc-300 leading-relaxed">{prompt.brief}</p>
      </div>

      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Rédigez votre texte créatif ici..."
          rows={10}
          className="w-full bg-zinc-900 border border-zinc-800 p-4 text-[14px] text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-600 leading-relaxed font-mono"
        />
        <div className="absolute bottom-3 right-4 font-['Space_Grotesk'] text-[11px] text-zinc-600">
          {wordCount} mots
        </div>
      </div>

      <button
        onClick={() => onSubmit({ text, wordCount })}
        disabled={text.trim().length < 10 || submitting}
        className="w-full py-3 font-['Space_Grotesk'] text-[12px] tracking-widest font-bold uppercase bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'SOUMISSION...' : 'SOUMETTRE AU DC POUR VALIDATION'}
      </button>
    </div>
  );
}
