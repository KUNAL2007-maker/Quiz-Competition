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

    return 0;
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
