import { useQuery } from '@tanstack/react-query';
import { gameApi } from '@/services/api';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type ToleranceLevel = 'SEREIN' | 'INSTABLE' | 'MÉFIANT' | 'HOSTILE';

function toleranceLevel(score: number): ToleranceLevel {
  if (score >= 70) return 'SEREIN';
  if (score >= 50) return 'INSTABLE';
  if (score >= 30) return 'MÉFIANT';
  return 'HOSTILE';
}

function toleranceColor(level: ToleranceLevel) {
  if (level === 'SEREIN') return '#34C759';
  if (level === 'INSTABLE') return '#FF9500';
  if (level === 'MÉFIANT') return '#FF9500';
  return '#FF3B30';
}

function toleranceMarkerPct(score: number) {
  return Math.max(2, Math.min(98, 100 - score));
}

function PersonalityList({ text }: { text: string }) {
  const traits = text
    .split(/[,;.\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const icons = ['crisis_alert', 'shuffle', 'record_voice_over', 'psychology', 'bolt'];
  const colors = ['#FF3B30', '#FF9500', '#8E8E93', '#c9a84c', '#34C759'];

  return (
    <ul className="flex flex-col gap-3">
      {traits.slice(0, 5).map((trait, i) => (
        <li key={i} className="flex items-center gap-3 text-[16px] text-white">
          <span
            className="material-symbols-outlined"
            style={{ color: colors[i % colors.length], fontVariationSettings: "'FILL' 1" }}
          >
            {icons[i % icons.length]}
          </span>
          {trait}
        </li>
      ))}
    </ul>
  );
}

export function ClientProfile() {
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['client-profile'],
    queryFn: () => gameApi.getClientProfile(),
    staleTime: 5 * 60_000,
  });

  const { data: scores } = useQuery({
    queryKey: ['game-scores'],
    queryFn: () => gameApi.getScores(),
    staleTime: 60_000,
  });

  const lastScore = scores?.[scores.length - 1];
  const level = lastScore ? toleranceLevel(lastScore.score) : null;
  const markerPct = lastScore ? toleranceMarkerPct(lastScore.score) : 50;

  if (profileLoading) {
    return (
      <div className="flex min-h-screen bg-[#0A0A0A]">
        <Sidebar />
        <TopBar />
        <main className="ml-64 mt-16 flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen bg-[#0A0A0A]">
        <Sidebar />
        <TopBar />
        <main className="ml-64 mt-16 flex-1 flex items-center justify-center">
          <p className="text-zinc-600 font-['Space_Grotesk'] uppercase tracking-widest text-sm">
            Profil client non configuré
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white">
      <Sidebar />
      <TopBar />

      <main className="ml-64 mt-16 flex-1 p-8 pb-12">
        <div className="max-w-[1200px] mx-auto">

          {/* Header */}
          <div className="flex items-end justify-between mb-12 border-b border-zinc-800 pb-6">
            <div>
              <p className="font-['Space_Grotesk'] text-[12px] tracking-widest text-zinc-500 mb-2 flex items-center gap-2 uppercase">
                <span className="material-symbols-outlined text-base">folder_shared</span>
                DOSSIER CLIENT // ACTIF
              </p>
              <h2 className="font-['Space_Grotesk'] text-[72px] font-bold leading-none tracking-tighter text-white uppercase">
                {profile.companyName}
              </h2>
            </div>
            <div className="text-right">
              <p className="font-['Space_Grotesk'] text-[12px] tracking-widest text-zinc-500 mb-2 uppercase">SECTEUR</p>
              <p className="font-['Space_Grotesk'] text-[24px] font-medium text-white">{profile.sector}</p>
            </div>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-12 gap-6">

            {/* Left col — 4/12: Portrait + Personality */}
            <div className="col-span-4 flex flex-col gap-6">

              {/* "Portrait" */}
              <div className="bg-[#141414] border border-zinc-800 p-6 relative">
                <div className="absolute top-2 right-2 bg-white text-black font-['Space_Grotesk'] text-[10px] tracking-widest font-bold px-2 py-1 uppercase">
                  CONFIDENTIEL
                </div>
                <div className="h-48 bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800">
                  <span className="material-symbols-outlined text-zinc-700 text-6xl">person</span>
                </div>
                <h3 className="font-['Space_Grotesk'] text-[24px] font-semibold text-white uppercase mb-1">
                  {profile.name}
                </h3>
                <p className="font-['Space_Grotesk'] text-[12px] tracking-widest text-[#FF3B30] uppercase font-bold">
                  DÉCIDEUR PRINCIPAL
                </p>
              </div>

              {/* Personality matrix */}
              <div className="bg-[#141414] border border-zinc-800 p-6">
                <h4 className="font-['Space_Grotesk'] text-[12px] tracking-widest text-zinc-500 uppercase mb-4 border-b border-zinc-800 pb-2">
                  PERSONALITY MATRIX
                </h4>
                <PersonalityList text={profile.personality} />
              </div>
            </div>

            {/* Right col — 8/12: Brief + Tolerance */}
            <div className="col-span-8 flex flex-col gap-6">

              {/* Initial brief */}
              <div className="bg-[#141414] border border-zinc-800 p-8 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 hover:border-white">
                <div className="absolute -right-12 -top-12 opacity-5 pointer-events-none">
                  <span className="material-symbols-outlined text-[200px]">rocket_launch</span>
                </div>
                <h4 className="font-['Space_Grotesk'] text-[12px] tracking-widest text-zinc-500 uppercase mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">assignment</span>
                  DIRECTIVE INITIALE
                </h4>
                <blockquote className="font-['Space_Grotesk'] text-[28px] font-semibold text-white border-l-4 border-[#FF3B30] pl-6 py-2 italic leading-snug">
                  "{profile.initialBrief}"
                </blockquote>
              </div>

              {/* Tolerance indicator */}
              <div className="bg-[#141414] border border-zinc-800 p-8">
                <div className="flex justify-between items-end mb-6">
                  <h4 className="font-['Space_Grotesk'] text-[12px] tracking-widest text-zinc-500 uppercase flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">thermostat</span>
                    INDICE DE TOLÉRANCE
                  </h4>
                  {level && (
                    <span
                      className="font-['Space_Grotesk'] text-[24px] font-semibold"
                      style={{ color: toleranceColor(level) }}
                    >
                      {level}
                    </span>
                  )}
                </div>

                <div className="relative h-12 w-full bg-[#0A0A0A] border border-zinc-800 flex items-center px-1 mb-6">
                  <div className="absolute left-1 right-1 h-8 bg-gradient-to-r from-[#34C759] via-[#FF9500] to-[#FF3B30] opacity-20" />
                  {level && (
                    <>
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
                        style={{
                          left: `${markerPct}%`,
                          boxShadow: '0 0 10px rgba(255,255,255,0.5)',
                        }}
                      />
                    </>
                  )}
                  <div className="w-full flex justify-between px-2 text-[10px] text-zinc-600 z-20 font-['Space_Grotesk'] font-bold uppercase tracking-wider">
                    <span>DOCILE</span>
                    <span>MÉFIANT</span>
                    <span>HOSTILE</span>
                  </div>
                </div>

                {lastScore?.aiComment && (
                  <p className="text-sm text-zinc-400 italic border-l-2 border-zinc-700 pl-4">
                    "{lastScore.aiComment}"
                  </p>
                )}
              </div>

              {/* Action bar */}
              <div className="flex gap-4 justify-end">
                <button className="bg-[#0A0A0A] text-white font-['Space_Grotesk'] text-[12px] tracking-widest font-bold py-3 px-8 border border-zinc-700 hover:bg-zinc-900 transition-colors uppercase">
                  CONSULTER ARCHIVES
                </button>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
