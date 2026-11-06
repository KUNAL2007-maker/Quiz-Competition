export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const entries = Array.isArray(body.entries) ? body.entries : [];

  if (entries.length === 0) {
    return res.status(200).json({ entries: [] });
  }

  const sorted = [...entries].sort((a, b) => {
    // 1. Primary: Score (Descending)
    const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
    if (scoreDiff !== 0) return scoreDiff;

    // 2. Secondary (Requirement): If score is the same, rank by completion time (Ascending - faster wins)
    const timeA =
      typeof a.completionTimeSeconds === 'number' && a.completionTimeSeconds >= 0
        ? a.completionTimeSeconds
        : 999999999;
    const timeB =
      typeof b.completionTimeSeconds === 'number' && b.completionTimeSeconds >= 0
        ? b.completionTimeSeconds
        : 999999999;
    const timeDiff = timeA - timeB;
    if (timeDiff !== 0) return timeDiff;

    // 3. Tertiary (Requirement): If both are the same, who submitted first must be winner
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 9999999999999;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 9999999999999;
    const dateDiff = dateA - dateB;
    if (dateDiff !== 0) return dateDiff;

    // 4. Fallback: Accuracy (Descending)
    const accDiff = Number(b.accuracyPercent || 0) - Number(a.accuracyPercent || 0);
    return accDiff;
  });

  const ranked = sorted.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));

  return res.status(200).json({ entries: ranked });
}
