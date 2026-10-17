import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateBlockProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  codeLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  visualType?: 'radar' | 'grid' | 'terminal' | 'matrix';
}

export const EmptyStateBlock: React.FC<EmptyStateBlockProps> = ({
  icon: Icon,
  title,
  description,
  codeLabel = 'STATE · UNPOPULATED',
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  visualType = 'radar',
}) => {
  return (
    <div className="relative overflow-hidden rounded-lg border border-[#252D38] bg-[#0C1017] p-8 md:p-12 text-center">
      {/* Subtle architectural background SVG */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20">
        {visualType === 'radar' && (
          <svg className="h-64 w-64 text-[#252D38]" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="85" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="100" cy="100" r="55" stroke="currentColor" strokeWidth="1" />
            <circle cx="100" cy="100" r="25" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" />
            <line x1="15" y1="100" x2="185" y2="100" stroke="currentColor" strokeWidth="1" />
            <line x1="100" y1="15" x2="100" y2="185" stroke="currentColor" strokeWidth="1" />
          </svg>
        )}
        {visualType === 'grid' && (
          <svg className="h-64 w-full max-w-md text-[#252D38]" viewBox="0 0 400 160" fill="none">
            <path d="M0 32H400M0 64H400M0 96H400M0 128H400" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
            <path d="M80 0V160M160 0V160M240 0V160M320 0V160" stroke="currentColor" strokeWidth="1" />
          </svg>
        )}
        {visualType === 'terminal' && (
          <svg className="h-56 w-56 text-[#252D38]" viewBox="0 0 200 200" fill="none">
            <rect x="25" y="35" width="150" height="130" rx="6" stroke="currentColor" strokeWidth="1" />
            <line x1="25" y1="60" x2="175" y2="60" stroke="currentColor" strokeWidth="1" />
            <path d="M50 90L70 105L50 120" stroke="#B6FF3B" strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="80" y1="120" x2="115" y2="120" stroke="#B6FF3B" strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
        {visualType === 'matrix' && (
          <svg className="h-64 w-64 text-[#252D38]" viewBox="0 0 200 200" fill="none">
            <polygon points="100,20 170,60 170,140 100,180 30,140 30,60" stroke="currentColor" strokeWidth="1" />
            <polygon points="100,50 145,75 145,125 100,150 55,125 55,75" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          </svg>
        )}
      </div>

      <div className="relative z-10 mx-auto max-w-md flex flex-col items-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-[#252D38] bg-[#111722] text-[#B6FF3B]">
          {Icon ? (
            <Icon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          )}
        </div>

        <p className="mb-2 font-mono text-xs tracking-wider text-[#929DAC]">
          {codeLabel}
        </p>

        <h3 className="mb-2 font-display text-lg font-semibold text-[#F0F3F7]">
          {title}
        </h3>

        <p className="mb-6 text-sm leading-relaxed text-[#929DAC]">
          {description}
        </p>

        {(actionLabel || secondaryActionLabel) && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {actionLabel && onAction && (
              <button
                type="button"
                onClick={onAction}
                className="inline-flex items-center gap-2 rounded-md bg-[#B6FF3B] px-4 py-2 text-xs font-semibold text-[#07090D] transition-colors hover:bg-[#c8ff66] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B6FF3B] whitespace-nowrap shrink-0 cursor-pointer"
              >
                {actionLabel}
              </button>
            )}
            {secondaryActionLabel && onSecondaryAction && (
              <button
                type="button"
                onClick={onSecondaryAction}
                className="inline-flex items-center gap-2 rounded-md border border-[#252D38] bg-[#111722] px-4 py-2 text-xs font-medium text-[#F0F3F7] transition-colors hover:border-[#929DAC]/50 hover:bg-[#161E2C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B6FF3B] whitespace-nowrap shrink-0 cursor-pointer"
              >
                {secondaryActionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
