import { QuizQuestion, QuizOption } from '../types';

/**
 * Deterministic pseudo-random number generator (Mulberry32).
 * Ensures that for a given user session seed (e.g. userId + competitionId),
 * the exact same shuffled order is produced across re-renders and reloads.
 */
export function createPRNG(seedString: string): () => number {
  let h = 1779033703 ^ seedString.length;
  for (let i = 0; i < seedString.length; i++) {
    h = Math.imul(h ^ seedString.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Shuffles an array using seeded Fisher-Yates algorithm.
 */
export function seededShuffle<T>(arr: readonly T[], random: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Difficulty bucket parsed from a question's category label (e.g. "Easy (Q31–34)"). */
export type Difficulty = 'easy' | 'medium' | 'hard';

export function difficultyOf(q: QuizQuestion): Difficulty {
  const c = (q.category || '').toLowerCase();
  if (c.startsWith('easy')) return 'easy';
  if (c.startsWith('hard')) return 'hard';
  return 'medium';
}

/**
 * Stratified pick: every candidate gets the SAME difficulty mix, so no one
 * draws an all-easy or all-hard paper by luck. Fixed mix set by the organiser
 * for a 30-question paper: Easy 4, Medium 16, Hard 10. Each bucket is shuffled
 * with the seeded PRNG, so which specific questions each candidate gets still
 * differs. Counts are capped by availability in the bank.
 */
export const FIXED_MIX: Record<Difficulty, number> = { easy: 4, medium: 16, hard: 10 };

export function stratifiedCounts(
  bank: QuizQuestion[],
  maxQuestions: number
): Record<Difficulty, number> {
  const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  for (const q of bank) counts[difficultyOf(q)]++;

  const target: Record<Difficulty, number> = {
    easy: Math.min(FIXED_MIX.easy, counts.easy),
    medium: Math.min(FIXED_MIX.medium, counts.medium),
    hard: Math.min(FIXED_MIX.hard, counts.hard),
  };
  let assigned = target.easy + target.medium + target.hard;
  // Safety: if caps ever leave us short of (or over) maxQuestions, fill/trim
  // from buckets with spare questions so the three buckets sum to exactly maxQuestions.
  const order: Difficulty[] = ['medium', 'hard', 'easy'];
  let i = 0;
  while (assigned < maxQuestions) {
    const d = order[i % order.length];
    if (target[d] < counts[d]) {
      target[d]++;
      assigned++;
    }
    i++;
    if (i > 100) break;
  }
  while (assigned > maxQuestions) {
    const d = order[i % order.length];
    if (target[d] > 0) {
      target[d]--;
      assigned--;
    }
    i++;
    if (i > 100) break;
  }
  return target;
}

/**
 * Shuffles questions AND options deterministically per user session.
 * - Every candidate gets a different question set, but the SAME difficulty mix
 *   (stratified: 4 Easy + 16 Medium + 10 Hard for a 30-question paper).
 * - Every question gets a different option sequence.
 * - Preserves option IDs and correctOptionId for 100% accurate scoring.
 */
export function getShuffledQuiz(
  rawQuestions: QuizQuestion[],
  sessionSeed: string,
  maxQuestions?: number
): QuizQuestion[] {
  if (!rawQuestions || rawQuestions.length === 0 || !sessionSeed) {
    return rawQuestions || [];
  }

  const random = createPRNG(sessionSeed);
  const limit =
    typeof maxQuestions === 'number' && maxQuestions > 0
      ? Math.min(maxQuestions, rawQuestions.length)
      : rawQuestions.length;

  // 1. Stratified pick: shuffle within each difficulty bucket, take a fixed
  //    count from each, so every candidate gets the same Easy/Medium/Hard mix.
  const buckets: Record<Difficulty, QuizQuestion[]> = { easy: [], medium: [], hard: [] };
  for (const q of rawQuestions) buckets[difficultyOf(q)].push(q);
  const want = stratifiedCounts(rawQuestions, limit);
  const picked: QuizQuestion[] = [];
  (['easy', 'medium', 'hard'] as Difficulty[]).forEach((d) => {
    const shuffled = seededShuffle(buckets[d], random);
    picked.push(...shuffled.slice(0, want[d]));
  });

  // 2. Shuffle the combined 30 so difficulties are mixed in display order.
  const selectedQuestions = seededShuffle(picked, random);

  // 3. Shuffle options within each question and re-assign visual labels (A, B, C, D)
  return selectedQuestions.map((q, qIndex) => {
    const optRandom = createPRNG(`${sessionSeed}_q_${q.id}`);
    const shuffledOptions = seededShuffle(q.options || [], optRandom).map(
      (opt, optIdx) => ({
        ...opt,
        label: OPTION_LABELS[optIdx] || opt.label,
      })
    );

    return {
      ...q,
      index: qIndex,
      options: shuffledOptions,
    };
  });
}
