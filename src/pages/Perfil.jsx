import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db, auth } from '../services/firebaseConnection';
import { 
    doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch 
} from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { MdSave, MdDeleteForever, MdWarning } from 'react-icons/md';
import { FaPatreon, FaDiscord, FaTwitter, FaCoffee } from 'react-icons/fa';
import toast from 'react-hot-toast';

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
  const [deleting, setDeleting] = useState(false);

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
    const toastId = toast.loading("Saving profile...");
    try {
      const userRef = doc(db, "usuarios", user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        nome: nome,
        foto: user.avatar || null,
        social: social,
        email: user.email 
      }, { merge: true });

      toast.success("Profile updated successfully!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Error saving profile.", { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
      const confirm1 = window.confirm("ARE YOU SURE? This will delete your account, library, and history.");
      if (!confirm1) return;

      const confirm2 = window.prompt("To confirm, type 'DELETE':");
      if (confirm2 !== "DELETE") return;

      setDeleting(true);
      const toastId = toast.loading("Deleting account...");

      try {
          const batch = writeBatch(db);
          const uid = user.uid;

          const userRef = doc(db, "usuarios", uid);
          batch.delete(userRef);
          
          // Deletar sub-coleções e referências (simplificado para o exemplo)
          // Em produção, use Cloud Functions para deletar recursivamente se tiver muitos dados
          
          await batch.commit();
          await deleteUser(auth.currentUser);

          toast.success("Account deleted.", { id: toastId });
      } catch (error) {
          console.error(error);
          toast.error("Error: " + error.message, { id: toastId });
      } finally {
          setDeleting(false);
      }
  }

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: 20 }}>
      
      <div className="profile-header" style={{ textAlign: 'center', background: '#1f1f1f', padding: 40, borderRadius: 10, borderBottom: '4px solid #4a90e2', marginBottom: 20 }}>
        <img src={user.avatar} alt="Perfil" style={{ width: 100, borderRadius: '50%', border: '4px solid #4a90e2', marginBottom: 20, backgroundColor: '#333' }} />
        
        <h2 style={{ color: 'white', marginBottom: 20 }}>Edit Profile</h2>

        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div>
                <label style={{ color: '#4a90e2', fontSize: '0.9rem' }}>Your Nickname</label>
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} style={{ background: '#2d2d2d', color: 'white', border: '1px solid #444', padding: 10, borderRadius: 5, width: '100%', marginTop: 5 }} />
            </div>
            
            <h4 style={{ color: '#aaa', margin: '20px 0 10px 0', borderBottom: '1px solid #333', paddingBottom: 5 }}>Social Links</h4>
            
            <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FaPatreon color="#f96854" size={20} />
                    <input type="text" placeholder="Patreon URL" value={social.patreon} onChange={(e) => setSocial({...social, patreon: e.target.value})} style={{ flex:1, background: '#252525', border:'none', padding: 10, color:'white', borderRadius: 5 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FaCoffee color="#13C3FF" size={20} />
                    <input type="text" placeholder="Ko-fi URL" value={social.kofi} onChange={(e) => setSocial({...social, kofi: e.target.value})} style={{ flex:1, background: '#252525', border:'none', padding: 10, color:'white', borderRadius: 5 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FaDiscord color="#5865F2" size={20} />
                    <input type="text" placeholder="Discord Invite" value={social.discord} onChange={(e) => setSocial({...social, discord: e.target.value})} style={{ flex:1, background: '#252525', border:'none', padding: 10, color:'white', borderRadius: 5 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FaTwitter color="#1da1f2" size={20} />
                    <input type="text" placeholder="Twitter URL" value={social.twitter} onChange={(e) => setSocial({...social, twitter: e.target.value})} style={{ flex:1, background: '#252525', border:'none', padding: 10, color:'white', borderRadius: 5 }} />
                </div>
            </div>
        </div>

        <button onClick={handleSave} disabled={saving || deleting} className="btn-primary" style={{ marginTop: 30, width: '100%', padding: 12, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
            <MdSave size={20} /> {saving ? "Saving..." : "Save Changes"}
        </button>

        <div style={{ marginTop: 40, borderTop: '1px solid #d9534f', paddingTop: 20 }}>
            <h4 style={{ color: '#d9534f', marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <MdWarning /> Danger Zone
            </h4>
            <button onClick={handleDeleteAccount} disabled={deleting} className="btn-danger" style={{ width: '100%', padding: '10px', marginTop: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5 }}>
                <MdDeleteForever size={20} /> {deleting ? "Deleting..." : "Delete Account"}
            </button>
        </div>
      </div>
    </div>
  );
}