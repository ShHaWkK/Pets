import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (e) {
      setError('Invalid credentials');
    }
    setLoading(false);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Login</h1>
        <p>Sign in to manage your pets</p>
      </header>
      <div style={{maxWidth:420,margin:'0 auto'}}>
        <div style={{marginBottom:10}}>
          <label>Email</label>
          <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="admin@example.com" style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--border-glass)',background:'rgba(255,255,255,0.85)'}} />
        </div>
        <div style={{marginBottom:10}}>
          <label>Password</label>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Your password" style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--border-glass)',background:'rgba(255,255,255,0.85)'}} />
        </div>
        {error && <div style={{color:'red',marginBottom:10}}>{error}</div>}
        <button onClick={handleLogin} disabled={loading} className="btn-brand" style={{width:'100%'}}>{loading?'Signing in…':'Sign In'}</button>
      </div>
    </div>
  );
};

export default Login;