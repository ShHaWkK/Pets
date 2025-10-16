import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPets, getMoments, addMoment } from '../api';

const AddMomentModal = ({ onSave, onClose }) => {
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
        <h2>Add Memory</h2>
        <button onClick={onClose} className="close-button">×</button>
        <div>
          <label>Description</label>
          <input value={text} onChange={(e)=>setText(e.target.value)} placeholder="What happened today?" />
        </div>
        <div>
          <label>Photo</label>
          <input type="file" accept="image/*" onChange={onFileChange} />
        </div>
        <button onClick={()=>onSave({ text, photo })} disabled={!text.trim()}>Add Memory</button>
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
  const { id } = useParams();
  const petId = Number(id);
  const [pet, setPet] = useState(null);
  const [moments, setMoments] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        <Link to="/" style={{textDecoration:'none',color:'var(--rose-500)'}}>← Back to Home</Link>
      </div>
      <header className="dashboard-header">
        <h1 className="brand-text">{pet?.name || 'Pet'}'s Growth Journey</h1>
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
        <p style={{marginTop:6}}>{moments.length === 0 ? 'No Memories Yet' : `${moments.length} memories`}</p>
        <button onClick={()=>setIsModalOpen(true)} className="btn-brand" style={{marginTop:12}}>+ Add Moment</button>
      </header>
      {moments.length === 0 ? (
        <div style={{textAlign:'center',marginTop:20}}>
          <div>Every moment with your pet is precious.</div>
          <button onClick={()=>setIsModalOpen(true)} className="btn-brand" style={{marginTop:12}}>Add First Memory</button>
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