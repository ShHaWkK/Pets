const crypto = require('crypto');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
  const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';

  function hashPassword(pw) {
    return crypto.createHash('sha256').update(pw).digest('hex');
  }

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const ok = email === ADMIN_EMAIL && (ADMIN_PASSWORD_HASH ? ADMIN_PASSWORD_HASH === hashPassword(password) : true);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: 'admin', email, iat: Math.floor(Date.now()/1000) })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(header+'.'+payload).digest('base64url');
  const jwt = `${header}.${payload}.${signature}`;
  return res.status(200).json({ token: jwt });
};