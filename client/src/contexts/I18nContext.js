import React, { createContext, useContext, useMemo, useState } from 'react';

const messages = {
  fr: {
    home: 'Accueil',
    adopt: 'Adopter',
    login: 'Se connecter',
    logout: 'Se déconnecter',
    lang: 'Langue',
    find_adoptable_pets: 'Trouver des animaux à adopter',
    powered_by_pf: 'Propulsé par Petfinder API',
    any_age: 'Tous âges',
    search: 'Rechercher',
    previous: 'Précédent',
    next: 'Suivant',
    view_on_petfinder: 'Voir sur Petfinder',
    view_cv: 'Voir le CV',
    adopt_cta: '🎉 Adopter',
    page_of: (a,b)=>`Page ${a} / ${b}`,
    back_home: '← Retour',
    growth_journey: (name)=>`Le parcours de ${name}`,
    no_memories: 'Aucun souvenir pour le moment',
    add_first_memory: 'Ajouter le premier souvenir',
    add_memory: 'Ajouter un souvenir',
    description: 'Description',
    photo: 'Photo',
    pf_details: 'Détails Petfinder',
    more_details: 'Plus de détails',
    adopted: 'Adopté',
    pf_not_configured: 'Petfinder non configuré côté serveur (renseignez PETFINDER_KEY/SECRET).',
    breed: 'Race',
    any_breed: 'Toutes races',
    must_login_to_adopt: 'Veuillez vous connecter pour adopter cet animal.',
    recent_adoptions: 'Adoptions récentes',
    adoptions_panel_empty: 'Aucune adoption pour le moment',
    animal_cv: 'CV de l\'animal',
    likes: 'Aime',
    preferences: 'Préférences',
    character: 'Caractère',
    lof_unspecified: 'Non précisé',
    start_trial: 'Essai adoption',
    foster_one_day: 'Garde 1 jour',
    experiences: 'Expériences (essai/garde)',
    experiences_empty: 'Aucune expérience pour le moment',
    comment_experience: 'Commenter l\'expérience',
    trial: 'Essai',
    day_foster: 'Garde 1 jour',
  },
  en: {
    home: 'Home',
    adopt: 'Adopt',
    login: 'Login',
    logout: 'Logout',
    lang: 'Language',
    find_adoptable_pets: 'Find Adoptable Pets',
    powered_by_pf: 'Powered by Petfinder API',
    any_age: 'Any age',
    search: 'Search',
    previous: 'Previous',
    next: 'Next',
    view_on_petfinder: 'View on Petfinder',
    view_cv: 'View CV',
    adopt_cta: '🎉 Adopt',
    page_of: (a,b)=>`Page ${a} / ${b}`,
    back_home: '← Back to Home',
    growth_journey: (name)=>`${name}'s Growth Journey`,
    no_memories: 'No Memories Yet',
    add_first_memory: 'Add First Memory',
    add_memory: 'Add Memory',
    description: 'Description',
    photo: 'Photo',
    pf_details: 'Petfinder Details',
    more_details: 'More details',
    adopted: 'Adopted',
    pf_not_configured: 'Petfinder not configured on server (set PETFINDER_KEY/SECRET).',
    breed: 'Breed',
    any_breed: 'Any breed',
    must_login_to_adopt: 'Please sign in to adopt this pet.',
    recent_adoptions: 'Recent Adoptions',
    adoptions_panel_empty: 'No recent adoptions yet',
    animal_cv: 'Animal CV',
    likes: 'Likes',
    preferences: 'Preferences',
    character: 'Character',
    lof_unspecified: 'Unspecified',
    start_trial: 'Start Trial Adoption',
    foster_one_day: 'Foster for a Day',
    experiences: 'Experiences (trial/foster)',
    experiences_empty: 'No experiences yet',
    comment_experience: 'Comment Experience',
    trial: 'Trial',
    day_foster: 'Day Foster',
  }
};

const I18nContext = createContext({ lang: 'fr', t: (k)=>k, setLang: ()=>{} });

export const I18nProvider = ({ defaultLang = 'fr', children }) => {
  const [lang, setLang] = useState(defaultLang);
  const dict = messages[lang] || messages.fr;

  const t = useMemo(() => {
    return (key, ...args) => {
      const val = dict[key];
      if (typeof val === 'function') return val(...args);
      return val || key;
    };
  }, [dict]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);