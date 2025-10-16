import React from 'react';
import { Link } from 'react-router-dom';

const fallbackAvatar = 'https://dummyimage.com/200x200/fff7fb/4b3d57&text=Adorable+Pet';
const emojiBySpecies = {
  Dog: '🐶', Cat: '🐱', Rabbit: '🐰', Bird: '🐦', Hamster: '🐹', 'Guinea Pig': '🐹', Ferret: '🦦', Fish: '🐟', Reptile: '🦎', Turtle: '🐢'
};
const stickerBySpecies = {
  Dog: '🐾', Cat: '❤️', Rabbit: '🌸', Bird: '✨'
};

const PetCard = ({ pet, onDelete }) => {
  return (
    <div className="pet-card">
      <div className="sticker">{stickerBySpecies[pet.species] || '✨'}</div>
      <div className="pet-card-header">
        <img src={pet.avatar || pet.displayAvatar || fallbackAvatar} alt={pet.name} className="pet-avatar" />
        <div className="pet-name brand-text"><Link to={`/pets/${pet.id}`} style={{textDecoration:'none',color:'inherit'}}>{pet.name}</Link></div>
      </div>
      <div className="pet-card-body">
        {pet.species && (
          <div className="pet-species">{emojiBySpecies[pet.species] || '🐾'} {pet.species}</div>
        )}
        <div className="pet-breed">{pet.breed}</div>
        <div className="pet-birthday">{pet.birthday}</div>
      </div>
      <div className="pet-card-footer">
        <button>Edit</button>
        <button onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
};

export default PetCard;
