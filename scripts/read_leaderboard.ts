import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import defaultConfig from '../firebase-applet-config.json';

async function main() {
  const app = initializeApp(defaultConfig);
  const db = getFirestore(app, defaultConfig.firestoreDatabaseId);

  console.log('Fetching leaderboard...');
  try {
    const q = query(collection(db, 'leaderboard'), where('score', '>=', 0));
    const snap = await getDocs(q);
    console.log(`Found ${snap.docs.length} entries in leaderboard:`);
    snap.docs.forEach((doc) => {
      console.log('ID:', doc.id);
      console.log('DATA:', JSON.stringify(doc.data(), null, 2));
    });

    console.log('\nFetching competitions...');
    const compSnap = await getDocs(collection(db, 'competitions'));
    console.log(`Found ${compSnap.docs.length} competitions:`);
    compSnap.docs.forEach((doc) => {
      console.log('COMP ID:', doc.id, doc.data().title);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

main().catch(console.error);
