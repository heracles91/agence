import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { GamePhase } from 'agence-shared';

const NAV_ITEMS = [
  { icon: 'dashboard', label: 'DASHBOARD', path: '/dashboard' },
  { icon: 'assignment', label: 'MISSIONS', path: '/prelaunch' },
  { icon: 'person', label: 'PROFIL CLIENT', path: '/client' },
  { icon: 'folder_open', label: 'ARCHIVES', path: '/history' },
];

export function Sidebar() {
  const { user } = useAuth();
  const { phase } = useGame();
  const location = useLocation();
  const isPlaying = phase !== GamePhase.PRELAUNCH;

  return (
    <nav className="h-screen w-64 border-r border-zinc-800 fixed left-0 top-0 bg-[#0A0A0A] flex flex-col py-8 z-40">
      <div className="px-8 mb-12">
        <h1 className="text-2xl font-black tracking-tighter text-white italic mb-1 font-['Space_Grotesk']">
          AGENCE
        </h1>
        <p className="font-['Space_Grotesk'] uppercase tracking-widest text-xs text-zinc-500">
          STATUS: OPERATIONAL
        </p>
      </div>

      <div className="flex-1 flex flex-col gap-1">
        {NAV_ITEMS.map(({ icon, label, path }) => {
          const active = location.pathname === path;
          const locked = !isPlaying && path !== '/prelaunch';

          if (locked) {
            return (
              <div
                key={path}
                className="pl-4 py-3 flex items-center gap-4 border-l-2 border-transparent cursor-not-allowed text-zinc-800"
              >
                <span className="material-symbols-outlined text-xl">{icon}</span>
                <span className="font-['Space_Grotesk'] uppercase tracking-widest text-xs">{label}</span>
              </div>
            );
          }

          return (
            <Link
              key={path}
              to={path}
              className={`pl-4 py-3 flex items-center gap-4 transition-colors border-l-2 ${
                active
                  ? 'text-white border-white bg-zinc-900/50'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-900/30'
              }`}
            >
              <span
                className="material-symbols-outlined text-xl"
                style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {icon}
              </span>
              <span className="font-['Space_Grotesk'] uppercase tracking-widest text-xs">{label}</span>
            </Link>
          );
        })}
      </div>

      <div className="px-6 mt-auto">
        <div className="border border-zinc-800 p-4 text-center">
          <p className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-500 uppercase mb-1">
            Connecté en tant que
          </p>
          <p className="font-['Space_Grotesk'] text-sm font-semibold text-white">
            {user?.username}
          </p>
        </div>
      </div>
    </nav>
  );
}
