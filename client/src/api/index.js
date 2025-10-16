import axios from 'axios';

// Détermine l'URL de l'API côté client
// - En dev: http://localhost:3001/api
// - En prod: si on est en localhost (ex: preview sur 3002), utilise 3001; sinon '/api'
const isBrowser = typeof window !== 'undefined';
const isLocalHost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_URL = process.env.REACT_APP_API_URL
  || (process.env.NODE_ENV === 'production'
      ? (isLocalHost ? 'http://localhost:3001/api' : '/api')
      : 'http://localhost:3001/api');

const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

export const getPets = () => api.get(`/pets`);
export const addPet = (pet) => api.post(`/pets`, pet);
export const updatePet = (id, pet) => api.put(`/pets/${id}`, pet);
export const deletePet = (id) => api.delete(`/pets/${id}`);

// Moments 
export const getMoments = (petId) => api.get(`/pets/${petId}/moments`);
export const addMoment = (petId, moment) => api.post(`/pets/${petId}/moments`, moment);

// Petfinder adoption search
export const searchAdoptablePets = (params) => api.get(`/petfinder/search`, { params });

// Auth
export const login = (email, password) => api.post(`/auth/login`, { email, password });

// Photos
export const searchPhotos = (query) => api.get(`/photos/search`, { params: { query } });
