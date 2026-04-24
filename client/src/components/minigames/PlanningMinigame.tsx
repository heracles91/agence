import { useState, useMemo } from 'react';
import type { PlanningTask, PlanningPrompt } from 'agence-shared';

interface Props {
  prompt: PlanningPrompt;
  onSubmit: (content: Record<string, unknown>) => Promise<void>;
  submitting: boolean;
}

function buildSchedule(tasks: PlanningTask[], order: string[]): Record<string, number> {
  const startDay: Record<string, number> = {};
  const orderedTasks = order.map((id) => tasks.find((t) => t.id === id)!).filter(Boolean);
  for (const task of orderedTasks) {
    const depEnd = task.dependsOn.length
      ? Math.max(...task.dependsOn.map((d) => (startDay[d] ?? 0) + (tasks.find((t) => t.id === d)?.duration ?? 0)))
      : 0;
    startDay[task.id] = depEnd;
  }
  return startDay;
}

export function PlanningMinigame({ prompt, onSubmit, submitting }: Props) {
  const [order, setOrder] = useState<string[]>(prompt.tasks.map((t) => t.id));
  const [dragging, setDragging] = useState<string | null>(null);

  const schedule = useMemo(() => buildSchedule(prompt.tasks, order), [prompt.tasks, order]);
  const totalDays = useMemo(() => {
    return Math.max(
      ...prompt.tasks.map((t) => (schedule[t.id] ?? 0) + t.duration)
    );
  }, [schedule, prompt.tasks]);

  const isValid = totalDays <= prompt.availableDays;

  const taskById = Object.fromEntries(prompt.tasks.map((t) => [t.id, t]));
  const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

  function handleDrop(targetId: string) {
    if (!dragging || dragging === targetId) return;
    setOrder((prev) => {
      const next = [...prev];
      const fromIdx = next.indexOf(dragging);
      const toIdx = next.indexOf(targetId);
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, dragging);
      return next;
    });
    setDragging(null);
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 p-4">
        <p className="text-zinc-300 text-[13px]">{prompt.context}</p>
        <p className="text-zinc-500 text-[12px] mt-2">
          Contrainte : terminer en ≤ {prompt.availableDays} jours. Glissez les tâches pour les réordonner.
        </p>
      </div>

      {/* Task list (drag order) */}
      <div className="space-y-2">
        {order.map((id, idx) => {
          const task = taskById[id];
          if (!task) return null;
          const start = schedule[id] ?? 0;
          return (
            <div
              key={id}
              draggable
              onDragStart={() => setDragging(id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(id)}
              className={`flex items-center gap-3 p-3 border cursor-grab active:cursor-grabbing transition-colors ${
                dragging === id ? 'border-zinc-500 opacity-50' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
              }`}
            >
              <span className="text-zinc-600 text-[12px] w-4">{idx + 1}</span>
              <span className="material-symbols-outlined text-zinc-600 text-base">drag_indicator</span>
              <div className="flex-1">
                <span className="text-[13px] text-white">{task.label}</span>
                {task.dependsOn.length > 0 && (
                  <span className="text-[11px] text-zinc-600 ml-2">
                    → après {task.dependsOn.map((d) => taskById[d]?.label ?? d).join(', ')}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[11px] text-zinc-500">J{start + 1}–J{start + task.duration}</span>
                <span className="text-[11px] text-zinc-600 ml-2">({task.duration}j)</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gantt simplifié */}
      <div className="bg-zinc-900 border border-zinc-800 p-4">
        <div className="flex gap-1 mb-2">
          {Array.from({ length: prompt.availableDays }).map((_, i) => (
            <div key={i} className="flex-1 text-center text-[10px] text-zinc-600">J{i + 1}</div>
          ))}
        </div>
        {order.map((id) => {
          const task = taskById[id];
          if (!task) return null;
          const start = schedule[id] ?? 0;
          const color = COLORS[prompt.tasks.findIndex((t) => t.id === id) % COLORS.length];
          return (
            <div key={id} className="flex gap-1 mb-1">
              {Array.from({ length: prompt.availableDays }).map((_, col) => {
                const active = col >= start && col < start + task.duration;
                return (
                  <div
                    key={col}
                    className="flex-1 h-5 rounded-sm"
                    style={{
                      backgroundColor: active ? (col >= prompt.availableDays ? '#ef4444' : color) : 'transparent',
                      border: active ? 'none' : '1px solid #27272a',
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      <div className={`flex justify-between items-center p-3 border ${isValid ? 'border-green-800 bg-green-950' : 'border-red-800 bg-red-950'}`}>
        <span className="font-['Space_Grotesk'] text-[11px] tracking-widest uppercase text-zinc-400">
          Durée totale
        </span>
        <span className={`font-['Space_Grotesk'] text-[16px] font-bold ${isValid ? 'text-green-400' : 'text-red-400'}`}>
          {totalDays} / {prompt.availableDays} jours
        </span>
      </div>

      <button
        onClick={() => onSubmit({ order, schedule })}
        disabled={!isValid || submitting}
        className="w-full py-3 font-['Space_Grotesk'] text-[12px] tracking-widest font-bold uppercase bg-white text-black hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'SOUMISSION...' : 'VALIDER LE PLANNING'}
      </button>
    </div>
  );
}
