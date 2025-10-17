import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { searchAdoptablePets } from '../api';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';

const AdoptCard = ({ pet, onAdopt, adopted, onTrial, onFoster }) => {
  const { t } = useI18n();
  const photo = pet.photos?.[0]?.medium || pet.photos?.[0]?.small || 'https://dummyimage.com/320x200/fff7fb/4b3d57&text=Adorable+Pet';
  const name = pet.name;
  const breed = pet.breeds?.primary || '';
  const age = pet.age;
  const gender = pet.gender;
  const type = pet.type;
  return (
    <div className="pet-card">
      {adopted && <div className="sticker" title={t('adopted')}>❤️</div>}
      <div className="pet-card-header">
        <img src={photo} alt={name} className="pet-avatar" />
        <div className="pet-name brand-text" style={{textTransform:'uppercase'}}>{name}</div>
      </div>
      <div className="pet-card-body">
        <div className="pet-breed">{breed}</div>
        <div className="pet-birthday">{age} · {gender}</div>
        <div className="pet-species" style={{marginTop:6}}>{type}</div>
        {pet.url && (
          <a href={pet.url} target="_blank" rel="noopener noreferrer" className="btn-brand" style={{marginTop:10,display:'inline-block'}}>{t('view_on_petfinder')}</a>
        )}
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
          <Link to={`/pets/0?pfId=${pet.id}`} className="btn-brand" style={{display:'inline-block'}}>{t('view_cv')}</Link>
        </div>
        <div className="pet-card-footer" style={{marginTop:12,display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center'}}>
          <button className="chip" onClick={()=>onAdopt?.(pet)}>{t('adopt_cta')}</button>
          <button className="chip" onClick={()=>onTrial?.(pet)}>{t('start_trial')}</button>
          <button className="chip" onClick={()=>onFoster?.(pet)}>{t('foster_one_day')}</button>
        </div>
      </div>
    </div>
  );
};

// Helper: initial adoptions from localStorage (supports legacy array of ids)
function readInitialAdoptions() {
  try {
    const raw = JSON.parse(localStorage.getItem('adoptions')||'[]');
    if (!Array.isArray(raw)) return [];
    if (raw.length && typeof raw[0] === 'number') {
      return raw.map((id)=>({ id, name: 'Inconnu', type: '', breed: '', photo: '', adoptedAt: Date.now() }));
    }
    return raw;
  } catch { return []; }
}
// Experiences: trial/foster records
function readInitialExperiences() {
  try {
    const raw = JSON.parse(localStorage.getItem('experiences')||'[]');
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

const CAT_BREEDS_FR = ['Siamois','Maine Coon','Persan','Ragdoll','British Shorthair','Chartreux','Bengal','Scottish Fold','Norvégien','Sphynx','Abyssin','Bleu Russe','Angora Turc','Oriental','Birman','Savannah','Bombay'];
const DOG_BREEDS_FR = ['Bouledogue français','Bulldog','Berger allemand','Berger belge (Malinois)','Australian Shepherd','Golden Retriever','Labrador Retriever','Border Collie','Teckel','Carlin','Corgi','Siberian Husky','Shiba Inu','Akita','Caniche','Chihuahua','Rottweiler','Dalmatien','Beagle','Chow-Chow'];

const Adopt = () => {
  const { t } = useI18n();
  const { isAuthed } = useAuth();
  const navigate = useNavigate();
  const [zip, setZip] = useState('90210');
  const [type, setType] = useState('dog');
  const [age, setAge] = useState('');
  const [breed, setBreed] = useState('');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pageInfo, setPageInfo] = useState({ current_page: 1, total_pages: 1 });
  const [celebratePet, setCelebratePet] = useState(null);
  const [adoptions, setAdoptions] = useState(()=> readInitialAdoptions());
  const [experiences, setExperiences] = useState(()=> readInitialExperiences());
  const adoptedIds = adoptions.map(a=>a.id);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qLoc = params.get('location');
    const qType = params.get('type');
    const qAge = params.get('age');
    const qBreed = params.get('breed');
    if (qLoc) setZip(qLoc);
    if (qType) setType(qType);
    if (qAge) setAge(qAge);
    if (qBreed) setBreed(qBreed);
  }, [location.search]);

  useEffect(() => {
    // reset breed when switching species
    setBreed('');
  }, [type]);

  const runSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await searchAdoptablePets({ location: zip, type, age: age || undefined, breed: breed || undefined, limit: 20, page });
      setResults(res.data?.animals || []);
      if (res.data?.pagination) {
        setPageInfo({
          current_page: res.data.pagination.current_page || page,
          total_pages: res.data.pagination.total_pages || Math.max(page, 1)
        });
      } else {
        setPageInfo({ current_page: page, total_pages: Math.max(page, 1) });
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Search failed';
      const friendly = /credentials missing/i.test(String(msg)) ? t('pf_not_configured') : msg;
      setError(friendly);
    }
    setLoading(false);
  };

  useEffect(() => { runSearch(); }, [zip, type, age, breed, page]);

  const onAdopt = (p) => {
    if (!isAuthed) {
      setError(t('must_login_to_adopt'));
      navigate('/login');
      return;
    }
    setCelebratePet(p);
    const record = { id: p.id, name: p.name, type: p.type, breed: p.breeds?.primary || '', photo: p.photos?.[0]?.small || '', adoptedAt: Date.now() };
    const next = [record, ...adoptions.filter(a=>a.id !== p.id)].slice(0, 12);
    setAdoptions(next);
    try { localStorage.setItem('adoptions', JSON.stringify(next)); } catch {}
    setTimeout(()=>setCelebratePet(null), 3600);
  };
  const startTrial = (p) => {
    const record = { id: p.id, name: p.name, type: p.type, breed: p.breeds?.primary || '', photo: p.photos?.[0]?.small || '', startAt: Date.now(), mode: 'trial', comment: '' };
    const next = [record, ...experiences.filter(e=>e.id !== p.id || e.mode !== 'trial')].slice(0, 20);
    setExperiences(next);
    try { localStorage.setItem('experiences', JSON.stringify(next)); } catch {}
  };
  const startFoster = (p) => {
    const record = { id: p.id, name: p.name, type: p.type, breed: p.breeds?.primary || '', photo: p.photos?.[0]?.small || '', startAt: Date.now(), mode: 'day', comment: '' };
    const next = [record, ...experiences.filter(e=>e.id !== p.id || e.mode !== 'day')].slice(0, 20);
    setExperiences(next);
    try { localStorage.setItem('experiences', JSON.stringify(next)); } catch {}
  };
  const commentExperience = (id, mode) => {
    const text = window.prompt(t('comment_experience')) || '';
    const next = experiences.map((e)=> (e.id===id && e.mode===mode) ? { ...e, comment: text } : e);
    setExperiences(next);
    try { localStorage.setItem('experiences', JSON.stringify(next)); } catch {}
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1 className="brand-text">{t('find_adoptable_pets')}</h1>
        <p>{t('powered_by_pf')}</p>
      </header>

      {/* Panneau Adoptions récentes */}
      <section style={{margin:'10px 0 16px'}}>
        <h2 style={{fontSize:'1.1rem',color:'var(--rose-500)'}}>{t('recent_adoptions')}</h2>
        {adoptions.length === 0 ? (
          <div className="chip">{t('adoptions_panel_empty')}</div>
        ) : (
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {adoptions.map(a => (
              <div key={a.id} className="chip">
                {a.photo && <img src={a.photo} alt={a.name} className="thumb" />}
                <span style={{fontWeight:700}}>{a.name}</span>
                <span style={{color:'var(--muted)'}}>{new Date(a.adoptedAt).toLocaleDateString()}</span>
                <Link to={`/pets/0?pfId=${a.id}`} className="btn-brand" style={{padding:'6px 10px',borderRadius:12}}>{t('view_cv')}</Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <div style={{display:'flex',gap:10,justifyContent:'center',alignItems:'center',flexWrap:'wrap',margin:'12px 0'}}>
        <input value={zip} onChange={(e)=>setZip(e.target.value)} placeholder="90210" style={{padding:10,borderRadius:12,border:'1px solid var(--border-glass)',background:'rgba(255,255,255,0.85)'}} />
        <select value={type} onChange={(e)=>setType(e.target.value)} style={{padding:10,borderRadius:12,border:'1px solid var(--border-glass)',background:'rgba(255,255,255,0.85)'}}>
          <option value="dog">Dog</option>
          <option value="cat">Cat</option>
        </select>
        <select value={age} onChange={(e)=>setAge(e.target.value)} style={{padding:10,borderRadius:12,border:'1px solid var(--border-glass)',background:'rgba(255,255,255,0.85)'}}>
          <option value="">{t('any_age')}</option>
          <option value="Baby">Baby</option>
          <option value="Young">Young</option>
          <option value="Adult">Adult</option>
          <option value="Senior">Senior</option>
        </select>
        {/* Breed selector conditionnel */}
        <select value={breed} onChange={(e)=>setBreed(e.target.value)} style={{padding:10,borderRadius:12,border:'1px solid var(--border-glass)',background:'rgba(255,255,255,0.85)'}}>
          <option value="">{t('any_breed')}</option>
          {(type==='cat'?CAT_BREEDS_FR:DOG_BREEDS_FR).map((b)=>(
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <button onClick={runSearch} className="btn-brand">{t('search')}</button>
      </div>
      {error && <div style={{color:'red',textAlign:'center'}}>{error}</div>}
      {loading ? (
        <div className="pet-list">
          {Array.from({length:8}).map((_,i)=> (
            <div key={i} className="pet-card" style={{animation:'pulse 1.2s ease-in-out infinite',opacity:0.7}}>
              <div className="pet-card-header">
                <div className="pet-avatar" style={{background:'rgba(0,0,0,0.06)'}} />
                <div className="pet-name" style={{width:120,height:14,background:'rgba(0,0,0,0.08)',borderRadius:8}} />
              </div>
              <div className="pet-card-body">
                <div style={{width:160,height:12,background:'rgba(0,0,0,0.06)',borderRadius:8,marginBottom:6}} />
                <div style={{width:100,height:12,background:'rgba(0,0,0,0.06)',borderRadius:8}} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="pet-list">
            {results.map(a => (
              <AdoptCard
                key={a.id}
                pet={a}
                adopted={adoptedIds.includes(a.id)}
                onAdopt={(p)=> onAdopt(p)}
                onTrial={(p)=> startTrial(p)}
                onFoster={(p)=> startFoster(p)}
              />
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'center',gap:10,margin:'16px 0'}}>
            <button className="chip" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>← {t('previous')}</button>
            <div className="chip">{t('page_of', pageInfo.current_page, pageInfo.total_pages)}</div>
            <button className="chip" disabled={pageInfo.current_page>=pageInfo.total_pages} onClick={()=>setPage(p=>p+1)}>{t('next')} →</button>
          </div>
          {celebratePet && (
            <div className="celebrate-overlay">
              <div className="celebrate-card">
                <div className="celebrate-title">Félicitations 🎉</div>
                <div className="celebrate-sub">{celebratePet.name} est tout heureux !</div>
                <div className="celebrate-emojis">
                  <span>🐶</span><span>❤️</span><span>🎉</span><span>🐾</span><span>✨</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Adopt;