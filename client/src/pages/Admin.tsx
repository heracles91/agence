import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, voteApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { GAME_ROLES, ROLE_LABELS, type Role, type GameRole } from 'agence-shared';

type UserWithVote = {
  id: string;
  username: string;
  email: string;
  role: Role | null;
  isAdmin: boolean;
  createdAt: string;
  roleVotes: { role: Role }[];
};

export function Admin() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [formError, setFormError] = useState('');
  const [launched, setLaunched] = useState(false);

  const { data: users = [] } = useQuery<UserWithVote[]>({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.getUsers() as unknown as Promise<UserWithVote[]>,
    refetchInterval: 8000,
  });

  const { data: voteData } = useQuery({
    queryKey: ['role-votes'],
    queryFn: () => voteApi.getRoleVotes(),
    refetchInterval: 8000,
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createUser(form),
    onSuccess: () => {
      setForm({ username: '', email: '', password: '' });
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: unknown) => {
      setFormError(err instanceof Error ? err.message : 'Erreur');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const launchMutation = useMutation({
    mutationFn: () => adminApi.launchGame(),
    onSuccess: () => setLaunched(true),
  });

  const players = users.filter((u) => !u.isAdmin);
  const votedCount = players.filter((u) => u.roleVotes[0]).length;
  const canLaunch = players.length === 9 && votedCount === players.length;
  const votes = voteData?.votes ?? {};

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-8 lg:p-12">
      <div className="max-w-[1200px] mx-auto">

        {/* Header */}
        <header className="mb-12 border-b border-zinc-800 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-1 bg-[#141414] border border-zinc-800 font-['Space_Grotesk'] text-[11px] tracking-widest font-bold uppercase text-zinc-500">
              ADMIN
            </span>
            <span className="font-['Space_Grotesk'] text-[11px] tracking-widest font-bold uppercase text-white">
              {me?.username}
            </span>
          </div>
          <h1 className="font-['Space_Grotesk'] text-[48px] font-bold text-white leading-none uppercase tracking-tighter">
            Panneau<br />d'Administration
          </h1>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Colonne gauche */}
          <div className="xl:col-span-1 space-y-6">

            {/* Statut du lancement */}
            <div className="bg-[#141414] border border-zinc-800 p-6">
              <p className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase text-zinc-500 mb-4">
                Statut du lancement
              </p>
              <div className="space-y-3 mb-6">
                <StatusRow label="Joueurs créés" value={`${players.length} / 9`} ok={players.length === 9} />
                <StatusRow label="Votes reçus" value={`${votedCount} / ${players.length}`} ok={votedCount === players.length && players.length > 0} />
                <StatusRow label="Conflits de rôle" value={conflictCount(votes)} ok={conflictCount(votes) === '0'} />
              </div>
              {launched ? (
                <div className="w-full py-3 bg-green-900/30 border border-green-700 text-green-400 font-['Space_Grotesk'] text-[11px] tracking-widest uppercase text-center">
                  Jeu lancé !
                </div>
              ) : (
                <button
                  onClick={() => launchMutation.mutate()}
                  disabled={!canLaunch || launchMutation.isPending}
                  className="w-full py-3 bg-white text-[#0A0A0A] font-['Space_Grotesk'] text-[11px] tracking-widest font-bold uppercase transition-all hover:bg-[#0A0A0A] hover:text-white border border-white disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ boxShadow: canLaunch ? '2px 2px 0px 0px #ffffff' : 'none' }}
                >
                  {launchMutation.isPending ? 'Lancement...' : 'Lancer le jeu'}
                </button>
              )}
              {!canLaunch && !launched && (
                <p className="text-[11px] text-zinc-600 mt-2 text-center">
                  {players.length < 9
                    ? `Encore ${9 - players.length} joueur(s) à créer`
                    : 'En attente de tous les votes'}
                </p>
              )}
            </div>

            {/* Créer un compte joueur */}
            <div className="bg-[#141414] border border-zinc-800 p-6">
              <p className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase text-zinc-500 mb-4">
                Créer un joueur
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Nom d'utilisateur"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  className="w-full bg-transparent border border-zinc-700 px-3 py-2 text-white text-sm font-['Inter'] placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full bg-transparent border border-zinc-700 px-3 py-2 text-white text-sm font-['Inter'] placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400"
                />
                <input
                  type="text"
                  placeholder="Mot de passe temporaire"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full bg-transparent border border-zinc-700 px-3 py-2 text-white text-sm font-['Inter'] placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400"
                />
                {formError && (
                  <p className="text-red-400 text-xs font-['Inter']">{formError}</p>
                )}
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !form.username || !form.email || !form.password}
                  className="w-full py-2 border border-zinc-600 text-zinc-300 font-['Space_Grotesk'] text-[11px] tracking-widest uppercase hover:border-white hover:text-white transition-colors disabled:opacity-30"
                >
                  {createMutation.isPending ? 'Création...' : 'Créer le compte'}
                </button>
              </div>
            </div>
          </div>

          {/* Colonne droite : liste des joueurs */}
          <div className="xl:col-span-2">
            <div className="bg-[#141414] border border-zinc-800">
              <div className="px-6 py-4 border-b border-zinc-800">
                <p className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase text-zinc-500">
                  Joueurs ({players.length}/9)
                </p>
              </div>

              {players.length === 0 ? (
                <div className="px-6 py-12 text-center text-zinc-600 font-['Inter'] text-sm">
                  Aucun joueur créé. Commencez par créer les 9 comptes.
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {players.map((u) => (
                    <PlayerRow
                      key={u.id}
                      user={u}
                      onDelete={() => deleteMutation.mutate(u.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerRow({ user, onDelete }: { user: UserWithVote; onDelete: () => void }) {
  const queryClient = useQueryClient();

  const assignMutation = useMutation({
    mutationFn: (role: string | null) =>
      adminApi.assignRole(user.id, role ?? ''),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  return (
    <div className="px-6 py-4 flex items-center gap-4">
      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[11px] text-zinc-400 font-bold flex-shrink-0">
        {user.username.slice(0, 2).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-['Space_Grotesk'] text-sm font-semibold text-white truncate">
          {user.username}
        </p>
        <p className="text-[11px] text-zinc-500 truncate">{user.email}</p>
      </div>

      <div className="flex-shrink-0 text-center min-w-[120px]">
        {user.roleVotes[0] ? (
          <span className="text-[10px] font-['Space_Grotesk'] tracking-widest uppercase text-green-400">
            {ROLE_LABELS[user.roleVotes[0].role as GameRole]}
          </span>
        ) : (
          <span className="text-[10px] text-zinc-600 font-['Space_Grotesk'] tracking-widest uppercase">
            Pas voté
          </span>
        )}
      </div>

      <select
        value={user.role ?? ''}
        onChange={(e) => assignMutation.mutate(e.target.value || null)}
        className="flex-shrink-0 bg-[#0A0A0A] border border-zinc-700 text-zinc-300 text-[11px] font-['Space_Grotesk'] px-2 py-1 focus:outline-none focus:border-zinc-400"
      >
        <option value="">Rôle forcé...</option>
        {GAME_ROLES.map((r) => (
          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
        ))}
      </select>

      <button
        onClick={onDelete}
        className="flex-shrink-0 text-zinc-600 hover:text-red-400 transition-colors"
        title="Supprimer"
      >
        <span className="material-symbols-outlined text-lg">delete</span>
      </button>
    </div>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-zinc-400 font-['Inter']">{label}</span>
      <span className={`font-['Space_Grotesk'] text-[12px] font-semibold ${ok ? 'text-green-400' : 'text-zinc-300'}`}>
        {value}
      </span>
    </div>
  );
}

function conflictCount(votes: Record<string, unknown[]>): string {
  let count = 0;
  for (const role of GAME_ROLES) {
    const voters = (votes[role] as unknown[] | undefined) ?? [];
    if (voters.length > 1) count++;
  }
  return String(count);
}
