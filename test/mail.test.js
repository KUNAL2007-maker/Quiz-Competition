import assert from 'node:assert/strict';
import test from 'node:test';
import {sendFirebaseAction} from '../server/mail.js';

test('Firebase sends verification to the token owner and keeps unknown reset addresses private', async t => {
  const originalKey = process.env.VITE_FIREBASE_API_KEY;
  process.env.VITE_FIREBASE_API_KEY = 'test-project-key';
  t.after(() => {
    if (originalKey === undefined) delete process.env.VITE_FIREBASE_API_KEY;
    else process.env.VITE_FIREBASE_API_KEY = originalKey;
  });
  const send = t.mock.method(globalThis, 'fetch', async () => new Response('{}'));
  await sendFirebaseAction('verify', 'ignored@example.invalid', 'test-id-token');
  const [url, options] = send.mock.calls[0].arguments;
  assert.equal(url.pathname, '/v1/accounts:sendOobCode');
  assert.equal(url.searchParams.get('key'), 'test-project-key');
  assert.deepEqual(JSON.parse(options.body), {requestType: 'VERIFY_EMAIL', idToken: 'test-id-token'});
  send.mock.mockImplementation(async () => Response.json({error: {message: 'EMAIL_NOT_FOUND'}}, {status: 400}));
  await sendFirebaseAction('reset', 'participant@example.invalid');
  assert.deepEqual(JSON.parse(send.mock.calls[1].arguments[1].body), {requestType: 'PASSWORD_RESET', email: 'participant@example.invalid'});
  await assert.rejects(sendFirebaseAction('verify', 'participant@example.invalid'), {status: 401});
  send.mock.mockImplementation(async () => Response.json({error: {message: 'INVALID_SENDER'}}, {status: 400}));
  await assert.rejects(sendFirebaseAction('reset', 'participant@example.invalid'), {status: 503});
});
