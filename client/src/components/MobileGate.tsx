import { ReactNode } from 'react';
import { useDeviceCheck } from '@/hooks/useDeviceCheck';

interface MobileGateProps {
  children: ReactNode;
}

export function MobileGate({ children }: MobileGateProps) {
  const { isMobile } = useDeviceCheck();

  if (!isMobile) return <>{children}</>;

  return (
    <div className="min-h-screen bg-agence-black flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-8">
        <h1 className="font-serif text-4xl text-agence-gold mb-2">AGENCE</h1>
        <div className="w-12 h-px bg-agence-gold-dim mx-auto" />
      </div>

      <div className="card p-8 max-w-sm w-full space-y-6">
        <div className="text-4xl">💻</div>
        <div>
          <h2 className="font-serif text-xl text-agence-cream mb-3">
            Mode lecture seule
          </h2>
          <p className="text-agence-muted text-sm leading-relaxed">
            Pour jouer, connecte-toi depuis un ordinateur. Sur mobile, tu peux
            consulter les scores et l'actualité.
          </p>
        </div>
        <div className="border-t border-agence-border pt-5 space-y-3 text-left">
          <p className="text-xs font-medium tracking-widest uppercase text-agence-muted mb-3">
            Disponible sur mobile
          </p>
          <Item label="Score de satisfaction" />
          <Item label="Actualités du jour" />
          <Item label="Historique des événements" />
        </div>
      </div>
    </div>
  );
}

function Item({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-agence-cream">
      <span className="w-1.5 h-1.5 rounded-full bg-agence-gold flex-shrink-0" />
      {label}
    </div>
  );
}
