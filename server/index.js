const express = require('express');
const cors = require('cors');
const store = require('./store');
const fetch = global.fetch || ((...args) => import('node-fetch').then(({default: f}) => f(...args)));
const crypto = require('crypto');
const path = require('path');

// Charge les variables d'environnement depuis le .env à la racine du projet
try {
  require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
} catch (_) {
  // si dotenv n'est pas installé ou fichier absent, on continue avec process.env
}

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
    story: body.story || '',
    preferences: body.preferences || ''
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
    // Optional breed and name filters (with FR->EN mapping for common cases)
    if (req.query.breed) {
      const normBreed = normalizeBreedForPetfinder((req.query.type||'').toLowerCase(), String(req.query.breed));
      if (normBreed) params.set('breed', normBreed);
    }
    if (req.query.name) params.set('name', req.query.name);
    const resp = await fetch('https://api.petfinder.com/v2/animals?'+params.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });
    const json = await resp.json();
    res.json(json);
  } catch (e) {
    res.status(500).json({ error: 'petfinder_failed', message: e.message });
  }
});

// NEW: Petfinder animal details by ID
app.get('/api/petfinder/animals/:id', async (req, res) => {
  try {
    const token = await getPetfinderToken();
    const id = encodeURIComponent(String(req.params.id));
    const resp = await fetch(`https://api.petfinder.com/v2/animals/${id}`, {
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
// FR -> EN mapping for Petfinder 'breed' parameter (common breeds)
function normalizeBreedForPetfinder(type, breedText) {
  const tokens = normalizeTokens(breedText);
  const join = (arr) => arr.join(' ');
  const dogs = [
    { fr: ['bouledogue','francais'], en: 'French Bulldog' },
    { fr: ['bouledogue','français'], en: 'French Bulldog' },
    { fr: ['bouledogue','anglais'], en: 'Bulldog' },
    { fr: ['berger','allemand'], en: 'German Shepherd Dog' },
    { fr: ['berger','belge'], en: 'Belgian Shepherd / Malinois' },
    { fr: ['berger','australien'], en: 'Australian Shepherd' },
    { fr: ['golden','retriever'], en: 'Golden Retriever' },
    { fr: ['labrador'], en: 'Labrador Retriever' },
    { fr: ['border','collie'], en: 'Border Collie' },
    { fr: ['teckel'], en: 'Dachshund' },
    { fr: ['carlin'], en: 'Pug' },
    { fr: ['corgi'], en: 'Corgi' },
    { fr: ['husky','siberien'], en: 'Siberian Husky' },
    { fr: ['husky','sibérien'], en: 'Siberian Husky' },
    { fr: ['shiba'], en: 'Shiba Inu' },
    { fr: ['akita'], en: 'Akita' },
    { fr: ['chow','chow'], en: 'Chow Chow' },
    { fr: ['caniche'], en: 'Poodle' },
    { fr: ['chihuahua'], en: 'Chihuahua' },
    { fr: ['rottweiler'], en: 'Rottweiler' },
    { fr: ['dalmatien'], en: 'Dalmatian' },
    { fr: ['beagle'], en: 'Beagle' },
  ];
  const cats = [
    { fr: ['siamois'], en: 'Siamese' },
    { fr: ['maine','coon'], en: 'Maine Coon' },
    { fr: ['persan'], en: 'Persian' },
    { fr: ['ragdoll'], en: 'Ragdoll' },
    { fr: ['chartreux'], en: 'Chartreux' },
    { fr: ['britannique','court','poil'], en: 'British Shorthair' },
    { fr: ['bengal'], en: 'Bengal' },
    { fr: ['scottish','fold'], en: 'Scottish Fold' },
    { fr: ['norvegien'], en: 'Norwegian Forest Cat' },
    { fr: ['norvégien'], en: 'Norwegian Forest Cat' },
    { fr: ['sphynx'], en: 'Sphynx' },
    { fr: ['abyssin'], en: 'Abyssinian' },
    { fr: ['bleu','russe'], en: 'Russian Blue' },
    { fr: ['angora','turc'], en: 'Turkish Angora' },
    { fr: ['oriental'], en: 'Oriental' },
    { fr: ['birman'], en: 'Birman' },
    { fr: ['savannah'], en: 'Savannah' },
    { fr: ['bombay'], en: 'Bombay' },
  ];
  const table = type === 'cat' ? cats : dogs;
  for (const m of table) {
    const mTokens = normalizeTokens(join(m.fr));
    if (mTokens.every(t => tokens.includes(t))) return m.en;
  }
  // If already english-looking, return the original
  if (/^[a-z0-9 .-]+$/i.test(String(breedText||''))) return String(breedText||'').trim();
  return String(breedText||'').trim();
}
function tokensIncludeAll(tokens, required) {
  const set = new Set(tokens);
  return required.every(r => set.has(r));
}
// Mapping de races FR -> Dog CEO (breed/sub-breed) pour mieux dissocier "race" et "origine"
const DOG_FRENCH_MAP = [
  { match: ['bouledogue','francais'], path: ['bulldog','french'] },
  { match: ['bouledogue','français'], path: ['bulldog','french'] },
  { match: ['berger','allemand'], path: ['shepherd','german'] },
  { match: ['retriever','golden'], path: ['retriever','golden'] },
  { match: ['labrador'], path: ['labrador'] },
  { match: ['border','collie'], path: ['collie','border'] },
  { match: ['caniche'], path: ['poodle'] },
  { match: ['teckel'], path: ['dachshund'] },
  { match: ['chow'], path: ['chow'] },
  { match: ['corgi','pembroke'], path: ['corgi','pembroke'] },
  { match: ['corgi'], path: ['corgi'] },
  { match: ['shiba','inu'], path: ['shiba'] },
  { match: ['akita'], path: ['akita'] },
  { match: ['husky','siberien'], path: ['husky'] },
  { match: ['husky','sibérien'], path: ['husky'] },
  { match: ['rottweiler'], path: ['rottweiler'] },
  { match: ['dalmatien'], path: ['dalmatian'] },
  { match: ['beagle'], path: ['beagle'] },
];
function resolveDogFrenchPath(tokens) {
  for (const m of DOG_FRENCH_MAP) {
    if (tokensIncludeAll(tokens, normalizeTokens(m.match.join(' ')))) return m.path;
  }
  return null;
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
  // D'abord essayer le mapping FR explicite (race + origine)
  const frPath = resolveDogFrenchPath(tokens);
  if (frPath) {
    const url = `https://dog.ceo/api/breed/${frPath.join('/')}/images/random`;
    try {
      const d = await fetch(url).then(r=>r.json());
      if (d?.message) return d.message;
    } catch {}
  }
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
  // Mapping FR -> EN de quelques races courantes
  const frToEn = [
    { fr: ['siamois'], en: 'siamese' },
    { fr: ['persan'], en: 'persian' },
    { fr: ['britannique','court','poil'], en: 'british shorthair' },
    { fr: ['british','shorthair'], en: 'british shorthair' },
    { fr: ['maine','coon'], en: 'maine coon' },
    { fr: ['chartreux'], en: 'chartreux' },
    { fr: ['ragdoll'], en: 'ragdoll' },
    { fr: ['bengal'], en: 'bengal' },
    { fr: ['scottish','fold'], en: 'scottish fold' },
    { fr: ['norvegien'], en: 'norwegian forest' },
    { fr: ['norvégien'], en: 'norwegian forest' },
    { fr: ['sphynx'], en: 'sphynx' },
    { fr: ['abyssin'], en: 'abyssinian' },
    { fr: ['bleu','russe'], en: 'russian blue' },
    { fr: ['angora','turc'], en: 'turkish angora' },
    { fr: ['oriental'], en: 'oriental' },
    { fr: ['birman'], en: 'birman' },
    { fr: ['savannah'], en: 'savannah' },
    { fr: ['bombay'], en: 'bombay' }
  ];
  let preferredName = '';
  for (const m of frToEn) {
    if (tokensIncludeAll(tokens, m.fr)) { preferredName = m.en; break; }
  }
  for (const b of list) {
    const nameTokens = normalizeTokens(preferredName || b.name);
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
