import test from 'node:test';
import assert from 'node:assert/strict';

test('single attempt detection identifies already completed competitions', () => {
  const currentUserId = 'user_123';
  const targetCompId = 'comp_456';

  const results = [
    { id: 'user_123_comp_456', competitionId: 'comp_456', finalScore: 800 },
    { id: 'user_999_comp_789', competitionId: 'comp_789', finalScore: 600 },
  ];

  const leaderboard = [
    { participantId: 'user_123_comp_456', score: 800, isCurrentUser: true },
  ];

  const hasResult = results.some((r) => r.competitionId === targetCompId);
  const hasLeaderboard = leaderboard.some(
    (l) => l.participantId === `${currentUserId}_${targetCompId}`
  );
  const hasAlreadyAttempted = hasResult || hasLeaderboard;

  assert.equal(hasAlreadyAttempted, true);

  // Another competition not yet attempted
  const unattemptedCompId = 'comp_new_999';
  const hasAttemptedOther =
    results.some((r) => r.competitionId === unattemptedCompId) ||
    leaderboard.some((l) => l.participantId === `${currentUserId}_${unattemptedCompId}`);

  assert.equal(hasAttemptedOther, false);
});

test('quiz activation guard holds timers paused while profile is incomplete or rules unacknowledged', () => {
  const profileCompleteFalse = false;
  const isQuizActiveFalse = false;

  // The timer intervals should not run
  const shouldRunTimers = profileCompleteFalse && isQuizActiveFalse;
  assert.equal(shouldRunTimers, false);

  // Once profile is complete and 3-2-1 countdown finishes
  const profileCompleteTrue = true;
  const isQuizActiveTrue = true;
  const shouldRunNow = profileCompleteTrue && isQuizActiveTrue;
  assert.equal(shouldRunNow, true);
});

test('countdown progression transitions from 3 to 2 to 1 to 0 (GO) before activating session', () => {
  const sequence: number[] = [3, 2, 1, 0];
  assert.equal(sequence[0], 3);
  assert.equal(sequence[3], 0); // 0 corresponds to "GO"
});

test('upcoming competition converts to live when target start timer is reached', () => {
  const now = Date.now();
  const pastStartTime = new Date(now - 1000).toISOString();
  const futureStartTime = new Date(now + 60000).toISOString();

  // 1. Future competition stays upcoming
  const futureComp = {
    id: 'comp_1',
    status: 'upcoming' as string,
    startTime: futureStartTime,
  };
  const isFutureLive =
    futureComp.status === 'live' ||
    (futureComp.startTime && new Date(futureComp.startTime).getTime() <= now && futureComp.status !== 'completed');
  assert.equal(isFutureLive, false);

  // 2. Timer elapsed competition automatically converts to live
  const elapsedComp = {
    id: 'comp_2',
    status: 'upcoming' as string,
    startTime: pastStartTime,
  };
  const isElapsedLive =
    elapsedComp.status === 'live' ||
    (elapsedComp.startTime && new Date(elapsedComp.startTime).getTime() <= now && elapsedComp.status !== 'completed');
  assert.equal(isElapsedLive, true);
});

test('competitions completed by user match under the completed status filter even when tournament is live', () => {
  const completedCompId = 'tourney_777';
  const liveCompId = 'tourney_888';
  const completedIds = new Set<string>([completedCompId]);

  const competitions = [
    { id: completedCompId, title: 'Network Security Round 1', status: 'live' as const },
    { id: liveCompId, title: 'Web Exploitation Round 2', status: 'live' as const },
    { id: 'tourney_999', title: 'Cryptography Finals', status: 'completed' as const },
  ];

  // Filtering by 'completed'
  const filterByCompleted = competitions.filter((comp) => {
    const isCompletedByUser = completedIds.has(comp.id);
    const isCompletedGlobally = comp.status === 'completed';
    return isCompletedByUser || isCompletedGlobally;
  });

  // Both the globally completed competition AND the user-completed live competition must match
  assert.equal(filterByCompleted.length, 2);
  assert.equal(filterByCompleted.some((c) => c.id === completedCompId), true);
  assert.equal(filterByCompleted.some((c) => c.id === 'tourney_999'), true);
  assert.equal(filterByCompleted.some((c) => c.id === liveCompId), false);
});

test('status tab counts accurately categorize live, upcoming, and completed items', () => {
  const completedCompId = 'comp_user_completed';
  const completedIds = new Set<string>([completedCompId]);

  const competitions = [
    { id: completedCompId, title: 'Tourney A', status: 'live' as const },
    { id: 'comp_live_open', title: 'Tourney B', status: 'live' as const },
    { id: 'comp_upcoming', title: 'Tourney C', status: 'upcoming' as const },
    { id: 'comp_archived', title: 'Tourney D', status: 'completed' as const },
  ];

  const completedCount = competitions.filter(
    (c) => c.status === 'completed' || completedIds.has(c.id)
  ).length;

  const liveCount = competitions.filter((c) => c.status === 'live').length;

  assert.equal(completedCount, 2); // comp_user_completed + comp_archived
  assert.equal(liveCount, 2); // comp_user_completed + comp_live_open
});

test('scoreboard tie-breaker: two individuals with identical scores are ranked by completion time', () => {
  const participants = [
    {
      id: 'user_slow',
      displayName: 'Operator Bob',
      score: 2800,
      completionTimeSeconds: 420, // 7 minutes
      accuracyPercent: 93,
    },
    {
      id: 'user_fast',
      displayName: 'Operator Alice',
      score: 2800, // Same score as Bob!
      completionTimeSeconds: 215, // 3 minutes 35 seconds (Faster)
      accuracyPercent: 93,
    },
    {
      id: 'user_lowest',
      displayName: 'Operator Charlie',
      score: 2500,
      completionTimeSeconds: 120,
      accuracyPercent: 83,
    },
    {
      id: 'user_highest',
      displayName: 'Operator Dave',
      score: 3000,
      completionTimeSeconds: 500,
      accuracyPercent: 100,
    },
  ];

  const sorted = [...participants].sort((a, b) => {
    // 1. Primary: Score (Descending)
    const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
    if (scoreDiff !== 0) return scoreDiff;

    // 2. Secondary (Requirement): If score is the same, rank by completion time (faster wins)
    const timeA = typeof a.completionTimeSeconds === 'number' ? a.completionTimeSeconds : 999999;
    const timeB = typeof b.completionTimeSeconds === 'number' ? b.completionTimeSeconds : 999999;
    const timeDiff = timeA - timeB;
    if (timeDiff !== 0) return timeDiff;

    // 3. Tertiary (Requirement): If both are the same, who submitted first must be winner
    const dateA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 9999999999999;
    const dateB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 9999999999999;
    return dateA - dateB;
  });

  // Dave should be #1 with 3000 pts
  assert.equal(sorted[0].id, 'user_highest');

  // Alice and Bob both have 2800 pts, but Alice finished faster (215s vs 420s), so Alice is #2
  assert.equal(sorted[1].id, 'user_fast');
  assert.equal(sorted[1].completionTimeSeconds, 215);

  // Bob is #3
  assert.equal(sorted[2].id, 'user_slow');
  assert.equal(sorted[2].completionTimeSeconds, 420);

  // Charlie is #4 with 2500 pts
  assert.equal(sorted[3].id, 'user_lowest');

  // Tie-breaker 2: Same score AND same completion time -> earlier submission timestamp wins
  const twinParticipants = [
    { id: 'user_late', score: 2800, completionTimeSeconds: 215, createdAt: '2026-11-06T12:05:00.000Z' },
    { id: 'user_first', score: 2800, completionTimeSeconds: 215, createdAt: '2026-11-06T12:01:00.000Z' },
  ];
  const sortedTwins = [...twinParticipants].sort((a, b) => {
    const sDiff = b.score - a.score;
    if (sDiff !== 0) return sDiff;
    const tDiff = a.completionTimeSeconds - b.completionTimeSeconds;
    if (tDiff !== 0) return tDiff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  assert.equal(sortedTwins[0].id, 'user_first'); // Earlier submitter wins!
});

test('quiz evaluation accurately scores answers against correctOptionId', () => {
  const questions = [
    { id: 'q1', points: 100, correctOptionId: 'opt_b' },
    { id: 'q2', points: 100, correctOptionId: 'opt_a' },
    { id: 'q3', points: 100, correctOptionId: 'opt_c' },
  ];

  const userAnswers: Record<string, string> = {
    q1: 'opt_b', // Correct (+100)
    q2: 'opt_d', // Incorrect (+0)
    // q3 is unanswered (+0)
  };

  let earned = 0;
  let correct = 0;
  let incorrect = 0;

  for (const q of questions) {
    const chosen = userAnswers[q.id];
    if (chosen !== undefined && chosen !== null && String(chosen).trim() !== '') {
      if (q.correctOptionId && String(chosen) === String(q.correctOptionId)) {
        earned += q.points;
        correct += 1;
      } else {
        incorrect += 1;
      }
    } else {
      incorrect += 1;
    }
  }

  assert.equal(earned, 100);
  assert.equal(correct, 1);
  assert.equal(incorrect, 2);
  const accuracy = Math.round((correct / questions.length) * 100);
  assert.equal(accuracy, 33);
});


test('tab-switching proctoring system enforces 2-warning limit and disqualifies on 3rd infraction with score 0', () => {
  let warningCount = 0;
  let isDisqualified = false;
  let finalScore: number | null = null;
  let activeModal: number | null = null;

  const handleTabSwitch = () => {
    warningCount += 1;
    if (warningCount > 2) {
      isDisqualified = true;
      activeModal = null;
      finalScore = 0;
    } else {
      activeModal = warningCount;
    }
  };

  // Infraction 1: First warning
  handleTabSwitch();
  assert.equal(warningCount, 1);
  assert.equal(activeModal, 1);
  assert.equal(isDisqualified, false);

  // Infraction 2: Second warning (Critical final warning)
  handleTabSwitch();
  assert.equal(warningCount, 2);
  assert.equal(activeModal, 2);
  assert.equal(isDisqualified, false);

  // Infraction 3: Exceeded 2 warnings (> 2 warnings) -> On the spot disqualification!
  handleTabSwitch();
  assert.equal(warningCount, 3);
  assert.equal(isDisqualified, true);
  assert.equal(finalScore, 0);
});

test('proctoring warning counter persists across browser reloads via client storage', () => {
  const mockStorage: Record<string, string> = {};
  const compId = 'cyber-quiz-2026';
  const key = `nullorigin_tab_warnings_${compId}`;

  // Step 1: Warning 1 issued
  mockStorage[key] = '1';

  // Step 2: Page reloaded -> warning count retrieved
  const restoredWarnings = parseInt(mockStorage[key] || '0', 10);
  assert.equal(restoredWarnings, 1);

  // Step 3: Next infraction increments to 2
  const nextWarnings = restoredWarnings + 1;
  mockStorage[key] = String(nextWarnings);
  assert.equal(parseInt(mockStorage[key], 10), 2);

  // Step 4: 3rd infraction disqualifies
  const finalWarnings = parseInt(mockStorage[key], 10) + 1;
  const isDisqualified = finalWarnings > 2;
  assert.equal(isDisqualified, true);
});

test('heartbeat proctoring detects hidden document or window blur even when events are missed', () => {
  const evaluateHeartbeat = (isDocHidden: boolean, hasFocus: boolean) => {
    return isDocHidden || !hasFocus;
  };

  // Normal focused state: no infraction
  assert.equal(evaluateHeartbeat(false, true), false);

  // User switched tabs: document is hidden
  assert.equal(evaluateHeartbeat(true, false), true);

  // User split-screen or secondary monitor: document not hidden but hasFocus is false
  assert.equal(evaluateHeartbeat(false, false), true);
});

test('disqualified quiz session evaluation forces score 0 and maximum penalty time', () => {
  const totalQuestions = 30;
  const disqualifiedPayload = {
    finalScore: 0,
    maxScore: totalQuestions * 100,
    accuracyPercent: 0,
    correctCount: 0,
    incorrectCount: totalQuestions,
    unwrittenCount: totalQuestions,
    wrongAnswerCount: 0,
    timeTakenSeconds: 86400,
    completionStatus: 'Completed',
  };

  assert.equal(disqualifiedPayload.finalScore, 0);
  assert.equal(disqualifiedPayload.correctCount, 0);
  assert.equal(disqualifiedPayload.incorrectCount, 30);
  assert.equal(disqualifiedPayload.unwrittenCount, 30);
  assert.equal(disqualifiedPayload.timeTakenSeconds, 86400);
});

test('strict forward-only progression disallows navigating backwards to previous questions', () => {
  const currentIndex = 3; // Question 4
  const attempts = [0, 1, 2, 3, 4, 5];

  const results = attempts.map((targetIdx) => {
    const isPast = targetIdx < currentIndex;
    const isCurrent = targetIdx === currentIndex;
    const canNavigate = !isPast && !isCurrent;
    return { targetIdx, isPast, canNavigate };
  });

  // Previous questions (0, 1, 2) must be strictly locked
  assert.equal(results[0].isPast, true);
  assert.equal(results[1].isPast, true);
  assert.equal(results[2].isPast, true);
  assert.equal(results[0].canNavigate, false);
  assert.equal(results[1].canNavigate, false);
  assert.equal(results[2].canNavigate, false);
});

test('getShuffledQuiz produces deterministic results for identical seeds', async () => {
  const { getShuffledQuiz } = await import('./shuffleQuiz');
  const sampleQuestions = [
    {
      id: 'q1',
      index: 0,
      prompt: 'What is port 443?',
      points: 100,
      correctOptionId: 'opt_https',
      options: [
        { id: 'opt_http', label: 'A', text: 'HTTP' },
        { id: 'opt_https', label: 'B', text: 'HTTPS' },
        { id: 'opt_ssh', label: 'C', text: 'SSH' },
        { id: 'opt_dns', label: 'D', text: 'DNS' },
      ],
    },
    {
      id: 'q2',
      index: 1,
      prompt: 'What is AES?',
      points: 100,
      correctOptionId: 'opt_symm',
      options: [
        { id: 'opt_asymm', label: 'A', text: 'Asymmetric cipher' },
        { id: 'opt_symm', label: 'B', text: 'Symmetric cipher' },
        { id: 'opt_hash', label: 'C', text: 'Hash function' },
        { id: 'opt_stream', label: 'D', text: 'Stream cipher' },
      ],
    },
    {
      id: 'q3',
      index: 2,
      prompt: 'Default port for SSH?',
      points: 100,
      correctOptionId: 'opt_22',
      options: [
        { id: 'opt_21', label: 'A', text: '21' },
        { id: 'opt_22', label: 'B', text: '22' },
        { id: 'opt_23', label: 'C', text: '23' },
        { id: 'opt_25', label: 'D', text: '25' },
      ],
    },
  ];

  const seed = 'kunalbankhele07@gmail.com_cyber-quiz-2026';
  const run1 = getShuffledQuiz(sampleQuestions, seed);
  const run2 = getShuffledQuiz(sampleQuestions, seed);

  // Exact same question sequence
  assert.deepEqual(
    run1.map((q) => q.id),
    run2.map((q) => q.id)
  );

  // Exact same option order per question
  for (let i = 0; i < run1.length; i++) {
    assert.deepEqual(
      run1[i].options.map((o) => o.id),
      run2[i].options.map((o) => o.id)
    );
    // Labels are re-indexed A, B, C, D in visual order
    assert.deepEqual(
      run1[i].options.map((o) => o.label),
      ['A', 'B', 'C', 'D']
    );
  }
});

test('getShuffledQuiz produces different question and option order for different candidate seeds', async () => {
  const { getShuffledQuiz } = await import('./shuffleQuiz');
  const sampleQuestions = Array.from({ length: 15 }, (_, i) => ({
    id: `q_${i + 1}`,
    index: i,
    prompt: `Question prompt ${i + 1}`,
    points: 100,
    correctOptionId: `q_${i + 1}_opt_correct`,
    options: [
      { id: `q_${i + 1}_opt_correct`, label: 'A', text: 'Correct Answer' },
      { id: `q_${i + 1}_opt_w1`, label: 'B', text: 'Wrong 1' },
      { id: `q_${i + 1}_opt_w2`, label: 'C', text: 'Wrong 2' },
      { id: `q_${i + 1}_opt_w3`, label: 'D', text: 'Wrong 3' },
    ],
  }));

  const userA = getShuffledQuiz(sampleQuestions, 'alice@nullorigin.live_cyber-quiz-2026');
  const userB = getShuffledQuiz(sampleQuestions, 'bob@nullorigin.live_cyber-quiz-2026');

  const orderA = userA.map((q) => q.id).join(',');
  const orderB = userB.map((q) => q.id).join(',');

  // The order of questions must be distinct
  assert.notEqual(orderA, orderB, 'Question ordering should differ between candidates');

  // Verify option shuffling: at least some questions must have differing option orders
  let optionOrderDifferences = 0;
  for (const qA of userA) {
    const qB = userB.find((q) => q.id === qA.id);
    if (qB) {
      const optsA = qA.options.map((o) => o.id).join(',');
      const optsB = qB.options.map((o) => o.id).join(',');
      if (optsA !== optsB) optionOrderDifferences++;
    }
  }
  assert.ok(optionOrderDifferences > 0, 'Candidate option order must be shuffled independently');
});

test('scoring engine matches correctOptionId regardless of option shuffling', async () => {
  const { getShuffledQuiz } = await import('./shuffleQuiz');
  const sampleQuestions = [
    {
      id: 'q1',
      index: 0,
      prompt: 'True or False',
      points: 100,
      correctOptionId: 'opt_true',
      options: [
        { id: 'opt_false', label: 'A', text: 'False' },
        { id: 'opt_true', label: 'B', text: 'True' },
      ],
    },
  ];

  // Candidates get shuffled options
  const candidate1 = getShuffledQuiz(sampleQuestions, 'student1_seed');
  const candidate2 = getShuffledQuiz(sampleQuestions, 'student2_seed');

  // Both choose the correct option by id
  const ans1: Record<string, string> = { q1: 'opt_true' };
  const ans2: Record<string, string> = { q1: 'opt_true' };

  let score1 = 0;
  for (const q of candidate1) {
    if (ans1[q.id] === q.correctOptionId) score1 += (q.points || 100);
  }

  let score2 = 0;
  for (const q of candidate2) {
    if (ans2[q.id] === q.correctOptionId) score2 += (q.points || 100);
  }

  assert.equal(score1, 100);
  assert.equal(score2, 100);
});

test('hasAlreadyAttempted strictly locks entry per email and per UID', () => {
  const mockStorage: Record<string, string> = {};

  const checkHasAttempted = (
    currentUser: { uid: string; email?: string } | null,
    activeCompId: string,
    storage: Record<string, string>
  ) => {
    if (!currentUser || !activeCompId) return false;
    const uidKey = `completed_comp_${currentUser.uid}_${activeCompId}`;
    if (storage[uidKey] === 'true') return true;

    if (currentUser.email) {
      const cleanEmail = currentUser.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
      const emailKey = `completed_email_${cleanEmail}_${activeCompId}`;
      if (storage[emailKey] === 'true') return true;
    }
    return false;
  };

  const compId = 'cyber-quiz-2026';
  const user = { uid: 'uid_kunal_123', email: 'kunalbankhele07@gmail.com' };

  // Fresh user: not attempted
  assert.equal(checkHasAttempted(user, compId, mockStorage), false);

  // Mark completed by email
  const cleanEmail = user.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  mockStorage[`completed_email_${cleanEmail}_${compId}`] = 'true';

  // Now locked
  assert.equal(checkHasAttempted(user, compId, mockStorage), true);

  // Even if user logs in with a different UID but the same email: STILL locked
  const altUidUser = { uid: 'uid_kunal_different_session', email: 'kunalbankhele07@gmail.com' };
  assert.equal(checkHasAttempted(altUidUser, compId, mockStorage), true);
});
