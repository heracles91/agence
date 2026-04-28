import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mailApi, gameApi, type InternalMail } from '@/services/api';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS, type GameRole } from 'agence-shared';

type View = 'inbox' | 'sent' | 'compose';

interface ComposeInit {
  mode: 'new' | 'reply' | 'forward';
  selectedIds?: string[];
  subject?: string;
  body?: string;
}

function prefixSubject(prefix: string, subject: string): string {
  const stripped = subject.replace(/^(Re|Fwd|Tr)\s*:\s*/i, '').trim();
  return `${prefix} : ${stripped}`.slice(0, 120);
}

function quoteBody(mail: InternalMail, mode: 'reply' | 'forward'): string {
  const date = new Date(mail.createdAt).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  }) + ' à ' + new Date(mail.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const header = mode === 'reply'
    ? `--- Message de ${mail.sender.username} (${date}) ---`
    : `--- Message transféré de ${mail.sender.username} (${date}) ---`;
  return `\n\n${header}\n${mail.body}`;
}

function MailRow({
  mail,
  side,
  selected,
  onClick,
}: {
  mail: InternalMail;
  side: 'inbox' | 'sent';
  selected: boolean;
  onClick: () => void;
}) {
  const person = side === 'inbox' ? mail.sender : mail.recipient;
  const unread = side === 'inbox' && !mail.isRead;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-5 py-4 border-b border-zinc-900 transition-colors ${
        selected
          ? 'bg-zinc-900 border-l-2 border-l-white'
          : unread
          ? 'bg-zinc-900/40 hover:bg-zinc-900/70'
          : 'hover:bg-zinc-900/30'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {unread && <span className="w-1.5 h-1.5 rounded-full bg-[#FF9500] shrink-0" />}
          <span className={`font-['Space_Grotesk'] text-[12px] font-semibold ${unread ? 'text-white' : 'text-zinc-400'}`}>
            {person.username}
          </span>
          {person.role && (
            <span className="font-['Space_Grotesk'] text-[9px] tracking-widest text-zinc-600 uppercase">
              {ROLE_LABELS[person.role as GameRole] ?? person.role}
            </span>
          )}
        </div>
        <span className="font-['Space_Grotesk'] text-[10px] text-zinc-600">
          {new Date(mail.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
          {' '}
          {new Date(mail.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <p className={`font-['Space_Grotesk'] text-[12px] truncate ${selected ? 'text-zinc-200' : unread ? 'text-zinc-300' : 'text-zinc-500'}`}>
        {mail.subject}
      </p>
    </button>
  );
}

function ComposeForm({
  init = { mode: 'new' },
  onSent,
  onCancel,
}: {
  init?: ComposeInit;
  onSent: () => void;
  onCancel: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(init.selectedIds ?? []);
  const [subject, setSubject] = useState(init.subject ?? '');
  const [body, setBody] = useState(init.body ?? '');
  const { user } = useAuth();

  const { data: team = [] } = useQuery({
    queryKey: ['game-team'],
    queryFn: () => gameApi.getTeam(),
  });

  const queryClient = useQueryClient();
  const sendMutation = useMutation({
    mutationFn: () => mailApi.send({ recipientIds: selectedIds, subject, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mail-sent'] });
      onSent();
    },
  });

  const recipients = team.filter((p) => p.id !== user?.id);
  const allSelected = recipients.length > 0 && selectedIds.length === recipients.length;
  const canSend = selectedIds.length > 0 && subject.trim() && body.trim() && !sendMutation.isPending;

  function toggleId(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : recipients.map((p) => p.id));
  }

  const modeLabel = init.mode === 'reply' ? 'Répondre' : init.mode === 'forward' ? 'Transférer' : 'Nouveau message';

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-zinc-500">
            {init.mode === 'reply' ? 'reply' : init.mode === 'forward' ? 'forward' : 'edit'}
          </span>
          <span className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase text-zinc-500">
            {modeLabel}
          </span>
        </div>
        <button onClick={onCancel} className="text-zinc-600 hover:text-zinc-300 transition-colors">
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto">
        {/* Destinataires */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="font-['Space_Grotesk'] text-[10px] tracking-widest uppercase text-zinc-600">
              Destinataires
              {selectedIds.length > 0 && (
                <span className="ml-2 text-zinc-400">({selectedIds.length})</span>
              )}
            </label>
            <button
              type="button"
              onClick={toggleAll}
              className={`font-['Space_Grotesk'] text-[9px] tracking-widest uppercase px-2 py-1 border transition-colors ${
                allSelected
                  ? 'border-white text-white bg-zinc-800'
                  : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
              }`}
            >
              Tout le monde
            </button>
          </div>
          <div className="bg-[#141414] border border-zinc-800 divide-y divide-zinc-900 max-h-44 overflow-y-auto">
            {recipients.map((p) => {
              const checked = selectedIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleId(p.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    checked ? 'bg-zinc-800' : 'hover:bg-zinc-900/60'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-base shrink-0"
                    style={{ color: checked ? '#ffffff' : '#52525b', fontVariationSettings: checked ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {checked ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                  <span className="font-['Space_Grotesk'] text-[12px] text-white">{p.username}</span>
                  {p.role && (
                    <span className="font-['Space_Grotesk'] text-[9px] tracking-widest text-zinc-600 uppercase">
                      {ROLE_LABELS[p.role as GameRole] ?? p.role}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Objet */}
        <div>
          <label className="font-['Space_Grotesk'] text-[10px] tracking-widest uppercase text-zinc-600 block mb-2">
            Objet
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={120}
            placeholder="Objet du message"
            className="w-full bg-[#141414] border border-zinc-800 text-white font-['Inter'] text-[13px] px-3 py-2.5 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600"
          />
          <p className="text-right text-[10px] text-zinc-700 mt-1">{subject.length}/120</p>
        </div>

        {/* Corps */}
        <div className="flex-1 flex flex-col">
          <label className="font-['Space_Grotesk'] text-[10px] tracking-widest uppercase text-zinc-600 block mb-2">
            Message
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Votre message…"
            className="flex-1 min-h-[200px] w-full bg-[#141414] border border-zinc-800 text-white font-['Inter'] text-[13px] px-3 py-2.5 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 resize-none leading-relaxed"
          />
        </div>

        {sendMutation.isError && (
          <p className="text-[12px] text-red-400 font-['Inter']">
            Erreur lors de l'envoi. Réessayez.
          </p>
        )}

        <button
          onClick={() => sendMutation.mutate()}
          disabled={!canSend}
          className="flex items-center justify-center gap-2 py-3 bg-white text-black font-['Space_Grotesk'] text-[11px] tracking-widest uppercase font-bold hover:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-base">send</span>
          {sendMutation.isPending ? 'Envoi…' : `Envoyer${selectedIds.length > 1 ? ` (${selectedIds.length})` : ''}`}
        </button>
      </div>
    </div>
  );
}

function MailDetail({
  mail,
  onBack,
  onReply,
  onForward,
}: {
  mail: InternalMail;
  onBack: () => void;
  onReply: (init: ComposeInit) => void;
  onForward: (init: ComposeInit) => void;
}) {
  const { user } = useAuth();
  const canReply = mail.sender.id !== user?.id;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-zinc-800 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-4 font-['Space_Grotesk'] text-[11px] tracking-widest uppercase"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Retour
        </button>
        <h3 className="font-['Space_Grotesk'] text-[18px] font-bold text-white leading-snug">
          {mail.subject}
        </h3>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className="font-['Space_Grotesk'] text-[11px] text-zinc-500">
            De <span className="text-zinc-300 font-semibold">{mail.sender.username}</span>
          </span>
          {mail.sender.role && (
            <span className="font-['Space_Grotesk'] text-[9px] tracking-widest text-zinc-600 uppercase border border-zinc-800 px-2 py-0.5">
              {ROLE_LABELS[mail.sender.role as GameRole] ?? mail.sender.role}
            </span>
          )}
          <span className="font-['Space_Grotesk'] text-[11px] text-zinc-500">
            À <span className="text-zinc-300 font-semibold">{mail.recipient.username}</span>
          </span>
          <span className="text-zinc-700 text-[11px]">
            {new Date(mail.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            {' à '}
            {new Date(mail.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <p className="font-['Inter'] text-[14px] text-zinc-300 leading-[1.8] whitespace-pre-wrap">
          {mail.body}
        </p>
      </div>

      {/* Action bar */}
      <div className="px-6 py-4 border-t border-zinc-800 flex items-center gap-3 shrink-0">
        {canReply && (
          <button
            onClick={() => onReply({
              mode: 'reply',
              selectedIds: [mail.sender.id],
              subject: prefixSubject('Re', mail.subject),
              body: quoteBody(mail, 'reply'),
            })}
            className="flex items-center gap-2 px-4 py-2.5 border border-zinc-700 text-white font-['Space_Grotesk'] text-[11px] tracking-widest uppercase hover:bg-zinc-900 transition-colors"
          >
            <span className="material-symbols-outlined text-base">reply</span>
            Répondre
          </button>
        )}
        <button
          onClick={() => onForward({
            mode: 'forward',
            selectedIds: [],
            subject: prefixSubject('Fwd', mail.subject),
            body: quoteBody(mail, 'forward'),
          })}
          className="flex items-center gap-2 px-4 py-2.5 border border-zinc-700 text-white font-['Space_Grotesk'] text-[11px] tracking-widest uppercase hover:bg-zinc-900 transition-colors"
        >
          <span className="material-symbols-outlined text-base">forward</span>
          Transférer
        </button>
      </div>
    </div>
  );
}

export function Mail() {
  const [view, setView] = useState<View>('inbox');
  const [selected, setSelected] = useState<InternalMail | null>(null);
  const [composeInit, setComposeInit] = useState<ComposeInit>({ mode: 'new' });
  const queryClient = useQueryClient();

  const { data: inbox = [], isLoading: loadingInbox } = useQuery({
    queryKey: ['mail-inbox'],
    queryFn: () => mailApi.getInbox(),
    refetchInterval: 30_000,
  });

  const { data: sent = [], isLoading: loadingSent } = useQuery({
    queryKey: ['mail-sent'],
    queryFn: () => mailApi.getSent(),
    refetchInterval: 60_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => mailApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mail-inbox'] }),
  });

  function openMail(mail: InternalMail) {
    setSelected(mail);
    if (!mail.isRead) markReadMutation.mutate(mail.id);
  }

  function openCompose(init: ComposeInit = { mode: 'new' }) {
    setComposeInit(init);
    setView('compose');
    setSelected(null);
  }

  const unread = inbox.filter((m) => !m.isRead).length;
  const mails = view === 'inbox' ? inbox : sent;
  const loading = view === 'inbox' ? loadingInbox : loadingSent;

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white">
      <Sidebar />
      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        <TopBar />
        <main className="flex-1 flex pt-16 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>

          {/* Colonne gauche : navigation + liste */}
          <div className="w-72 border-r border-zinc-800 flex flex-col shrink-0 h-full overflow-hidden">

            {/* Header */}
            <div className="px-5 py-5 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase text-zinc-500">
                  Messagerie
                </span>
                {unread > 0 && (
                  <span className="bg-[#FF9500] text-black font-['Space_Grotesk'] text-[9px] font-bold px-1.5 py-0.5">
                    {unread}
                  </span>
                )}
              </div>
              <button
                onClick={() => openCompose()}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-zinc-700 text-white font-['Space_Grotesk'] text-[11px] tracking-widest uppercase hover:bg-zinc-900 transition-colors"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                Rédiger
              </button>
            </div>

            {/* Tabs inbox / sent */}
            <div className="flex border-b border-zinc-800 shrink-0">
              {(['inbox', 'sent'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setView(tab); setSelected(null); }}
                  className={`flex-1 py-2.5 font-['Space_Grotesk'] text-[10px] tracking-widest uppercase transition-colors ${
                    view === tab ? 'text-white border-b-2 border-white' : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  {tab === 'inbox' ? 'Boîte de réception' : 'Envoyés'}
                </button>
              ))}
            </div>

            {/* Liste des mails */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="py-10 text-center text-zinc-700 text-sm">Chargement…</div>
              ) : mails.length === 0 ? (
                <div className="py-10 text-center">
                  <span className="material-symbols-outlined text-3xl text-zinc-800 block mb-2">inbox</span>
                  <p className="font-['Space_Grotesk'] text-[11px] text-zinc-700 uppercase tracking-widest">
                    {view === 'inbox' ? 'Aucun message reçu' : 'Aucun message envoyé'}
                  </p>
                </div>
              ) : (
                mails.map((mail) => (
                  <MailRow
                    key={mail.id}
                    mail={mail}
                    side={view === 'inbox' ? 'inbox' : 'sent'}
                    selected={selected?.id === mail.id}
                    onClick={() => openMail(mail)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Colonne droite : détail / composition */}
          <div className="flex-1 h-full overflow-hidden">
            {view === 'compose' ? (
              <ComposeForm
                key={composeInit.mode + (composeInit.subject ?? '')}
                init={composeInit}
                onSent={() => setView('sent')}
                onCancel={() => setView(selected ? 'inbox' : 'inbox')}
              />
            ) : selected ? (
              <MailDetail
                mail={selected}
                onBack={() => setSelected(null)}
                onReply={openCompose}
                onForward={openCompose}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                <span className="material-symbols-outlined text-5xl text-zinc-800">mail</span>
                <p className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase text-zinc-700">
                  Sélectionne un message ou rédige-en un nouveau
                </p>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
