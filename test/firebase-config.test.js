import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import test from 'node:test';
import {readSigningKey} from '../server/cloud.js';

test('Firebase accepts dashboard and JSON representations of the same signing key', () => {
  const {privateKey} = generateKeyPairSync('rsa', {modulusLength: 2048});
  const pem = privateKey.export({format: 'pem', type: 'pkcs8'});
  const representations = [
    pem,
    JSON.stringify(pem),
    JSON.stringify({private_key: pem}),
    '"private_key": ' + JSON.stringify(pem) + ',',
    pem.replaceAll('\n', '\\\\r\\\\n'),
    pem.replaceAll('\n', ' '),
  ];
  for (const input of representations) assert.equal(readSigningKey(input), pem);
  assert.throws(() => readSigningKey('missing key'), {status: 503});
});
