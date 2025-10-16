const store = require('../server/store');
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json(store.list());
  }
  if (req.method === 'POST') {
    if (!verify(req)) return res.status(401).json({ error: 'unauthorized' });
    const body = req.body || {};
    if (!body.name) return res.status(400).json({ error: 'name is required' });
    const created = store.create({
      name: body.name,
      breed: body.breed || '',
      species: body.species || '',
      birthday: body.birthday || '',
      avatar: body.avatar || '',
      story: body.story || ''
    });
    return res.status(201).json(created);
  }
  if (req.method === 'PUT') {
    if (!verify(req)) return res.status(401).json({ error: 'unauthorized' });
    const id = Number(new URL(req.url, 'http://localhost').searchParams.get('id'));
    const updated = store.update(id, req.body || {});
    if (!updated) return res.status(404).json({ error: 'not found' });
    return res.status(200).json(updated);
  }
  if (req.method === 'DELETE') {
    if (!verify(req)) return res.status(401).json({ error: 'unauthorized' });
    const id = Number(new URL(req.url, 'http://localhost').searchParams.get('id'));
    const ok = store.remove(id);
    if (!ok) return res.status(404).json({ error: 'not found' });
    return res.status(204).end();
  }
  return res.status(405).json({ error: 'method not allowed' });
};
