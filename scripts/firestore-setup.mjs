// Run once per Firebase environment. Routine application builds do not require
// permission to publish rules or create indexes.
import {readFile} from 'node:fs/promises';
import {token, project} from '../server/cloud.js';

const expected = process.argv[2];
const apply = process.argv.includes('--apply');
if (!expected || project() !== expected) throw new Error('Supply the configured Firebase project ID.');
const root = 'projects/' + expected;
const headers = {Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json'};
const rulesApi = 'https://firebaserules.googleapis.com/v1/';
const dbApi = 'https://firestore.googleapis.com/v1/' + root + '/databases/(default)';
const release = root + '/releases/cloud.firestore';
async function request(url, method = 'GET', data) {
  const response = await fetch(url, {
    method, headers, signal: AbortSignal.timeout(15000),
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  if (!response.ok) throw new Error(method + ' returned HTTP ' + response.status);
  return response.json();
}
async function checkRules() {
  const live = await request(rulesApi + release);
  const {source} = await request(rulesApi + live.rulesetName);
  const content = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  const normalize = text => text.replace(/\/\/[^\n]*/g, '').replace(/\s+/g, '');
  if (source.files.length === 1 && normalize(source.files[0].content) === normalize(content)) return 'verified';
  if (!apply) return 'differs from repository';
  const ruleset = await request(rulesApi + root + '/rulesets', 'POST', {
    source: {files: [{name: 'firestore.rules', content}]},
  });
  await request(rulesApi + release, 'PATCH', {
    release: {name: release, rulesetName: ruleset.name}, updateMask: 'rulesetName',
  });
  const published = await request(rulesApi + release);
  if (published.rulesetName !== ruleset.name) throw Error('release changed during publication');
  return 'published and verified';
}
async function checkIndex() {
  const file = await readFile(new URL('../firestore.indexes.json', import.meta.url), 'utf8');
  const [index] = JSON.parse(file).indexes;
  const endpoint = dbApi + '/collectionGroups/' + index.collectionGroup + '/indexes';
  const fields = value => JSON.stringify(value.filter(f => f.fieldPath !== '__name__').map(f => [f.fieldPath, f.order]));
  let page = '';
  do {
    const url = new URL(endpoint);
    if (page) url.searchParams.set('pageToken', page);
    const list = await request(url);
    const match = (list.indexes || []).find(i => i.queryScope === index.queryScope && fields(i.fields) === fields(index.fields));
    if (match) return match.state;
    page = list.nextPageToken;
  } while (page);
  if (!apply) return 'missing';
  await request(endpoint, 'POST', {queryScope: index.queryScope, fields: index.fields});
  return 'creation requested';
}
for (const [label, check] of [['rules', checkRules], ['leaderboard index', checkIndex]]) {
  try {
    console.log('Firestore ' + label + ': ' + await check());
  } catch (error) {
    console.error('Firestore ' + label + ': ' + error.message);
    process.exitCode = 1;
  }
}
