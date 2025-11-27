import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db, auth } from '../services/firebaseConnection';
import { 
    doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, writeBatch 
} from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { MdSave, MdDeleteForever, MdWarning } from 'react-icons/md';
import { FaPatreon, FaDiscord, FaTwitter, FaCoffee } from 'react-icons/fa';
import toast from 'react-hot-toast'; // <--- IMPORTANTE

export default function Perfil() {
  const { user, logout } = useContext(AuthContext);

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

      const confirm2 = window.prompt("Your stories and comments will REMAIN visible as 'Unknown User'. To confirm, type 'DELETE':");
      if (confirm2 !== "DELETE") return;

      setDeleting(true);
      const toastId = toast.loading("Deleting account...");

      try {
          const batch = writeBatch(db);
          const uid = user.uid;

          const userRef = doc(db, "usuarios", uid);
          batch.delete(userRef);
          const statusRef = doc(db, "status_usuario", uid);
          batch.delete(statusRef);

          const qLib = query(collection(db, "biblioteca"), where("userId", "==", uid));
          const snapLib = await getDocs(qLib);
          snapLib.forEach(d => batch.delete(d.ref));

          const qHist = query(collection(db, "historico"), where("userId", "==", uid));
          const snapHist = await getDocs(qHist);
          snapHist.forEach(d => batch.delete(d.ref));

          const qNotif = query(collection(db, "notificacoes"), where("paraId", "==", uid));
          const snapNotif = await getDocs(qNotif);
          snapNotif.forEach(d => batch.delete(d.ref));
          
          const qSeguindo = query(collection(db, "seguidores"), where("seguidorId", "==", uid));
          const snapSeguindo = await getDocs(qSeguindo);
          snapSeguindo.forEach(d => batch.delete(d.ref));

          const qSeguidores = query(collection(db, "seguidores"), where("seguidoId", "==", uid));
          const snapSeguidores = await getDocs(qSeguidores);
          snapSeguidores.forEach(d => batch.delete(d.ref));

          await batch.commit();

          const userAuth = auth.currentUser;
          await deleteUser(userAuth);

          toast.success("Account deleted.", { id: toastId });
      } catch (error) {
          console.error("Erro ao deletar conta:", error);
          if (error.code === 'auth/requires-recent-login') {
              toast.error("Please logout and login again before deleting.", { id: toastId });
          } else {
              toast.error("Error: " + error.message, { id: toastId });
          }
      } finally {
          setDeleting(false);
      }
  }

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: 20 }}>
      
      <div className="profile-header" style={{ textAlign: 'center', background: '#1f1f1f', padding: 40, borderRadius: 10, borderBottom: '4px solid #4a90e2', marginBottom: 20 }}>
        <img src={user.avatar} alt="Perfil" style={{ width: 100, borderRadius: '50%', border: '4px solid #4a90e2', marginBottom: 20 }} />
        
        <h2 style={{ color: 'white', marginBottom: 20 }}>Edit Profile</h2>

        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div>
                <label style={{ color: '#4a90e2', fontSize: '0.9rem' }}>Your Nickname</label>
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} style={{ background: '#2d2d2d', color: 'white', border: '1px solid #444', padding: 10, borderRadius: 5, width: '100%', marginTop: 5 }} />
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

        <button onClick={handleSave} disabled={saving || deleting} className="btn-primary" style={{ marginTop: 30, width: '100%', padding: 12, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
            <MdSave size={20} /> {saving ? "Saving..." : "Save Changes"}
        </button>

        <div style={{ marginTop: 50, borderTop: '1px solid #d9534f', paddingTop: 20 }}>
            <h4 style={{ color: '#d9534f', marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <MdWarning /> Danger Zone
            </h4>
            <p style={{ fontSize: '0.8rem', color: '#aaa' }}>
                Deleting your account will remove your profile, library, and history. <br/>
                <strong>Your published stories will NOT be deleted.</strong>
            </p>
            <button onClick={handleDeleteAccount} disabled={deleting} className="btn-danger" style={{ width: '100%', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5 }}>
                <MdDeleteForever size={20} /> {deleting ? "Deleting..." : "Delete Account"}
            </button>
        </div>
      </div>
    </div>
  );
}