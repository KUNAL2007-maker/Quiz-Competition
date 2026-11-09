import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Trophy,
  Search,
  SlidersHorizontal,
  X,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Users,
  ExternalLink,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { formatDurationSeconds } from '../utils/timerLogic';
import { isExcludedLeaderboardEntry, applyCalibration } from '../utils/leaderboardCalibration';
import leaderboardSeed from '../constants/leaderboardSeed.json';
import {
  CYBER_QUIZ_COMP_ID,
  CYBER_QUIZ_TOP_WINNERS,
  ARCHIVED_CYBER_QUIZ,
} from '../constants/tournaments';
import { LeaderboardEntry } from '../types';

export const StandingsPage: React.FC = () => {
  const { competitionId } = useParams<{ competitionId?: string }>();
  const navigate = useNavigate();
  const { leaderboard, competitions } = useAppContext();

  const targetCompId = competitionId || CYBER_QUIZ_COMP_ID;
  const isCyberQuiz = targetCompId === CYBER_QUIZ_COMP_ID;

  const compObj = useMemo(() => {
    if (isCyberQuiz) return ARCHIVED_CYBER_QUIZ;
    return competitions.find((c) => c.id === targetCompId) || ARCHIVED_CYBER_QUIZ;
  }, [competitions, targetCompId, isCyberQuiz]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('overall');

  // Compute the static, verified full standings list for this completed tournament
  const finalizedStandings = useMemo(() => {
    // Collect all entries for this competition from AppContext leaderboard + offline seed
    const rawList: LeaderboardEntry[] = leaderboard.filter((entry) => {
      if (isExcludedLeaderboardEntry(entry)) return false;
      const entryCompId =
        entry.competitionId ||
        (entry.participantId.includes('_') ? entry.participantId.split('_').slice(1).join('_') : '');
      return entryCompId === targetCompId || entry.participantId.endsWith(`_${targetCompId}`);
    });

    // If it's Cyber Quiz 2026, ensure all seed entries are present
    if (isCyberQuiz) {
      const existingIds = new Set(rawList.map((e) => e.participantId));
      (leaderboardSeed as LeaderboardEntry[]).forEach((seed) => {
        if (!existingIds.has(seed.participantId) && !isExcludedLeaderboardEntry(seed)) {
          rawList.push(applyCalibration(seed));
        }
      });
    }

    // Filter by category if set
    const filtered = rawList.filter((entry) => {
      if (categoryFilter !== 'overall') {
        const catLower = categoryFilter.toLowerCase();
        if (!entry.category || !entry.category.toLowerCase().includes(catLower)) {
          return false;
        }
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const nameMatch = entry.displayName.toLowerCase().includes(q);
        const userMatch = (entry.username || '').toLowerCase().includes(q);
        if (!nameMatch && !userMatch) return false;
      }
      return true;
    });

    // Sort strictly by official tournament criteria:
    // 1. Score (higher wins)
    // 2. Completion Time (faster wins tie)
    // 3. CreatedAt (earlier submission wins tie)
    // 4. Accuracy % (higher wins tie)
    filtered.sort((a, b) => {
      const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;

      const timeA =
        typeof a.completionTimeSeconds === 'number' && a.completionTimeSeconds >= 0
          ? a.completionTimeSeconds
          : 999999999;
      const timeB =
        typeof b.completionTimeSeconds === 'number' && b.completionTimeSeconds >= 0
          ? b.completionTimeSeconds
          : 999999999;
      const timeDiff = timeA - timeB;
      if (timeDiff !== 0) return timeDiff;

      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 9999999999999;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 9999999999999;
      const dateDiff = dateA - dateB;
      if (dateDiff !== 0) return dateDiff;

      return Number(b.accuracyPercent || 0) - Number(a.accuracyPercent || 0);
    });

    return filtered.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [leaderboard, targetCompId, isCyberQuiz, categoryFilter, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Header Breadcrumb & Status */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#2e2e2a] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#b38d3a]/50 bg-[#b38d3a]/10 px-3 py-0.5 font-mono text-[11px] font-bold text-[#E6B450] uppercase tracking-wider">
              <CheckCircle2 className="h-3.5 w-3.5" /> Official Concluded Tournament Archive
            </span>
            <span className="font-mono text-xs text-[#a8a8a2]">
              · {isCyberQuiz ? 'November 8, 2026' : 'Archived Results'}
            </span>
          </div>

          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-[#f5f5f2]">
            {compObj.title} — Official Final Standings
          </h1>
          <p className="mt-2 text-sm text-[#a8a8a2] max-w-2xl leading-relaxed">
            Permanent, tamper-proof record of finalized competitor scores, accuracy percentiles, and laureate podium placements. All participated students can fetch their certified credentials below.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/certification')}
            className="inline-flex items-center gap-2 rounded-lg bg-[#8dc63f] px-5 py-2.5 text-xs font-bold text-[#141a09] hover:bg-[#a4d65e] transition-colors cursor-pointer shadow-md"
          >
            <Award className="h-4 w-4" />
            <span>Fetch My Certificate</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/competitions')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#2e2e2a] bg-[#1b1b19] px-4 py-2.5 text-xs font-medium text-[#f5f5f2] hover:text-[#8dc63f] hover:border-[#7ab32e] transition-colors cursor-pointer"
          >
            <span>Competitions Directory</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Prominent Certificate Fetch Banner for Competitors */}
      <section className="relative overflow-hidden rounded-xl border border-[#7ab32e]/50 bg-gradient-to-r from-[#171f11] via-[#1b1b19] to-[#171f11] p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-[#8dc63f] uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4 text-[#8dc63f]" />
              <span>Verified Participant Credential Issuance</span>
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#f5f5f2]">
              Did you participate in this tournament?
            </h2>
            <p className="text-xs sm:text-sm text-[#a8a8a2] leading-relaxed">
              Every student who entered <strong className="text-[#f5f5f2]">{compObj.title}</strong> (any score, including 0) is officially eligible to fetch and download their high-resolution <strong className="text-[#f5f5f2]">Certificate of Participation</strong> or <strong className="text-[#f5f5f2]">Certificate of Excellence</strong> (Top 3 winners), complete with a cryptographically verifiable QR code.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/certification')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8dc63f] px-6 py-3 text-xs sm:text-sm font-bold text-[#141a09] hover:bg-[#a4d65e] transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
          >
            <Award className="h-4 w-4" />
            <span>Fetch &amp; Download Certificate</span>
          </button>
        </div>
      </section>

      {/* Top 3 Laureates & Podium Showcase */}
      {isCyberQuiz && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[#E6B450]" />
              <h2 className="font-display text-base sm:text-lg font-bold text-[#f5f5f2]">
                Official Laureates &amp; Podium Winners
              </h2>
            </div>
            <span className="font-mono text-xs text-[#a8a8a2]">TOP 3 EXCELLENCE HONORS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CYBER_QUIZ_TOP_WINNERS.map((winner, idx) => {
              const borderStyles = [
                'border-[#E6B450]/60 bg-gradient-to-b from-[#24211a] to-[#1b1b19]',
                'border-[#CBD5E0]/60 bg-gradient-to-b from-[#212328] to-[#1b1b19]',
                'border-[#D69E2E]/60 bg-gradient-to-b from-[#251f18] to-[#1b1b19]',
              ];
              const tagStyles = [
                'bg-[#E6B450]/20 text-[#E6B450] border-[#E6B450]/50',
                'bg-[#CBD5E0]/20 text-[#CBD5E0] border-[#CBD5E0]/50',
                'bg-[#D69E2E]/20 text-[#D69E2E] border-[#D69E2E]/50',
              ];

              return (
                <div
                  key={winner.rank}
                  className={`rounded-xl border p-5 space-y-4 shadow-lg ${borderStyles[idx]}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase border ${tagStyles[idx]}`}
                    >
                      <Trophy className="h-3 w-3" />
                      {winner.rank}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#8dc63f]">
                      {winner.score} PTS
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-lg font-bold text-[#f5f5f2]">
                      {winner.name}
                    </h3>
                    <p className="font-mono text-xs text-[#a8a8a2]">@{winner.username}</p>
                    <p className="font-mono text-[10px] text-[#8dc63f] mt-1 font-semibold">
                      {winner.title} · {winner.badge}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2e2e2a] font-mono text-xs">
                    <div className="rounded bg-[#111110] p-2 border border-[#2e2e2a]">
                      <span className="block text-[9px] text-[#a8a8a2]">ACCURACY</span>
                      <span className="font-bold text-[#f5f5f2]">{winner.accuracyPercent}%</span>
                    </div>
                    <div className="rounded bg-[#111110] p-2 border border-[#2e2e2a]">
                      <span className="block text-[9px] text-[#a8a8a2]">DURATION</span>
                      <span className="font-bold text-[#f5f5f2]">
                        {formatDurationSeconds(winner.completionTimeSeconds)}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-[#a8a8a2] flex items-center justify-between pt-1">
                    <span>Credential: {winner.certId}</span>
                    <span className="text-[#8dc63f] font-semibold">Excellence Cert</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-xs text-[#a8a8a2]">
            <Users className="h-4 w-4 text-[#8dc63f]" />
            <span className="font-bold text-[#f5f5f2]">{finalizedStandings.length}</span>
            <span>VERIFIED COMPETITORS</span>
          </div>

          <label htmlFor="category-select" className="sr-only">
            Filter Category
          </label>
          <select
            id="category-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-[#2e2e2a] bg-[#111110] px-3 py-1.5 text-xs text-[#f5f5f2] focus:border-[#7ab32e] focus:outline-none cursor-pointer"
          >
            <option value="overall">Overall Standings (All Questions)</option>
            <option value="cryptography">Cryptography &amp; Reversing</option>
            <option value="forensics">Digital Forensics</option>
            <option value="network">Network Exploitation</option>
          </select>
        </div>

        <div className="relative sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8a8a2]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search competitor name or handle..."
            aria-label="Search competitor name"
            className="w-full rounded-md border border-[#2e2e2a] bg-[#111110] py-1.5 pl-9 pr-8 text-xs text-[#f5f5f2] placeholder-[#a8a8a2]/60 focus:border-[#7ab32e] focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#a8a8a2] hover:text-[#f5f5f2] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Complete Verified Standings Table */}
      <section className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] overflow-hidden shadow-xl">
        <div className="border-b border-[#2e2e2a] px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-[#f5f5f2]">
              Finalized Participant Ranking Directory
            </h3>
            <p className="font-mono text-xs text-[#a8a8a2]">
              Verified results ordered by Score &gt; Time Taken &gt; Submission Timestamp
            </p>
          </div>
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#111110] border border-[#2e2e2a] text-[#a4d65e]">
            OFFICIAL LEDGER
          </span>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:grid md:grid-cols-12 gap-4 border-b border-[#2e2e2a] bg-[#151513] px-6 py-3 font-mono text-xs font-semibold text-[#a8a8a2]">
          <div className="col-span-1">RANK</div>
          <div className="col-span-4">PARTICIPANT Dossier</div>
          <div className="col-span-2">INTEGRITY STATUS</div>
          <div className="col-span-1 text-right">ACCURACY</div>
          <div className="col-span-2 text-right">TIME TAKEN</div>
          <div className="col-span-2 text-right">FINAL SCORE</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[#2e2e2a]">
          {finalizedStandings.map((entry) => {
            const isTop3 = entry.rank <= 3;
            return (
              <div
                key={entry.participantId}
                className="grid grid-cols-12 gap-4 items-center px-6 py-3.5 text-sm hover:bg-[#151513]/80 transition-colors"
              >
                <div className="col-span-1 font-mono font-bold text-[#8dc63f] tabular-nums flex items-center gap-1.5">
                  {isTop3 ? (
                    <span
                      className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${
                        entry.rank === 1
                          ? 'bg-[#E6B450]/20 text-[#E6B450] border border-[#E6B450]/50'
                          : entry.rank === 2
                            ? 'bg-[#CBD5E0]/20 text-[#CBD5E0] border border-[#CBD5E0]/50'
                            : 'bg-[#D69E2E]/20 text-[#D69E2E] border border-[#D69E2E]/50'
                      }`}
                    >
                      #{entry.rank}
                    </span>
                  ) : (
                    <span>#{String(entry.rank).padStart(2, '0')}</span>
                  )}
                </div>

                <div className="col-span-4">
                  <p className="font-semibold text-[#f5f5f2] flex items-center gap-2">
                    <span>{entry.displayName}</span>
                    {isTop3 && (
                      <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-[#E6B450]/15 text-[#E6B450] border border-[#E6B450]/30 font-bold uppercase">
                        Laureate
                      </span>
                    )}
                  </p>
                  {entry.username && (
                    <p className="font-mono text-xs text-[#a8a8a2]">@{entry.username}</p>
                  )}
                </div>

                <div className="col-span-2 font-mono text-xs text-[#a4d65e] flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  <span>Verified Competitor</span>
                </div>

                <div className="col-span-1 text-right font-mono text-xs text-[#f5f5f2] tabular-nums">
                  {entry.accuracyPercent !== undefined ? `${entry.accuracyPercent}%` : '—'}
                </div>

                <div className="col-span-2 text-right font-mono text-xs text-[#a8a8a2] tabular-nums">
                  {formatDurationSeconds(entry.completionTimeSeconds)}
                </div>

                <div className="col-span-2 text-right font-mono font-bold text-[#8dc63f] tabular-nums text-base">
                  {entry.score.toLocaleString()} <span className="text-xs text-[#a8a8a2]">PTS</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer Helper */}
      <div className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#a8a8a2]">
        <p>
          Need to verify your certificate or scan a credential QR? Use our official verification gateway.
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/certification"
            className="text-[#8dc63f] font-semibold hover:underline inline-flex items-center gap-1"
          >
            <span>Certification Gateway</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <span>·</span>
          <Link to="/leaderboard" className="text-[#f5f5f2] hover:underline">
            Live Scoreboard
          </Link>
        </div>
      </div>
    </div>
  );
};
