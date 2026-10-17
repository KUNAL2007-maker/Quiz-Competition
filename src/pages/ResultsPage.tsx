import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, CheckCircle2, Clock, Trophy } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { EmptyStateBlock } from '../components/ui/EmptyStateBlock';
import { formatDurationSeconds } from '../utils/timerLogic';

export const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const { results } = useAppContext();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#252D38] pb-6">
        <div>
          <p className="font-mono text-xs tracking-wider text-[#B6FF3B]">
            POST-ASSESSMENT ANALYTICS
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#F0F3F7]">
            Results & Performance
          </h1>
          <p className="mt-2 text-sm text-[#929DAC] max-w-2xl">
            Detailed evaluation outcomes, final scores, rank placements, accuracy percentages, and topic-wise telemetry derived from completed competitions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/competitions')}
          className="rounded-md bg-[#B6FF3B] px-4 py-2 text-xs font-semibold text-[#07090D] hover:bg-[#c8ff66] transition-colors whitespace-nowrap shrink-0 self-start md:self-auto cursor-pointer"
        >
          Browse Competitions
        </button>
      </div>

      {/* Strictly Empty State when no results exist (no fabricated charts or scores) */}
      {results.length === 0 ? (
        <EmptyStateBlock
          icon={BarChart3}
          visualType="grid"
          codeLabel="PERFORMANCE ARCHIVE · NO COMPLETED RECORDS"
          title="No Completed Competition Results Available"
          description="Completed competition outcomes—including final scores, rank placements, accuracy ratios, time taken, and topic-wise performance charts—will render here once real assessment results are recorded."
          actionLabel="Explore Active Competitions"
          onAction={() => navigate('/competitions')}
          secondaryActionLabel="Open Live Leaderboard"
          onSecondaryAction={() => navigate('/leaderboard')}
        />
      ) : (
        /* Real Results Contract Rendering when actual result records exist */
        <div className="space-y-6">
          {results.map((res) => (
            <article
              key={res.id}
              className="rounded-lg border border-[#252D38] bg-[#0C1017] p-6 space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#252D38] pb-4">
                <div>
                  <span className="font-mono text-xs text-[#929DAC]">
                    COMPLETED · {new Date(res.completedAt).toLocaleDateString()}
                  </span>
                  <h2 className="mt-1 font-display text-xl font-bold text-[#F0F3F7]">
                    {res.competitionName}
                  </h2>
                </div>
                <div className="font-mono text-2xl font-bold text-[#B6FF3B] tabular-nums">
                  {res.finalScore} {res.maxScore ? `/ ${res.maxScore}` : 'PTS'}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {res.rank !== undefined && (
                  <div className="rounded-md border border-[#252D38] bg-[#111722] p-4">
                    <div className="flex items-center gap-2 text-xs text-[#929DAC] font-mono">
                      <Trophy className="h-3.5 w-3.5 text-[#B6FF3B]" />
                      <span>RANK</span>
                    </div>
                    <p className="mt-2 font-mono text-xl font-bold text-[#F0F3F7] tabular-nums">
                      #{res.rank}
                    </p>
                  </div>
                )}

                {res.accuracyPercent !== undefined && (
                  <div className="rounded-md border border-[#252D38] bg-[#111722] p-4">
                    <div className="flex items-center gap-2 text-xs text-[#929DAC] font-mono">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#36F58A]" />
                      <span>ACCURACY</span>
                    </div>
                    <p className="mt-2 font-mono text-xl font-bold text-[#F0F3F7] tabular-nums">
                      {res.accuracyPercent}%
                    </p>
                  </div>
                )}

                {res.timeTakenSeconds !== undefined && (
                  <div className="rounded-md border border-[#252D38] bg-[#111722] p-4">
                    <div className="flex items-center gap-2 text-xs text-[#929DAC] font-mono">
                      <Clock className="h-3.5 w-3.5 text-[#929DAC]" />
                      <span>TIME TAKEN</span>
                    </div>
                    <p className="mt-2 font-mono text-xl font-bold text-[#F0F3F7] tabular-nums">
                      {formatDurationSeconds(res.timeTakenSeconds)}
                    </p>
                  </div>
                )}

                {(res.correctCount !== undefined || res.incorrectCount !== undefined) && (
                  <div className="rounded-md border border-[#252D38] bg-[#111722] p-4">
                    <span className="block font-mono text-xs text-[#929DAC]">
                      RESPONSES
                    </span>
                    <p className="mt-2 font-mono text-sm font-semibold text-[#F0F3F7] tabular-nums">
                      <span className="text-[#36F58A]">{res.correctCount ?? 0} Correct</span> ·{' '}
                      <span className="text-[#FF365B]">{res.incorrectCount ?? 0} Incorrect</span>
                    </p>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
