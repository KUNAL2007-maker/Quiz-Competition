import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  User,
  Edit3,
  History,
  Check,
  AlertCircle,
  Phone,
  Mail,
  Lock,
  CheckCircle2,
  Clock,
  Trophy,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { validateOperatorProfileInput, formatDurationSeconds } from '../utils/timerLogic';
import { validateWhatsAppNumber } from '../utils/phoneValidation';
import { EmptyStateBlock } from '../components/ui/EmptyStateBlock';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isRequiredNotice = searchParams.get('required') === '1';

  const {
    currentUser,
    profile,
    updateProfile,
    results,
    competitions,
    leaderboard,
    quizSession,
    selectCompetition,
    resetQuizSession,
  } = useAppContext();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName || currentUser?.displayName || '');
  const [username, setUsername] = useState(profile.username || '');
  const [whatsappNumber, setWhatsappNumber] = useState(profile.whatsappNumber || '');
  const [biography, setBiography] = useState(profile.biography || '');
  const [validationErrors, setValidationErrors] = useState<{
    displayName?: string;
    username?: string;
    whatsappNumber?: string;
    biography?: string;
  }>({});

  // Auto-open editor if user was redirected specifically because profile was incomplete
  useEffect(() => {
    if (isRequiredNotice && !profile.isProfileComplete) {
      setIsEditing(true);
    }
  }, [isRequiredNotice, profile.isProfileComplete]);

  // Sync state if profile changes externally
  useEffect(() => {
    if (!isEditing) {
      setDisplayName(profile.displayName || currentUser?.displayName || '');
      setUsername(profile.username || '');
      setWhatsappNumber(profile.whatsappNumber || '');
      setBiography(profile.biography || '');
    }
  }, [profile, currentUser, isEditing]);

  // System-assigned deterministic avatar (cannot be modified by user)
  const assignedAvatarUrl = useMemo(() => {
    if (profile.avatarUrl) return profile.avatarUrl;
    const seed = currentUser?.uid || 'cyber-operator-default';
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}&backgroundColor=111110`;
  }, [profile.avatarUrl, currentUser]);

  // Calculate 100% profile completeness
  const isNameComplete = Boolean(profile.displayName && profile.displayName.trim().length >= 2);
  const isWhatsappComplete = Boolean(
    profile.whatsappNumber && validateWhatsAppNumber(profile.whatsappNumber).isValid
  );
  const isEmailComplete = Boolean(currentUser?.email || profile.email);
  const isAvatarAssigned = true; // Randomly assigned by system

  const completionPercentage = useMemo(() => {
    let pct = 15; // Avatar assigned
    if (isEmailComplete) pct += 15;
    if (isNameComplete) pct += 35;
    if (isWhatsappComplete) pct += 35;
    return pct;
  }, [isNameComplete, isWhatsappComplete, isEmailComplete]);

  const is100PercentComplete = Boolean(
    profile.isProfileComplete || (isNameComplete && isWhatsappComplete)
  );

  const handleOpenEdit = () => {
    setDisplayName(profile.displayName || currentUser?.displayName || '');
    setUsername(profile.username || '');
    setWhatsappNumber(profile.whatsappNumber || '');
    setBiography(profile.biography || '');
    setValidationErrors({});
    setIsEditing(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof validationErrors = {};

    const trimmedName = displayName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      errors.displayName = 'Please enter your real full name (at least 2 characters).';
    }

    const phoneVal = validateWhatsAppNumber(whatsappNumber);
    if (!phoneVal.isValid) {
      errors.whatsappNumber = phoneVal.error || 'Please enter a valid WhatsApp number (e.g. +91 9876543210).';
    }

    const validation = validateOperatorProfileInput({
      displayName: trimmedName,
      username: username.trim(),
      biography: biography.trim(),
    });

    if (!validation.isValid) {
      if (validation.errors.displayName) errors.displayName = validation.errors.displayName;
      if (validation.errors.username) errors.username = validation.errors.username;
      if (validation.errors.biography) errors.biography = validation.errors.biography;
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const saved = await updateProfile({
      displayName: trimmedName,
      username: username.trim() || `user_${(currentUser?.uid || 'opr').slice(0, 8)}`,
      whatsappNumber: phoneVal.normalized || whatsappNumber.trim(),
      biography: biography.trim(),
      avatarUrl: assignedAvatarUrl,
      isProfileComplete: true,
    });

    // Only close the editor when the save actually persisted. If it failed
    // (e.g. a Firestore permission error), keep the editor open so the
    // student sees the error instead of thinking it saved and then finding
    // the name reverted on refresh.
    if (saved) {
      setIsEditing(false);
    }
  };

  // Find user's standing for completed quizzes, synthesizing local records if Firestore sync is pending
  const enrichedResults = useMemo(() => {
    if (!currentUser) return [];

    const list: Array<{
      id: string;
      competitionId: string;
      competitionTitle: string;
      completedAt: string;
      finalScore: number;
      maxScore: number;
      accuracyPercent?: number;
      timeTakenSeconds?: number;
      correctCount?: number;
      incorrectCount?: number;
      unwrittenCount?: number;
      rank?: number;
    }> = [];
    const validCompIds = new Set(competitions.map((c) => c.id));
    const seenCompIds = new Set<string>();

    // 1. Existing results in state (strictly belonging to current authenticated user)
    results.forEach((res) => {
      if (!res.competitionId || !validCompIds.has(res.competitionId) || seenCompIds.has(res.competitionId)) return;
      // Strict user boundary check: verify ownerId if available
      if ((res as any).ownerId && (res as any).ownerId !== currentUser.uid) return;

      const matchComp = competitions.find((c) => c.id === res.competitionId);
      // Practice simulations are never recorded in individual participant history
      const isPractice =
        (res.competitionName || '').toLowerCase().includes('practice') ||
        (res.competitionId || '').toLowerCase().includes('practice') ||
        (matchComp?.title || '').toLowerCase().includes('practice');
      if (isPractice) return;

      seenCompIds.add(res.competitionId);
      const matchLeaderboard = leaderboard.find(
        (l) =>
          (l.competitionId === res.competitionId || l.participantId.endsWith(`_${res.competitionId}`)) &&
          ((currentUser && l.participantId.startsWith(`${currentUser.uid}_`)) ||
           (currentUser && (l as any).ownerId === currentUser.uid) ||
           (currentUser.email && l.email && l.email.toLowerCase() === currentUser.email.toLowerCase()))
      );

      const hasCalibratedLb = matchLeaderboard && matchLeaderboard.score > (res.finalScore || 0);
      const effectiveScore = hasCalibratedLb ? matchLeaderboard.score : res.finalScore;
      const effectiveAccuracy = hasCalibratedLb && matchLeaderboard.accuracyPercent !== undefined
        ? matchLeaderboard.accuracyPercent
        : res.accuracyPercent;
      const effectiveTime = hasCalibratedLb && matchLeaderboard.completionTimeSeconds !== undefined
        ? matchLeaderboard.completionTimeSeconds
        : res.timeTakenSeconds;
      const matchCompTotalQuestions = matchComp?.quizFormat?.totalQuestions || 30;
      const effectiveMax = res.maxScore || (matchComp as any)?.totalPoints || (matchCompTotalQuestions * 100);

      list.push({
        id: res.id,
        competitionId: res.competitionId,
        competitionTitle: res.competitionName || matchComp?.title || 'Cybersecurity Quiz Competition',
        completedAt: res.completedAt || new Date().toISOString(),
        finalScore: effectiveScore,
        maxScore: effectiveMax,
        accuracyPercent: effectiveAccuracy,
        timeTakenSeconds: effectiveTime,
        correctCount: hasCalibratedLb ? Math.round(effectiveScore / 100) : res.correctCount,
        incorrectCount: hasCalibratedLb ? Math.max(0, matchCompTotalQuestions - Math.round(effectiveScore / 100)) : res.incorrectCount,
        unwrittenCount: res.unwrittenCount,
        rank: matchLeaderboard?.rank || 1,
      });
    });

    // 2. Synthesize from current user's verified leaderboard records if not in results yet
    leaderboard.forEach((l) => {
      const compId =
        l.competitionId ||
        (currentUser && l.participantId.startsWith(`${currentUser.uid}_`)
          ? l.participantId.replace(`${currentUser.uid}_`, '')
          : '');
      // Strict identification by UID or exact verified email only:
      // NEVER match on loose display names or unauthenticated flags!
      const isMine =
        (currentUser && l.participantId.startsWith(`${currentUser.uid}_`)) ||
        (currentUser && (l as any).ownerId === currentUser.uid) ||
        (currentUser?.email && l.email && l.email.toLowerCase() === currentUser.email.toLowerCase());

      if (isMine && compId && validCompIds.has(compId) && !seenCompIds.has(compId)) {
        const matchComp = competitions.find((c) => c.id === compId);
        const isPractice =
          (matchComp?.title || '').toLowerCase().includes('practice') ||
          compId.toLowerCase().includes('practice');
        if (isPractice) return;

        seenCompIds.add(compId);
        const matchCompTotalQuestions = matchComp?.quizFormat?.totalQuestions || 30;
        const effectiveMax = (matchComp as any)?.totalPoints || (matchCompTotalQuestions * 100);
        list.push({
          id: l.participantId,
          competitionId: compId,
          competitionTitle: matchComp?.title || 'Cybersecurity Quiz Competition',
          completedAt: typeof l.createdAt === 'string' ? l.createdAt : new Date().toISOString(),
          finalScore: l.score,
          maxScore: effectiveMax,
          accuracyPercent: l.accuracyPercent,
          timeTakenSeconds: l.completionTimeSeconds,
          correctCount: Math.round(l.score / 100),
          incorrectCount: Math.max(0, matchCompTotalQuestions - Math.round(l.score / 100)),
          rank: l.rank || 1,
        });
      }
    });

    return list;
  }, [results, competitions, leaderboard, currentUser]);

  // Categorize competitions into Live, Coming Soon, and Completed
  const completedIds = useMemo(
    () => new Set(enrichedResults.map((r) => r.competitionId)),
    [enrichedResults]
  );

  const compStatusStats = useMemo(() => {
    const now = Date.now();
    let live = 0;
    let upcoming = 0;
    let completed = 0;

    competitions.forEach((comp) => {
      const isPractice = comp.title.toLowerCase().includes('practice');
      const isEnded =
        !isPractice &&
        (comp.status === 'completed' || (comp.endTime && new Date(comp.endTime).getTime() <= now));
      if (isEnded || comp.status === 'completed') {
        completed++;
      } else if (
        comp.status === 'live' ||
        (comp.startTime && new Date(comp.startTime).getTime() <= now)
      ) {
        live++;
      } else {
        upcoming++;
      }
    });

    return { live, upcoming, completed };
  }, [competitions]);

  return (
    <div className="space-y-6">
      {/* Incomplete Profile Alert (Only displayed if profile is missing required legal name or WhatsApp) */}
      {!is100PercentComplete && (
        <div className="rounded-xl border border-[#FFB800]/50 bg-[#FFB800]/10 p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#FFB800]/60 bg-[#FFB800]/20 text-[#FFB800]">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-mono text-xs font-bold text-[#FFB800] uppercase tracking-wider">
                Profile Incomplete ({completionPercentage}%) · Required to Enter Quizzes
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <span className={isNameComplete ? 'text-[#a4d65e]' : 'text-[#FF365B]'}>
                  {isNameComplete ? '✓ Legal Name' : '✗ Missing Legal Name'}
                </span>
                <span className="text-[#a8a8a2]">·</span>
                <span className={isWhatsappComplete ? 'text-[#a4d65e]' : 'text-[#FF365B]'}>
                  {isWhatsappComplete ? '✓ WhatsApp' : '✗ Missing WhatsApp'}
                </span>
              </div>
            </div>
          </div>
          {!isEditing && (
            <button
              type="button"
              onClick={handleOpenEdit}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#FFB800] px-3.5 py-1.5 text-xs font-bold text-[#141a09] hover:bg-[#ffc933] transition-colors self-start sm:self-center cursor-pointer shrink-0"
            >
              <span>Complete Now</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Operator Identity Dossier Card */}
      <section className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-[#7ab32e] bg-[#111110] text-[#8dc63f] overflow-hidden shadow-inner">
              <img
                src={assignedAvatarUrl}
                alt="System-assigned avatar"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div
                title="System-assigned competitor avatar"
                className="absolute bottom-0.5 right-0.5 rounded-full bg-[#111110] border border-[#7ab32e] p-0.5 text-[#8dc63f]"
              >
                <Lock className="h-2.5 w-2.5" />
              </div>
            </div>

            {/* Identity Info */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-[#f5f5f2]">
                  {profile.displayName || currentUser?.displayName || 'Unassigned Operator'}
                </h1>
                {is100PercentComplete ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#a4d65e]/15 border border-[#a4d65e]/30 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#a4d65e]">
                    <CheckCircle2 className="h-3 w-3" /> 100% Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FFB800]/15 border border-[#FFB800]/30 px-2 py-0.5 font-mono text-[10px] font-bold text-[#FFB800]">
                    Incomplete
                  </span>
                )}
              </div>

              <p className="font-mono text-xs text-[#8dc63f]">
                {profile.username ? `@${profile.username}` : `@user_${(currentUser?.uid || 'opr').slice(0, 8)}`}
              </p>

              {/* Verified Contact Badges */}
              <div className="pt-1 flex flex-wrap items-center gap-2 font-mono text-xs">
                {profile.whatsappNumber ? (
                  <span className="inline-flex items-center gap-1 rounded bg-[#111110] border border-[#2e2e2a] px-2.5 py-0.5 text-[#a4d65e]">
                    <Phone className="h-3 w-3" />
                    <span>WhatsApp Verified</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-[#111110] border border-[#2e2e2a] px-2.5 py-0.5 text-[#FF365B]">
                    <Phone className="h-3 w-3" />
                    <span>WhatsApp Missing</span>
                  </span>
                )}

                {(currentUser?.email || profile.email) && (
                  <span className="inline-flex items-center gap-1 rounded bg-[#111110] border border-[#2e2e2a] px-2.5 py-0.5 text-[#a8a8a2]">
                    <Mail className="h-3 w-3 text-[#a4d65e]" />
                    <span>Email Verified</span>
                  </span>
                )}
              </div>

              {profile.biography && (
                <p className="pt-1 max-w-xl text-xs text-[#a8a8a2] leading-relaxed">
                  {profile.biography}
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0 self-start sm:self-center">
            {!isEditing && (
              <button
                type="button"
                onClick={handleOpenEdit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#2e2e2a] bg-[#111110] px-3.5 py-2 text-xs font-semibold text-[#f5f5f2] hover:border-[#7ab32e] hover:text-[#8dc63f] transition-colors cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* Profile Edit Form */}
        {isEditing && (
          <form
            onSubmit={handleSaveProfile}
            className="mt-5 space-y-4 border-t border-[#2e2e2a] pt-5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-displayName" className="block font-mono text-xs text-[#a8a8a2] mb-1">
                  FULL LEGAL NAME *
                </label>
                <input
                  id="profile-displayName"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-md border border-[#2e2e2a] bg-[#111110] px-3.5 py-2 text-sm text-[#f5f5f2] focus:border-[#7ab32e] focus:outline-none"
                />
                {validationErrors.displayName && (
                  <p className="mt-1 text-xs text-[#FF365B]">{validationErrors.displayName}</p>
                )}
              </div>

              <div>
                <label htmlFor="profile-whatsappNumber" className="block font-mono text-xs text-[#a8a8a2] mb-1">
                  WHATSAPP CONTACT NUMBER *
                </label>
                <input
                  id="profile-whatsappNumber"
                  type="tel"
                  required
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full rounded-md border border-[#2e2e2a] bg-[#111110] px-3.5 py-2 text-sm text-[#f5f5f2] focus:border-[#7ab32e] focus:outline-none"
                />
                {validationErrors.whatsappNumber && (
                  <p className="mt-1 text-xs text-[#FF365B]">{validationErrors.whatsappNumber}</p>
                )}
              </div>

              <div>
                <label htmlFor="profile-username" className="block font-mono text-xs text-[#a8a8a2] mb-1">
                  OPERATOR CALLSIGN / USERNAME
                </label>
                <input
                  id="profile-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="callsign_01"
                  className="w-full rounded-md border border-[#2e2e2a] bg-[#111110] px-3.5 py-2 text-sm text-[#f5f5f2] focus:border-[#7ab32e] focus:outline-none"
                />
                {validationErrors.username && (
                  <p className="mt-1 text-xs text-[#FF365B]">{validationErrors.username}</p>
                )}
              </div>

              <div>
                <label htmlFor="profile-email-readonly" className="block font-mono text-xs text-[#a8a8a2] mb-1">
                  AUTHENTICATED EMAIL (LOCKED)
                </label>
                <input
                  id="profile-email-readonly"
                  type="text"
                  disabled
                  value={currentUser?.email || profile.email || 'operator@nullorigin.live'}
                  className="w-full rounded-md border border-[#2e2e2a] bg-[#111110]/50 px-3.5 py-2 text-sm text-[#a8a8a2] cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label htmlFor="profile-biography" className="block font-mono text-xs text-[#a8a8a2] mb-1">
                SHORT BIOGRAPHY ({biography.length}/280)
              </label>
              <textarea
                id="profile-biography"
                rows={2}
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                placeholder="Optional background or interest..."
                className="w-full rounded-md border border-[#2e2e2a] bg-[#111110] p-3 text-sm text-[#f5f5f2] focus:border-[#7ab32e] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#2e2e2a] pt-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-md border border-[#2e2e2a] bg-[#1b1b19] px-4 py-1.5 text-xs font-medium text-[#a8a8a2] hover:text-[#f5f5f2] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md bg-[#8dc63f] px-4 py-1.5 text-xs font-semibold text-[#141a09] hover:bg-[#a4d65e] cursor-pointer shadow-md"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Save Profile</span>
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Tournaments & Participation History Section */}
      <section className="space-y-6" aria-labelledby="tournaments-heading">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2e2e2a] pb-3">
          <div>
            <h2 id="tournaments-heading" className="font-display text-base sm:text-lg font-bold text-[#f5f5f2]">
              Tournaments &amp; History
            </h2>
            <p className="text-xs text-[#a8a8a2]">
              Real-time directory of active, upcoming, and concluded competitions.
            </p>
          </div>

          <span className="rounded-md border border-[#2e2e2a] bg-[#1b1b19] px-3 py-1 font-mono text-xs text-[#a8a8a2]">
            {compStatusStats.live} Live · {compStatusStats.upcoming} Coming · {compStatusStats.completed} Completed
          </span>
        </div>

        {/* 1. Completed Tournament Rounds History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-[#f5f5f2] uppercase tracking-wide">
              Completed Tournament Rounds ({enrichedResults.length})
            </h3>
            {enrichedResults.length > 0 && (
              <button
                type="button"
                onClick={() => navigate('/leaderboard')}
                className="text-xs font-mono text-[#8dc63f] hover:underline cursor-pointer"
              >
                View Full Leaderboard Standings →
              </button>
            )}
          </div>

          {enrichedResults.length === 0 ? (
            <EmptyStateBlock
              icon={History}
              visualType="grid"
              codeLabel="HISTORY · NO COMPLETED QUIZZES"
              title="No Completed Competitions Yet"
              description="You have not submitted any quiz competitions yet. Ensure your profile is 100% complete and enter an active competition below to establish your official tournament record."
              actionLabel="Browse Available Competitions"
              onAction={() => navigate('/competitions')}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {enrichedResults.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-5 sm:p-6 transition-all hover:border-[#a4d65e]/50 space-y-4 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2e2e2a] pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded bg-[#a4d65e]/15 border border-[#a4d65e]/30 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#a4d65e]">
                          <CheckCircle2 className="h-3 w-3" /> COMPLETED · 1 ATTEMPT RECORDED
                        </span>
                        {item.rank &&
                          !(
                            (item.competitionTitle || '').toLowerCase().includes('practice') ||
                            (item.competitionId || '').toLowerCase().includes('practice')
                          ) && (
                            <span className="inline-flex items-center gap-1 rounded bg-[#8dc63f]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#8dc63f]">
                              <Trophy className="h-3 w-3" /> RANK #{item.rank}
                            </span>
                          )}
                      </div>
                      <h4 className="font-display text-base sm:text-lg font-bold text-[#f5f5f2]">
                        {item.competitionTitle}
                      </h4>
                    </div>

                    <div className="font-mono text-xs text-[#a8a8a2] sm:text-right">
                      <span>Submitted: </span>
                      <span className="text-[#f5f5f2]">
                        {new Date(item.completedAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="rounded-md border border-[#2e2e2a] bg-[#1b1b19] p-3 text-center">
                      <span className="block font-mono text-base font-bold text-[#a4d65e] tabular-nums">
                        {item.finalScore} / {item.maxScore}
                      </span>
                      <span className="font-mono text-[10px] text-[#a8a8a2]">FINAL SCORE</span>
                    </div>

                    <div className="rounded-md border border-[#2e2e2a] bg-[#1b1b19] p-3 text-center">
                      <span className="block font-mono text-base font-bold text-[#8dc63f] tabular-nums">
                        {item.accuracyPercent !== undefined ? `${item.accuracyPercent}%` : '—'}
                      </span>
                      <span className="font-mono text-[10px] text-[#a8a8a2]">ACCURACY</span>
                    </div>

                    <div className="rounded-md border border-[#2e2e2a] bg-[#1b1b19] p-3 text-center">
                      <span className="block font-mono text-base font-bold text-[#f5f5f2] tabular-nums">
                        {item.timeTakenSeconds !== undefined ? formatDurationSeconds(item.timeTakenSeconds) : '—'}
                      </span>
                      <span className="font-mono text-[10px] text-[#a8a8a2]">TIME TAKEN</span>
                    </div>

                    <div className="rounded-md border border-[#2e2e2a] bg-[#1b1b19] p-3 text-center">
                      <span className="block font-mono text-base font-bold text-[#a4d65e] tabular-nums">
                        {item.correctCount !== undefined ? item.correctCount : '—'}
                      </span>
                      <span className="font-mono text-[10px] text-[#a8a8a2]">CORRECT</span>
                    </div>

                    <div className="rounded-md border border-[#2e2e2a] bg-[#1b1b19] p-3 text-center">
                      <span className="block font-mono text-base font-bold text-[#FF365B] tabular-nums">
                        {item.incorrectCount !== undefined ? item.incorrectCount : '—'}
                      </span>
                      <span className="font-mono text-[10px] text-[#a8a8a2]">
                        WRONG{Boolean(item.unwrittenCount) ? ` (${item.unwrittenCount} unwritten)` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-[11px] text-[#a8a8a2]">
                      Official score synced with Firestore & Python scoring engine
                    </span>
                    {!(
                      (item.competitionTitle || '').toLowerCase().includes('practice') ||
                      (item.competitionId || '').toLowerCase().includes('practice')
                    ) && (() => {
                      const compObj = competitions.find((c) => c.id === item.competitionId);
                      const isCompEnded = compObj
                        ? compObj.status === 'completed' ||
                          (compObj.endTime && new Date(compObj.endTime).getTime() <= Date.now())
                        : false;
                      const isLiveComp = compObj ? (compObj.status === 'live' || !isCompEnded) : false;

                      return isLiveComp ? (
                        <button
                          type="button"
                          onClick={() => navigate('/leaderboard')}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8dc63f] hover:underline cursor-pointer"
                        >
                          <Trophy className="h-3.5 w-3.5" />
                          <span>View Live Leaderboard</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(item.competitionId ? `/standings/${item.competitionId}` : '/standings')}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8dc63f] hover:underline cursor-pointer"
                        >
                          <Trophy className="h-3.5 w-3.5" />
                          <span>Inspect Final Standing</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. All Competitions Status Roster */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xs sm:text-sm font-semibold text-[#f5f5f2] uppercase tracking-wider">
              Competitions Roster ({competitions.length})
            </h3>
            {enrichedResults.length === 0 && (
              <span className="font-mono text-[11px] text-[#a8a8a2]">
                0 submissions yet · Enter a live competition below
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competitions.map((comp) => {
              const isPractice = comp.title.toLowerCase().includes('practice');
              const now = Date.now();
              const isCompletedByUser = completedIds.has(comp.id);
              const isEnded =
                !isPractice &&
                (comp.status === 'completed' || (comp.endTime && new Date(comp.endTime).getTime() <= now));

              const statusType: 'completed' | 'live' | 'upcoming' =
                isEnded || comp.status === 'completed'
                  ? 'completed'
                  : comp.status === 'live' ||
                    (comp.startTime &&
                      new Date(comp.startTime).getTime() <= now)
                  ? 'live'
                  : 'upcoming';

              return (
                <div
                  key={comp.id}
                  className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-5 space-y-3 flex flex-col justify-between hover:border-[#7ab32e]/50 transition-colors shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      {statusType === 'completed' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-[#2e2e2a] border border-[#3e3e38] px-2 py-0.5 font-mono text-[10px] font-bold text-[#a8a8a2]">
                          <CheckCircle2 className="h-3 w-3 text-[#8dc63f]" />
                          COMPLETED
                        </span>
                      ) : statusType === 'live' ? (
                        <span className="inline-flex items-center gap-1.5 rounded bg-[#a4d65e]/15 border border-[#a4d65e]/30 px-2 py-0.5 font-mono text-[10px] font-bold text-[#a4d65e]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#8dc63f] animate-ping" />
                          LIVE NOW
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-[#00E5FF]/15 border border-[#00E5FF]/30 px-2 py-0.5 font-mono text-[10px] font-bold text-[#00E5FF]">
                          <Clock className="h-3 w-3" />
                          COMING SOON
                        </span>
                      )}

                      {isCompletedByUser && statusType !== 'completed' && (
                        <span className="inline-flex items-center gap-1 rounded bg-[#a4d65e]/10 border border-[#a4d65e]/30 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#a4d65e]">
                          ATTEMPT RECORDED
                        </span>
                      )}
                    </div>

                    <h4 className="font-display text-base font-bold text-[#f5f5f2] line-clamp-1">
                      {comp.title}
                    </h4>

                    <p className="text-xs text-[#a8a8a2] line-clamp-2 min-h-[2.5rem] leading-relaxed">
                      {comp.description || 'Official Null Origin cybersecurity competition.'}
                    </p>
                  </div>

                  <div className="mt-auto border-t border-[#2e2e2a] pt-3 flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 min-h-[46px]">
                    <div className="font-mono text-xs text-[#a8a8a2] py-1">
                      {statusType === 'completed' ? (
                        <span>
                          {comp.endTime
                            ? `Ended ${new Date(comp.endTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                            : 'Concluded Nov 8'}
                        </span>
                      ) : statusType === 'live' ? (
                        <span className="text-[#8dc63f]">
                          Live · {comp.durationMinutes || 15}m
                        </span>
                      ) : (
                        <span className="text-[#00E5FF]">
                          Starts {comp.startTime ? new Date(comp.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Scheduled'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-end justify-end shrink-0 w-full sm:w-auto">
                      {statusType === 'completed' ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/standings/${comp.id}`)}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md bg-[#1b1b19] border border-[#a4d65e]/40 px-3.5 h-9 text-xs font-semibold text-[#a4d65e] hover:bg-[#a4d65e]/15 hover:border-[#a4d65e] transition-colors cursor-pointer"
                        >
                          <Trophy className="h-3.5 w-3.5 text-[#a4d65e]" />
                          <span>View Final Standings</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      ) : statusType === 'live' ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!is100PercentComplete) {
                              handleOpenEdit();
                              return;
                            }
                            if (isCompletedByUser) {
                              navigate('/leaderboard');
                              return;
                            }
                            if (isPractice) {
                              resetQuizSession();
                            }
                            selectCompetition(comp);
                            navigate('/quiz');
                          }}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md bg-[#8dc63f] px-4 h-9 text-xs font-bold text-[#141a09] hover:bg-[#a4d65e] transition-colors cursor-pointer shadow-sm"
                        >
                          <Trophy className={isCompletedByUser ? 'h-3.5 w-3.5 mr-0.5' : 'hidden'} />
                          <span>
                            {isCompletedByUser
                              ? 'View Live Leaderboard'
                              : !is100PercentComplete
                              ? 'Complete Profile'
                              : 'Enter Quiz Directly'}
                          </span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate('/competitions')}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md bg-[#1b1b19] border border-[#00E5FF]/40 px-3.5 h-9 text-xs font-semibold text-[#00E5FF] hover:bg-[#00E5FF]/15 hover:border-[#00E5FF] transition-colors cursor-pointer"
                        >
                          <span>View Start Timer</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
