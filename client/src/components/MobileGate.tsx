import { ReactNode } from 'react';
import { useDeviceCheck } from '@/hooks/useDeviceCheck';

const MOBILE_ACCESSIBLE = [
  { icon: 'show_chart', label: 'Score de satisfaction' },
  { icon: 'newspaper', label: 'Actualités du jour' },
  { icon: 'folder_open', label: 'Historique des crises' },
  { icon: 'person', label: 'Profil du client' },
];

interface MobileGateProps {
  children: ReactNode;
}

export function MobileGate({ children }: MobileGateProps) {
  const { isMobile } = useDeviceCheck();

  if (!isMobile) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-8 border-b border-zinc-900">
        <h1 className="font-['Space_Grotesk'] text-[32px] font-black tracking-tighter text-white italic">
          AGENCE
        </h1>
        <p className="font-['Space_Grotesk'] text-[10px] tracking-[0.3em] text-zinc-600 uppercase mt-1">
          SERIOUS GAME
        </p>
      </div>

      {/* Main message */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="mb-8">
          <span className="material-symbols-outlined text-zinc-700 text-5xl block mb-4">
            desktop_windows
          </span>
          <h2 className="font-['Space_Grotesk'] text-[28px] font-bold text-white leading-tight mb-3">
            Jeu réservé<br />au desktop
          </h2>
          <p className="text-[14px] text-zinc-500 leading-relaxed">
            Pour jouer, connecte-toi depuis un ordinateur. Les mini-jeux, crises et votes
            nécessitent un écran large pour une expérience optimale.
          </p>
        </div>

        {/* What's accessible on mobile */}
        <div className="bg-[#141414] border border-zinc-800 p-5">
          <p className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-600 uppercase mb-4">
            Disponible en lecture sur mobile
          </p>
          <div className="space-y-3">
            {MOBILE_ACCESSIBLE.map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="material-symbols-outlined text-zinc-600 text-base">{icon}</span>
                <span className="text-[13px] text-zinc-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-6 border-t border-zinc-900">
        <p className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-700 uppercase text-center">
          Reconnecte-toi sur desktop pour jouer
        </p>
      </div>
    </div>
  );
}
