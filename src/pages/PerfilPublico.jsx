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
    <div className="max-w-5xl mx-auto px-4 py-10 animate-fade-in">
       
       {/* Cartão do Perfil com Glassmorphism */}
       <div className="glass-panel rounded-2xl p-8 mb-12 flex flex-col items-center text-center relative overflow-hidden">
            {/* Background Decorativo */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-900/50 to-purple-900/50 -z-10"></div>
            
            <div className="relative mt-10 mb-4 group">
                <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-500"></div>
                <img 
                    src={autor?.foto || getFallbackAvatar(autor?.nome)} 
                    alt={autor?.nome} 
                    className="relative w-32 h-32 rounded-full object-cover border-4 border-[#121212] bg-[#222]" 
                    onError={(e) => { e.target.src = getFallbackAvatar(autor?.nome); }} 
                />
            </div>

            <h2 className="text-3xl font-bold text-white mb-1">{autor?.nome}</h2>
            <p className="text-blue-400 text-sm font-medium tracking-wide uppercase mb-6">Author</p>

            {/* Redes Sociais */}
            {autor?.social && (
                <div className="flex justify-center gap-3 mb-6 flex-wrap">
                    {autor.social.patreon && <a href={autor.social.patreon} target="_blank" className="bg-[#f96854] hover:brightness-110 text-white p-2 rounded-full transition-transform hover:-translate-y-1"><FaPatreon size={18} /></a>}
                    {autor.social.kofi && <a href={autor.social.kofi} target="_blank" className="bg-[#13C3FF] hover:brightness-110 text-white p-2 rounded-full transition-transform hover:-translate-y-1"><FaCoffee size={18} /></a>}
                    {autor.social.discord && <a href={autor.social.discord} target="_blank" className="bg-[#5865F2] hover:brightness-110 text-white p-2 rounded-full transition-transform hover:-translate-y-1"><FaDiscord size={18} /></a>}
                    {autor.social.twitter && <a href={autor.social.twitter} target="_blank" className="bg-[#1da1f2] hover:brightness-110 text-white p-2 rounded-full transition-transform hover:-translate-y-1"><FaTwitter size={18} /></a>}
                </div>
            )}

            {user?.uid !== id && (
                <button 
                    onClick={handleFollow} 
                    className={`
                        px-8 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 transition-all shadow-lg
                        ${seguindo 
                            ? 'bg-white/10 text-gray-300 hover:bg-red-500/20 hover:text-red-400 border border-white/10' 
                            : 'bg-primary hover:bg-primary-dark text-white hover:shadow-blue-500/25'
                        }
                    `}
                >
                    {seguindo ? <><FaUserCheck /> Following</> : <><FaUserPlus /> Follow</>}
                </button>
            )}
       </div>

       {/* Seção de Obras */}
       <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
           <h3 className="text-xl font-bold text-white">Published Works</h3>
           <span className="bg-white/10 text-xs px-2 py-1 rounded text-gray-400">{obras.length}</span>
       </div>

       {obras.length === 0 ? ( 
           <div className="text-center py-20 opacity-50 border border-dashed border-gray-700 rounded-xl">
               <p>This author hasn't published anything yet.</p>
           </div> 
       ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {obras.map(livro => <StoryCard key={livro.id} data={livro} />)}
        </div>
       )}
    </div>
  );
}