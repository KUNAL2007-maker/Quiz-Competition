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
    const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
    if (scoreDiff !== 0) return scoreDiff;

    const accDiff = Number(b.accuracyPercent || 0) - Number(a.accuracyPercent || 0);
    if (accDiff !== 0) return accDiff;

    const timeA =
      typeof a.completionTimeSeconds === 'number' && a.completionTimeSeconds >= 0
        ? a.completionTimeSeconds
        : 999999999;
    const timeB =
      typeof b.completionTimeSeconds === 'number' && b.completionTimeSeconds >= 0
        ? b.completionTimeSeconds
        : 999999999;
    return timeA - timeB;
  });

  const ranked = sorted.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));

  return res.status(200).json({ entries: ranked });
}
