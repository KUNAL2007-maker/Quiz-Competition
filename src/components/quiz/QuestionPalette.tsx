import React from 'react';
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
      <div className="mb-4 flex items-center justify-between border-b border-[#252D38] pb-3">
        <h3 className="font-display text-sm font-semibold text-[#F0F3F7]">
          Question Navigator
        </h3>
        <span className="font-mono text-xs text-[#929DAC] tabular-nums">
          {questions.length} SLOTS
        </span>
      </div>

      {/* Accessible Legend (state is not communicated through color alone) */}
      <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-[#929DAC]">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-[#B6FF3B] bg-[#B6FF3B]/15 font-mono text-[10px] font-bold text-[#B6FF3B]">
            •
          </span>
          <span>Current</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-[#36F58A]/60 bg-[#111722] font-mono text-[10px] font-bold text-[#36F58A]">
            ✓
          </span>
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-[#FF365B]/70 bg-[#111722] font-mono text-[10px] font-bold text-[#FF365B]">
            !
          </span>
          <span>Review</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-[#252D38] bg-[#07090D] font-mono text-[10px] text-[#929DAC]">
            -
          </span>
          <span>Unanswered</span>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-md border border-[#252D38] bg-[#111722]/50 p-4 text-center">
          <p className="font-mono text-xs text-[#929DAC]">PALETTE · EMPTY</p>
          <p className="mt-1 text-xs text-[#929DAC]">
            Question slots will populate here once a live assessment packet is loaded.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {questions.map((q, idx) => {
            const isCurrent = idx === currentIndex;
            const isAnswered = Boolean(selectedAnswers[q.id]);
            const isReview = Boolean(markedForReview[q.id]);

            let statusSymbol = '';
            let statusAria = 'Unanswered';
            let btnStyle =
              'border-[#252D38] bg-[#07090D] text-[#929DAC] hover:border-[#929DAC]';

            if (isCurrent) {
              statusSymbol = '•';
              statusAria = 'Current question';
              btnStyle =
                'border-[#B6FF3B] bg-[#B6FF3B]/15 text-[#B6FF3B] font-bold';
            } else if (isReview) {
              statusSymbol = '!';
              statusAria = 'Marked for review';
              btnStyle =
                'border-[#FF365B]/80 bg-[#111722] text-[#FF365B] font-semibold';
            } else if (isAnswered) {
              statusSymbol = '✓';
              statusAria = 'Answered';
              btnStyle =
                'border-[#36F58A]/60 bg-[#111722] text-[#36F58A] font-semibold';
            }

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => onSelectIndex(idx)}
                aria-label={`Question ${idx + 1}: ${statusAria}`}
                aria-current={isCurrent ? 'step' : undefined}
                className={`flex flex-col items-center justify-center rounded-md border py-2 px-1 font-mono text-xs transition-colors tabular-nums cursor-pointer ${btnStyle}`}
              >
                <span>{String(idx + 1).padStart(2, '0')}</span>
                <span className="text-[9px] leading-none mt-0.5" aria-hidden="true">
                  {statusSymbol || '-'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
