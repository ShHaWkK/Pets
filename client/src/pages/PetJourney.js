import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { getPets, getMoments, addMoment, searchAdoptablePets, getPetfinderAnimal } from '../api';
import { useI18n } from '../contexts/I18nContext';

const AddMomentModal = ({ onSave, onClose }) => {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState('');

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const onFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const base64 = await fileToBase64(f);
    setPhoto(base64);
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>{t('add_memory')}</h2>
        <button onClick={onClose} className="close-button">×</button>
        <div>
          <label>{t('description')}</label>
          <input value={text} onChange={(e)=>setText(e.target.value)} placeholder="What happened today?" />
        </div>
        <div>
          <label>{t('photo')}</label>
          <input type="file" accept="image/*" onChange={onFileChange} />
        </div>
        <button onClick={()=>onSave({ text, photo })} disabled={!text.trim()}>{t('add_memory')}</button>
      </div>
    </div>
  );
};

const MomentCard = ({ m }) => (
  <div className="pet-card">
    {m.photo && <img src={m.photo} alt="moment" className="pet-avatar" style={{width:140,height:140}} />}
    <div className="pet-card-body">
      <div className="pet-breed" style={{marginTop:8}}>{new Date(m.createdAt).toLocaleString()}</div>
      <div className="pet-birthday" style={{marginTop:8}}>{m.text}</div>
    </div>
  </div>
);

const PetJourney = () => {
  const { t } = useI18n();
  const { id } = useParams();
  const location = useLocation();
  const petId = Number(id);
  const [pet, setPet] = useState(null);
  const [moments, setMoments] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pfDetails, setPfDetails] = useState(null);
  const [pfLoading, setPfLoading] = useState(false);
  const [pfError, setPfError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const resPets = await getPets();
        const found = (resPets.data || []).find(p => p.id === petId) || null;
        setPet(found);
      } catch {}
      try {
        const resMoments = await getMoments(petId);
        setMoments(resMoments.data || []);
      } catch {}
    };
    load();
  }, [petId]);

  // Charger des détails Petfinder (FR/EN) par nom et race, fallback EN
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const pfId = q.get('pfId');
    const run = async () => {
      if (!pet && !pfId) return;
      setPfLoading(true);
      setPfError('');
      try {
        if (pfId) {
          const res = await getPetfinderAnimal(pfId);
          const animal = res.data?.animal || res.data || null;
          setPfDetails(animal);
        } else {
          const typeTokens = String(pet?.species || '').toLowerCase();
          const type = typeTokens.startsWith('dog') ? 'dog' : (typeTokens.startsWith('cat') ? 'cat' : undefined);
          const params = {
            location: '90210',
            type,
            name: pet?.name || undefined,
            breed: pet?.breed || undefined,
            limit: 10,
            page: 1
          };
          const res = await searchAdoptablePets(params);
          const animals = res.data?.animals || [];
          const norm = (s) => String(s||'').trim().toLowerCase();
          const targetName = norm(pet?.name);
          const targetBreed = norm(pet?.breed);
          let candidate = animals.find(a => norm(a.name) === targetName && norm(a.breeds?.primary) === targetBreed)
            || animals.find(a => norm(a.name) === targetName)
            || animals.find(a => norm(a.breeds?.primary) === targetBreed)
            || animals[0];
          setPfDetails(candidate || null);
        }
      } catch (e) {
        const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Search failed';
        setPfError(msg);
      }
      setPfLoading(false);
    };
    run();
  }, [pet, location.search]);

  const onSaveMoment = async (moment) => {
    try {
      const res = await addMoment(petId, moment);
      setMoments([res.data, ...moments]);
      setIsModalOpen(false);
    } catch {}
  };

  return (
    <div className="dashboard">
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
        <Link to="/" style={{textDecoration:'none',color:'var(--rose-500)'}}>{t('back_home')}</Link>
      </div>
      <header className="dashboard-header">
        <h1 className="brand-text">{t('growth_journey', pet?.name || 'Pet')}</h1>
        {pet && (
          <div style={{marginTop:10}}>
            {pet.species && <span className="pet-species" style={{marginRight:8}}>{pet.species}</span>}
            {pet.breed && <span className="chip">{pet.breed}</span>}
            {pet.birthday && (
              <span className="chip" style={{marginLeft:8}}>
                🎂 {new Date(pet.birthday).toLocaleDateString()}
              </span>
            )}
          </div>
        )}
        {pet?.story && (
          <p style={{marginTop:12,color:'var(--muted)'}}>{pet.story}</p>
        )}
        <p style={{marginTop:6}}>{moments.length === 0 ? t('no_memories') : `${moments.length} memories`}</p>
        <button onClick={()=>setIsModalOpen(true)} className="btn-brand" style={{marginTop:12}}>+ {t('add_memory')}</button>
      </header>

      {/* Détails Petfinder bilingues */}
      <section style={{marginTop:20}}>
        <h2 className="brand-text" style={{fontSize:'1.2rem'}}>{t('pf_details')}</h2>
        {pfLoading && <div className="chip">Loading…</div>}
        {pfError && <div className="chip" style={{color:'var(--rose-500)'}}>{pfError}</div>}
        {pfDetails && (
          <div className="pet-card" style={{textAlign:'left'}}>
            <div className="pet-card-body">
              {(pfDetails.primary_photo_cropped || (Array.isArray(pfDetails.photos) && pfDetails.photos.length>0)) && (
                <div style={{marginBottom:10}}>
                  {pfDetails.primary_photo_cropped && (
                    <img
                      src={pfDetails.primary_photo_cropped.medium || pfDetails.primary_photo_cropped.small || pfDetails.primary_photo_cropped.full}
                      alt={pfDetails.name || 'Animal'}
                      style={{width:'100%',maxHeight:320,objectFit:'cover',borderRadius:16,boxShadow:'var(--shadow-soft)'}}
                    />
                  )}
                  {Array.isArray(pfDetails.photos) && pfDetails.photos.length > 1 && (
                    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
                      {pfDetails.photos.slice(0,6).map((ph,i)=> (
                        <img key={i} src={ph.small || ph.medium || ph.full} alt={`photo ${i+1}`} className="thumb" />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {pfDetails.description && (
                <p style={{whiteSpace:'pre-wrap'}}>{pfDetails.description}</p>
              )}
              {/* CV de l'animal */}
              <div style={{marginTop:10}}>
                <h3 style={{margin:'8px 0'}}>{t('animal_cv')}</h3>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {pfDetails.breeds?.primary && <span className="chip">{t('breed')}: {pfDetails.breeds.primary}{pfDetails.breeds?.mixed === false ? ' · Pure race' : ''}</span>}
                  {pfDetails.age && <span className="chip">🕒 {pfDetails.age}</span>}
                  {pfDetails.gender && <span className="chip">⚧ {pfDetails.gender}</span>}
                  {pfDetails.size && <span className="chip">📏 {pfDetails.size}</span>}
                  {pfDetails.attributes?.house_trained && <span className="chip">🏠 Propre</span>}
                  {pfDetails.attributes?.special_needs && <span className="chip">⚕️ Besoins spéciaux</span>}
                  {pfDetails.environment?.children && <span className="chip">👶 Aime les enfants</span>}
                  {pfDetails.environment?.dogs && <span className="chip">🐶 Aime les chiens</span>}
                  {pfDetails.environment?.cats && <span className="chip">🐱 Aime les chats</span>}
                  {(pfDetails.type === 'Dog' && pfDetails.breeds?.mixed === false) && <span className="chip">LOF: {t('lof_unspecified')}</span>}
                </div>
                {/* Préférences / Loisirs libres (profil) */}
                {pet?.preferences && (
                  <div style={{marginTop:8}}>
                    <div style={{color:'var(--muted)'}}>{t('preferences')}:</div>
                    <p style={{whiteSpace:'pre-wrap',marginTop:6}}>{pet.preferences}</p>
                  </div>
                )}
                {/* Caractère déduit via tags Petfinder */}
                {Array.isArray(pfDetails.tags) && pfDetails.tags.length > 0 && (() => {
                  const tags = pfDetails.tags.map((s)=>String(s).toLowerCase());
                  const map = {
                    playful: 'Joueur', energetic: 'Énergique', affectionate: 'Affectueux', gentle: 'Doux', friendly: 'Sociable', loyal: 'Fidèle',
                    smart: 'Malin', quiet: 'Calme', curious: 'Curieux', shy: 'Timide', independent: 'Indépendant', athletic: 'Athlétique',
                    outgoing: 'Ouvert', protective: 'Protecteur', goofy: 'Rigolo'
                  };
                  const chars = Object.keys(map).filter(k=>tags.includes(k));
                  return chars.length ? (
                    <div style={{marginTop:8}}>
                      <div style={{color:'var(--muted)'}}>{t('character')}:</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:6}}>
                        {chars.map((k)=> <span key={k} className="chip">{map[k]}</span>)}
                      </div>
                    </div>
                  ) : null;
                })()}
                {Array.isArray(pfDetails.tags) && pfDetails.tags.length > 0 && (
                  <div style={{marginTop:8}}>
                    <div style={{color:'var(--muted)'}}>{t('likes')}:</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:6}}>
                      {pfDetails.tags.slice(0,8).map((tag)=> (
                        <span key={tag} className="chip">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div style={{marginTop:8}}>
                {pfDetails.contact?.email && <div className="chip">✉️ {pfDetails.contact.email}</div>}
                {pfDetails.contact?.phone && <div className="chip" style={{marginLeft:8}}>📞 {pfDetails.contact.phone}</div>}
              </div>
              {pfDetails.url && (
                <a href={pfDetails.url} target="_blank" rel="noopener noreferrer" className="btn-brand" style={{marginTop:10,display:'inline-block'}}>{t('more_details')}</a>
              )}
            </div>
          </div>
        )}
      </section>

      {moments.length === 0 ? (
        <div style={{textAlign:'center',marginTop:20}}>
          <div>Every moment with your pet is precious.</div>
          <button onClick={()=>setIsModalOpen(true)} className="btn-brand" style={{marginTop:12}}>{t('add_first_memory')}</button>
        </div>
      ) : (
        <div className="pet-list">
          {moments.map(m => <MomentCard key={m.id} m={m} />)}
        </div>
      )}
      {isModalOpen && <AddMomentModal onSave={onSaveMoment} onClose={()=>setIsModalOpen(false)} />}
    </div>
  );
};

export default PetJourney;