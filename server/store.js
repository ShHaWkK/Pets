const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'pets.json');

// In-memory fallback store (used when file write not allowed e.g. on Vercel)
let memory = [];

function readFileSafe() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const json = JSON.parse(raw || '[]');
      memory = json; // keep memory in sync
      return json;
    }
  } catch (e) {
    // fall back to memory
  }
  return memory;
}

function writeFileSafe(data) {
  memory = data;
  try {
    // On Vercel or readonly FS, this will throw. That's fine, we keep memory only.
    if (!process.env.VERCEL) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    }
  } catch (e) {
    // Ignore write errors in serverless/readonly env
  }
}

module.exports = {
  list() {
    return readFileSafe();
  },
  create(pet) {
    const data = readFileSafe();
    const id = (data.at(-1)?.id || 0) + 1;
    const item = { id, moments: [], ...pet };
    data.push(item);
    writeFileSafe(data);
    return item;
  },
  update(id, pet) {
    const data = readFileSafe();
    const idx = data.findIndex(p => p.id === id);
    if (idx === -1) return null;
    data[idx] = { ...data[idx], ...pet, id };
    writeFileSafe(data);
    return data[idx];
  },
  remove(id) {
    const data = readFileSafe();
    const idx = data.findIndex(p => p.id === id);
    if (idx === -1) return false;
    data.splice(idx, 1);
    writeFileSafe(data);
    return true;
  },
  listMoments(petId) {
    const data = readFileSafe();
    const pet = data.find(p => p.id === petId);
    if (!pet) return null;
    const arr = Array.isArray(pet.moments) ? pet.moments : [];
    // reverse chronological
    return [...arr].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  },
  addMoment(petId, moment) {
    const data = readFileSafe();
    const pet = data.find(p => p.id === petId);
    if (!pet) return null;
    if (!Array.isArray(pet.moments)) pet.moments = [];
    const id = (pet.moments.at(-1)?.id || 0) + 1;
    const item = { id, text: moment.text || '', photo: moment.photo || '', createdAt: moment.createdAt || new Date().toISOString() };
    pet.moments.push(item);
    writeFileSafe(data);
    return item;
  }
};
