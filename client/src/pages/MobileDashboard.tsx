import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { gameApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { useDeviceCheck } from '@/hooks/useDeviceCheck';
import { GamePhase, CrisisType, ROLE_LABELS, type GameRole } from 'agence-shared';

type Tab = 'score' | 'news' | 'crises' | 'client';

function scoreColor(score: number) {
  if (score >= 70) return '#34C759';
  if (score >= 40) return '#FF9500';
  return '#FF3B30';
}

function ScoreTab() {
  const { currentDay } = useGame();
  const { data: scores = [] } = useQuery({
    queryKey: ['game-scores'],
    queryFn: () => gameApi.getScores(),
    refetchInterval: 60_000,
  });

  const sorted = [...scores].sort((a, b) => a.dayNumber - b.dayNumber);
  const last = sorted[sorted.length - 1];
  const color = last ? scoreColor(last.score) : '#8E8E93';

  return (
    <div className="px-5 py-6 space-y-6">
      {/* Score principal */}
      <div className="bg-[#141414] border border-zinc-800 p-6 text-center">
        <p className="font-['Space_Grotesk'] text-[10px] tracking-[0.3em] text-zinc-600 uppercase mb-3">
          JOUR {currentDay} — SATISFACTION CLIENT
        </p>
        {last ? (
          <>
            <span
              className="font-['Space_Grotesk'] text-[88px] font-black leading-none"
              style={{ color }}
            >
              {last.score}
            </span>
            <span className="font-['Space_Grotesk'] text-[32px] font-bold text-zinc-500">%</span>
            <div className="flex justify-center items-center gap-2 mt-2">
              <span
                className="font-['Space_Grotesk'] text-[14px] font-bold"
                style={{ color: (last.delta ?? 0) >= 0 ? '#34C759' : '#FF3B30' }}
              >
                {last.delta >= 0 ? '+' : ''}{last.delta}% depuis hier
              </span>
            </div>
            {last.aiComment && (
              <p className="text-[13px] text-zinc-500 italic mt-4 leading-relaxed border-t border-zinc-800 pt-4">
                "{last.aiComment}"
              </p>
            )}
          </>
        ) : (
          <p className="text-zinc-600 text-sm">Score pas encore calculé</p>
        )}
      </div>

      {/* Mini historique */}
      {sorted.length > 1 && (
        <div className="bg-[#141414] border border-zinc-800 p-4">
          <p className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-600 uppercase mb-3">
            Évolution
          </p>
          <div className="space-y-2">
            {sorted.slice(-5).reverse().map((s) => (
              <div key={s.dayNumber} className="flex items-center justify-between">
                <span className="font-['Space_Grotesk'] text-[11px] text-zinc-600">J{s.dayNumber}</span>
                <div className="flex-1 mx-3 h-px bg-zinc-900" />
                <span
                  className="font-['Space_Grotesk'] text-[14px] font-bold"
                  style={{ color: scoreColor(s.score) }}
                >
                  {s.score}%
                </span>
                <span
                  className="font-['Space_Grotesk'] text-[11px] ml-2 w-10 text-right"
                  style={{ color: (s.delta ?? 0) >= 0 ? '#34C759' : '#FF3B30' }}
                >
                  {s.delta >= 0 ? '+' : ''}{s.delta}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NewsTab() {
  const { currentDay } = useGame();
  const { data: news = [], isLoading } = useQuery({
    queryKey: ['game-news'],
    queryFn: () => gameApi.getNews(),
    refetchInterval: 60_000,
  });

  return (
    <div className="px-5 py-6 space-y-4">
      <p className="font-['Space_Grotesk'] text-[10px] tracking-[0.3em] text-zinc-600 uppercase">
        JOUR {currentDay} — ACTUALITÉS
      </p>
      {isLoading ? (
        <div className="py-12 text-center text-zinc-700 text-sm">Chargement…</div>
      ) : news.length === 0 ? (
        <div className="py-12 text-center">
          <span className="material-symbols-outlined text-4xl text-zinc-800 block mb-3">newspaper</span>
          <p className="font-['Space_Grotesk'] text-[11px] tracking-widest text-zinc-700 uppercase">
            Pas d'actualité aujourd'hui
          </p>
        </div>
      ) : (
        news.map((n) => (
          <div key={n.id} className="bg-[#141414] border border-zinc-800 p-5">
            <p className="text-[15px] text-zinc-300 leading-relaxed">{n.content}</p>
            <p className="font-['Space_Grotesk'] text-[10px] text-zinc-700 mt-3 uppercase tracking-widest">
              {new Date(n.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        ))
      )}
    </div>
  );
}

function CrisesTab() {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['game-history'],
    queryFn: () => gameApi.getHistory(),
    refetchInterval: 60_000,
  });

  const daysWithCrises = history.filter((d) => d.crises.length > 0);

  return (
    <div className="px-5 py-6 space-y-4">
      <p className="font-['Space_Grotesk'] text-[10px] tracking-[0.3em] text-zinc-600 uppercase">
        HISTORIQUE DES CRISES
      </p>
      {isLoading ? (
        <div className="py-12 text-center text-zinc-700 text-sm">Chargement…</div>
      ) : daysWithCrises.length === 0 ? (
        <div className="py-12 text-center">
          <span className="material-symbols-outlined text-4xl text-zinc-800 block mb-3">shield</span>
          <p className="font-['Space_Grotesk'] text-[11px] tracking-widest text-zinc-700 uppercase">
            Aucune crise enregistrée
          </p>
        </div>
      ) : (
        daysWithCrises.map((day) => (
          <div key={day.dayNumber} className="bg-[#141414] border border-zinc-800 overflow-hidden">
            <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-2">
              <span className="font-['Space_Grotesk'] text-[10px] font-bold tracking-widest text-zinc-500 uppercase border border-zinc-800 px-2 py-0.5">
                JOUR {day.dayNumber}
              </span>
              <span className="font-['Space_Grotesk'] text-[10px] text-zinc-600">
                {day.crises.length} crise{day.crises.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="divide-y divide-zinc-900">
              {day.crises.map((c) => (
                <div key={c.id} className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <span
                      className="material-symbols-outlined text-base mt-0.5 shrink-0"
                      style={{
                        color: c.winningOption ? '#34C759' : '#FF3B30',
                        fontVariationSettings: "'FILL' 1",
                      }}
                    >
                      {c.winningOption ? 'check_circle' : 'cancel'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-['Space_Grotesk'] text-[9px] tracking-widest font-bold uppercase px-1.5 py-0.5 ${
                          c.type === CrisisType.VOTE_COLLECTIF ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {c.type === CrisisType.VOTE_COLLECTIF ? 'VOTE' : 'SUBI'}
                        </span>
                      </div>
                      <p className="font-['Space_Grotesk'] text-[13px] font-semibold text-white">
                        {c.title}
                      </p>
                      {c.aiConsequence && (
                        <p className="text-[12px] text-zinc-500 italic mt-1 leading-snug">
                          {c.aiConsequence}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ClientTab() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['client-profile'],
    queryFn: () => gameApi.getClientProfile(),
    staleTime: 60_000,
  });

  if (isLoading) return <div className="py-12 text-center text-zinc-700 text-sm px-5">Chargement…</div>;
  if (!profile) return (
    <div className="px-5 py-12 text-center">
      <p className="font-['Space_Grotesk'] text-[11px] tracking-widest text-zinc-700 uppercase">
        Profil non configuré
      </p>
    </div>
  );

  return (
    <div className="px-5 py-6 space-y-4">
      {/* Portrait */}
      <div className="bg-[#141414] border border-zinc-800 overflow-hidden">
        {profile.photoUrl ? (
          <img
            src={profile.photoUrl}
            alt={profile.name}
            className="w-full h-48 object-cover object-top"
          />
        ) : (
          <div className="h-32 flex items-center justify-center bg-zinc-900">
            <span className="material-symbols-outlined text-zinc-700 text-5xl">person</span>
          </div>
        )}
        <div className="p-4">
          <p className="font-['Space_Grotesk'] text-[20px] font-bold text-white uppercase">{profile.name}</p>
          <p className="font-['Space_Grotesk'] text-[13px] text-zinc-400 mt-0.5">{profile.companyName}</p>
          <span className="inline-block mt-2 font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-600 uppercase border border-zinc-800 px-2 py-0.5">
            {profile.sector}
          </span>
        </div>
      </div>

      {/* Personnalité */}
      <div className="bg-[#141414] border border-zinc-800 p-4">
        <p className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-600 uppercase mb-3">
          Personnalité
        </p>
        <p className="text-[14px] text-zinc-300 leading-relaxed">{profile.personality}</p>
      </div>

      {/* Brief */}
      <div className="bg-[#141414] border border-zinc-800 p-4">
        <p className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-600 uppercase mb-3">
          Brief initial
        </p>
        <p className="text-[14px] text-zinc-300 leading-relaxed italic">"{profile.initialBrief}"</p>
      </div>
    </div>
  );
}

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'score',  icon: 'show_chart',   label: 'Score'   },
  { id: 'news',   icon: 'newspaper',    label: 'Actus'   },
  { id: 'crises', icon: 'crisis_alert', label: 'Crises'  },
  { id: 'client', icon: 'person',       label: 'Client'  },
];

export function MobileDashboard() {
  const { isMobile } = useDeviceCheck();
  const { phase, currentDay } = useGame();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('score');

  // Redirige les desktops vers le dashboard normal
  if (!isMobile) return <Navigate to="/dashboard" replace />;
  if (phase !== GamePhase.PLAYING) return <Navigate to="/prelaunch" replace />;

  const role = user?.role ? (ROLE_LABELS[user.role as GameRole] ?? user.role) : null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">

      {/* Header */}
      <div className="px-5 pt-10 pb-4 border-b border-zinc-900 shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-['Space_Grotesk'] text-[28px] font-black tracking-tighter text-white italic leading-none">
              AGENCE
            </h1>
            <p className="font-['Space_Grotesk'] text-[10px] tracking-[0.25em] text-zinc-600 uppercase mt-1">
              JOUR {currentDay} — LECTURE SEULE
            </p>
          </div>
          <div className="text-right">
            <p className="font-['Space_Grotesk'] text-[13px] font-semibold text-white">{user?.username}</p>
            {role && <p className="font-['Space_Grotesk'] text-[10px] text-zinc-600 uppercase tracking-widest mt-0.5">{role}</p>}
          </div>
        </div>
        <div className="mt-3 p-2 bg-zinc-900/60 border border-zinc-800">
          <p className="font-['Space_Grotesk'] text-[10px] text-zinc-600 text-center uppercase tracking-widest">
            Pour jouer, connecte-toi sur ordinateur
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'score'  && <ScoreTab />}
        {activeTab === 'news'   && <NewsTab />}
        {activeTab === 'crises' && <CrisesTab />}
        {activeTab === 'client' && <ClientTab />}
      </div>

      {/* Tab bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0F0F0F] border-t border-zinc-800 grid grid-cols-4 z-50">
        {TABS.map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
              activeTab === id ? 'text-white' : 'text-zinc-600'
            }`}
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={activeTab === id ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {icon}
            </span>
            <span className="font-['Space_Grotesk'] text-[9px] tracking-widest uppercase">
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
