import { NavLink } from 'react-router-dom';

const TABS = [
  { label: 'LIVE FEED', path: '/dashboard', disabled: false },
  { label: 'CRISIS MGMT', path: '/crisis', disabled: true },
  { label: 'PROFIL CLIENT', path: '/client', disabled: false },
];

export function TopBar() {
  return (
    <header className="fixed top-0 right-0 left-64 h-16 border-b border-zinc-800 z-50 bg-[#0A0A0A]/90 backdrop-blur-md flex justify-between items-center px-8">
      <nav className="flex gap-8 h-full items-end pb-1">
        {TABS.map(({ label, path, disabled }) =>
          disabled ? (
            <span
              key={path}
              className="font-['Space_Grotesk'] font-medium text-zinc-700 pb-1 cursor-not-allowed text-sm"
            >
              {label}
            </span>
          ) : (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `font-['Space_Grotesk'] font-medium pb-1 text-sm transition-colors ${
                  isActive
                    ? 'text-white border-b-2 border-white'
                    : 'text-zinc-400 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          )
        )}
      </nav>
      <div className="flex items-center gap-4">
        <button className="text-zinc-400 hover:text-white transition-colors">
          <span className="material-symbols-outlined">notifications_active</span>
        </button>
        <button className="text-zinc-400 hover:text-white transition-colors">
          <span className="material-symbols-outlined">account_circle</span>
        </button>
      </div>
    </header>
  );
}
