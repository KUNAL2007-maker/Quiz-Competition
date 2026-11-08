import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import defaultConfig from '../firebase-applet-config.json';
import * as fs from 'fs';

async function main() {
  const app = initializeApp(defaultConfig);
  const db = getFirestore(app, defaultConfig.firestoreDatabaseId);

  const q = query(collection(db, 'leaderboard'), where('score', '>=', 0));
  const snap = await getDocs(q);
  const entries = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  console.log(`Total leaderboard entries: ${entries.length}`);

  const zeroScores = entries.filter((e: any) => e.score === 0);
  const nonZeroScores = entries.filter((e: any) => e.score > 0);

  console.log(`Zero scores: ${zeroScores.length}`);
  console.log(`Non-zero scores: ${nonZeroScores.length}`);

  fs.writeFileSync('scripts/leaderboard_dump.json', JSON.stringify(entries, null, 2));
  console.log('Saved dump to scripts/leaderboard_dump.json');
}

main().catch(console.error);
