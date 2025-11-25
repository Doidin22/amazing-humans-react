import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../services/firebaseConnection';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  setDoc, 
  deleteDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import StoryCard from '../components/StoryCard';
import { FaPatreon, FaDiscord, FaTwitter, FaCoffee, FaUserPlus, FaUserCheck } from 'react-icons/fa';

export default function PerfilPublico() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);

  const [autor, setAutor] = useState(null);
  const [obras, setObras] = useState([]);
  const [seguindo, setSeguindo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Author Data
        const userDoc = await getDoc(doc(db, "usuarios", id));
        if (userDoc.exists()) {
           setAutor(userDoc.data());
        } else {
           setAutor({ nome: "Unknown User", foto: "https://via.placeholder.com/150" });
        }

        // 2. Author Works (Public only)
        const q = query(collection(db, "obras"), where("autorId", "==", id), where("status", "==", "public"));
        const snap = await getDocs(q);
        let lista = [];
        snap.forEach(d => lista.push({id: d.id, ...d.data()}));
        setObras(lista);

        // 3. Check if following
        if (user?.uid) {
            const followId = `${user.uid}_${id}`;
            const followDoc = await getDoc(doc(db, "seguidores", followId));
            setSeguindo(followDoc.exists());
        }

      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, user]);

  async function handleFollow() {
      if(!user) return alert("Login to follow.");
      
      const followId = `${user.uid}_${id}`;
      const docRef = doc(db, "seguidores", followId);

      try {
        if(seguindo) {
            // UNFOLLOW
            await deleteDoc(docRef);
            setSeguindo(false);
        } else {
            // FOLLOW
            await setDoc(docRef, {
                seguidorId: user.uid,
                seguidorNome: user.name,
                seguidoId: id,
                seguidoNome: autor.nome,
                data: new Date()
            });

            // NOTIFICATION
            await addDoc(collection(db, "notificacoes"), {
                paraId: id,
                mensagem: `<strong>${user.name}</strong> started following you.`,
                tipo: 'follow',
                linkDestino: `/usuario/${user.uid}`,
                lida: false,
                data: serverTimestamp()
            });

            setSeguindo(true);
        }
      } catch (error) {
          console.error("Error following:", error);
          alert("Error updating follow status.");
      }
  }

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: 20 }}>
       
       <div style={{ textAlign: 'center', background: '#1f1f1f', padding: 40, borderRadius: 10, borderBottom: '4px solid #4a90e2', marginBottom: 40 }}>
            <img src={autor.foto || "https://via.placeholder.com/150"} alt={autor.nome} style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '4px solid #4a90e2', marginBottom: 15 }} />
            
            <h2 style={{ color: 'white', margin: 0 }}>{autor.nome}</h2>
            <p style={{ color: '#777' }}>Author</p>

            {/* Social Links */}
            {autor.social && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 15, marginTop: 15, flexWrap: 'wrap' }}>
                    {autor.social.patreon && <a href={autor.social.patreon} target="_blank" className="btn-social" style={{background:'#f96854', color:'white', padding:'8px 12px', borderRadius:20, textDecoration:'none', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:5}}><FaPatreon /> Patreon</a>}
                    {autor.social.kofi && <a href={autor.social.kofi} target="_blank" className="btn-social" style={{background:'#13C3FF', color:'white', padding:'8px 12px', borderRadius:20, textDecoration:'none', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:5}}><FaCoffee /> Ko-fi</a>}
                    {autor.social.discord && <a href={autor.social.discord} target="_blank" className="btn-social" style={{background:'#5865F2', color:'white', padding:'8px 12px', borderRadius:20, textDecoration:'none', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:5}}><FaDiscord /> Discord</a>}
                    {autor.social.twitter && <a href={autor.social.twitter} target="_blank" className="btn-social" style={{background:'#1da1f2', color:'white', padding:'8px 12px', borderRadius:20, textDecoration:'none', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:5}}><FaTwitter /> Twitter</a>}
                </div>
            )}

            {/* Follow Button */}
            {user?.uid !== id && (
                <button 
                    onClick={handleFollow}
                    style={{ 
                        marginTop: 20, 
                        background: seguindo ? '#333' : '#4a90e2', 
                        color: 'white', 
                        border: 'none', 
                        padding: '10px 30px', 
                        borderRadius: 20, 
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'inline-flex', alignItems: 'center', gap: 8
                    }}
                >
                    {seguindo ? <><FaUserCheck /> Following</> : <><FaUserPlus /> Follow</>}
                </button>
            )}
       </div>

       <h3 style={{ color: 'white', borderBottom: '1px solid #333', paddingBottom: 10 }}>Published Works</h3>
       
       {obras.length === 0 ? (
           <p style={{ color: '#777' }}>This author hasn't published anything yet.</p>
       ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
            {obras.map(livro => (
                <StoryCard key={livro.id} data={livro} />
            ))}
        </div>
       )}

    </div>
  );
}