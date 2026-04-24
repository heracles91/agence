import { MiniGameType, SubmissionStatus } from 'agence-shared';
import type { Minigame, ArbitragePrompt, BudgetPrompt, PlanningPrompt, ModerationPrompt, RedactionPrompt } from 'agence-shared';
import { ArbitrageMinigame } from './ArbitrageMinigame';
import { BudgetMinigame } from './BudgetMinigame';
import { PlanningMinigame } from './PlanningMinigame';
import { ModerationMinigame } from './ModerationMinigame';
import { RedactionMinigame } from './RedactionMinigame';

interface Props {
  minigame: Minigame;
  onSubmit: (content: Record<string, unknown>) => Promise<void>;
  submitting: boolean;
}

export function MinigameRenderer({ minigame, onSubmit, submitting }: Props) {
  if (minigame.submission) {
    const status = minigame.submission.status;
    const isApproved = status === SubmissionStatus.APPROVED;
    const isPending = status === SubmissionStatus.PENDING || status === SubmissionStatus.PENDING_VALIDATION;
    return (
      <div className={`flex flex-col items-center justify-center py-12 gap-4 border ${
        isApproved ? 'border-green-800 bg-green-950/30' : isPending ? 'border-zinc-700 bg-zinc-900' : 'border-red-800 bg-red-950/30'
      }`}>
        <span
          className="material-symbols-outlined text-4xl"
          style={{
            color: isApproved ? '#34C759' : isPending ? '#8E8E93' : '#FF3B30',
            fontVariationSettings: "'FILL' 1",
          }}
        >
          {isApproved ? 'check_circle' : isPending ? 'pending' : 'cancel'}
        </span>
        <p className="font-['Space_Grotesk'] text-[12px] tracking-widest uppercase text-zinc-400">
          {isApproved ? 'Soumission validée' : isPending ? 'En attente de validation' : 'Soumission rejetée'}
        </p>
        {minigame.submission.validatorComment && (
          <p className="text-[13px] text-zinc-500 italic text-center max-w-md">
            {minigame.submission.validatorComment}
          </p>
        )}
      </div>
    );
  }

  const props = { onSubmit, submitting };

  switch (minigame.type) {
    case MiniGameType.ARBITRAGE:
      return <ArbitrageMinigame prompt={minigame.prompt as ArbitragePrompt} {...props} />;
    case MiniGameType.BUDGET:
      return <BudgetMinigame prompt={minigame.prompt as BudgetPrompt} {...props} />;
    case MiniGameType.PLANNING:
      return <PlanningMinigame prompt={minigame.prompt as PlanningPrompt} {...props} />;
    case MiniGameType.MODERATION:
      return <ModerationMinigame prompt={minigame.prompt as ModerationPrompt} {...props} />;
    case MiniGameType.REDACTION:
      return <RedactionMinigame prompt={minigame.prompt as RedactionPrompt} {...props} />;
    default:
      return (
        <div className="text-center py-8 text-zinc-600">
          <p>Type de mini-jeu non supporté : {minigame.type}</p>
        </div>
      );
  }
}
