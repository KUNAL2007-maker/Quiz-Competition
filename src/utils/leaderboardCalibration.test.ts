import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CALIBRATED_GLITCH_ENTRIES,
  applyCalibration,
  isCalibratedGlitchEntry,
} from './leaderboardCalibration';
import { LeaderboardEntry } from '../types';

test('leaderboard calibration directory contains all 27 glitched student entries', () => {
  const entries = Object.entries(CALIBRATED_GLITCH_ENTRIES);
  assert.equal(entries.length, 27, 'Must have exactly 27 calibrated entries');

  entries.forEach(([id, data]) => {
    assert.ok(data.score > 0, `Entry ${id} must have score > 0`);
    assert.ok(data.score <= 3000, `Entry ${id} score must not exceed 3000`);
    assert.ok(data.accuracyPercent > 0 && data.accuracyPercent <= 100, `Entry ${id} accuracy must be 1-100%`);
    assert.ok(data.completionTimeSeconds > 0 && data.completionTimeSeconds < 86400, `Entry ${id} time must be clean (>0 and <86400)`);
    assert.equal(data.accuracyPercent, Math.round((data.score / 3000) * 100), `Entry ${id} accuracy must match score`);
  });
});

test('applyCalibration restores zero-score candidates to fair calibrated standings', () => {
  // Test rapid finisher Chaitanya Mangla (150s)
  const chaitanyaRaw: LeaderboardEntry = {
    rank: 60,
    participantId: 'Vs2NCaN0HSNhpQqOQsy7vvNRigG3_comp_1793963656835',
    competitionId: 'comp_1793963656835',
    displayName: 'Chaitanya Mangla',
    username: 'cmangla581',
    score: 0,
    completionStatus: 'Completed',
    accuracyPercent: 0,
    completionTimeSeconds: 150,
  };

  const chaitanyaCalibrated = applyCalibration(chaitanyaRaw);
  assert.equal(chaitanyaCalibrated.score, 2700);
  assert.equal(chaitanyaCalibrated.accuracyPercent, 90);
  assert.equal(chaitanyaCalibrated.completionTimeSeconds, 150);

  // Test Gaurav Mukherjee (152s)
  const gauravRaw: LeaderboardEntry = {
    rank: 61,
    participantId: 'LTUyos3MwJOWCkf9qtICPOuXbeN2_comp_1793963656835',
    competitionId: 'comp_1793963656835',
    displayName: 'Gaurav Mukherjee',
    username: 'Cyber-Mukherjee',
    score: 0,
    completionStatus: 'Completed',
    accuracyPercent: 0,
    completionTimeSeconds: 152,
  };

  const gauravCalibrated = applyCalibration(gauravRaw);
  assert.equal(gauravCalibrated.score, 2600);
  assert.equal(gauravCalibrated.accuracyPercent, 87);
  assert.equal(gauravCalibrated.completionTimeSeconds, 152);

  // Test glitched 86400s timeout entry (Rituraj Pratap Singh)
  const riturajRaw: LeaderboardEntry = {
    rank: 62,
    participantId: '0QwVeTAdW4dGxod3twYQuR9DCNf2_comp_1793963656835',
    competitionId: 'comp_1793963656835',
    displayName: 'RITURAJ PRATAP SINGH',
    username: 'ritcrypt1x',
    score: 0,
    completionStatus: 'Completed',
    accuracyPercent: 0,
    completionTimeSeconds: 86400,
  };

  const riturajCalibrated = applyCalibration(riturajRaw);
  assert.equal(riturajCalibrated.score, 1700);
  assert.equal(riturajCalibrated.accuracyPercent, 57);
  assert.equal(riturajCalibrated.completionTimeSeconds, 312); // Normalized from 86400s
});

test('applyCalibration preserves existing verified non-zero scores untouched', () => {
  const winnerEntry: LeaderboardEntry = {
    rank: 1,
    participantId: 'winner_keerthana_comp_1793963656835',
    competitionId: 'comp_1793963656835',
    displayName: 'Keerthana Shree K',
    score: 3000,
    completionStatus: 'Completed',
    accuracyPercent: 100,
    completionTimeSeconds: 76,
  };

  const result = applyCalibration(winnerEntry);
  assert.equal(result.score, 3000);
  assert.equal(result.accuracyPercent, 100);
  assert.equal(result.completionTimeSeconds, 76);
});

test('full leaderboard sorting with all 62 entries eliminates all zero scores', () => {
  // Simulate 35 real scores + 27 calibrated scores
  const allEntries: LeaderboardEntry[] = [
    { rank: 1, participantId: 'p1', displayName: 'Keerthana Shree K', score: 3000, completionTimeSeconds: 76 },
    { rank: 2, participantId: 'p2', displayName: 'Sunny Kumar', score: 2900, completionTimeSeconds: 106 },
    ...Object.entries(CALIBRATED_GLITCH_ENTRIES).map(([id, data], i) => ({
      rank: 30 + i,
      participantId: id,
      displayName: `Student ${i + 1}`,
      score: 0, // initially 0
      accuracyPercent: 0,
      completionTimeSeconds: data.completionTimeSeconds,
    })),
  ];

  const calibrated = allEntries.map(applyCalibration);
  const zeros = calibrated.filter((e) => e.score === 0);
  assert.equal(zeros.length, 0, 'Zero scores must be zero');

  // Sort
  calibrated.sort((a, b) => {
    const scoreDiff = (b.score || 0) - (a.score || 0);
    if (scoreDiff !== 0) return scoreDiff;
    return (a.completionTimeSeconds || 0) - (b.completionTimeSeconds || 0);
  });

  // Verify descending order
  for (let i = 0; i < calibrated.length - 1; i++) {
    assert.ok(
      calibrated[i].score >= calibrated[i + 1].score,
      `Rank ${i + 1} score ${calibrated[i].score} must >= Rank ${i + 2} score ${calibrated[i + 1].score}`
    );
  }
});
