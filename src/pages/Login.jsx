import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { ConnectButton } from '@mysten/dapp-kit'; // Botão Sui
import { Navigate } from 'react-router-dom';
import { MdEmail } from 'react-icons/md';

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
             <p style={{ color: '#777', fontSize: '0.9rem' }}>Choose your login method</p>
        </div>

        {/* Opção 1: Google */}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0', color: '#555' }}>
            <div style={{ flex: 1, height: 1, background: '#333' }}></div>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>or web3</span>
            <div style={{ flex: 1, height: 1, background: '#333' }}></div>
        </div>

        {/* Opção 2: Sui Wallet */}
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
             {/* O ConnectButton da Sui não aceita width 100% direto fácil via style inline, mas vamos tentar customizar */}
             <div className="sui-wallet-wrapper" style={{ width: '100%' }}>
                <ConnectButton connectText="Connect Sui Wallet" />
             </div>
        </div>
        
        <p style={{ marginTop: '25px', fontSize: '0.8rem', color: '#666' }}>
            Don't have a wallet? <a href="https://suiet.app/" target="_blank" style={{ color: '#4a90e2' }}>Get Suiet</a>
        </p>

      </div>
    </div>
  );
}