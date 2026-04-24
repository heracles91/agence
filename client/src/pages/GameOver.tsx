import { useQuery } from '@tanstack/react-query';
import { gameApi } from '@/services/api';
import type { EndingData } from '@/services/api';
import { GamePhase } from 'agence-shared';

function ScoreSparkline({ scores }: { scores: { dayNumber: number; score: number }[] }) {
  if (scores.length < 2) return null;
  const W = 400;
  const H = 60;
  const pad = 4;
  const maxScore = 100;
  const points = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * (W - pad * 2);
    const y = H - pad - ((s.score / maxScore) * (H - pad * 2));
    return `${x},${y}`;
  });

  const lastScore = scores[scores.length - 1]?.score ?? 0;
  const color = lastScore >= 70 ? '#34C759' : lastScore >= 40 ? '#FF9500' : '#FF3B30';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.6"
      />
      {scores.map((s, i) => {
        const x = pad + (i / (scores.length - 1)) * (W - pad * 2);
        const y = H - pad - ((s.score / maxScore) * (H - pad * 2));
        return <circle key={i} cx={x} cy={y} r="2" fill={color} opacity="0.8" />;
      })}
    </svg>
  );
}

export function GameOver() {
  const { data: ending, isLoading } = useQuery<EndingData>({
    queryKey: ['game-ending'],
    queryFn: () => gameApi.getEnding(),
    staleTime: Infinity,
    retry: 1,
  });

  const isVictory = ending?.phase === GamePhase.VICTORY;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center space-y-4">
          <span className="material-symbols-outlined text-5xl text-zinc-700 animate-pulse">
            hourglass_top
          </span>
          <p className="font-['Space_Grotesk'] text-[11px] tracking-widest text-zinc-600 uppercase">
            Génération du récit final…
          </p>
        </div>
      </div>
    );
  }

  const accentColor = isVictory ? '#34C759' : '#FF3B30';
  const bgAccent = isVictory ? '#0d1f12' : '#1a0a0a';

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0A0A0A' }}>
      {/* Hero */}
      <div
        className="relative flex flex-col items-center justify-center py-24 px-8 text-center border-b"
        style={{ borderColor: `${accentColor}20`, background: `radial-gradient(ellipse at center, ${bgAccent} 0%, #0A0A0A 70%)` }}
      >
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundImage: `repeating-linear-gradient(0deg, ${accentColor}, ${accentColor} 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, ${accentColor}, ${accentColor} 1px, transparent 1px, transparent 40px)` }}
        />

        <span
          className="font-['Space_Grotesk'] text-[11px] tracking-[0.3em] uppercase font-bold mb-6 block"
          style={{ color: accentColor }}
        >
          {isVictory ? '— MISSION ACCOMPLIE —' : '— GAME OVER —'}
        </span>

        <h1
          className="font-['Space_Grotesk'] text-[96px] md:text-[128px] font-black leading-none tracking-tighter uppercase mb-4"
          style={{ color: isVictory ? '#34C759' : '#FF3B30', textShadow: `0 0 80px ${accentColor}40` }}
        >
          {isVictory ? 'VICTOIRE' : 'DÉFAITE'}
        </h1>

        <p className="font-['Space_Grotesk'] text-zinc-500 text-[14px] tracking-widest uppercase">
          {isVictory ? `30 jours d'agence — client satisfait` : `Jour ${ending?.dayNumber ?? '?'} — le client a rompu`}
        </p>
      </div>

      <div className="max-w-[900px] mx-auto px-8 py-16 space-y-16">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Score final', value: `${ending?.finalScore ?? 0}%`, color: accentColor },
            { label: 'Meilleur score', value: `${ending?.bestScore ?? 0}%`, color: '#34C759' },
            { label: 'Jours joués', value: ending?.dayNumber ?? 0 },
            { label: 'Crises résolues', value: `${ending?.resolvedCrises ?? 0}/${ending?.totalCrises ?? 0}` },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#141414] border border-zinc-800 p-6 text-center">
              <span
                className="font-['Space_Grotesk'] text-[32px] font-bold block leading-none mb-2"
                style={{ color: color ?? 'white' }}
              >
                {value}
              </span>
              <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-600 uppercase">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Score timeline */}
        {ending?.scores && ending.scores.length > 0 && (
          <div className="bg-[#141414] border border-zinc-800 p-6">
            <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-500 uppercase block mb-4">
              Évolution de la satisfaction
            </span>
            <ScoreSparkline scores={ending.scores} />
            <div className="flex justify-between mt-2">
              <span className="text-[11px] text-zinc-600">Jour 1</span>
              <span className="text-[11px] text-zinc-600">Jour {ending.scores[ending.scores.length - 1]?.dayNumber ?? '?'}</span>
            </div>
          </div>
        )}

        {/* Narrative IA */}
        {ending?.narrative && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="font-['Space_Grotesk'] text-[10px] tracking-[0.25em] text-zinc-600 uppercase">
                Épilogue
              </span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {ending.narrative.split('\n\n').filter((p) => p.trim()).map((paragraph, i) => (
              <p
                key={i}
                className="text-[16px] text-zinc-400 leading-[1.8] font-['Inter']"
                style={{ textIndent: '2em' }}
              >
                {paragraph.trim()}
              </p>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-zinc-800 pt-8 flex flex-col items-center gap-4">
          <span
            className="font-['Space_Grotesk'] text-[48px] font-black tracking-tighter uppercase"
            style={{ color: accentColor, opacity: 0.2 }}
          >
            AGENCE
          </span>
          <p className="font-['Space_Grotesk'] text-[11px] tracking-widest text-zinc-700 uppercase text-center">
            Fin de la session — 30 jours, 9 rôles, une seule agence
          </p>
        </div>
      </div>
    </div>
  );
}
