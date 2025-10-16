const store = require('../../../server/store');
const crypto = require('crypto');

function verify(req) {
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
  const hdr = req.headers['authorization'] || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (!token) return false;
  const [h,p,s] = token.split('.');
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(h+'.'+p).digest('base64url');
  return expected === s;
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const id = Number(req.query.id || req.query.slug || req.url.split('/').slice(-2)[0]);
  if (!id) return res.status(400).json({ error: 'id required' });

  if (req.method === 'GET') {
    const list = store.listMoments(id);
    if (!list) return res.status(404).json({ error: 'not found' });
    return res.status(200).json(list);
  }

  if (req.method === 'POST') {
    if (!verify(req)) return res.status(401).json({ error: 'unauthorized' });
    const created = store.addMoment(id, req.body || {});
    if (!created) return res.status(404).json({ error: 'not found' });
    return res.status(201).json(created);
  }

  return res.status(405).json({ error: 'method not allowed' });
};