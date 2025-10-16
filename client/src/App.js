import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Adopt from './pages/Adopt';
import PetJourney from './pages/PetJourney';
import Login from './pages/Login';
import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppShell() {
  const { isAuthed, logout } = useAuth();

  return (
    <div className="App" style={{paddingTop:20}}>
      <nav style={{display:'flex',gap:12,justifyContent:'center',marginBottom:20}}>
        <Link to="/" style={{textDecoration:'none',color:'var(--rose-500)'}}>Home</Link>
        <Link to="/adopt" style={{textDecoration:'none',color:'var(--rose-500)'}}>Adopt</Link>
        {isAuthed ? (
          <button onClick={logout} style={{background:'transparent',border:'1px solid var(--rose-500)',borderRadius:12,color:'var(--rose-500)',padding:'4px 10px'}}>Logout</button>
        ) : (
          <Link to="/login" style={{textDecoration:'none',color:'var(--rose-500)'}}>Login</Link>
        )}
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/adopt" element={<Adopt />} />
        <Route path="/pets/:id" element={<PetJourney />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppShell />
      </Router>
    </AuthProvider>
  );
}

export default App;
