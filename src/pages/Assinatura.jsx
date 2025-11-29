import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { MdStar, MdCheck, MdDiamond } from 'react-icons/md';

export default function Assinatura() {
  const { isVip } = useContext(AuthContext);

  const handleAssinar = () => {
      alert("Payment system (Stripe/PayPal) coming soon!");
  };

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '20px', textAlign: 'center' }}>
      <MdDiamond size={60} color="#00d2ff" style={{ marginBottom: 20 }} />
      <h1 style={{ color: 'white', fontSize: '2.5rem', margin: '0 0 10px 0' }}>Premium Membership</h1>
      <p style={{ color: '#aaa', marginBottom: '50px', fontSize: '1.1rem' }}>
        Support the platform and unlock exclusive benefits.
      </p>

      {isVip() ? (
        <div style={{ background: 'linear-gradient(135deg, #2d8a56 0%, #1e5c39 100%)', padding: 40, borderRadius: 15, color: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '1px solid #45a049' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
             <MdCheck size={32} /> You are Premium!
          </h2>
          <p style={{ opacity: 0.8 }}>Enjoy your benefits.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: '#1f1f1f', border: '2px solid #3da6f5', borderRadius: 20, padding: 40, maxWidth: 450, width: '100%', position: 'relative', boxShadow: '0 0 30px rgba(61, 166, 245, 0.1)' }}>
              <div style={{ position: 'absolute', top: -15, left: '50%', transform: 'translateX(-50%)', background: '#3da6f5', color: 'white', padding: '5px 20px', borderRadius: 20, fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '1px' }}>
                MOST POPULAR
              </div>
              
              <h3 style={{ color: 'white', fontSize: '1.8rem', margin: '10px 0' }}>Monthly VIP</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 5, margin: '30px 0' }}>
                <span style={{ fontSize: '3.5rem', color: 'white', fontWeight: 'bold' }}>$4.99</span>
                <span style={{ fontSize: '1.2rem', color: '#3da6f5', fontWeight: 'bold' }}>/mo</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', color: '#ccc', marginBottom: 40, display: 'flex', flexDirection: 'column', gap: 15 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '1rem' }}><MdStar color="#ffd700" size={20} /> No ads while reading</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '1rem' }}><MdStar color="#ffd700" size={20} /> Exclusive profile badge</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '1rem' }}><MdStar color="#ffd700" size={20} /> Support platform & authors</li>
              </ul>

              <button 
                onClick={handleAssinar} 
                className="btn-header-login"
                style={{ width: '100%', padding: '15px', fontSize: '1.1rem', borderRadius: '12px', cursor: 'pointer' }}
              >
                Subscribe Now
              </button>
            </div>
        </div>
      )}
    </div>
  );
}