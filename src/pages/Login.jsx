import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { signed, signInGoogle } = useContext(AuthContext);

  if (signed) {
    return <Navigate to="/" />;
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', padding: 20 }}>
      <div style={{ background: '#1f1f1f', padding: '40px', borderRadius: '10px', border: '1px solid #333', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
        
        <div style={{ marginBottom: 30 }}>
             <img src="/logo-ah.png" alt="Logo" style={{ width: 80, marginBottom: 10 }} />
             <h1 style={{ color: 'white', fontSize: '1.5rem', margin: 0 }}>Welcome Back</h1>
             <p style={{ color: '#777', fontSize: '0.9rem' }}>Access your account</p>
        </div>

        <button 
            onClick={signInGoogle} 
            style={{ 
                width: '100%', padding: '12px', borderRadius: '8px', border: 'none', 
                background: 'white', color: '#333', fontWeight: 'bold', fontSize: '1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', marginBottom: 20
            }}
        >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" style={{width: 20}}/>
            Sign in with Google
        </button>

      </div>
    </div>
  );
}