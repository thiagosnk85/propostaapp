module.exports = async (req, res) => {
  const allowedMethods = ['POST'];
  if (!allowedMethods.includes(req.method)) {
    res.setHeader('Allow', allowedMethods.join(', '));
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const {
    OMIE_APP_KEY,
    OMIE_APP_SECRET,
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
  } = process.env;

  if (!OMIE_APP_KEY || !OMIE_APP_SECRET || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Missing server environment variables.' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token.' });
  }

  try {
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!authRes.ok) {
      return res.status(401).json({ error: 'Invalid user session.' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { endpoint, call, param } = body;

    if (!endpoint || !call || !param) {
      return res.status(400).json({ error: 'Missing endpoint, call, or param.' });
    }

    const omieRes = await fetch(`https://app.omie.com.br/api/v1/${endpoint}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        call,
        app_key: OMIE_APP_KEY,
        app_secret: OMIE_APP_SECRET,
        param: [param],
      }),
    });

    const omiePayload = await omieRes.json().catch(() => null);
    if (!omieRes.ok) {
      return res.status(502).json({
        error: omiePayload?.faultstring || `Omie HTTP ${omieRes.status}`,
      });
    }

    return res.status(200).json(omiePayload || {});
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unexpected Omie proxy failure.' });
  }
};
