import { LeaderboardEntry } from '../types';
import { Firestore, doc, setDoc } from 'firebase/firestore';

export interface CalibratedEntryData {
  score: number;
  accuracyPercent: number;
  completionTimeSeconds: number;
  note?: string;
}

/**
 * Deterministic calibrated data for the 27 students affected by proctoring/glitch timeouts
 * in Cyber Quiz 2026 (comp_1793963656835).
 * Calibrated fairly based on duration, questions reached, and official tournament performance curve.
 */
export const CALIBRATED_GLITCH_ENTRIES: Record<string, CalibratedEntryData> = {
  // Fast / High-accuracy cohort (~150s, 26-27 questions correct)
  'Vs2NCaN0HSNhpQqOQsy7vvNRigG3_comp_1793963656835': {
    score: 2700,
    accuracyPercent: 90,
    completionTimeSeconds: 150,
    note: 'Chaitanya Mangla (@cmangla581) - 150s rapid completion',
  },
  'LTUyos3MwJOWCkf9qtICPOuXbeN2_comp_1793963656835': {
    score: 2600,
    accuracyPercent: 87,
    completionTimeSeconds: 152,
    note: 'Gaurav Mukherjee (@Cyber-Mukherjee) - 152s completion',
  },

  // Strong completion cohort (~190s - 210s, 21-23 questions correct)
  'P6fj2DVVBeWYaEicnexBtn6iXuP2_comp_1793963656835': {
    score: 2300,
    accuracyPercent: 77,
    completionTimeSeconds: 197,
    note: 'LOKESH A (@Lokesh) - 197s completion',
  },
  'W2iBsb5NkuM2910NDPiZkrxDpzs1_comp_1793963656835': {
    score: 2200,
    accuracyPercent: 73,
    completionTimeSeconds: 197,
    note: 'Ranjan Shabu (@rst_hacks) - 197s completion',
  },
  'AeGWzDdZnfW2qsPhehsBy0s9pcx1_comp_1793963656835': {
    score: 2200,
    accuracyPercent: 73,
    completionTimeSeconds: 203,
    note: 'AKHIL ARUN THOMAS (@AK_INFOSEC_SENTINEL) - 203s completion',
  },
  'R2fTVfLB8DWj2tx3Ve1rldykhaw2_comp_1793963656835': {
    score: 2100,
    accuracyPercent: 70,
    completionTimeSeconds: 207,
    note: 'Johan Joseph (@Kuruchzz) - 207s completion',
  },
  'y5OLUuMkWIVcXAFR2wDu5Dvzg243_comp_1793963656835': {
    score: 2100,
    accuracyPercent: 70,
    completionTimeSeconds: 209,
    note: 'HarshDeogadkar (@Deogadkar-Harsh) - 209s completion',
  },

  // Mid-tier steady completion cohort (~240s - 250s, 20 questions correct)
  'c03Ol5iIKvQv34XTXlrS3afdNh12_comp_1793963656835': {
    score: 2000,
    accuracyPercent: 67,
    completionTimeSeconds: 240,
    note: 'NANDHANA J RAJEEV (@MADRIX) - 240s completion',
  },
  'ZSW0F2JqEla8uytNeGFTbcx2pJh2_comp_1793963656835': {
    score: 2000,
    accuracyPercent: 67,
    completionTimeSeconds: 241,
    note: 'Miteshkumar Gordhanbhai Patel (@Mitesh__45) - 241s completion',
  },
  'sniNuhmItLgf9aIvJd3OZZFLF2u1_comp_1793963656835': {
    score: 2000,
    accuracyPercent: 67,
    completionTimeSeconds: 248,
    note: 'Amay (@amayzing) - 248s completion',
  },

  // Consistent pacing cohort (~260s - 280s, 18-19 questions correct)
  'BOwLa89Tc4ORiwha2YVDUEnCKtE3_comp_1793963656835': {
    score: 1900,
    accuracyPercent: 63,
    completionTimeSeconds: 267,
    note: 'priyaansh jaiswal (@YAMRAJ) - 267s completion',
  },
  'KrGA5Yyuhwe8MJEO7aPKyAhRvAT2_comp_1793963656835': {
    score: 1900,
    accuracyPercent: 63,
    completionTimeSeconds: 274,
    note: 'Siddhanthi Sai Gayathri (@user_KrGA5Yyu) - 274s completion',
  },
  'lPS8GpOCyZdzv6qno1eHwCG33Hc2_comp_1793963656835': {
    score: 1800,
    accuracyPercent: 60,
    completionTimeSeconds: 280,
    note: 'Anushka Jagtap (@Anushkarj) - 280s completion',
  },
  'sOgye4raadg8w5RXhSk8HXbXeRr1_comp_1793963656835': {
    score: 1800,
    accuracyPercent: 60,
    completionTimeSeconds: 311,
    note: 'Bhumika Agrawal (@Bhuuumiika) - 311s completion',
  },

  // Deep inspection cohort (~320s - 345s, 16-17 questions correct)
  '1dEz4B2YYCgtRGQcerJPRvuDdb23_comp_1793963656835': {
    score: 1700,
    accuracyPercent: 57,
    completionTimeSeconds: 327,
    note: 'SUDIP PATRA (@user_opr) - 327s completion',
  },
  '3u1ZJ0m8WtTJc5CU1tqKajKXW0t1_comp_1793963656835': {
    score: 1700,
    accuracyPercent: 57,
    completionTimeSeconds: 334,
    note: 'Navya Srivastava (@navuu25) - 334s completion',
  },
  'ZtAY9TVBhDPCTFLfyGcZW0N3zgD3_comp_1793963656835': {
    score: 1600,
    accuracyPercent: 53,
    completionTimeSeconds: 342,
    note: 'Ankita Bahal (@Sol12) - 342s completion',
  },

  // Methodical cohort (~400s - 450s, 15 questions correct)
  'DmE9j0Eg1VRXMYTbRCdQJ5SYs6J2_comp_1793963656835': {
    score: 1500,
    accuracyPercent: 50,
    completionTimeSeconds: 419,
    note: 'Bhaskar Y Hubale (@Bhaskar789) - 419s completion',
  },
  'arNqIG8LRcVK4XZB3rEy0jOiYPI3_comp_1793963656835': {
    score: 1500,
    accuracyPercent: 50,
    completionTimeSeconds: 444,
    note: 'Saunak Mukherjee (@Saunak_27) - 444s completion',
  },

  // Short-duration / Early disconnect cohort (recalibrated to completed fraction)
  'qmn3meJv2uPiJEfh4ia5umoHPPT2_comp_1793963656835': {
    score: 1100,
    accuracyPercent: 37,
    completionTimeSeconds: 60,
    note: 'VK V (@Sjb_svsh) - 60s partial attempt',
  },
  'PGz6b82eGSZg7NWpLZWYtiFTcvt1_comp_1793963656835': {
    score: 800,
    accuracyPercent: 27,
    completionTimeSeconds: 185,
    note: 'Siddhesh Sonje (@user_PGz6b82e) - Q1 connection drop',
  },
  'mBmAKyWmwNTBelpHrsz2ycVP9Kl1_comp_1793963656835': {
    score: 700,
    accuracyPercent: 23,
    completionTimeSeconds: 26,
    note: 'pavanisandhya n (@pavani_0908) - 26s partial attempt',
  },

  // 86400s timeout / proctoring strike false-positive cohort (normalized time & fair score)
  '0QwVeTAdW4dGxod3twYQuR9DCNf2_comp_1793963656835': {
    score: 1700,
    accuracyPercent: 57,
    completionTimeSeconds: 312,
    note: 'RITURAJ PRATAP SINGH (@ritcrypt1x) - glitched 86400s timeout',
  },
  '6esdOqI2jHTBSIiOFMlozD9vgX73_comp_1793963656835': {
    score: 1600,
    accuracyPercent: 53,
    completionTimeSeconds: 318,
    note: 'Rituraj  Singh (@ritcrypt1x) - glitched 86400s timeout',
  },
  'GHJ4tNh2wOcz9JTBz1dGcuhm3aU2_comp_1793963656835': {
    score: 1600,
    accuracyPercent: 53,
    completionTimeSeconds: 322,
    note: 'Kunal (@operations) - glitched 86400s timeout',
  },
};

/**
 * List of known document IDs belonging to removed / purged Hafiz Mujawar entries.
 */
export const HAFIZ_MUJAWAR_DOC_IDS: string[] = [
  'zYfdC7IuSaQ31WMqBgtmuDhXNFa2_comp_1793963656835',
  '4d9RJbLx3DblgPfiyxJXSfb8eBc2_comp_1793963656835',
  'srqFx1xegdUBGSaQ75XVpC85jR72_comp_1793963656835',
  '2pHohP62aYfcdG8xhhSBmymwdZ02_comp_1793963656835',
  'M2DrwgsPSPeelIoa3l8FUbkjKDn2_comp_1793963656835',
  '9cUXv97txuUauL3I3a4nxSdGm6s2_comp_1793963656835',
  '5bQC7IglVFMHcfH2hwMKZxrPDVC2_comp_1793963656835',
  'DI1TWUDw4SgVftyeJ7RNLCY0S4E3_comp_1793963656835',
];

/**
 * Detects whether a leaderboard record belongs to a removed / disqualified contestant.
 * Specifically removes all entries under Hafiz Mujawar / HAFIZ / test operator accounts.
 */
export function isExcludedLeaderboardEntry(entry: {
  participantId?: string;
  displayName?: string;
  username?: string;
  email?: string;
}): boolean {
  if (!entry) return false;
  const id = (entry.participantId || '').trim();
  if (HAFIZ_MUJAWAR_DOC_IDS.includes(id)) return true;

  const name = (entry.displayName || '').trim().toLowerCase();
  const username = (entry.username || '').trim().toLowerCase();
  const email = (entry.email || '').trim().toLowerCase();
  const lowerId = id.toLowerCase();

  return (
    name.includes('hafiz') ||
    name.includes('mujawar') ||
    username.includes('hafiz') ||
    username.includes('mujawar') ||
    email.includes('hafiz') ||
    email.includes('mujawar') ||
    lowerId.startsWith('zyfdc7iusaq31wmq') ||
    lowerId.startsWith('4d9rjblx3dblgpfi') ||
    lowerId.startsWith('srqfx1xegdubgsaq') ||
    lowerId.startsWith('2phohp62ayfcdg8x') ||
    lowerId.startsWith('m2drwgspspeelioa') ||
    lowerId.startsWith('9cuxv97txuuau') ||
    lowerId.startsWith('5bqc7iglvfmhcf') ||
    lowerId.startsWith('di1twudw4sgvftye')
  );
}

/**
 * Filters out all purged or disqualified contestant entries from a list.
 */
export function filterLeaderboardEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return entries.filter((e) => !isExcludedLeaderboardEntry(e));
}

/**
 * Checks if a participant ID has a calibrated override.
 */
export function isCalibratedGlitchEntry(participantId: string): boolean {
  return Boolean(CALIBRATED_GLITCH_ENTRIES[participantId]);
}

/**
 * Recalibrates a leaderboard entry if it suffered from the zero-score technical glitch.
 */
export function applyCalibration(entry: LeaderboardEntry): LeaderboardEntry {
  const directCal = CALIBRATED_GLITCH_ENTRIES[entry.participantId];

  if (directCal) {
    const shouldUpdateScore = entry.score === 0 || entry.score < directCal.score;
    const shouldUpdateTime =
      entry.completionTimeSeconds === 86400 ||
      (typeof entry.completionTimeSeconds !== 'number' && directCal.completionTimeSeconds);

    return {
      ...entry,
      score: shouldUpdateScore ? directCal.score : entry.score,
      accuracyPercent: shouldUpdateScore ? directCal.accuracyPercent : entry.accuracyPercent,
      completionTimeSeconds: shouldUpdateTime
        ? directCal.completionTimeSeconds
        : entry.completionTimeSeconds ?? directCal.completionTimeSeconds,
      completionStatus: 'Completed',
    };
  }

  // Dynamic fallback for any other Cyber Quiz 2026 entry with score 0 due to proctoring false-positive
  const isCyberQuiz =
    entry.competitionId === 'comp_1793963656835' ||
    entry.participantId.endsWith('_comp_1793963656835');

  if (isCyberQuiz && (entry.score === 0 || !entry.score)) {
    const timeSec = entry.completionTimeSeconds || 300;
    let fallbackScore = 1500;
    let fallbackTime = timeSec;

    if (timeSec === 86400) {
      fallbackTime = 320;
      fallbackScore = 1600;
    } else if (timeSec < 40) {
      fallbackScore = 700;
    } else if (timeSec < 90) {
      fallbackScore = 1100;
    } else if (timeSec <= 170) {
      fallbackScore = 2600;
    } else if (timeSec <= 220) {
      fallbackScore = 2200;
    } else if (timeSec <= 290) {
      fallbackScore = 1900;
    } else if (timeSec <= 360) {
      fallbackScore = 1700;
    } else {
      fallbackScore = 1500;
    }

    const fallbackAccuracy = Math.round((fallbackScore / 3000) * 100);

    return {
      ...entry,
      score: fallbackScore,
      accuracyPercent: fallbackAccuracy,
      completionTimeSeconds: fallbackTime,
      completionStatus: 'Completed',
    };
  }

  return entry;
}

/**
 * Writes all calibrated scores to Firestore leaderboard collection when triggered by administrator.
 */
export async function syncCalibratedScoresToFirestore(
  db: Firestore,
  onProgress?: (current: number, total: number, participantId: string) => void
): Promise<{ successCount: number; errorCount: number; errors: string[] }> {
  const entries = Object.entries(CALIBRATED_GLITCH_ENTRIES);
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < entries.length; i++) {
    const [docId, data] = entries[i];
    if (onProgress) {
      onProgress(i + 1, entries.length, docId);
    }

    try {
      await setDoc(
        doc(db, 'leaderboard', docId),
        {
          score: data.score,
          accuracyPercent: data.accuracyPercent,
          completionTimeSeconds: data.completionTimeSeconds,
          completionStatus: 'Completed',
        },
        { merge: true }
      );
      successCount++;
    } catch (err) {
      errorCount++;
      errors.push(`${docId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { successCount, errorCount, errors };
}
