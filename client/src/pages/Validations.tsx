import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { minigameApi } from '@/services/api';
import type { ValidationQueueItem } from '@/services/api';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

function SubmissionPreview({ item, onValidate }: {
  item: ValidationQueueItem;
  onValidate: (submissionId: string, approved: boolean, comment?: string) => void;
}) {
  const [comment, setComment] = useState('');
  const [open, setOpen] = useState(false);

  const content = item.submission.content as Record<string, unknown>;

  return (
    <div className="bg-[#141414] border border-zinc-800 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-zinc-900 transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-500 uppercase border border-zinc-700 px-2 py-0.5">
            J{item.minigame.dayNumber}
          </span>
          <div>
            <p className="font-['Space_Grotesk'] text-[14px] font-semibold text-white">{item.minigame.title}</p>
            <p className="text-[12px] text-zinc-500">par <span className="text-zinc-300">{item.submission.user.username}</span></p>
          </div>
        </div>
        <span className="material-symbols-outlined text-zinc-600 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }}>
          expand_more
        </span>
      </button>

      {open && (
        <div className="border-t border-zinc-800 px-6 py-5 space-y-5">
          {/* Contenu soumis */}
          <div className="bg-zinc-900 border border-zinc-800 p-4">
            <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-500 uppercase block mb-3">
              Soumission
            </span>
            {typeof content.text === 'string' && (
              <p className="text-[14px] text-white leading-relaxed whitespace-pre-wrap font-mono">{content.text}</p>
            )}
            {typeof content.description === 'string' && (
              <p className="text-[14px] text-white leading-relaxed whitespace-pre-wrap">{content.description}</p>
            )}
            {typeof content.selectedStyle === 'string' && (
              <p className="text-[12px] text-zinc-400 mt-2">Style : {content.selectedStyle}</p>
            )}
            {typeof content.toolUsed === 'string' && (
              <p className="text-[12px] text-zinc-500">Outil : {content.toolUsed}</p>
            )}
          </div>

          {/* Commentaire */}
          <div>
            <span className="font-['Space_Grotesk'] text-[10px] tracking-widest text-zinc-500 uppercase block mb-2">
              Commentaire <span className="text-zinc-700">(facultatif)</span>
            </span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Retour pour le joueur..."
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 text-[13px] text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onValidate(item.submission.id, true, comment || undefined)}
              className="flex-1 py-3 font-['Space_Grotesk'] text-[12px] tracking-widest font-bold uppercase bg-green-600 text-white hover:bg-green-500 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              VALIDER
            </button>
            <button
              onClick={() => onValidate(item.submission.id, false, comment || undefined)}
              className="flex-1 py-3 font-['Space_Grotesk'] text-[12px] tracking-widest font-bold uppercase bg-red-900 text-white hover:bg-red-800 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
              REFUSER
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Validations() {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery<ValidationQueueItem[]>({
    queryKey: ['validation-queue'],
    queryFn: () => minigameApi.getValidationQueue(),
    staleTime: 30_000,
  });

  const validateMutation = useMutation({
    mutationFn: ({ submissionId, approved, comment }: { submissionId: string; approved: boolean; comment?: string }) =>
      minigameApi.validate(submissionId, approved, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation-queue'] });
    },
  });

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white">
      <Sidebar />
      <TopBar />

      <main className="ml-64 mt-16 flex-1 p-8 pb-16">
        <div className="max-w-[860px] mx-auto">

          <div className="border-b border-zinc-800 pb-6 mb-10 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-zinc-500">
              <span className="material-symbols-outlined text-sm">approval</span>
              <span className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase">
                / DIRECTION CRÉATIVE / VALIDATION
              </span>
            </div>
            <div className="flex items-end justify-between">
              <h2 className="font-['Space_Grotesk'] text-[72px] font-bold leading-none tracking-tighter text-white">
                VALIDATIONS
              </h2>
              {!isLoading && (
                <span className="font-['Space_Grotesk'] text-[13px] text-zinc-500 mb-2">
                  {items.length} en attente
                </span>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-zinc-900 border border-zinc-800" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <span className="material-symbols-outlined text-zinc-700 text-5xl">done_all</span>
              <p className="font-['Space_Grotesk'] text-[12px] tracking-widest text-zinc-700 uppercase">
                Aucune soumission en attente
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <SubmissionPreview
                  key={item.submission.id}
                  item={item}
                  onValidate={(submissionId, approved, comment) =>
                    validateMutation.mutate({ submissionId, approved, comment })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
