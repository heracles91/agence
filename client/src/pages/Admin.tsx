import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, voteApi, gameApi, type ClientProfileAdmin } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { GAME_ROLES, GamePhase, ROLE_LABELS, CrisisType, type Role, type GameRole, type GameConfig } from 'agence-shared';

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
  const { phase, currentDay } = useGame();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [formError, setFormError] = useState('');
  const [launched, setLaunched] = useState(false);
  const [dailyResult, setDailyResult] = useState<string | null>(null);
  const [configHour, setConfigHour] = useState(20);
  const [configSaved, setConfigSaved] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: '',
    companyName: '',
    sector: '',
    personality: '',
    initialBrief: '',
    toleranceThreshold: 50,
  });
  const [clientSaved, setClientSaved] = useState(false);
  const [clientError, setClientError] = useState('');
  const [crisisForm, setCrisisForm] = useState({
    type: CrisisType.VOTE_COLLECTIF as string,
    title: '',
    content: '',
    optionA: '',
    optionB: '',
    deadlineMinutes: 60,
  });
  const [crisisResult, setCrisisResult] = useState<string | null>(null);

  const { data: clientProfile } = useQuery<ClientProfileAdmin | null>({
    queryKey: ['admin-client-profile'],
    queryFn: () => adminApi.getClientProfile(),
  });

  useEffect(() => {
    if (clientProfile) {
      setClientForm({
        name: clientProfile.name,
        companyName: clientProfile.companyName,
        sector: clientProfile.sector,
        personality: clientProfile.personality,
        initialBrief: clientProfile.initialBrief,
        toleranceThreshold: clientProfile.toleranceThreshold,
      });
    }
  }, [clientProfile]);

  const upsertClientMutation = useMutation({
    mutationFn: () => adminApi.upsertClientProfile(clientForm),
    onSuccess: () => {
      setClientSaved(true);
      setClientError('');
      queryClient.invalidateQueries({ queryKey: ['admin-client-profile'] });
      setTimeout(() => setClientSaved(false), 2000);
    },
    onError: (err: unknown) => {
      setClientError(err instanceof Error ? err.message : 'Erreur');
    },
  });

  const { data: gameConfig } = useQuery<GameConfig>({
    queryKey: ['game-config'],
    queryFn: () => gameApi.getConfig(),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (gameConfig?.dailyUpdateHour !== undefined) setConfigHour(gameConfig.dailyUpdateHour);
  }, [gameConfig?.dailyUpdateHour]);

  const updateConfigMutation = useMutation({
    mutationFn: (hour: number) => adminApi.updateConfig({ dailyUpdateHour: hour }),
    onSuccess: () => {
      setConfigSaved(true);
      queryClient.invalidateQueries({ queryKey: ['game-config'] });
      setTimeout(() => setConfigSaved(false), 2000);
    },
  });

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

  const crisisMutation = useMutation({
    mutationFn: () => {
      const isTypeA = crisisForm.type === CrisisType.VOTE_COLLECTIF;
      return adminApi.createCrisis({
        type: crisisForm.type,
        title: crisisForm.title,
        content: crisisForm.content,
        options: isTypeA
          ? [
              { id: 'a', label: crisisForm.optionA },
              { id: 'b', label: crisisForm.optionB },
            ]
          : undefined,
        deadlineMinutes: isTypeA ? crisisForm.deadlineMinutes : undefined,
      });
    },
    onSuccess: () => {
      setCrisisResult('Crise créée et diffusée à tous les joueurs.');
      setCrisisForm({ type: CrisisType.VOTE_COLLECTIF, title: '', content: '', optionA: '', optionB: '', deadlineMinutes: 60 });
    },
    onError: (err: unknown) => {
      setCrisisResult(err instanceof Error ? err.message : 'Erreur');
    },
  });

  const dailyMutation = useMutation({
    mutationFn: () => adminApi.triggerDailyUpdate(),
    onSuccess: () => {
      setDailyResult(`Jour ${currentDay + 1} généré avec succès.`);
      queryClient.invalidateQueries({ queryKey: ['game-config'] });
      queryClient.invalidateQueries({ queryKey: ['game-scores'] });
    },
    onError: (err: unknown) => {
      setDailyResult(err instanceof Error ? err.message : 'Erreur');
    },
  });

  const scoreMutation = useMutation({
    mutationFn: () => adminApi.calculateScore(),
    onSuccess: () => {
      setDailyResult(`Score du Jour ${currentDay} calculé.`);
      queryClient.invalidateQueries({ queryKey: ['game-scores'] });
    },
    onError: (err: unknown) => {
      setDailyResult(err instanceof Error ? err.message : 'Erreur');
    },
  });

  const { data: aiLogs = [] } = useQuery({
    queryKey: ['admin-ai-logs'],
    queryFn: () => adminApi.getAiLogs(),
    refetchInterval: 15_000,
  });

  const { data: scores = [] } = useQuery({
    queryKey: ['game-scores'],
    queryFn: () => gameApi.getScores(),
    refetchInterval: 30_000,
  });

  const forcePhaseMutation = useMutation({
    mutationFn: (phase: string) => adminApi.forcePhase(phase),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['game-config'] }),
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

            {/* Mise à jour quotidienne */}
            {phase === GamePhase.PLAYING && (
              <div className="bg-[#141414] border border-zinc-800 p-6">
                <p className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase text-zinc-500 mb-1">
                  Boucle quotidienne
                </p>
                <p className="text-xs text-zinc-600 font-['Inter'] mb-4">
                  Jour actuel : <span className="text-white">{currentDay}/30</span>
                </p>
                <button
                  onClick={() => { setDailyResult(null); scoreMutation.mutate(); }}
                  disabled={scoreMutation.isPending || dailyMutation.isPending}
                  className="w-full py-2 border border-zinc-700 text-zinc-500 font-['Space_Grotesk'] text-[11px] tracking-widest uppercase hover:border-zinc-400 hover:text-zinc-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {scoreMutation.isPending ? 'Calcul...' : `Calculer score Jour ${currentDay}`}
                </button>
                <button
                  onClick={() => { setDailyResult(null); dailyMutation.mutate(); }}
                  disabled={dailyMutation.isPending || scoreMutation.isPending || currentDay >= 30}
                  className="w-full py-3 border border-zinc-600 text-zinc-300 font-['Space_Grotesk'] text-[11px] tracking-widest uppercase hover:border-white hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {dailyMutation.isPending ? 'Génération en cours...' : `Générer le Jour ${currentDay + 1}`}
                </button>
                {dailyResult && (
                  <p className={`text-xs mt-2 font-['Inter'] ${dailyResult.includes('Erreur') || dailyResult.includes('erreur') ? 'text-red-400' : 'text-green-400'}`}>
                    {dailyResult}
                  </p>
                )}
              </div>
            )}

            {/* Créer une crise */}
            {phase === GamePhase.PLAYING && (
              <div className="bg-[#141414] border border-zinc-800 p-6">
                <p className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase text-zinc-500 mb-4">
                  Créer une crise
                </p>
                <div className="space-y-3">
                  <select
                    value={crisisForm.type}
                    onChange={(e) => setCrisisForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full bg-[#0A0A0A] border border-zinc-700 text-zinc-300 text-[11px] font-['Space_Grotesk'] px-2 py-2 focus:outline-none focus:border-zinc-400"
                  >
                    <option value={CrisisType.VOTE_COLLECTIF}>Type A — Vote collectif</option>
                    <option value={CrisisType.SUBI}>Type B — Crise subie</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Titre"
                    value={crisisForm.title}
                    onChange={(e) => setCrisisForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full bg-transparent border border-zinc-700 px-3 py-2 text-white text-sm font-['Inter'] placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400"
                  />
                  <textarea
                    placeholder="Description de la crise..."
                    value={crisisForm.content}
                    onChange={(e) => setCrisisForm((f) => ({ ...f, content: e.target.value }))}
                    rows={3}
                    className="w-full bg-transparent border border-zinc-700 px-3 py-2 text-white text-sm font-['Inter'] placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 resize-none"
                  />
                  {crisisForm.type === CrisisType.VOTE_COLLECTIF && (
                    <>
                      <input
                        type="text"
                        placeholder="Option A"
                        value={crisisForm.optionA}
                        onChange={(e) => setCrisisForm((f) => ({ ...f, optionA: e.target.value }))}
                        className="w-full bg-transparent border border-zinc-700 px-3 py-2 text-white text-sm font-['Inter'] placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400"
                      />
                      <input
                        type="text"
                        placeholder="Option B"
                        value={crisisForm.optionB}
                        onChange={(e) => setCrisisForm((f) => ({ ...f, optionB: e.target.value }))}
                        className="w-full bg-transparent border border-zinc-700 px-3 py-2 text-white text-sm font-['Inter'] placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-zinc-600 font-['Inter']">Délai :</span>
                        <input
                          type="number"
                          min={5}
                          max={1440}
                          value={crisisForm.deadlineMinutes}
                          onChange={(e) => setCrisisForm((f) => ({ ...f, deadlineMinutes: Number(e.target.value) }))}
                          className="w-20 bg-transparent border border-zinc-700 px-2 py-1 text-white text-sm font-['Inter'] focus:outline-none focus:border-zinc-400 text-center"
                        />
                        <span className="text-[11px] text-zinc-600 font-['Inter']">minutes</span>
                      </div>
                    </>
                  )}
                  {crisisResult && (
                    <p className={`text-xs font-['Inter'] ${crisisResult.includes('Erreur') ? 'text-red-400' : 'text-green-400'}`}>
                      {crisisResult}
                    </p>
                  )}
                  <button
                    onClick={() => { setCrisisResult(null); crisisMutation.mutate(); }}
                    disabled={crisisMutation.isPending || !crisisForm.title || !crisisForm.content}
                    className="w-full py-2 border border-[#FF3B30] text-[#FF3B30] font-['Space_Grotesk'] text-[11px] tracking-widest uppercase hover:bg-[#FF3B30] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {crisisMutation.isPending ? 'Diffusion...' : 'Déclencher la crise'}
                  </button>
                </div>
              </div>
            )}

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
            {/* Configuration */}
            <div className="bg-[#141414] border border-zinc-800 p-6">
              <p className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase text-zinc-500 mb-4">
                Configuration
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-zinc-600 font-['Inter'] mb-1">
                    Heure de mise à jour quotidienne
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={configHour}
                      onChange={(e) => setConfigHour(Number(e.target.value))}
                      className="w-20 bg-transparent border border-zinc-700 px-3 py-2 text-white text-sm font-['Inter'] focus:outline-none focus:border-zinc-400 text-center"
                    />
                    <span className="text-[11px] text-zinc-600 font-['Inter']">h00</span>
                    <button
                      onClick={() => updateConfigMutation.mutate(configHour)}
                      disabled={updateConfigMutation.isPending}
                      className="flex-1 py-2 border border-zinc-600 text-zinc-300 font-['Space_Grotesk'] text-[11px] tracking-widest uppercase hover:border-white hover:text-white transition-colors disabled:opacity-30"
                    >
                      {configSaved ? 'Sauvé ✓' : 'Sauvegarder'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Profil client */}
        <div className="mt-8 bg-[#141414] border border-zinc-800">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <p className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase text-zinc-500">
              Profil du client
            </p>
            {clientProfile ? (
              <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-green-500 uppercase">
                Configuré
              </span>
            ) : (
              <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-red-400 uppercase">
                Manquant — requis avant le lancement
              </span>
            )}
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-zinc-600 font-['Inter'] mb-1">Prénom du client</label>
              <input
                type="text"
                placeholder="ex : Sophie"
                value={clientForm.name}
                onChange={(e) => setClientForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-transparent border border-zinc-700 px-3 py-2 text-white text-sm font-['Inter'] placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-600 font-['Inter'] mb-1">Nom de l'entreprise</label>
              <input
                type="text"
                placeholder="ex : NovaTech SAS"
                value={clientForm.companyName}
                onChange={(e) => setClientForm((f) => ({ ...f, companyName: e.target.value }))}
                className="w-full bg-transparent border border-zinc-700 px-3 py-2 text-white text-sm font-['Inter'] placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-600 font-['Inter'] mb-1">Secteur d'activité</label>
              <input
                type="text"
                placeholder="ex : FinTech B2B"
                value={clientForm.sector}
                onChange={(e) => setClientForm((f) => ({ ...f, sector: e.target.value }))}
                className="w-full bg-transparent border border-zinc-700 px-3 py-2 text-white text-sm font-['Inter'] placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400"
              />
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-[11px] text-zinc-600 font-['Inter'] mb-1">
                  Seuil de tolérance (1–100)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={clientForm.toleranceThreshold}
                  onChange={(e) => setClientForm((f) => ({ ...f, toleranceThreshold: Number(e.target.value) }))}
                  className="w-full bg-transparent border border-zinc-700 px-3 py-2 text-white text-sm font-['Inter'] focus:outline-none focus:border-zinc-400 text-center"
                />
              </div>
              <p className="text-[11px] text-zinc-600 font-['Inter'] pb-2">
                Score min avant game over
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] text-zinc-600 font-['Inter'] mb-1">Personnalité</label>
              <textarea
                placeholder="ex : Exigeante, perfectionniste, réactive sur les réseaux sociaux. Apprécie la transparence mais déteste les surprises négatives."
                value={clientForm.personality}
                onChange={(e) => setClientForm((f) => ({ ...f, personality: e.target.value }))}
                rows={3}
                className="w-full bg-transparent border border-zinc-700 px-3 py-2 text-white text-sm font-['Inter'] placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] text-zinc-600 font-['Inter'] mb-1">Brief initial</label>
              <textarea
                placeholder="ex : Lancer une campagne de notoriété pour le produit X sur LinkedIn et Twitter, budget 50k€, cible : DSI de PME."
                value={clientForm.initialBrief}
                onChange={(e) => setClientForm((f) => ({ ...f, initialBrief: e.target.value }))}
                rows={4}
                className="w-full bg-transparent border border-zinc-700 px-3 py-2 text-white text-sm font-['Inter'] placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 resize-none"
              />
            </div>
            {clientError && (
              <p className="md:col-span-2 text-red-400 text-xs font-['Inter']">{clientError}</p>
            )}
            <div className="md:col-span-2 flex justify-end">
              <button
                onClick={() => upsertClientMutation.mutate()}
                disabled={upsertClientMutation.isPending || !clientForm.name || !clientForm.companyName || !clientForm.initialBrief}
                className="px-8 py-2 border border-white text-white font-['Space_Grotesk'] text-[11px] tracking-widest uppercase hover:bg-white hover:text-[#0A0A0A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ boxShadow: '2px 2px 0px 0px #ffffff' }}
              >
                {clientSaved ? 'Sauvegardé ✓' : upsertClientMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder le profil'}
              </button>
            </div>
          </div>
        </div>

        {/* Contrôle de phase + Score sparkline */}
        {phase !== GamePhase.PRELAUNCH && (
          <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-8">

            {/* Score trend */}
            <div className="bg-[#141414] border border-zinc-800 p-6">
              <p className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase text-zinc-500 mb-4">
                Évolution de la satisfaction
              </p>
              {scores.length > 0 ? (
                <div>
                  <div className="flex gap-6 mb-4">
                    {scores.slice(-3).map((s) => (
                      <div key={s.dayNumber} className="text-center">
                        <span className="font-['Space_Grotesk'] text-[18px] font-bold text-white block">{s.score}%</span>
                        <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-600 uppercase">J{s.dayNumber}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-zinc-800 pt-4 mt-2">
                    <div className="flex gap-2 flex-wrap">
                      {scores.map((s) => (
                        <div
                          key={s.dayNumber}
                          title={`Jour ${s.dayNumber}: ${s.score}%`}
                          className="w-5 h-5 rounded-sm"
                          style={{ backgroundColor: s.score >= 70 ? '#34C759' : s.score >= 40 ? '#FF9500' : '#FF3B30', opacity: 0.7 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-600 text-sm font-['Inter']">Aucun score calculé</p>
              )}
            </div>

            {/* Forcer la phase */}
            <div className="bg-[#141414] border border-zinc-800 p-6">
              <p className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase text-zinc-500 mb-1">
                Contrôle de phase
              </p>
              <p className="text-xs text-zinc-600 font-['Inter'] mb-4">
                Phase actuelle : <span className="text-white font-semibold">{phase}</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {([GamePhase.PLAYING, GamePhase.VICTORY, GamePhase.DEFEAT, GamePhase.PRELAUNCH] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => forcePhaseMutation.mutate(p)}
                    disabled={phase === p || forcePhaseMutation.isPending}
                    className={`py-2 border font-['Space_Grotesk'] text-[10px] tracking-widest uppercase transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                      p === GamePhase.VICTORY ? 'border-green-700 text-green-400 hover:bg-green-900/30' :
                      p === GamePhase.DEFEAT ? 'border-red-800 text-red-400 hover:bg-red-900/30' :
                      'border-zinc-700 text-zinc-400 hover:border-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-700 mt-3 font-['Inter']">
                Forcer la phase pour tests et démonstration.
              </p>
            </div>
          </div>
        )}

        {/* Journal IA */}
        <div className="mt-8 bg-[#141414] border border-zinc-800">
          <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
            <p className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase text-zinc-500">
              Journal des appels IA
            </p>
            <span className="font-['Space_Grotesk'] text-[11px] text-zinc-600">
              {aiLogs.length} entrées
            </span>
          </div>
          {aiLogs.length === 0 ? (
            <div className="px-6 py-8 text-center text-zinc-600 font-['Inter'] text-sm">
              Aucun appel IA enregistré.
            </div>
          ) : (
            <div className="divide-y divide-zinc-900 max-h-80 overflow-y-auto">
              {aiLogs.map((log) => {
                const d = log.details as Record<string, unknown>;
                const tokens = d.inputTokens && d.outputTokens ? `${d.inputTokens}→${d.outputTokens} tokens` : '';
                const day = d.dayNumber ? `J${d.dayNumber}` : '';
                const label = log.action.replace('claude_', '').replace(/_/g, ' ');
                return (
                  <div key={log.id} className="px-6 py-3 flex items-center gap-4">
                    <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-600 uppercase w-36 shrink-0">
                      {label}
                    </span>
                    {day && <span className="font-['Space_Grotesk'] text-[10px] text-zinc-700 border border-zinc-800 px-1.5">{day}</span>}
                    {tokens && <span className="text-[11px] text-zinc-600 font-['Inter']">{tokens}</span>}
                    <span className="ml-auto text-[11px] text-zinc-700 font-['Inter']">
                      {new Date(log.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
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
