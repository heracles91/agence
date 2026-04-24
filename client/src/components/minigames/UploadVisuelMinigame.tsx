import { useState } from 'react';
import type { UploadVisuelPrompt } from 'agence-shared';

interface Props {
  prompt: UploadVisuelPrompt;
  onSubmit: (content: Record<string, unknown>) => Promise<void>;
  submitting: boolean;
}

const STYLE_OPTIONS = [
  'Minimaliste & épuré',
  'Coloré & dynamique',
  'Corporate & sérieux',
  'Créatif & audacieux',
  'Élégant & premium',
  'Autre (préciser ci-dessous)',
];

export function UploadVisuelMinigame({ prompt, onSubmit, submitting }: Props) {
  const [selectedStyle, setSelectedStyle] = useState('');
  const [description, setDescription] = useState('');
  const [toolUsed, setToolUsed] = useState('');

  const isValid = description.trim().length > 20;

  return (
    <div className="space-y-6">
      <div className="bg-amber-950/30 border border-amber-800/40 p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-500 text-base mt-0.5 shrink-0">pending_actions</span>
        <p className="text-amber-300/80 text-[13px]">
          Ce livrable sera soumis au <strong>Directeur Créatif</strong> pour validation.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-500 uppercase block mb-2">Brief</span>
          <p className="text-[13px] text-zinc-300 leading-relaxed">{prompt.brief}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 space-y-3">
          <div>
            <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-500 uppercase block mb-1">Format</span>
            <p className="text-[13px] text-white">{prompt.format}</p>
          </div>
          <div>
            <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-500 uppercase block mb-1">Références</span>
            <p className="text-[13px] text-zinc-400">{prompt.references}</p>
          </div>
        </div>
      </div>

      <div>
        <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-500 uppercase block mb-3">
          Direction artistique retenue
        </span>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {STYLE_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStyle(s)}
              className={`text-left px-3 py-2 border text-[12px] transition-colors ${
                selectedStyle === s
                  ? 'border-white bg-zinc-800 text-white'
                  : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-500 uppercase block mb-2">
          Description du livrable <span className="text-zinc-700">(URL, mockup ou description détaillée)</span>
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={`Décrivez votre création en détail : composition, couleurs, typographie, éléments visuels...\nOu collez un lien Figma / Canva / autre outil.`}
          rows={6}
          className="w-full bg-zinc-900 border border-zinc-800 p-4 text-[13px] text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-600 leading-relaxed"
        />
      </div>

      <div>
        <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-500 uppercase block mb-2">
          Outil utilisé <span className="text-zinc-700">(facultatif)</span>
        </span>
        <input
          type="text"
          value={toolUsed}
          onChange={(e) => setToolUsed(e.target.value)}
          placeholder="Figma, Canva, Illustrator, Photoshop..."
          className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 text-[13px] text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
        />
      </div>

      <button
        onClick={() => onSubmit({ selectedStyle, description, toolUsed })}
        disabled={!isValid || submitting}
        className="w-full py-3 font-['Space_Grotesk'] text-[12px] tracking-widest font-bold uppercase bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'SOUMISSION...' : 'SOUMETTRE AU DC POUR VALIDATION'}
      </button>
    </div>
  );
}
