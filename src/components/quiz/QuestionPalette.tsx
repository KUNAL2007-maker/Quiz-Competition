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
    <div className="rounded-lg border border-[#252D38] bg-[#0C1017] p-5">
      <div className="mb-3 flex items-center justify-between border-b border-[#252D38] pb-3">
        <h3 className="font-display text-sm font-semibold text-[#F0F3F7]">
          Question Navigator
        </h3>
        <span className="font-mono text-xs text-[#929DAC] tabular-nums">
          {questions.length} SLOTS
        </span>
      </div>

      {/* Forward-only Notice */}
      <div className="mb-3.5 flex items-center gap-2 rounded-md border border-[#E6B450]/30 bg-[#E6B450]/10 px-2.5 py-1.5 text-[11px] font-mono text-[#E6B450]">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span>Strict Forward-Only · Returning Locked</span>
      </div>

      {/* Accessible Legend */}
      <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-[#929DAC]">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-[#B6FF3B] bg-[#B6FF3B]/15 font-mono text-[10px] font-bold text-[#B6FF3B]">
            •
          </span>
          <span>Current</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-[#252D38] bg-[#111722] font-mono text-[10px] text-[#929DAC]">
            🔒
          </span>
          <span>Locked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-[#252D38] bg-[#07090D] font-mono text-[10px] text-[#929DAC]/50">
            -
          </span>
          <span>Upcoming</span>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-md border border-[#252D38] bg-[#111722]/50 p-4 text-center">
          <p className="font-mono text-xs text-[#929DAC]">PALETTE · EMPTY</p>
          <p className="mt-1 text-xs text-[#929DAC]">
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
            let btnStyle = 'border-[#252D38]/50 bg-[#07090D] text-[#929DAC]/40 cursor-not-allowed opacity-50';
            let isDisabled = true;

            if (isCurrent) {
              statusSymbol = '•';
              statusAria = 'Current question';
              btnStyle = 'border-[#B6FF3B] bg-[#B6FF3B]/15 text-[#B6FF3B] font-bold ring-1 ring-[#B6FF3B]/50';
              isDisabled = false;
            } else if (isPast) {
              statusSymbol = isAnswered ? '✓' : '🔒';
              statusAria = isAnswered
                ? 'Answered and locked (returning disabled)'
                : 'Locked (returning disabled)';
              btnStyle = 'border-[#252D38] bg-[#111722]/60 text-[#929DAC]/60 cursor-not-allowed opacity-60';
              isDisabled = true;
            } else if (isFuture) {
              statusSymbol = '-';
              statusAria = 'Upcoming question (locked)';
              btnStyle = 'border-[#252D38]/50 bg-[#07090D] text-[#929DAC]/40 cursor-not-allowed opacity-50';
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
