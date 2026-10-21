export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const questions = Array.isArray(body.questions) ? body.questions : [];
  const selectedAnswers =
    typeof body.selectedAnswers === 'object' && body.selectedAnswers ? body.selectedAnswers : {};
  const markedForReview =
    typeof body.markedForReview === 'object' && body.markedForReview ? body.markedForReview : {};
  const timeTakenSeconds =
    typeof body.timeTakenSeconds === 'number' ? body.timeTakenSeconds : null;

  const totalQuestions = questions.length;
  if (totalQuestions === 0) {
    return res.status(200).json({
      totalQuestions: 0,
      answeredCount: 0,
      unansweredCount: 0,
      markedForReviewCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      finalScore: 0,
      maxScore: 0,
      accuracyPercent: 0,
      timeTakenSeconds,
      topicBreakdown: [],
    });
  }

  let answeredCount = 0;
  let reviewCount = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let finalScore = 0;
  let maxScore = 0;
  const topicTotals: Record<string, [number, number]> = {};

  for (const q of questions) {
    const qid = String(q.id || '');
    const points = Number(q.points || 100);
    const category = String(q.category || 'General Security');
    const correctOpt = q.correctOptionId;

    maxScore += points;
    if (!topicTotals[category]) {
      topicTotals[category] = [0, 0];
    }
    topicTotals[category][1] += points;

    if (markedForReview[qid]) {
      reviewCount += 1;
    }

    const chosen = selectedAnswers[qid];
    if (chosen !== undefined && chosen !== null && String(chosen).trim() !== '') {
      answeredCount += 1;
      if (correctOpt !== undefined && correctOpt !== null) {
        if (String(chosen) === String(correctOpt)) {
          correctCount += 1;
          finalScore += points;
          topicTotals[category][0] += points;
        } else {
          incorrectCount += 1;
        }
      }
    }
  }

  const unansweredCount = Math.max(0, totalQuestions - answeredCount);
  const gradedTotal = correctCount + incorrectCount;
  const accuracyPercent =
    gradedTotal > 0
      ? Math.round((correctCount / gradedTotal) * 100)
      : Math.round((answeredCount / totalQuestions) * 100);

  const topicBreakdown = Object.entries(topicTotals).map(([topic, [earned, possible]]) => ({
    topic,
    scorePercent: possible > 0 ? Math.round((earned / possible) * 100) : 0,
  }));

  return res.status(200).json({
    totalQuestions,
    answeredCount,
    unansweredCount,
    markedForReviewCount: reviewCount,
    correctCount,
    incorrectCount,
    finalScore,
    maxScore,
    accuracyPercent,
    timeTakenSeconds,
    topicBreakdown,
  });
}
