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
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}&backgroundColor=07090d`;
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

    await updateProfile({
      displayName: trimmedName,
      username: username.trim() || `user_${(currentUser?.uid || 'opr').slice(0, 8)}`,
      whatsappNumber: whatsappNumber.trim(),
      biography: biography.trim(),
      avatarUrl: assignedAvatarUrl,
      isProfileComplete: true,
    });

    setIsEditing(false);
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
        <div className="rounded-xl border border-[#36F58A]/40 bg-[#0C1017] p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#36F58A]/50 bg-[#36F58A]/10 text-[#36F58A]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#36F58A] tracking-wider uppercase">
                  PROFILE STATUS: 100% COMPLETED
                </span>
                <span className="rounded bg-[#36F58A]/15 border border-[#36F58A]/30 px-2 py-0.5 font-mono text-[10px] font-bold text-[#36F58A]">
                  ELIGIBLE FOR QUIZ
                </span>
              </div>
              <p className="mt-1 text-xs text-[#929DAC] leading-relaxed">
                Your competitor profile is 100% complete and verified. You are fully eligible to enter live quiz competitions and receive winner prize notifications.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center shrink-0">
            <div className="text-right">
              <span className="block font-mono text-sm font-bold text-[#36F58A]">100%</span>
              <span className="font-mono text-[10px] text-[#929DAC]">VERIFIED</span>
            </div>
            <div className="w-24 h-2.5 rounded-full bg-[#111722] overflow-hidden border border-[#252D38]">
              <div className="h-full bg-[#36F58A] w-full" />
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
              <p className="mt-1 text-xs text-[#F0F3F7] leading-relaxed">
                Tournament rules require a 100% completed profile before participating in any quiz. Please provide your Full Legal Name and WhatsApp contact number.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[11px]">
                <span className={isNameComplete ? 'text-[#36F58A]' : 'text-[#FF365B]'}>
                  {isNameComplete ? '✓ Full Legal Name' : '✗ Missing Full Legal Name'}
                </span>
                <span className="text-[#929DAC]">·</span>
                <span className={isWhatsappComplete ? 'text-[#36F58A]' : 'text-[#FF365B]'}>
                  {isWhatsappComplete ? '✓ WhatsApp Contact' : '✗ Missing WhatsApp Number'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Operator Identity Dossier Header Card */}
      <section className="rounded-lg border border-[#252D38] bg-[#0C1017] p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Locked Avatar Slot */}
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-2 border-[#B6FF3B] bg-[#111722] text-[#B6FF3B] overflow-hidden">
              <img
                src={assignedAvatarUrl}
                alt="System-assigned avatar"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div
                title="Profile photo is randomly assigned by the platform and cannot be changed"
                className="absolute bottom-1 right-1 rounded-full bg-[#07090D] border border-[#B6FF3B] p-0.5 text-[#B6FF3B]"
              >
                <Lock className="h-3 w-3" />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#929DAC]">
                <span>OPERATOR DOSSIER</span>
                <span aria-hidden="true">·</span>
                <span>AUTHENTICATED</span>
                {is100PercentComplete && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#36F58A] font-semibold">100% COMPLETED</span>
                  </>
                )}
              </div>

              <h1 className="mt-1 font-display text-2xl font-bold text-[#F0F3F7]">
                {profile.displayName || currentUser?.displayName || 'Unassigned Operator Identity'}
              </h1>

              <p className="mt-0.5 font-mono text-xs text-[#B6FF3B]">
                {profile.username ? `@${profile.username}` : `@user_${(currentUser?.uid || 'opr').slice(0, 8)}`}
              </p>

              <div className="mt-2.5 flex flex-wrap items-center gap-4 font-mono text-xs">
                {profile.whatsappNumber ? (
                  <span className="inline-flex items-center gap-1.5 text-[#36F58A]">
                    <Phone className="h-3.5 w-3.5" />
                    <span>WhatsApp: {profile.whatsappNumber}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[#FF365B]">
                    <Phone className="h-3.5 w-3.5" />
                    <span>WhatsApp: Not provided (Required)</span>
                  </span>
                )}

                {(currentUser?.email || profile.email) && (
                  <span className="inline-flex items-center gap-1.5 text-[#929DAC]">
                    <Mail className="h-3.5 w-3.5" />
                    <span>Email: {currentUser?.email || profile.email}</span>
                  </span>
                )}
              </div>

              <p className="mt-3 max-w-2xl text-sm text-[#929DAC] leading-relaxed">
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
                className="inline-flex items-center gap-2 rounded-md bg-[#B6FF3B] px-4 py-2 text-xs font-semibold text-[#07090D] hover:bg-[#c8ff66] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
            className="mt-8 border-t border-[#252D38] pt-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-[#F0F3F7]">
                  Edit Competitor Contact Details
                </h2>
                <p className="text-xs text-[#929DAC]">
                  Ensure your full legal name and WhatsApp number are accurate so we can contact you immediately upon winning.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="profile-display-name"
                  className="block font-mono text-xs text-[#929DAC] mb-1.5"
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
                  className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3.5 py-2 text-sm text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none"
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
                  className="block font-mono text-xs text-[#929DAC] mb-1.5"
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
                  className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3.5 py-2 text-sm text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none"
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
                  className="block font-mono text-xs text-[#929DAC] mb-1.5"
                >
                  USERNAME / CALLSIGN
                </label>
                <input
                  id="profile-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. operator_01"
                  className="w-full rounded-md border border-[#252D38] bg-[#07090D] px-3.5 py-2 font-mono text-sm text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none"
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
                  className="block font-mono text-xs text-[#929DAC] mb-1.5"
                >
                  REGISTERED EMAIL (LOCKED)
                </label>
                <div className="relative">
                  <input
                    id="profile-email-ro"
                    type="email"
                    readOnly
                    disabled
                    value={currentUser?.email || profile.email || 'unassigned@operator'}
                    className="w-full rounded-md border border-[#252D38] bg-[#07090D]/50 px-3.5 py-2 text-sm text-[#929DAC] cursor-not-allowed"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#929DAC]/50" />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-biography"
                className="block font-mono text-xs text-[#929DAC] mb-1.5"
              >
                SHORT BIOGRAPHY ({biography.length}/280)
              </label>
              <textarea
                id="profile-biography"
                rows={2}
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                placeholder="Describe your cybersecurity background or areas of interest..."
                className="w-full rounded-md border border-[#252D38] bg-[#07090D] p-3.5 text-sm text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none"
              />
              {validationErrors.biography && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#FF365B]">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{validationErrors.biography}</span>
                </p>
              )}
            </div>

            {/* Random Assigned Avatar Notice (Requirement) */}
            <div className="rounded-lg border border-[#252D38] bg-[#07090D] p-4 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-[#B6FF3B] shrink-0" />
              <div className="text-xs text-[#929DAC] leading-relaxed">
                <span className="font-semibold text-[#F0F3F7]">System-Assigned Profile Avatar</span>:
                Profile photos are automatically and uniquely generated by the tournament identity protocol based on your account ID to maintain tournament fairness. Competitors cannot change this photo.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#252D38] pt-4">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-md border border-[#252D38] bg-[#111722] px-4 py-2 text-xs font-medium text-[#929DAC] hover:text-[#F0F3F7] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md bg-[#B6FF3B] px-5 py-2 text-xs font-semibold text-[#07090D] hover:bg-[#c8ff66] cursor-pointer shadow-md"
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#252D38] pb-4">
          <div>
            <h2 id="history-heading" className="font-display text-lg font-bold text-[#F0F3F7]">
              01. Competition & Participation History
            </h2>
            <p className="text-xs text-[#929DAC]">
              Complete ledger of tournaments you have applied for, completed, or are currently scheduled to enter.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-md border border-[#252D38] bg-[#111722] px-3 py-1 font-mono text-xs text-[#929DAC]">
              {enrichedResults.length} Completed · {pendingCompetitions.length} Available
            </span>
          </div>
        </div>

        {/* 1. Completed Tournaments Ledger */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-[#F0F3F7] uppercase tracking-wide">
              Completed Tournament Rounds ({enrichedResults.length})
            </h3>
            {enrichedResults.length > 0 && (
              <button
                type="button"
                onClick={() => navigate('/leaderboard')}
                className="text-xs font-mono text-[#B6FF3B] hover:underline cursor-pointer"
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
                  className="rounded-lg border border-[#252D38] bg-[#0C1017] p-5 sm:p-6 transition-all hover:border-[#36F58A]/50 space-y-4 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#252D38] pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded bg-[#36F58A]/15 border border-[#36F58A]/30 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#36F58A]">
                          <CheckCircle2 className="h-3 w-3" /> COMPLETED · 1 ATTEMPT RECORDED
                        </span>
                        {item.rank && (
                          <span className="inline-flex items-center gap-1 rounded bg-[#B6FF3B]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#B6FF3B]">
                            <Trophy className="h-3 w-3" /> RANK #{item.rank}
                          </span>
                        )}
                      </div>
                      <h4 className="font-display text-base sm:text-lg font-bold text-[#F0F3F7]">
                        {item.competitionTitle}
                      </h4>
                    </div>

                    <div className="font-mono text-xs text-[#929DAC] sm:text-right">
                      <span>Submitted: </span>
                      <span className="text-[#F0F3F7]">
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
                    <div className="rounded-md border border-[#252D38] bg-[#111722] p-3 text-center">
                      <span className="block font-mono text-base font-bold text-[#36F58A] tabular-nums">
                        {item.finalScore} / {item.maxScore}
                      </span>
                      <span className="font-mono text-[10px] text-[#929DAC]">FINAL SCORE</span>
                    </div>

                    <div className="rounded-md border border-[#252D38] bg-[#111722] p-3 text-center">
                      <span className="block font-mono text-base font-bold text-[#B6FF3B] tabular-nums">
                        {item.accuracyPercent !== undefined ? `${item.accuracyPercent}%` : '—'}
                      </span>
                      <span className="font-mono text-[10px] text-[#929DAC]">ACCURACY</span>
                    </div>

                    <div className="rounded-md border border-[#252D38] bg-[#111722] p-3 text-center">
                      <span className="block font-mono text-base font-bold text-[#F0F3F7] tabular-nums">
                        {item.timeTakenSeconds !== undefined ? formatDurationSeconds(item.timeTakenSeconds) : '—'}
                      </span>
                      <span className="font-mono text-[10px] text-[#929DAC]">TIME TAKEN</span>
                    </div>

                    <div className="rounded-md border border-[#252D38] bg-[#111722] p-3 text-center">
                      <span className="block font-mono text-base font-bold text-[#36F58A] tabular-nums">
                        {item.correctCount !== undefined ? item.correctCount : '—'}
                      </span>
                      <span className="font-mono text-[10px] text-[#929DAC]">CORRECT</span>
                    </div>

                    <div className="rounded-md border border-[#252D38] bg-[#111722] p-3 text-center">
                      <span className="block font-mono text-base font-bold text-[#FF365B] tabular-nums">
                        {item.incorrectCount !== undefined ? item.incorrectCount : '—'}
                      </span>
                      <span className="font-mono text-[10px] text-[#929DAC]">WRONG</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-[11px] text-[#929DAC]">
                      Official score synced with Firestore & Python scoring engine
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/leaderboard')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B6FF3B] hover:underline cursor-pointer"
                    >
                      <span>Inspect Live Standing</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Pending / Available Competitions */}
        {pendingCompetitions.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-[#252D38]">
            <h3 className="font-display text-sm font-semibold text-[#F0F3F7] uppercase tracking-wide">
              Pending & Available Competitions ({pendingCompetitions.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingCompetitions.map((comp) => (
                <div
                  key={comp.id}
                  className="rounded-lg border border-[#252D38] bg-[#0C1017] p-5 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span
                        className={`rounded px-2 py-0.5 font-bold ${
                          comp.status === 'live'
                            ? 'bg-[#36F58A]/15 text-[#36F58A] border border-[#36F58A]/30'
                            : 'bg-[#B6FF3B]/10 text-[#B6FF3B] border border-[#B6FF3B]/30'
                        }`}
                      >
                        {comp.status === 'live' ? 'LIVE NOW' : 'PENDING / SCHEDULED'}
                      </span>
                    </div>

                    <h4 className="font-display text-base font-semibold text-[#F0F3F7]">
                      {comp.title}
                    </h4>

                    {comp.description && (
                      <p className="text-xs text-[#929DAC] line-clamp-2 leading-relaxed">
                        {comp.description}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-[#252D38] pt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 font-mono text-xs text-[#929DAC]">
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
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#111722] border border-[#252D38] px-3 py-1.5 text-xs font-semibold text-[#F0F3F7] hover:border-[#B6FF3B] hover:text-[#B6FF3B] transition-colors cursor-pointer"
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
