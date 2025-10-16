import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PetCard from '../components/PetCard';
import AddPetModal from '../components/AddPetModal';
import { useAuth } from '../contexts/AuthContext';
import { getPets, addPet, deletePet, searchPhotos } from '../api';

const Dashboard = () => {
  const [pets, setPets] = useState([]);
  const [photoById, setPhotoById] = useState({});
  const [speciesThumbs, setSpeciesThumbs] = useState({});
  const [selectedSpecies, setSelectedSpecies] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isAuthed } = useAuth();

  useEffect(() => {
    const fetchPets = async () => {
      try {
        const response = await getPets();
        const list = response.data || [];
        setPets(list);
        // Fetch HQ display photos for all pets (override displayAvatar)
        const targets = list.slice(0, 50);
        const promises = targets.map(async (p) => {
          try {
            const breedPart = (p.breed || '').trim();
            const speciesPart = (p.species || '').trim();
            const query = [breedPart, speciesPart].filter(Boolean).join(' ') || (p.name || '').trim();
            const r = await searchPhotos(query);
            return { id: p.id, url: r.data?.url };
          } catch { return { id: p.id, url: '' }; }
        });
        const results = await Promise.all(promises);
        const map = {};
        results.forEach(({ id, url }) => { if (url) map[id] = url; });
        setPhotoById(map);
        // Species thumbnails for filter chips
        const species = Array.from(new Set(list.map(p => p.species).filter(Boolean)));
        const spPromises = species.map(async (s) => {
          try {
            const r = await searchPhotos(s);
            return { s, url: r.data?.url };
          } catch { return { s, url: '' }; }
        });
        const spRes = await Promise.all(spPromises);
        const spMap = {}; spRes.forEach(({ s, url }) => { if (url) spMap[s] = url; });
        setSpeciesThumbs(spMap);
      } catch (e) {
        console.error(e);
      }
    };
    fetchPets();
  }, []);

  const handleAddPet = async (pet) => {
    try {
      const newPet = await addPet(pet);
      setPets([...pets, newPet.data]);
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletePet(id);
      setPets(pets.filter(p => p.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="dashboard">
      <section className="hero-wrap">
        <div className="hero glass-card">
          <div className="float-hearts">
            <span className="heart h1">❤</span>
            <span className="heart h2">🐾</span>
            <span className="heart h3">❤</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:24,justifyContent:'center',flexWrap:'wrap'}}>
            <img src={process.env.PUBLIC_URL + '/gif/accueil2.gif'} alt="adorable dog" className="hero-gif" />
            <div>
              <h1 className="brand-text" style={{margin:'0 0 8px'}}>Chaque instant compte</h1>
              <p style={{color:'var(--muted)'}}>Suivez la grande histoire d’amour entre vous et votre compagnon.</p>
              <div style={{marginTop:12}}>
                <button className="btn-brand" onClick={() => setIsModalOpen(true)}>+ Créer un profil</button>
                <Link to="/adopt" style={{marginLeft:10}} className="btn-brand">Découvrir l’adoption</Link>
              </div>
              {/* Thèmes rapides vers Adopt */}
              <div style={{marginTop:14,display:'flex',gap:8,flexWrap:'wrap'}}>
                <Link to="/adopt?type=dog&age=Baby" className="chip">🐶 Chiots</Link>
                <Link to="/adopt?age=Senior" className="chip">🐾 Seniors</Link>
                <Link to="/adopt?location=90210" className="chip">📍 Près de chez vous</Link>
                <Link to="/adopt" className="chip" style={{fontWeight:600}}>→ Voir plus</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Bandeau valeurs d’accroche */}
      <section className="value-props" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16,margin:'18px 0 26px'}}>
        <div className="glass-card" style={{padding:'16px'}}>
          <div style={{fontSize:22}}>📍</div>
          <h3 style={{margin:'8px 0'}}>Près de chez vous</h3>
          <p style={{color:'var(--muted)'}}>Animaux disponibles dans votre région via Petfinder.</p>
        </div>
        <div className="glass-card" style={{padding:'16px'}}>
          <div style={{fontSize:22}}>📸</div>
          <h3 style={{margin:'8px 0'}}>Photos réalistes</h3>
          <p style={{color:'var(--muted)'}}>Images de race précises grâce à Unsplash et nos fallbacks.</p>
        </div>
        <div className="glass-card" style={{padding:'16px'}}>
          <div style={{fontSize:22}}>✨</div>
          <h3 style={{margin:'8px 0'}}>Expérience fluide</h3>
          <p style={{color:'var(--muted)'}}>Interface agréable pour explorer, suivre et adopter.</p>
        </div>
      </section>
      <header className="dashboard-header">
        <h1 className="brand-text">Pet Growth Tracker</h1>
        <p>Record every precious moment, share your pet's happiness</p>
      </header>
      <div className="my-adorable-pets">
        <h2>My Adorable Pets</h2>
        <button className="btn-brand" onClick={() => isAuthed ? setIsModalOpen(true) : alert('Please login to add pets')}>+ Add New Pet</button>
      </div>
      {/* Species filters */}
      <div className="filters" style={{display:'flex',gap:10,flexWrap:'wrap',margin:'8px 0 18px'}}>
        {['All', ...Array.from(new Set(pets.map(p => p.species).filter(Boolean)))].map(sp => (
          <button key={sp} className={`chip ${selectedSpecies===sp?'active':''}`} onClick={()=>setSelectedSpecies(sp)}>
            {sp !== 'All' && <img className="thumb" src={speciesThumbs[sp] || (process.env.PUBLIC_URL + '/logo192.png')} alt={sp} />}
            {sp}
          </button>
        ))}
      </div>
      <div className="pet-list">
        {(selectedSpecies==='All' ? pets : pets.filter(p=>p.species===selectedSpecies)).map(pet => (
          <PetCard key={pet.id} pet={{...pet, displayAvatar: photoById[pet.id] || pet.displayAvatar }} onDelete={() => handleDelete(pet.id)} />
        ))}
      </div>
      {isModalOpen && <AddPetModal onSave={handleAddPet} onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};

export default Dashboard;
