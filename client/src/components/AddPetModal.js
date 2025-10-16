import React, { useState } from 'react';

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const AddPetModal = ({ onSave, onClose }) => {
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [species, setSpecies] = useState('Dog');
  const [birthday, setBirthday] = useState('');
  const [story, setStory] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarData, setAvatarData] = useState('');
  const [saving, setSaving] = useState(false);

  const onFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const base64 = await fileToBase64(f);
    setAvatarPreview(base64);
    setAvatarData(base64);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), breed: breed.trim(), species, birthday, avatar: avatarData, story: story.trim() });
    setSaving(false);
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Add Adorable Pet</h2>
        <button onClick={onClose} className="close-button">×</button>
        <div style={{textAlign:'center'}}>
          {avatarPreview ? (
            <img src={avatarPreview} alt="preview" className="pet-avatar" />
          ) : (
            <div className="pet-avatar" style={{background:'#f8f8f8',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>📷</div>
          )}
          <input type="file" accept="image/*" onChange={onFileChange} />
        </div>
        <div>
          <label>Pet Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your pet's name" />
        </div>
        <div>
          <label>Breed</label>
          <input type="text" value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="What breed is your pet?" />
        </div>
        <div>
          <label>Species</label>
          <select value={species} onChange={(e)=>setSpecies(e.target.value)}>
            <option>Dog</option>
            <option>Cat</option>
            <option>Rabbit</option>
            <option>Bird</option>
            <option>Hamster</option>
            <option>Guinea Pig</option>
            <option>Ferret</option>
            <option>Fish</option>
            <option>Reptile</option>
            <option>Turtle</option>
          </select>
        </div>
        <div>
          <label>Birthday</label>
          <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
        </div>
        <div>
          <label>Story</label>
          <textarea value={story} onChange={(e)=>setStory(e.target.value)} placeholder="Sa petite histoire, ses habitudes, ce qu’il aime…" rows={4} />
        </div>
        <button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Create Profile'}</button>
      </div>
    </div>
  );
};

export default AddPetModal;
