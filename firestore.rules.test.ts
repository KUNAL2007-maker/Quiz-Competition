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

test('firestore.rules authorizes designated administrator emails', () => {
  assert.match(rulesContent, /'checkship66@gmail\.com'/);
  assert.match(rulesContent, /'hafizmujawar786@gmail\.com'/);
});

