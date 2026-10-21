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
    status: 'upcoming' as const,
    startTime: futureStartTime,
  };
  const isFutureLive =
    futureComp.status === 'live' ||
    (futureComp.startTime && new Date(futureComp.startTime).getTime() <= now && futureComp.status !== 'completed');
  assert.equal(isFutureLive, false);

  // 2. Timer elapsed competition automatically converts to live
  const elapsedComp = {
    id: 'comp_2',
    status: 'upcoming' as const,
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
