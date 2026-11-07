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

/**
 * Shuffles questions AND options deterministically per user session.
 * - Every candidate gets a different question sequence.
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

  // 1. Shuffle question sequence, then take a random subset (e.g. 30 of a 50-question bank).
  // The seed is per candidate, so each candidate gets a different subset, stable across reloads.
  const shuffledQuestions = seededShuffle(rawQuestions, random);
  const selectedQuestions =
    typeof maxQuestions === 'number' && maxQuestions > 0
      ? shuffledQuestions.slice(0, Math.min(maxQuestions, shuffledQuestions.length))
      : shuffledQuestions;

  // 2. Shuffle options within each question and re-assign visual labels (A, B, C, D)
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
