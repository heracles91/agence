import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { voteApi } from '@/services/api';
import { Sidebar } from '@/components/layout/Sidebar';
import { GAME_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, Role, type GameRole, type VoterInfo } from 'agence-shared';

const ROLE_META: Record<GameRole, { code: string; icon: string }> = {
  [Role.DIRECTEUR_GENERAL]:  { code: 'EXE-01', icon: 'account_balance' },
  [Role.DIRECTEUR_CREATIF]:  { code: 'CRE-01', icon: 'palette' },
  [Role.DIRECTEUR_FINANCIER]:{ code: 'FIN-01', icon: 'attach_money' },
  [Role.CHEF_DE_PROJET]:     { code: 'PRJ-01', icon: 'schedule' },
  [Role.SOCIAL_MEDIA]:       { code: 'COM-02', icon: 'tag' },
  [Role.COPYWRITER]:         { code: 'CRE-02', icon: 'edit_note' },
  [Role.DESIGNER]:           { code: 'CRE-03', icon: 'design_services' },
  [Role.COMMERCIAL]:         { code: 'COM-01', icon: 'handshake' },
  [Role.CONSULTANT_EXTERNE]: { code: 'EXT-01', icon: 'lightbulb' },
};

function VoterAvatars({ voters }: { voters: VoterInfo[] }) {
  if (voters.length === 0) return <div className="h-6 mb-4" />;
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="flex -space-x-2">
        {voters.slice(0, 4).map((v) => (
          <div
            key={v.userId}
            title={v.username}
            className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-400 font-bold"
          >
            {v.initials}
          </div>
        ))}
        {voters.length > 4 && (
          <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-400 font-bold">
            +{voters.length - 4}
          </div>
        )}
      </div>
      <span className="text-[10px] text-zinc-500 lowercase">
        {voters.length} {voters.length > 1 ? 'personnes' : 'personne'} sur le poste
      </span>
    </div>
  );
}

interface RoleCardProps {
  role: GameRole;
  voters: VoterInfo[];
  myVote: Role | null;
  onVote: (role: GameRole) => void;
  isLoading: boolean;
}

function RoleCard({ role, voters, myVote, onVote, isLoading }: RoleCardProps) {
  const meta = ROLE_META[role];
  const isMyVote = myVote === role;
  const hasVoters = voters.length > 0;

  return (
    <div
      className="bg-[#141414] border border-zinc-800 p-8 flex flex-col justify-between min-h-[320px] transition-all duration-300 group relative overflow-hidden"
      style={{ borderColor: isMyVote ? '#ffffff' : '#27272a', transform: 'translateZ(0)' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px) translateZ(0)';
        (e.currentTarget as HTMLElement).style.borderColor = isMyVote ? '#ffffff' : '#52525b';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateZ(0)';
        (e.currentTarget as HTMLElement).style.borderColor = isMyVote ? '#ffffff' : '#27272a';
      }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -mr-16 -mt-16 rounded-full" />

      <div>
        <div className="flex justify-between items-start mb-6">
          <span className="font-['Space_Grotesk'] text-[12px] tracking-widest font-bold uppercase text-zinc-500 border border-zinc-800 px-2 py-1">
            {meta.code}
          </span>
          <span className="material-symbols-outlined text-zinc-500 group-hover:text-white transition-colors text-xl">
            {meta.icon}
          </span>
        </div>
        <h3 className="font-['Space_Grotesk'] text-[24px] font-semibold text-white uppercase mb-2 leading-tight">
          {ROLE_LABELS[role]}
        </h3>
        <p className="text-[14px] text-zinc-500 leading-relaxed line-clamp-2">
          {ROLE_DESCRIPTIONS[role]}
        </p>
      </div>

      <div className="mt-8">
        <VoterAvatars voters={voters} />
        <button
          onClick={() => onVote(role)}
          disabled={isLoading}
          className={
            isMyVote
              ? 'w-full border border-white text-[#0A0A0A] bg-white font-["Space_Grotesk"] text-[12px] tracking-widest font-bold py-3 uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2'
              : hasVoters
              ? 'w-full border border-zinc-700 text-white bg-transparent font-["Space_Grotesk"] text-[12px] tracking-widest font-bold py-3 uppercase hover:bg-zinc-900 transition-colors disabled:opacity-50'
              : 'w-full border border-white text-[#0A0A0A] bg-white font-["Space_Grotesk"] text-[12px] tracking-widest font-bold py-3 uppercase transition-all hover:bg-[#0A0A0A] hover:text-white disabled:opacity-50'
          }
          style={
            isMyVote
              ? {}
              : hasVoters
              ? {}
              : { boxShadow: '2px 2px 0px 0px #ffffff' }
          }
        >
          {isMyVote ? (
            <>
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              Ma sélection
            </>
          ) : hasVoters ? (
            'Voter'
          ) : (
            'Revendiquer'
          )}
        </button>
      </div>
    </div>
  );
}

export function Prelaunch() {
  const queryClient = useQueryClient();

  const { data: voteData } = useQuery({
    queryKey: ['role-votes'],
    queryFn: () => voteApi.getRoleVotes(),
    refetchInterval: 5000,
  });

  const voteMutation = useMutation({
    mutationFn: (role: GameRole) => {
      if (voteData?.myVote === role) {
        return voteApi.cancelRoleVote();
      }
      return voteApi.castRoleVote(role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-votes'] });
    },
  });

  const votes = voteData?.votes ?? {};
  const myVote = voteData?.myVote ?? null;

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white">
      <Sidebar />

      {/* Main content */}
      <main className="ml-64 flex-1 min-h-screen bg-[#0A0A0A] p-12">
        {/* Header */}
        <header className="max-w-[1200px] mx-auto mb-16 flex justify-between items-end border-b border-zinc-800 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-1 bg-[#141414] border border-zinc-800 font-['Space_Grotesk'] text-[12px] tracking-widest font-bold uppercase text-zinc-500">
                PHASE 0
              </span>
              <span className="font-['Space_Grotesk'] text-[12px] tracking-widest font-bold uppercase text-white">
                PRÉ-LANCEMENT
              </span>
            </div>
            <h2 className="font-['Space_Grotesk'] text-[64px] font-bold text-white leading-none uppercase tracking-tighter">
              Affectation<br />des Rôles
            </h2>
          </div>
          <div className="text-right max-w-xs">
            <p className="text-[16px] text-zinc-500 leading-relaxed">
              Déclarez vos intentions de poste avant le lancement.
              Les conflits seront résolus par vote collectif.
            </p>
            {myVote && (
              <div className="mt-4 px-3 py-2 border border-zinc-700 inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-green-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
                <span className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase text-zinc-400">
                  Votre choix : {ROLE_LABELS[myVote as GameRole]}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Role cards grid */}
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {GAME_ROLES.map((role) => (
            <RoleCard
              key={role}
              role={role}
              voters={votes[role] ?? []}
              myVote={myVote}
              onVote={(r) => voteMutation.mutate(r)}
              isLoading={voteMutation.isPending}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

