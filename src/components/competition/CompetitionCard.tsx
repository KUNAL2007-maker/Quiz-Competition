import React from 'react';
import { Competition } from '../../types';
import { ArrowRight, Clock, Shield, Users, CheckCircle2 } from 'lucide-react';

interface CompetitionCardProps {
  competition: Competition;
  isCompleted?: boolean;
  onSelect: (competition: Competition) => void;
}

export const CompetitionCard: React.FC<CompetitionCardProps> = ({
  competition,
  isCompleted,
  onSelect,
}) => {
  return (
    <article className="group relative flex flex-col justify-between rounded-lg border border-[#252D38] bg-[#111722] p-6 transition-colors hover:border-[#B6FF3B]/60">
      <div>
        {/* Metadata kicker */}
        <div className="mb-3 flex flex-wrap items-center gap-2 font-mono text-xs text-[#929DAC]">
          <span
            className={
              competition.status === 'live'
                ? 'text-[#36F58A] font-semibold'
                : competition.status === 'upcoming'
                ? 'text-[#B6FF3B]'
                : 'text-[#929DAC]'
            }
          >
            {competition.status.toUpperCase()}
          </span>
          {competition.difficulty && (
            <>
              <span aria-hidden="true">·</span>
              <span>{competition.difficulty}</span>
            </>
          )}
          {competition.accessType && (
            <>
              <span aria-hidden="true">·</span>
              <span>{competition.accessType}</span>
            </>
          )}
          {isCompleted && (
            <span className="inline-flex items-center gap-1 rounded bg-[#36F58A]/10 border border-[#36F58A]/30 px-2 py-0.5 font-mono text-[10px] font-bold text-[#36F58A]">
              <CheckCircle2 className="h-3 w-3" /> ATTEMPT COMPLETED
            </span>
          )}
        </div>

        <h3 className="font-display text-lg font-semibold text-[#F0F3F7] group-hover:text-[#B6FF3B] transition-colors">
          {competition.title}
        </h3>

        {competition.description && (
          <p className="mt-2 text-sm text-[#929DAC] leading-relaxed line-clamp-2">
            {competition.description}
          </p>
        )}
      </div>

      <div className="mt-6 border-t border-[#252D38] pt-4 flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-[#929DAC]">
          {competition.startTime && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#929DAC]" aria-hidden="true" />
              {new Date(competition.startTime).toLocaleDateString()}
            </span>
          )}
          {competition.durationMinutes !== undefined && (
            <span className="inline-flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-[#929DAC]" aria-hidden="true" />
              {competition.durationMinutes}m
            </span>
          )}
          {competition.participantCount !== undefined && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-[#929DAC]" aria-hidden="true" />
              {competition.participantCount}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onSelect(competition)}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#0C1017] border border-[#252D38] px-3 py-1.5 text-xs font-medium text-[#F0F3F7] transition-colors hover:border-[#B6FF3B] hover:text-[#B6FF3B] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>{isCompleted ? 'View Standing' : 'View Details'}</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
};
