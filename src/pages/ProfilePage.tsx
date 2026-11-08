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
  const isWhatsappComplete = Boolean(profile.whatsappNumber && profile.whatsappNumber.trim().length >= 6);
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

    const digitsOnly = whatsappNumber.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      errors.whatsappNumber = 'Please enter a valid WhatsApp number (e.g. +91 9876543210).';
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
      whatsappNumber: whatsappNumber.trim(),
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

    // 1. Existing results in state
    results.forEach((res) => {
      if (!res.competitionId || !validCompIds.has(res.competitionId) || seenCompIds.has(res.competitionId)) return;
      seenCompIds.add(res.competitionId);

      const matchComp = competitions.find((c) => c.id === res.competitionId);
      const matchLeaderboard = leaderboard.find(
        (l) =>
          (l.competitionId === res.competitionId || l.participantId.endsWith(`_${res.competitionId}`)) &&
          (l.isCurrentUser || (currentUser && l.participantId.startsWith(currentUser.uid)))
      );

      list.push({
        id: res.id,
        competitionId: res.competitionId,
        competitionTitle: res.competitionName || matchComp?.title || 'Cybersecurity Quiz Competition',
        completedAt: res.completedAt || new Date().toISOString(),
        finalScore: res.finalScore,
        maxScore: res.maxScore || (matchComp as any)?.totalPoints || 100,
        accuracyPercent: res.accuracyPercent,
        timeTakenSeconds: res.timeTakenSeconds,
        correctCount: res.correctCount,
        incorrectCount: res.incorrectCount,
        unwrittenCount: res.unwrittenCount,
        rank: matchLeaderboard?.rank || 1,
      });
    });

    // 2. Synthesize from current user's leaderboard records if not in results yet
    leaderboard.forEach((l) => {
      const compId =
        l.competitionId ||
        (currentUser && l.participantId.startsWith(`${currentUser.uid}_`)
          ? l.participantId.replace(`${currentUser.uid}_`, '')
          : '');
      const isMine =
        l.isCurrentUser || (currentUser && l.participantId.startsWith(currentUser.uid));
      if (isMine && compId && validCompIds.has(compId) && !seenCompIds.has(compId)) {
        seenCompIds.add(compId);
        const matchComp = competitions.find((c) => c.id === compId);
        list.push({
          id: l.participantId,
          competitionId: compId,
          competitionTitle: matchComp?.title || 'Cybersecurity Quiz Competition',
          completedAt: typeof l.createdAt === 'string' ? l.createdAt : new Date().toISOString(),
          finalScore: l.score,
          maxScore: (matchComp as any)?.totalPoints || 100,
          accuracyPercent: l.accuracyPercent,
          timeTakenSeconds: l.completionTimeSeconds,
          rank: l.rank || 1,
        });
      }
    });

    // 3. Synthesize from submitted quizSession if not in results yet
    if (
      quizSession?.isSubmitted &&
      quizSession?.competitionId &&
      validCompIds.has(quizSession.competitionId) &&
      !seenCompIds.has(quizSession.competitionId)
    ) {
      const compId = quizSession.competitionId;
      seenCompIds.add(compId);
      const matchComp = competitions.find((c) => c.id === compId);
      list.push({
        id: `session_${compId}`,
        competitionId: compId,
        competitionTitle:
          quizSession.competitionTitle || matchComp?.title || 'Cybersecurity Quiz Competition',
        completedAt: quizSession.submittedAt || new Date().toISOString(),
        finalScore: 0,
        maxScore: (matchComp as any)?.totalPoints || 100,
        rank: 1,
      });
    }

    return list;
  }, [results, competitions, leaderboard, currentUser, quizSession]);

  // Competitions not yet attempted
  const pendingCompetitions = useMemo(() => {
    const completedIds = new Set(enrichedResults.map((r) => r.competitionId));
    return competitions.filter((comp) => !completedIds.has(comp.id));
  }, [competitions, enrichedResults]);

  return (
    <div className="space-y-8">
      {/* 100% Profile Completion Status Banner */}
      {is100PercentComplete ? (
        <div className="rounded-xl border border-[#a4d65e]/40 bg-[#1b1b19] p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#a4d65e]/50 bg-[#a4d65e]/10 text-[#a4d65e]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#a4d65e] tracking-wider uppercase">
                  PROFILE STATUS: 100% COMPLETED
                </span>
                <span className="rounded bg-[#a4d65e]/15 border border-[#a4d65e]/30 px-2 py-0.5 font-mono text-[10px] font-bold text-[#a4d65e]">
                  ELIGIBLE FOR QUIZ
                </span>
              </div>
              <p className="mt-1 text-xs text-[#a8a8a2] leading-relaxed">
                Your competitor profile is 100% complete and verified. You are fully eligible to enter live quiz competitions and receive winner prize notifications.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center shrink-0">
            <div className="text-right">
              <span className="block font-mono text-sm font-bold text-[#a4d65e]">100%</span>
              <span className="font-mono text-[10px] text-[#a8a8a2]">VERIFIED</span>
            </div>
            <div className="w-24 h-2.5 rounded-full bg-[#1b1b19] overflow-hidden border border-[#2e2e2a]">
              <div className="h-full bg-[#a4d65e] w-full" />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[#FFB800]/50 bg-[#FFB800]/10 p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#FFB800]/60 bg-[#FFB800]/20 text-[#FFB800]">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#FFB800] tracking-wider uppercase">
                  PROFILE STATUS: INCOMPLETE ({completionPercentage}%)
                </span>
                <span className="rounded bg-[#FFB800]/20 border border-[#FFB800]/40 px-2 py-0.5 font-mono text-[10px] font-bold text-[#FFB800]">
                  100% REQUIRED TO ENTER QUIZ
                </span>
              </div>
              <p className="mt-1 text-xs text-[#f5f5f2] leading-relaxed">
                Tournament rules require a 100% completed profile before participating in any quiz. Please provide your Full Legal Name and WhatsApp contact number.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[11px]">
                <span className={isNameComplete ? 'text-[#a4d65e]' : 'text-[#FF365B]'}>
                  {isNameComplete ? '✓ Full Legal Name' : '✗ Missing Full Legal Name'}
                </span>
                <span className="text-[#a8a8a2]">·</span>
                <span className={isWhatsappComplete ? 'text-[#a4d65e]' : 'text-[#FF365B]'}>
                  {isWhatsappComplete ? '✓ WhatsApp Contact' : '✗ Missing WhatsApp Number'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Operator Identity Dossier Header Card */}
      <section className="rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Locked Avatar Slot */}
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-2 border-[#7ab32e] bg-[#1b1b19] text-[#8dc63f] overflow-hidden">
              <img
                src={assignedAvatarUrl}
                alt="System-assigned avatar"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div
                title="Profile photo is randomly assigned by the platform and cannot be changed"
                className="absolute bottom-1 right-1 rounded-full bg-[#111110] border border-[#7ab32e] p-0.5 text-[#8dc63f]"
              >
                <Lock className="h-3 w-3" />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#a8a8a2]">
                <span>OPERATOR DOSSIER</span>
                <span aria-hidden="true">·</span>
                <span>AUTHENTICATED</span>
                {is100PercentComplete && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#a4d65e] font-semibold">100% COMPLETED</span>
                  </>
                )}
              </div>

              <h1 className="mt-1 font-display text-2xl font-bold text-[#f5f5f2]">
                {profile.displayName || currentUser?.displayName || 'Unassigned Operator Identity'}
              </h1>

              <p className="mt-0.5 font-mono text-xs text-[#8dc63f]">
                {profile.username ? `@${profile.username}` : `@user_${(currentUser?.uid || 'opr').slice(0, 8)}`}
              </p>

              <div className="mt-2.5 flex flex-wrap items-center gap-4 font-mono text-xs">
                {profile.whatsappNumber ? (
                  <span className="inline-flex items-center gap-1.5 text-[#a4d65e]">
                    <Phone className="h-3.5 w-3.5" />
                    <span>WhatsApp: Registered & Verified (Hidden)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[#a8a8a2]">
                    <Phone className="h-3.5 w-3.5" />
                    <span>WhatsApp: Not provided</span>
                  </span>
                )}

                {(currentUser?.email || profile.email) && (
                  <span className="inline-flex items-center gap-1.5 text-[#a8a8a2]">
                    <Mail className="h-3.5 w-3.5" />
                    <span>Email: Verified Account (Hidden)</span>
                  </span>
                )}
              </div>

              <p className="mt-3 max-w-2xl text-sm text-[#a8a8a2] leading-relaxed">
                {profile.biography ||
                  'Official competitor dossier. Contact details are securely archived for tournament verification, leaderboard standings, and winner prize distribution.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start">
            {!isEditing && (
              <button
                type="button"
                onClick={handleOpenEdit}
                className="inline-flex items-center gap-2 rounded-md bg-[#8dc63f] px-4 py-2.5 min-h-11 text-xs font-semibold text-[#141a09] hover:bg-[#a4d65e] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* Working Profile Edit Form */}
        {isEditing && (
          <form
            onSubmit={handleSaveProfile}
            className="mt-8 border-t border-[#2e2e2a] pt-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-[#f5f5f2]">
                  Edit Competitor Contact Details
                </h2>
                <p className="text-xs text-[#a8a8a2]">
                  Ensure your full legal name and WhatsApp number are accurate so we can contact you immediately upon winning.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="profile-display-name"
                  className="block font-mono text-xs text-[#a8a8a2] mb-1.5"
                >
                  FULL LEGAL NAME *
                </label>
                <input
                  id="profile-display-name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Johnathan Doe"
                  className="w-full rounded-md border border-[#2e2e2a] bg-[#111110] px-3.5 py-2 text-sm text-[#f5f5f2] focus:border-[#7ab32e] focus:outline-none"
                />
                {validationErrors.displayName && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#FF365B]">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{validationErrors.displayName}</span>
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="profile-whatsapp"
                  className="block font-mono text-xs text-[#a8a8a2] mb-1.5"
                >
                  WHATSAPP CONTACT NUMBER *
                </label>
                <input
                  id="profile-whatsapp"
                  type="tel"
                  required
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full rounded-md border border-[#2e2e2a] bg-[#111110] px-3.5 py-2 text-sm text-[#f5f5f2] focus:border-[#7ab32e] focus:outline-none"
                />
                {validationErrors.whatsappNumber && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#FF365B]">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{validationErrors.whatsappNumber}</span>
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="profile-username"
                  className="block font-mono text-xs text-[#a8a8a2] mb-1.5"
                >
                  USERNAME / CALLSIGN
                </label>
                <input
                  id="profile-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. operator_01"
                  className="w-full rounded-md border border-[#2e2e2a] bg-[#111110] px-3.5 py-2 font-mono text-sm text-[#f5f5f2] focus:border-[#7ab32e] focus:outline-none"
                />
                {validationErrors.username && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#FF365B]">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{validationErrors.username}</span>
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="profile-email-ro"
                  className="block font-mono text-xs text-[#a8a8a2] mb-1.5"
                >
                  REGISTERED EMAIL (LOCKED)
                </label>
                <div className="relative">
                  <input
                    id="profile-email-ro"
                    type="email"
                    readOnly
                    disabled
                    value={currentUser?.email ? (currentUser.email.slice(0, 3) + '••••@••••.com') : 'Account Connected'}
                    className="w-full rounded-md border border-[#2e2e2a] bg-[#111110]/50 px-3.5 py-2 text-sm text-[#a8a8a2] cursor-not-allowed"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#a8a8a2]/50" />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-biography"
                className="block font-mono text-xs text-[#a8a8a2] mb-1.5"
              >
                SHORT BIOGRAPHY ({biography.length}/280)
              </label>
              <textarea
                id="profile-biography"
                rows={2}
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                placeholder="Describe your cybersecurity background or areas of interest..."
                className="w-full rounded-md border border-[#2e2e2a] bg-[#111110] p-3.5 text-sm text-[#f5f5f2] focus:border-[#7ab32e] focus:outline-none"
              />
              {validationErrors.biography && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#FF365B]">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{validationErrors.biography}</span>
                </p>
              )}
            </div>

            {/* Random Assigned Avatar Notice (Requirement) */}
            <div className="rounded-lg border border-[#2e2e2a] bg-[#111110] p-4 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-[#8dc63f] shrink-0" />
              <div className="text-xs text-[#a8a8a2] leading-relaxed">
                <span className="font-semibold text-[#f5f5f2]">System-Assigned Profile Avatar</span>:
                Profile photos are automatically and uniquely generated by the tournament identity protocol based on your account ID to maintain tournament fairness. Competitors cannot change this photo.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#2e2e2a] pt-4">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-md border border-[#2e2e2a] bg-[#1b1b19] px-4 py-2 text-xs font-medium text-[#a8a8a2] hover:text-[#f5f5f2] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md bg-[#8dc63f] px-5 py-2 text-xs font-semibold text-[#141a09] hover:bg-[#a4d65e] cursor-pointer shadow-md"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Save Profile (100% Verify)</span>
              </button>
            </div>
          </form>
        )}
      </section>

      {/* SECTION 01: Competition & Participation History (The ONLY section retained per instructions) */}
      <section className="space-y-6" aria-labelledby="history-heading">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2e2e2a] pb-4">
          <div>
            <h2 id="history-heading" className="font-display text-lg font-bold text-[#f5f5f2]">
              01. Competition & Participation History
            </h2>
            <p className="text-xs text-[#a8a8a2]">
              Complete ledger of tournaments you have applied for, completed, or are currently scheduled to enter.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-md border border-[#2e2e2a] bg-[#1b1b19] px-3 py-1 font-mono text-xs text-[#a8a8a2]">
              {enrichedResults.length} Completed · {pendingCompetitions.length} Available
            </span>
          </div>
        </div>

        {/* 1. Completed Tournaments Ledger */}
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
                    {/* Practice quizzes have no leaderboard standing, so no link. */}
                    {!(
                      (item.competitionTitle || '').toLowerCase().includes('practice') ||
                      (item.competitionId || '').toLowerCase().includes('practice')
                    ) && (
                      <button
                        type="button"
                        onClick={() => navigate('/leaderboard')}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8dc63f] hover:underline cursor-pointer"
                      >
                        <span>Inspect Live Standing</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Pending / Available Competitions */}
        {pendingCompetitions.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-[#2e2e2a]">
            <h3 className="font-display text-sm font-semibold text-[#f5f5f2] uppercase tracking-wide">
              Pending & Available Competitions ({pendingCompetitions.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingCompetitions.map((comp) => (
                <div
                  key={comp.id}
                  className="rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-5 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span
                        className={`rounded px-2 py-0.5 font-bold ${
                          comp.status === 'live'
                            ? 'bg-[#a4d65e]/15 text-[#a4d65e] border border-[#a4d65e]/30'
                            : 'bg-[#8dc63f]/10 text-[#8dc63f] border border-[#7ab32e]/30'
                        }`}
                      >
                        {comp.status === 'live' ? 'LIVE NOW' : 'PENDING / SCHEDULED'}
                      </span>
                    </div>

                    <h4 className="font-display text-base font-semibold text-[#f5f5f2]">
                      {comp.title}
                    </h4>

                    {comp.description && (
                      <p className="text-xs text-[#a8a8a2] line-clamp-2 leading-relaxed">
                        {comp.description}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-[#2e2e2a] pt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 font-mono text-xs text-[#a8a8a2]">
                      {comp.startTime && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(comp.startTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                      <span>{comp.durationMinutes || 15}m</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        selectCompetition(comp);
                        if (!is100PercentComplete) {
                          handleOpenEdit();
                        } else {
                          const isLive =
                            comp.status === 'live' ||
                            (comp.startTime &&
                              new Date(comp.startTime).getTime() <= Date.now() &&
                              comp.status !== 'completed');
                          if (isLive) {
                            navigate('/quiz');
                          } else {
                            navigate('/competitions');
                          }
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#1b1b19] border border-[#2e2e2a] px-3 py-1.5 text-xs font-semibold text-[#f5f5f2] hover:border-[#7ab32e] hover:text-[#8dc63f] transition-colors cursor-pointer"
                    >
                      <span>
                        {!is100PercentComplete
                          ? 'Complete Profile First'
                          : comp.status === 'live'
                          ? 'Enter Quiz Directly'
                          : 'View Start Timer'}
                      </span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
