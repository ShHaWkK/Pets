import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login as apiLogin } from '../api';

const AuthContext = createContext({
  isAuthed: false,
  token: '',
  login: async (_email, _password) => {},
  logout: () => {}
});

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState('');
  useEffect(() => {
    const t = localStorage.getItem('token') || '';
    if (t) setToken(t);
  }, []);

  const login = async (email, password) => {
    const res = await apiLogin(email, password);
    const t = res.data?.token || '';
    localStorage.setItem('token', t);
    setToken(t);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
  };

  const value = useMemo(() => ({ isAuthed: !!token, token, login, logout }), [token]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);