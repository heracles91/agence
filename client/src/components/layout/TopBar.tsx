import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi, gameApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { GAME_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, Role, type GameRole } from 'agence-shared';
import type { Notification } from 'agence-shared';

const TABS = [
  { label: 'LIVE FEED', path: '/dashboard', disabled: false },
  { label: 'CRISIS MGMT', path: '/crisis', disabled: false },
  { label: 'PROFIL CLIENT', path: '/client', disabled: false },
];

const ROLE_META: Record<GameRole, { code: string; icon: string }> = {
  [Role.DIRECTEUR_GENERAL]:   { code: 'EXE-01', icon: 'account_balance' },
  [Role.DIRECTEUR_CREATIF]:   { code: 'CRE-01', icon: 'palette' },
  [Role.DIRECTEUR_FINANCIER]: { code: 'FIN-01', icon: 'attach_money' },
  [Role.CHEF_DE_PROJET]:      { code: 'PRJ-01', icon: 'schedule' },
  [Role.SOCIAL_MEDIA]:        { code: 'COM-02', icon: 'tag' },
  [Role.DESIGNER]:            { code: 'CRE-02', icon: 'design_services' },
  [Role.COMMERCIAL]:          { code: 'COM-01', icon: 'handshake' },
};

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

function ProfilePanel({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuth();

  const { data: team = [] } = useQuery({
    queryKey: ['game-team'],
    queryFn: () => gameApi.getTeam(),
    staleTime: 60_000,
  });

  const role = user?.role as GameRole | null;
  const meta = role ? ROLE_META[role] : null;
  const initials = user?.username.slice(0, 2).toUpperCase() ?? '??';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-[420px] bg-[#0F0F0F] border-l border-zinc-800 z-50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <span className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase text-zinc-500">
            Dossier personnel
          </span>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Mon profil */}
          <div className="px-6 py-6 border-b border-zinc-800/60">

            {/* Avatar + identité */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-['Space_Grotesk'] text-[18px] font-bold text-white shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-['Space_Grotesk'] text-[20px] font-bold text-white leading-none mb-1 truncate">
                  {user?.username}
                </p>
                <p className="text-[12px] text-zinc-500 font-['Inter'] truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Poste */}
            {role && meta ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="font-['Space_Grotesk'] text-[10px] tracking-widest font-bold uppercase text-zinc-500 border border-zinc-700 px-2 py-0.5">
                    {meta.code}
                  </span>
                  <span className="material-symbols-outlined text-zinc-400 text-base">
                    {meta.icon}
                  </span>
                  <span className="font-['Space_Grotesk'] text-[13px] font-semibold text-white uppercase tracking-wide">
                    {ROLE_LABELS[role]}
                  </span>
                </div>
                <p className="text-[13px] text-zinc-400 font-['Inter'] leading-relaxed">
                  {ROLE_DESCRIPTIONS[role]}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-zinc-600">
                <span className="material-symbols-outlined text-base">pending</span>
                <span className="text-[12px] font-['Inter']">Rôle non encore attribué</span>
              </div>
            )}
          </div>

          {/* Organigramme */}
          <div className="px-6 py-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-zinc-600 text-base">account_tree</span>
              <span className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase text-zinc-500">
                Organigramme de l'agence
              </span>
            </div>

            <div className="space-y-1">
              {GAME_ROLES.map((r) => {
                const m = ROLE_META[r];
                const player = team.find((p) => p.role === r);
                const isMe = user?.role === r;
                return (
                  <div
                    key={r}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors ${
                      isMe ? 'bg-white/5 border border-zinc-700' : 'hover:bg-zinc-900/50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-zinc-600 text-[15px] shrink-0">
                      {m.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-['Space_Grotesk'] text-[9px] tracking-widest text-zinc-600 font-bold">
                          {m.code}
                        </span>
                        {isMe && (
                          <span className="font-['Space_Grotesk'] text-[9px] tracking-widest uppercase text-white bg-white/10 px-1.5 py-0.5">
                            moi
                          </span>
                        )}
                      </div>
                      <p className={`font-['Space_Grotesk'] text-[12px] font-semibold truncate ${isMe ? 'text-white' : 'text-zinc-300'}`}>
                        {ROLE_LABELS[r]}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {player ? (
                        <span className={`text-[12px] font-['Inter'] ${isMe ? 'text-zinc-300' : 'text-zinc-500'}`}>
                          {player.username}
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-700 font-['Inter'] italic">vacant</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer — déconnexion */}
        <div className="px-6 py-4 border-t border-zinc-800 shrink-0">
          <button
            onClick={() => logout()}
            className="w-full py-2.5 border border-zinc-700 text-zinc-400 font-['Space_Grotesk'] text-[11px] tracking-widest uppercase hover:border-red-800 hover:text-red-400 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Se déconnecter
          </button>
        </div>
      </div>
    </>
  );
}

export function TopBar() {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
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
          <button
            onClick={() => setProfileOpen(true)}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </header>

      {profileOpen && <ProfilePanel onClose={() => setProfileOpen(false)} />}
    </>
  );
}
