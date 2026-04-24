import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '@/services/api';
import type { Notification } from 'agence-shared';

const TABS = [
  { label: 'LIVE FEED', path: '/dashboard', disabled: false },
  { label: 'CRISIS MGMT', path: '/crisis', disabled: true },
  { label: 'PROFIL CLIENT', path: '/client', disabled: false },
];

function NotificationPanel() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getAll(),
    staleTime: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative text-zinc-400 hover:text-white transition-colors"
      >
        <span className="material-symbols-outlined" style={unread > 0 ? { fontVariationSettings: "'FILL' 1", color: '#FF9500' } : {}}>
          notifications
        </span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF9500] rounded-full flex items-center justify-center font-['Space_Grotesk'] text-[9px] font-bold text-black">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-[#141414] border border-zinc-800 z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
            <span className="font-['Space_Grotesk'] text-[11px] tracking-widest text-zinc-500 uppercase">
              Notifications
            </span>
            {unread > 0 && (
              <span className="font-['Space_Grotesk'] text-[10px] text-[#FF9500]">
                {unread} non lue{unread > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-zinc-600 text-[13px]">Aucune notification</div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
                className={`w-full text-left px-4 py-3 border-b border-zinc-900 last:border-0 transition-colors ${
                  n.isRead ? 'opacity-50' : 'hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.isRead && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF9500] mt-1.5 shrink-0" />
                  )}
                  <div className={!n.isRead ? '' : 'ml-3.5'}>
                    <p className="text-[13px] text-white leading-snug">{n.content}</p>
                    <p className="text-[11px] text-zinc-600 mt-1">
                      {new Date(n.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

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
        <NotificationPanel />
        <button className="text-zinc-400 hover:text-white transition-colors">
          <span className="material-symbols-outlined">account_circle</span>
        </button>
      </div>
    </header>
  );
}
