import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../services/firebaseConnection';
import { 
  doc, getDoc, collection, query, where, getDocs, setDoc, deleteDoc, addDoc, serverTimestamp
} from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import StoryCard from '../components/StoryCard';
import { FaPatreon, FaDiscord, FaTwitter, FaCoffee, FaUserPlus, FaUserCheck } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function PerfilPublico() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);

  const [autor, setAutor] = useState(null);
  const [obras, setObras] = useState([]);
  const [seguindo, setSeguindo] = useState(false);
  const [loading, setLoading] = useState(true);

  // Helper para avatar
  const getFallbackAvatar = (name) => `https://ui-avatars.com/api/?name=${name || 'User'}&background=random`;

  useEffect(() => {
    async function loadData() {
      try {
        let dadosAutor = { nome: "Unknown User", foto: "" };
        const userDoc = await getDoc(doc(db, "usuarios", id));
        if (userDoc.exists()) { dadosAutor = userDoc.data(); } 
        
        const q = query(collection(db, "obras"), where("autorId", "==", id), where("status", "==", "public"));
        const snap = await getDocs(q);
        let listaObras = [];
        snap.forEach(d => {
            const data = d.data();
            listaObras.push({id: d.id, ...data});
            if (!userDoc.exists() && data.autor) { dadosAutor.nome = data.autor; }
        });
        setAutor(dadosAutor);
        setObras(listaObras);
        
        if (user?.uid) {
            const followId = `${user.uid}_${id}`;
            const followDoc = await getDoc(doc(db, "seguidores", followId));
            setSeguindo(followDoc.exists());
        }
      } catch (err) { console.log("Error loading profile:", err); } finally { setLoading(false); }
    }
    loadData();
  }, [id, user]);

  async function handleFollow() {
      if(!user) return toast.error("Login to follow.");
      
      const followId = `${user.uid}_${id}`;
      const docRef = doc(db, "seguidores", followId);

      try {
        if(seguindo) {
            await deleteDoc(docRef);
            setSeguindo(false);
            toast.success("Unfollowed");
        } else {
            await setDoc(docRef, {
                seguidorId: user.uid, seguidorNome: user.name, seguidoId: id, seguidoNome: autor.nome, data: new Date()
            });
            await addDoc(collection(db, "notificacoes"), {
                paraId: id, mensagem: `<strong>${user.name}</strong> started following you.`, tipo: 'follow', linkDestino: `/usuario/${user.uid}`, lida: false, data: serverTimestamp()
            });
            setSeguindo(true);
            toast.success("Following!");
        }
      } catch (error) { console.error(error); toast.error("Error updating follow status."); }
  }

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: 20 }}>
       <div style={{ textAlign: 'center', background: '#1f1f1f', padding: 40, borderRadius: 10, borderBottom: '4px solid #4a90e2', marginBottom: 40 }}>
            <img 
                src={autor?.foto || getFallbackAvatar(autor?.nome)} 
                alt={autor?.nome} 
                style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '4px solid #4a90e2', marginBottom: 15, backgroundColor: '#333' }} 
                onError={(e) => { e.target.src = getFallbackAvatar(autor?.nome); }} 
            />
            <h2 style={{ color: 'white', margin: 0 }}>{autor?.nome}</h2>
            <p style={{ color: '#777' }}>Author</p>
            {autor?.social && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 15, marginTop: 15, flexWrap: 'wrap' }}>
                    {autor.social.patreon && <a href={autor.social.patreon} target="_blank" className="btn-social" style={{background:'#f96854', color:'white', padding:'8px 12px', borderRadius:20, textDecoration:'none', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:5}}><FaPatreon /> Patreon</a>}
                    {autor.social.kofi && <a href={autor.social.kofi} target="_blank" className="btn-social" style={{background:'#13C3FF', color:'white', padding:'8px 12px', borderRadius:20, textDecoration:'none', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:5}}><FaCoffee /> Ko-fi</a>}
                    {autor.social.discord && <a href={autor.social.discord} target="_blank" className="btn-social" style={{background:'#5865F2', color:'white', padding:'8px 12px', borderRadius:20, textDecoration:'none', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:5}}><FaDiscord /> Discord</a>}
                    {autor.social.twitter && <a href={autor.social.twitter} target="_blank" className="btn-social" style={{background:'#1da1f2', color:'white', padding:'8px 12px', borderRadius:20, textDecoration:'none', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:5}}><FaTwitter /> Twitter</a>}
                </div>
            )}
            {user?.uid !== id && (
                <button onClick={handleFollow} style={{ marginTop: 20, background: seguindo ? '#333' : '#4a90e2', color: 'white', border: 'none', padding: '10px 30px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {seguindo ? <><FaUserCheck /> Following</> : <><FaUserPlus /> Follow</>}
                </button>
            )}
       </div>
       <h3 style={{ color: 'white', borderBottom: '1px solid #333', paddingBottom: 10 }}>Published Works</h3>
       {obras.length === 0 ? ( <p style={{ color: '#777' }}>This author hasn't published anything yet.</p> ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
            {obras.map(livro => <StoryCard key={livro.id} data={livro} />)}
        </div>
       )}
    </div>
  );
}