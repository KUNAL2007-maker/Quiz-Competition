import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import defaultConfig from '../firebase-applet-config.json';
import * as fs from 'fs';

async function main() {
  const app = initializeApp(defaultConfig);
  const db = getFirestore(app, defaultConfig.firestoreDatabaseId);

  console.log('Testing results collection read...');
  try {
    const snap = await getDocs(collection(db, 'results'));
    console.log(`Found ${snap.docs.length} entries in results`);
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    fs.writeFileSync('scripts/results_dump.json', JSON.stringify(results, null, 2));
  } catch (err: any) {
    console.error('Error reading results collection:', err.message);
  }
}

main().catch(console.error);
