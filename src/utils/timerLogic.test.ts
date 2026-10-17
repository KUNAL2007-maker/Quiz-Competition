import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCountdown,
  formatPad,
  formatDurationSeconds,
  calculateQuizProgress,
  validateOperatorProfileInput,
} from './timerLogic.ts';

test('calculateCountdown handles null, empty, and invalid timestamps gracefully without inventing a timer', () => {
  const resNull = calculateCountdown(null, 1000000);
  assert.equal(resNull.isValid, false);
  assert.equal(resNull.isExpired, false);
  assert.equal(resNull.totalMs, 0);

  const resInvalid = calculateCountdown('not-a-timestamp', 1000000);
  assert.equal(resInvalid.isValid, false);
  assert.equal(resInvalid.totalMs, 0);
});

test('calculateCountdown computes accurate days, hours, minutes, seconds without drift', () => {
  const now = 1700000000000;
  // 1 day (86400s) + 2 hours (7200s) + 3 minutes (180s) + 45 seconds = 93825s
  const target = now + 93825 * 1000;
  const result = calculateCountdown(target, now);

  assert.equal(result.isValid, true);
  assert.equal(result.isExpired, false);
  assert.equal(result.days, 1);
  assert.equal(result.hours, 2);
  assert.equal(result.minutes, 3);
  assert.equal(result.seconds, 45);
});

test('calculateCountdown detects expiration when target <= now', () => {
  const now = 1700000000000;
  const target = now - 5000;
  const result = calculateCountdown(target, now);

  assert.equal(result.isValid, true);
  assert.equal(result.isExpired, true);
  assert.equal(result.totalMs, 0);
  assert.equal(result.seconds, 0);
  assert.equal(result.progressPercent, 100);
});

test('calculateQuizProgress computes answered, unanswered, and review states accurately', () => {
  const emptyProgress = calculateQuizProgress([], {}, {});
  assert.equal(emptyProgress.total, 0);
  assert.equal(emptyProgress.completionPercent, 0);

  const qIds = ['q1', 'q2', 'q3', 'q4'];
  const answers = { q1: 'optA', q3: 'optC' };
  const review = { q2: true, q3: true };
  const progress = calculateQuizProgress(qIds, answers, review);

  assert.equal(progress.total, 4);
  assert.equal(progress.answered, 2);
  assert.equal(progress.unanswered, 2);
  assert.equal(progress.markedForReview, 2);
  assert.equal(progress.completionPercent, 50);
});

test('validateOperatorProfileInput enforces callsign and length rules', () => {
  const valid = validateOperatorProfileInput({
    displayName: 'Cipher Zero',
    username: 'cipher_0x',
    biography: 'Digital forensics & reverse engineering specialist.',
  });
  assert.equal(valid.isValid, true);

  const invalidHandle = validateOperatorProfileInput({
    displayName: 'A',
    username: 'bad handle!',
    biography: 'Valid bio',
  });
  assert.equal(invalidHandle.isValid, false);
  assert.ok(invalidHandle.errors.displayName);
  assert.ok(invalidHandle.errors.username);
});

test('formatPad and formatDurationSeconds format tabular strings cleanly', () => {
  assert.equal(formatPad(5), '05');
  assert.equal(formatPad(14), '14');
  assert.equal(formatDurationSeconds(null), '—');
  assert.equal(formatDurationSeconds(125), '02:05');
  assert.equal(formatDurationSeconds(3665), '01:01:05');
});
