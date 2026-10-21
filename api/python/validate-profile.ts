export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const displayName = String(body.displayName || '').trim();
  const username = String(body.username || '').trim();
  const errors: Record<string, string> = {};

  if (!displayName || displayName.length < 2) {
    errors.displayName = 'Full legal name must contain at least 2 characters.';
  } else if (displayName.length > 64) {
    errors.displayName = 'Full legal name must not exceed 64 characters.';
  }

  if (username) {
    if (username.length < 3) {
      errors.username = 'Callsign must be at least 3 characters.';
    } else if (username.length > 24) {
      errors.username = 'Callsign must not exceed 24 characters.';
    } else if (!/^[A-Za-z0-9_-]+$/.test(username)) {
      errors.username = 'Callsign may only contain letters, numbers, underscores, and hyphens.';
    }
  }

  return res.status(200).json({
    isValid: Object.keys(errors).length === 0,
    errors,
  });
}
