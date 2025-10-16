import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { searchAdoptablePets } from '../api';

const AdoptCard = ({ pet, onAdopt }) => {
  const photo = pet.photos?.[0]?.medium || pet.photos?.[0]?.small || 'https://dummyimage.com/320x200/fff7fb/4b3d57&text=Adorable+Pet';
  const name = pet.name;
  const breed = pet.breeds?.primary || '';
  const age = pet.age;
  const gender = pet.gender;
  const type = pet.type;
  return (
    <div className="pet-card">
      <div className="pet-card-header">
        <img src={photo} alt={name} className="pet-avatar" />
        <div className="pet-name brand-text" style={{textTransform:'uppercase'}}>{name}</div>
      </div>
      <div className="pet-card-body">
        <div className="pet-breed">{breed}</div>
        <div className="pet-birthday">{age} · {gender}</div>
        <div className="pet-species" style={{marginTop:6}}>{type}</div>
        {pet.url && (
          <a href={pet.url} target="_blank" rel="noopener noreferrer" className="btn-brand" style={{marginTop:10,display:'inline-block'}}>Voir sur Petfinder</a>
        )}
        <div className="pet-card-footer" style={{marginTop:12}}>
          <button className="chip" onClick={()=>onAdopt?.(pet)}>🎉 Adopter</button>
        </div>
      </div>
    </div>
  );
};

const Adopt = () => {
  const [zip, setZip] = useState('90210');
  const [type, setType] = useState('dog');
  const [age, setAge] = useState('');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pageInfo, setPageInfo] = useState({ current_page: 1, total_pages: 1 });
  const [celebratePet, setCelebratePet] = useState(null);
  const location = useLocation();

  const runSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await searchAdoptablePets({ location: zip, type, age: age || undefined, limit: 20, page });
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
      // Message plus clair si les credentials Petfinder manquent
      const friendly = /credentials missing/i.test(String(msg)) ? "Petfinder non configuré côté serveur (renseignez PETFINDER_KEY/SECRET)." : msg;
      setError(friendly);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Read query params coming from Dashboard chips
    const params = new URLSearchParams(location.search);
    const qType = params.get('type');
    const qAge = params.get('age');
    const qLoc = params.get('location');
    if (qType) setType(qType);
    if (qAge) setAge(qAge);
    if (qLoc) setZip(qLoc);
    // After initial states set, trigger search
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zip, type, age, page]);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1 className="brand-text">Find Adoptable Pets</h1>
        <p>Powered by Petfinder API</p>
      </header>
      <div style={{display:'flex',gap:12,justifyContent:'center',margin:'12px 0 20px'}}>
        <input value={zip} onChange={(e)=>setZip(e.target.value)} placeholder="ZIP/Postal" style={{padding:10,borderRadius:12,border:'1px solid var(--border-glass)',background:'rgba(255,255,255,0.85)'}} />
        <select value={type} onChange={(e)=>setType(e.target.value)} style={{padding:10,borderRadius:12,border:'1px solid var(--border-glass)',background:'rgba(255,255,255,0.85)'}}>
          <option value="dog">Dog</option>
          <option value="cat">Cat</option>
          <option value="rabbit">Rabbit</option>
          <option value="small-furry">Small & Furry</option>
        </select>
        <select value={age} onChange={(e)=>setAge(e.target.value)} style={{padding:10,borderRadius:12,border:'1px solid var(--border-glass)',background:'rgba(255,255,255,0.85)'}}>
          <option value="">Any age</option>
          <option value="Baby">Baby</option>
          <option value="Young">Young</option>
          <option value="Adult">Adult</option>
          <option value="Senior">Senior</option>
        </select>
        <button onClick={runSearch} className="btn-brand">Search</button>
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
            {results.map(a => <AdoptCard key={a.id} pet={a} onAdopt={(p)=>{ setCelebratePet(p); setTimeout(()=>setCelebratePet(null), 3600); }} />)}
          </div>
          <div style={{display:'flex',justifyContent:'center',gap:10,margin:'16px 0'}}>
            <button className="chip" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>← Précédent</button>
            <div className="chip">Page {pageInfo.current_page} / {pageInfo.total_pages}</div>
            <button className="chip" disabled={pageInfo.current_page>=pageInfo.total_pages} onClick={()=>setPage(p=>p+1)}>Suivant →</button>
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