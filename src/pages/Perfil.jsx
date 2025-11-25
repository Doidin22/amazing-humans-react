import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { MdSave } from 'react-icons/md';
import { FaPatreon, FaDiscord, FaTwitter, FaCoffee } from 'react-icons/fa';

export default function Perfil() {
  const { user } = useContext(AuthContext);

  const [nome, setNome] = useState('');
  const [social, setSocial] = useState({
    patreon: '',
    kofi: '',
    discord: '',
    twitter: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadPerfil() {
      if (!user?.uid) return;

      const docRef = doc(db, "usuarios", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const dados = docSnap.data();
        setNome(dados.nome || user.name);
        if (dados.social) setSocial(dados.social);
      } else {
        setNome(user.name);
      }
      setLoading(false);
    }
    loadPerfil();
  }, [user]);

  async function handleSave() {
    setSaving(true);
    try {
      const userRef = doc(db, "usuarios", user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        nome: nome,
        foto: user.avatar || null,
        social: social,
        email: user.email 
      }, { merge: true });

      alert("Profile updated successfully!");
    } catch (error) {
      console.error(error);
      alert("Error saving profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: 20 }}>
      
      <div className="profile-header" style={{ textAlign: 'center', background: '#1f1f1f', padding: 40, borderRadius: 10, borderBottom: '4px solid #4a90e2' }}>
        <img src={user.avatar} alt="Perfil" style={{ width: 100, borderRadius: '50%', border: '4px solid #4a90e2', marginBottom: 20 }} />
        
        <h2 style={{ color: 'white', marginBottom: 20 }}>Edit Profile</h2>

        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div>
                <label style={{ color: '#4a90e2', fontSize: '0.9rem' }}>Your Nickname</label>
                <input 
                    type="text" 
                    value={nome} 
                    onChange={(e) => setNome(e.target.value)} 
                    style={{ background: '#2d2d2d', color: 'white', border: '1px solid #444', padding: 10, borderRadius: 5, width: '100%', marginTop: 5 }}
                />
            </div>

            <h4 style={{ color: '#aaa', margin: '20px 0 10px 0', borderBottom: '1px solid #333', paddingBottom: 5 }}>Social Links (Optional)</h4>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FaPatreon color="#f96854" size={24} />
                <input type="text" placeholder="Patreon URL" value={social.patreon} onChange={(e) => setSocial({...social, patreon: e.target.value})} style={{ flex:1, background: '#252525', border:'none', padding: 10, color:'white', borderRadius: 5 }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FaCoffee color="#13C3FF" size={24} />
                <input type="text" placeholder="Ko-fi URL" value={social.kofi} onChange={(e) => setSocial({...social, kofi: e.target.value})} style={{ flex:1, background: '#252525', border:'none', padding: 10, color:'white', borderRadius: 5 }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FaDiscord color="#5865F2" size={24} />
                <input type="text" placeholder="Discord Invite Link" value={social.discord} onChange={(e) => setSocial({...social, discord: e.target.value})} style={{ flex:1, background: '#252525', border:'none', padding: 10, color:'white', borderRadius: 5 }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FaTwitter color="#1da1f2" size={24} />
                <input type="text" placeholder="Twitter/X URL" value={social.twitter} onChange={(e) => setSocial({...social, twitter: e.target.value})} style={{ flex:1, background: '#252525', border:'none', padding: 10, color:'white', borderRadius: 5 }} />
            </div>
        </div>

        <button 
            onClick={handleSave} 
            disabled={saving}
            className="btn-primary" 
            style={{ marginTop: 30, width: '100%', padding: 12, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}
        >
            <MdSave size={20} /> {saving ? "Saving..." : "Save Changes"}
        </button>

      </div>
    </div>
  );
}