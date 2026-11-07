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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#2e2e2a] pb-6">
        <div>
          <p className="font-mono text-xs tracking-wider text-[#8dc63f]">
            POST-QUIZ ANALYTICS
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#f5f5f2]">
            Results & Performance
          </h1>
          <p className="mt-2 text-sm text-[#a8a8a2] max-w-2xl">
            Detailed evaluation outcomes, final scores, rank placements, accuracy percentages, and topic-wise telemetry derived from completed competitions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/competitions')}
          className="rounded-md bg-[#8dc63f] px-4 py-2 text-xs font-semibold text-[#141a09] hover:bg-[#a4d65e] transition-colors whitespace-nowrap shrink-0 self-start md:self-auto cursor-pointer"
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
          description="Completed competition outcomes—including final scores, rank placements, accuracy ratios, time taken, and topic-wise performance charts—will render here once real quiz results are recorded."
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
              className="rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-6 space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2e2e2a] pb-4">
                <div>
                  <span className="font-mono text-xs text-[#a8a8a2]">
                    COMPLETED · {new Date(res.completedAt).toLocaleDateString()}
                  </span>
                  <h2 className="mt-1 font-display text-xl font-bold text-[#f5f5f2]">
                    {res.competitionName}
                  </h2>
                </div>
                <div className="font-mono text-2xl font-bold text-[#8dc63f] tabular-nums">
                  {res.finalScore} {res.maxScore ? `/ ${res.maxScore}` : 'PTS'}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {res.rank !== undefined && (
                  <div className="rounded-md border border-[#2e2e2a] bg-[#1b1b19] p-4">
                    <div className="flex items-center gap-2 text-xs text-[#a8a8a2] font-mono">
                      <Trophy className="h-3.5 w-3.5 text-[#8dc63f]" />
                      <span>RANK</span>
                    </div>
                    <p className="mt-2 font-mono text-xl font-bold text-[#f5f5f2] tabular-nums">
                      #{res.rank}
                    </p>
                  </div>
                )}

                {res.accuracyPercent !== undefined && (
                  <div className="rounded-md border border-[#2e2e2a] bg-[#1b1b19] p-4">
                    <div className="flex items-center gap-2 text-xs text-[#a8a8a2] font-mono">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#a4d65e]" />
                      <span>ACCURACY</span>
                    </div>
                    <p className="mt-2 font-mono text-xl font-bold text-[#f5f5f2] tabular-nums">
                      {res.accuracyPercent}%
                    </p>
                  </div>
                )}

                {res.timeTakenSeconds !== undefined && (
                  <div className="rounded-md border border-[#2e2e2a] bg-[#1b1b19] p-4">
                    <div className="flex items-center gap-2 text-xs text-[#a8a8a2] font-mono">
                      <Clock className="h-3.5 w-3.5 text-[#a8a8a2]" />
                      <span>TIME TAKEN</span>
                    </div>
                    <p className="mt-2 font-mono text-xl font-bold text-[#f5f5f2] tabular-nums">
                      {formatDurationSeconds(res.timeTakenSeconds)}
                    </p>
                  </div>
                )}

                {(res.correctCount !== undefined || res.incorrectCount !== undefined) && (
                  <div className="rounded-md border border-[#2e2e2a] bg-[#1b1b19] p-4">
                    <span className="block font-mono text-xs text-[#a8a8a2]">
                      RESPONSES
                    </span>
                    <p className="mt-2 font-mono text-sm font-semibold text-[#f5f5f2] tabular-nums">
                      <span className="text-[#a4d65e]">{res.correctCount ?? 0} Correct</span> ·{' '}
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
