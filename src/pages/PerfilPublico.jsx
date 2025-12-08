import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../services/firebaseConnection';
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'; 
import { AuthContext } from '../contexts/AuthContext';
import StoryCard from '../components/StoryCard';
import { MdVerified, MdPersonAdd, MdCheck, MdPeople, MdAutoStories, MdTimeline } from 'react-icons/md';
import toast from 'react-hot-toast';

export default function PerfilPublico() {
  const { id } = useParams(); // ID do usuário que estamos visitando
  const { user } = useContext(AuthContext); // Eu (logado)

  const [perfil, setPerfil] = useState(null);
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);

  useEffect(() => {
    async function loadData() {
        try {
            // 1. Carrega Perfil
            const userDoc = await getDoc(doc(db, "usuarios", id));
            if(userDoc.exists()) {
                setPerfil({ id: userDoc.id, ...userDoc.data() });
            }

            // 2. Carrega Obras
            const q = query(collection(db, "obras"), where("autorId", "==", id), where("status", "==", "public"));
            const snap = await getDocs(q);
            let lista = [];
            snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
            setObras(lista);

            // 3. Verifica se já sigo
            if(user?.uid) {
                const followId = `${user.uid}_${id}`;
                const followDoc = await getDoc(doc(db, "seguidores", followId));
                setIsFollowing(followDoc.exists());
            }

        } catch(e) { console.error(e); } finally { setLoading(false); }
    }
    loadData();
  }, [id, user]);

  async function handleFollow() {
      if(!user) return toast.error("Login to follow.");
      if(loadingFollow) return;
      if(user.uid === id) return toast.error("You cannot follow yourself.");

      setLoadingFollow(true);
      const followId = `${user.uid}_${id}`;
      const followRef = doc(db, "seguidores", followId);

      try {
          if(isFollowing) {
              await deleteDoc(followRef);
              setIsFollowing(false);
              toast.success("Unfollowed.");
              setPerfil(prev => ({ ...prev, followersCount: (prev.followersCount || 1) - 1 }));
          } else {
              await setDoc(followRef, {
                  followerId: user.uid,
                  followedId: id,
                  createdAt: new Date()
              });
              setIsFollowing(true);
              toast.success("Following!");
              setPerfil(prev => ({ ...prev, followersCount: (prev.followersCount || 0) + 1 }));
          }
      } catch(e) {
          console.error(e);
          toast.error("Error updating follow.");
      } finally {
          setLoadingFollow(false);
      }
  }

  if(loading) return <div className="loading-spinner"></div>;
  if(!perfil) return <div className="text-center text-white py-20">User not found.</div>;

  // CÁLCULO DE NÍVEL (Visualização)
  const leituras = perfil.contador_leituras || 0;
  const currentLevel = Math.floor(leituras / 20) + 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-fade-in">
        <div className="flex flex-col md:flex-row gap-8 items-start">
            
            {/* CARD DO PERFIL */}
            <div className="w-full md:w-1/3 space-y-6">
                <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center relative overflow-hidden border border-white/5 bg-[#1a1a1a]">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-purple-900/10 opacity-50 -z-10"></div>
                    
                    {/* Avatar */}
                    <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-primary to-purple-500 shadow-xl mb-4">
                        <img src={perfil.foto || `https://ui-avatars.com/api/?name=${perfil.nome}`} alt="Avatar" className="w-full h-full rounded-full object-cover bg-[#222]" />
                    </div>

                    {/* Nome + Badge */}
                    <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                        {perfil.nome}
                        {perfil.badges?.includes('pioneer') && <MdVerified className="text-yellow-400" title="Founder Author" />}
                    </h2>
                    
                    {/* Role + Level Badge */}
                    <div className="flex gap-2 mb-6 justify-center">
                        <span className="text-gray-400 text-xs font-bold uppercase bg-white/5 px-3 py-1 rounded border border-white/10">{perfil.role || 'User'}</span>
                        <span className="text-primary font-bold text-xs uppercase bg-primary/10 px-3 py-1 rounded border border-primary/20">Lvl {currentLevel} Reader</span>
                    </div>

                    {/* BOTÃO SEGUIR (Se não for eu mesmo) */}
                    {user?.uid !== id && (
                        <button 
                            onClick={handleFollow} 
                            disabled={loadingFollow}
                            className={`w-full py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 mb-6 transition-all ${isFollowing 
                                ? 'bg-white/10 text-gray-300 hover:bg-red-500/20 hover:text-red-400 border border-white/10' 
                                : 'bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/20'}`}
                        >
                            {loadingFollow ? 'Processing...' : isFollowing ? <><MdCheck /> Following</> : <><MdPersonAdd /> Follow</>}
                        </button>
                    )}

                    {/* CONTADORES (GRID DE 3) */}
                    <div className="grid grid-cols-3 gap-2 w-full">
                        <div className="bg-black/20 p-2 py-3 rounded-xl border border-white/5 flex flex-col items-center">
                            <span className="text-lg font-bold text-white">{perfil.followersCount || 0}</span>
                            <span className="text-[9px] text-gray-400 uppercase tracking-widest flex items-center gap-1"><MdPeople /> Fans</span>
                        </div>
                        <div className="bg-black/20 p-2 py-3 rounded-xl border border-white/5 flex flex-col items-center">
                            <span className="text-lg font-bold text-white">{perfil.followingCount || 0}</span>
                            <span className="text-[9px] text-gray-400 uppercase tracking-widest flex items-center gap-1">Following</span>
                        </div>
                        <div className="bg-black/20 p-2 py-3 rounded-xl border border-white/5 flex flex-col items-center">
                            <span className="text-lg font-bold text-white">{leituras}</span>
                            <span className="text-[9px] text-gray-400 uppercase tracking-widest flex items-center gap-1"><MdAutoStories /> Reads</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* OBRAS DO USUÁRIO */}
            <div className="w-full md:w-2/3">
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-2">
                    <MdTimeline className="text-primary" /> Published Works <span className="bg-white/10 text-xs px-2 py-1 rounded-full text-gray-300">{obras.length}</span>
                </h2>
                {obras.length === 0 ? (
                    <div className="text-center py-20 bg-[#1f1f1f] rounded-xl border border-dashed border-[#333]">
                        <p className="text-gray-500 italic">This user hasn't published any stories yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {obras.map(obra => <StoryCard key={obra.id} data={obra} />)}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}