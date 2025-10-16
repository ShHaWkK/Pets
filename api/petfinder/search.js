const fetch = global.fetch || ((...args) => import('node-fetch').then(({default: f}) => f(...args)));

let pfCache = { token: '', expiresAt: 0 };

async function getPetfinderToken() {
  if (pfCache.token && pfCache.expiresAt > Date.now()) return pfCache.token;
  const client_id = process.env.PETFINDER_KEY || '';
  const client_secret = process.env.PETFINDER_SECRET || '';
  if (!client_id || !client_secret) throw new Error('Petfinder credentials missing');
  const resp = await fetch('https://api.petfinder.com/v2/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials', client_id, client_secret })
  });
  const json = await resp.json();
  pfCache = { token: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
  return pfCache.token;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const token = await getPetfinderToken();
    const params = new URLSearchParams({
      location: req.query.location || '90210',
      type: req.query.type || 'dog',
      limit: req.query.limit || '20',
      page: req.query.page || '1'
    });
    if (req.query.age) params.set('age', req.query.age);
    const resp = await fetch('https://api.petfinder.com/v2/animals?'+params.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });
    const json = await resp.json();
    return res.status(200).json(json);
  } catch (e) {
    return res.status(500).json({ error: 'petfinder_failed', message: e.message });
  }
};