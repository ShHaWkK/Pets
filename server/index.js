const express = require('express');
const cors = require('cors');
const store = require('./store');
const fetch = global.fetch || ((...args) => import('node-fetch').then(({default: f}) => f(...args)));
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Healthcheck
app.get('/api/health', (_, res) => res.json({ ok: true }));

// List all pets
app.get('/api/pets', (req, res) => {
  res.json(store.list());
});

// Create a new pet
app.post('/api/pets', (req, res) => {
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
  res.status(201).json(created);
});

// Update a pet
app.put('/api/pets/:id', (req, res) => {
  const id = Number(req.params.id);
  const updated = store.update(id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json(updated);
});

// Delete a pet
app.delete('/api/pets/:id', (req, res) => {
  const id = Number(req.params.id);
  const ok = store.remove(id);
  if (!ok) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
});

// Simple JWT auth (single admin via env vars)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';

function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const ok = email === ADMIN_EMAIL && (ADMIN_PASSWORD_HASH ? ADMIN_PASSWORD_HASH === hashPassword(password) : true);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  const tokenPayload = { sub: 'admin', email };
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ ...tokenPayload, iat: Math.floor(Date.now()/1000) })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(header+'.'+payload).digest('base64url');
  const jwt = `${header}.${payload}.${signature}`;
  res.json({ token: jwt });
});

function authMiddleware(req, res, next) {
  const hdr = req.headers['authorization'] || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  const [h,p,s] = token.split('.');
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(h+'.'+p).digest('base64url');
  if (expected !== s) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// Protect write operations
app.post('/api/pets', authMiddleware);
app.put('/api/pets/:id', authMiddleware);
app.delete('/api/pets/:id', authMiddleware);
app.post('/api/pets/:id/moments', authMiddleware);

// Petfinder proxy
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

app.get('/api/petfinder/search', async (req, res) => {
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
    res.json(json);
  } catch (e) {
    res.status(500).json({ error: 'petfinder_failed', message: e.message });
  }
});

// Photos search (multi-provider with graceful fallbacks)
let dogBreedsCache = null;
let catBreedsCache = null;
function normalizeTokens(str) {
  return String(str || '').toLowerCase().replace(/[^a-z]+/g, ' ').trim().split(/\s+/).filter(Boolean);
}
async function getDogBreeds() {
  if (dogBreedsCache) return dogBreedsCache;
  try {
    const resp = await fetch('https://dog.ceo/api/breeds/list/all');
    const json = await resp.json();
    dogBreedsCache = json?.message || {};
  } catch {
    dogBreedsCache = {};
  }
  return dogBreedsCache;
}
async function resolveDogBreedImage(breedText) {
  const tokens = normalizeTokens(breedText);
  const list = await getDogBreeds();
  // Try exact breed match first
  for (const [breed, subs] of Object.entries(list)) {
    if (tokens.includes(breed)) {
      if (Array.isArray(subs) && subs.length) {
        for (const sub of subs) {
          if (tokens.includes(sub)) {
            const u = `https://dog.ceo/api/breed/${breed}/${sub}/images/random`;
            const d = await fetch(u).then(r=>r.json()).catch(()=>null);
            if (d?.message) return d.message;
          }
        }
      }
      const u = `https://dog.ceo/api/breed/${breed}/images/random`;
      const d = await fetch(u).then(r=>r.json()).catch(()=>null);
      if (d?.message) return d.message;
    }
  }
  return '';
}
async function getCatBreeds() {
  if (catBreedsCache) return catBreedsCache;
  try {
    const resp = await fetch('https://api.thecatapi.com/v1/breeds');
    const json = await resp.json();
    catBreedsCache = Array.isArray(json) ? json : [];
  } catch {
    catBreedsCache = [];
  }
  return catBreedsCache;
}
async function resolveCatBreedImage(breedText) {
  const tokens = normalizeTokens(breedText);
  const list = await getCatBreeds();
  for (const b of list) {
    const nameTokens = normalizeTokens(b.name);
    const allPresent = nameTokens.every(t => tokens.includes(t));
    if (allPresent) {
      try {
        const resp = await fetch(`https://api.thecatapi.com/v1/images/search?breed_ids=${encodeURIComponent(b.id)}&limit=1`);
        const arr = await resp.json();
        const url = (Array.isArray(arr) && arr[0]?.url) || '';
        if (url) return url;
      } catch {}
    }
  }
  return '';
}
async function searchPhoto(query) {
  const qRaw = String(query || '');
  const q = qRaw.toLowerCase();
  const tokens = normalizeTokens(qRaw);
  // Optional Unsplash (requires UNSPLASH_ACCESS_KEY)
  const UNSPLASH = process.env.UNSPLASH_ACCESS_KEY || '';
  if (UNSPLASH) {
    try {
      const resp = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=1`, {
        headers: { Authorization: `Client-ID ${UNSPLASH}` }
      });
      const json = await resp.json();
      const url = json?.results?.[0]?.urls?.small || json?.results?.[0]?.urls?.thumb;
      if (url) return url;
    } catch {}
  }
  // Breed-aware fallbacks
  if (tokens.includes('dog') || q.includes('dog')) {
    // Try breed-specific if breed words are present
    const breedCandidate = tokens.filter(t => t !== 'dog').join(' ');
    if (breedCandidate) {
      const byBreed = await resolveDogBreedImage(breedCandidate);
      if (byBreed) return byBreed;
    }
    try {
      const d = await fetch('https://dog.ceo/api/breeds/image/random').then(r=>r.json());
      if (d?.message) return d.message;
    } catch {}
  }
  if (tokens.includes('cat') || q.includes('cat')) {
    const breedCandidate = tokens.filter(t => t !== 'cat').join(' ');
    if (breedCandidate) {
      const byBreed = await resolveCatBreedImage(breedCandidate);
      if (byBreed) return byBreed;
    }
    try {
      const c = await fetch('https://api.thecatapi.com/v1/images/search').then(r=>r.json());
      const url = (Array.isArray(c) && c[0]?.url) || '';
      if (url) return url;
    } catch {}
  }
  // Generic fallback placeholder themed to our palette
  return `https://dummyimage.com/320x320/fff7fb/4b3d57&text=${encodeURIComponent(query||'Pet')}`;
}

app.get('/api/photos/search', async (req, res) => {
  const query = req.query.query || req.query.q || 'pet';
  try {
    const url = await searchPhoto(query);
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: 'photo_failed', message: e.message });
  }
});

// Moments timeline
app.get('/api/pets/:id/moments', (req, res) => {
  const id = Number(req.params.id);
  const list = store.listMoments(id);
  if (!list) return res.status(404).json({ error: 'not found' });
  res.json(list);
});

app.post('/api/pets/:id/moments', (req, res) => {
  const id = Number(req.params.id);
  const created = store.addMoment(id, req.body || {});
  if (!created) return res.status(404).json({ error: 'not found' });
  res.status(201).json(created);
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
