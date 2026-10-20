import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

test('firestore.rules enforces rules_version 2 and global default-deny catch-all', () => {
  assert.match(rulesContent, /rules_version\s*=\s*'2';/);
  assert.match(rulesContent, /match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/);
});

test('firestore.rules enforces Dirty Dozen guards (email_verified, hasOnly, isValidId, request.time, immutable ownerId)', () => {
  assert.match(rulesContent, /request\.auth\.token\.email_verified\s*==\s*true/);
  assert.match(rulesContent, /isValidId\(/);
  assert.match(rulesContent, /affectedKeys\(\)\.hasOnly\(/);
  assert.match(rulesContent, /incoming\(\)\.createdAt\s*==\s*request\.time/);
  assert.match(rulesContent, /incoming\(\)\.ownerId\s*==\s*existing\(\)\.ownerId/);
  assert.match(rulesContent, /exists\(\/databases\/\$\(database\)\/documents\/competitions\/\$\(incoming\(\)\.competitionId\)\)/);
});

test('firestore.rules authorizes designated administrator emails with case-insensitivity', () => {
  assert.match(rulesContent, /'checkship66@gmail\.com'/);
  assert.match(rulesContent, /'hafizmujawar786@gmail\.com'/);
  assert.match(rulesContent, /\(\?i\)/);
});

test('firestore.rules allows robust numeric types for JavaScript number serialization', () => {
  assert.match(rulesContent, /data\.durationMinutes\s+is\s+number/);
  assert.match(rulesContent, /data\.perQuestionTimerSeconds\s+is\s+number/);
  assert.match(rulesContent, /data\.timeLimitSeconds\s+is\s+number/);
});

test('firestore.rules provides diagnostic collection for admin verification', () => {
  assert.match(rulesContent, /match\s+\/_diagnostics\/\{docId\}/);
  assert.match(rulesContent, /allow\s+read,\s*write:\s*if\s+isAdmin\(\);/);
});

test('firestore.rules protects winner contacts and prevents PII leakage on public leaderboard', () => {
  assert.match(rulesContent, /match\s+\/winner_contacts\/\{entryId\}/);
  assert.match(rulesContent, /allow\s+get,\s*list:\s*if\s+isAdmin\(\);/);
});
