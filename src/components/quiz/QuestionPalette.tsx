import React from 'react';
import { Lock } from 'lucide-react';
import { QuizQuestion } from '../../types';

interface QuestionPaletteProps {
  questions: QuizQuestion[];
  currentIndex: number;
  selectedAnswers: Record<string, string>;
  markedForReview: Record<string, boolean>;
  onSelectIndex: (index: number) => void;
}

export const QuestionPalette: React.FC<QuestionPaletteProps> = ({
  questions,
  currentIndex,
  selectedAnswers,
  markedForReview,
  onSelectIndex,
}) => {
  return (
    <div className="rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-5">
      <div className="mb-3 flex items-center justify-between border-b border-[#2e2e2a] pb-3">
        <h3 className="font-display text-sm font-semibold text-[#f5f5f2]">
          Question Navigator
        </h3>
        <span className="font-mono text-xs text-[#a8a8a2] tabular-nums">
          {questions.length} SLOTS
        </span>
      </div>

      {/* Forward-only Notice */}
      <div className="mb-3.5 flex items-center gap-2 rounded-md border border-[#E6B450]/30 bg-[#E6B450]/10 px-2.5 py-1.5 text-[11px] font-mono text-[#E6B450]">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span>Strict Forward-Only · Returning Locked</span>
      </div>

      {/* Accessible Legend */}
      <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-[#a8a8a2]">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-[#7ab32e] bg-[#8dc63f]/15 font-mono text-[10px] font-bold text-[#8dc63f]">
            •
          </span>
          <span>Current</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-[#2e2e2a] bg-[#1b1b19] font-mono text-[10px] text-[#a8a8a2]">
            🔒
          </span>
          <span>Locked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-[#2e2e2a] bg-[#111110] font-mono text-[10px] text-[#a8a8a2]/50">
            -
          </span>
          <span>Upcoming</span>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-md border border-[#2e2e2a] bg-[#1b1b19]/50 p-4 text-center">
          <p className="font-mono text-xs text-[#a8a8a2]">PALETTE · EMPTY</p>
          <p className="mt-1 text-xs text-[#a8a8a2]">
            Question slots will populate here once a live quiz packet is loaded.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {questions.map((q, idx) => {
            const isCurrent = idx === currentIndex;
            const isPast = idx < currentIndex;
            const isFuture = idx > currentIndex;
            const isAnswered = Boolean(selectedAnswers[q.id]);

            let statusSymbol = '-';
            let statusAria = 'Upcoming question (locked)';
            let btnStyle = 'border-[#2e2e2a]/50 bg-[#111110] text-[#a8a8a2]/40 cursor-not-allowed opacity-50';
            let isDisabled = true;

            if (isCurrent) {
              statusSymbol = '•';
              statusAria = 'Current question';
              btnStyle = 'border-[#7ab32e] bg-[#8dc63f]/15 text-[#8dc63f] font-bold ring-1 ring-[#7ab32e]/50';
              isDisabled = false;
            } else if (isPast) {
              statusSymbol = isAnswered ? '✓' : '🔒';
              statusAria = isAnswered
                ? 'Answered and locked (returning disabled)'
                : 'Locked (returning disabled)';
              btnStyle = 'border-[#2e2e2a] bg-[#1b1b19]/60 text-[#a8a8a2]/60 cursor-not-allowed opacity-60';
              isDisabled = true;
            } else if (isFuture) {
              statusSymbol = '-';
              statusAria = 'Upcoming question (locked)';
              btnStyle = 'border-[#2e2e2a]/50 bg-[#111110] text-[#a8a8a2]/40 cursor-not-allowed opacity-50';
              isDisabled = true;
            }

            return (
              <button
                key={q.id}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  if (!isDisabled) onSelectIndex(idx);
                }}
                aria-label={`Question ${idx + 1}: ${statusAria}`}
                aria-current={isCurrent ? 'step' : undefined}
                className={`flex flex-col items-center justify-center rounded-md border py-2 px-1 font-mono text-xs transition-colors tabular-nums ${btnStyle}`}
              >
                <span>{String(idx + 1).padStart(2, '0')}</span>
                <span className="text-[9px] leading-none mt-0.5" aria-hidden="true">
                  {statusSymbol}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
