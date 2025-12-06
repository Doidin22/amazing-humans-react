import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db, functions } from '../services/firebaseConnection';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'; 
import { httpsCallable } from 'firebase/functions';
import { 
    MdSave, MdEdit, MdPerson, MdLink, MdClose, MdImage, 
    MdMonetizationOn, MdArrowUpward, MdVerified 
} from 'react-icons/md';
import StoryCard from '../components/StoryCard';
import toast from 'react-hot-toast';

export default function Perfil() {
  const { user } = useContext(AuthContext);
  
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [preview, setPreview] = useState('');
  
  const [minhasObras, setMinhasObras] = useState([]);
  const [loadingObras, setLoadingObras] = useState(true);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    async function loadObras() {
        if(!user?.uid) return;
        try {
            const q = query(collection(db, "obras"), where("autorId", "==", user.uid));
            const snapshot = await getDocs(q);
            let lista = [];
            snapshot.forEach((doc) => lista.push({ id: doc.id, ...doc.data() }));
            setMinhasObras(lista);
        } catch(err) { console.error(err); } finally { setLoadingObras(false); }
    }
    loadObras();
  }, [user]);

  useEffect(() => {
      if(user?.avatar) { setAvatarUrl(user.avatar); setPreview(user.avatar); }
  }, [user]);

  function handleUrlChange(e) {
      const url = e.target.value;
      setAvatarUrl(url);
      if(url.length > 10) setPreview(url);
  }

  async function handleSaveAvatar() {
      if(!user?.uid) return;
      try {
          const userRef = doc(db, "usuarios", user.uid);
          await updateDoc(userRef, { foto: avatarUrl });
          toast.success("Profile picture updated!");
          setIsEditing(false);
      } catch(error) { toast.error("Error updating profile."); }
  }

  function handleCancel() {
      setIsEditing(false);
      setAvatarUrl(user?.avatar || '');
      setPreview(user?.avatar || '');
  }

  async function handleBuyCoins(dollarAmount) {
      if(buying) return;
      setBuying(true);
      const buyCoinsFunc = httpsCallable(functions, 'buyCoins');
      const toastId = toast.loading("Processing purchase...");
      
      try {
          const result = await buyCoinsFunc({ amountDollars: dollarAmount });
          if(result.data.success) {
              toast.success(`Purchased ${dollarAmount * 10} Coins!`, { id: toastId });
          } else {
              toast.error(result.data.message || "Failed.", { id: toastId });
          }
      } catch(e) {
          toast.error("Transaction failed.", { id: toastId });
      } finally {
          setBuying(false);
      }
  }

  async function handleLevelUp() {
      if(buying) return;
      if((user.coins || 0) < 100) return toast.error("Need 100 coins to level up.");
      
      setBuying(true);
      const levelUpFunc = httpsCallable(functions, 'levelUp');
      const toastId = toast.loading("Leveling up...");

      try {
          const result = await levelUpFunc({ levels: 1 });
          if(result.data.success) {
              toast.success(`Level Up! Now Level ${result.data.newLevel}`, { id: toastId });
              if(result.data.newLevel >= 100) toast("Ads Removed!", { icon: '🎉' });
          } else {
              toast.error(result.data.message, { id: toastId });
          }
      } catch(e) { toast.error("Error leveling up.", { id: toastId }); } finally { setBuying(false); }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-fade-in">
        <div className="flex flex-col md:flex-row gap-8 items-start">
            
            {/* ESQUERDA - INFO & CARTEIRA */}
            <div className="w-full md:w-1/3 flex flex-col gap-6">
                
                {/* Perfil */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-purple-900/10 opacity-50 -z-10"></div>
                    <div className="relative mb-4">
                        <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-primary to-purple-500 shadow-xl relative">
                            <img src={isEditing ? preview : (user?.avatar)} alt="Avatar" className="w-full h-full rounded-full object-cover bg-[#222]" onError={(e) => { e.target.onerror = null; e.target.src = "https://ui-avatars.com/api/?name=User&background=random"; }} />
                            {!isEditing && <button onClick={() => setIsEditing(true)} className="absolute bottom-0 right-0 bg-[#222] text-white p-2 rounded-full border border-gray-600 hover:bg-primary transition-all shadow-lg"><MdEdit size={16} /></button>}
                        </div>
                    </div>
                    
                    {/* NOME + BADGE (NOVO) */}
                    <div className="flex flex-col items-center">
                        <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                            {user?.name}
                            {user?.badges?.includes('pioneer') && (
                                <div className="relative group cursor-help">
                                    <MdVerified className="text-yellow-400 text-xl" />
                                    <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-32 bg-black/90 text-yellow-500 text-[10px] text-center p-2 rounded border border-yellow-500/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                        Founder Author (Top 100)
                                    </span>
                                </div>
                            )}
                        </h2>
                        
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-yellow-500 font-bold text-sm bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">Lvl {user?.level || 0}</span>
                            {user?.level >= 100 && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded border border-purple-500/30">No Ads</span>}
                        </div>
                    </div>

                    {isEditing && (
                        <div className="w-full bg-black/20 p-4 rounded-xl border border-white/5 animate-fade-in">
                            <label className="text-xs font-bold text-primary mb-2 block text-left flex items-center gap-1"><MdLink /> IMAGE URL</label>
                            <input type="text" value={avatarUrl} onChange={handleUrlChange} className="w-full bg-[#121212] text-sm text-gray-200 p-3 rounded-lg border border-gray-700 mb-3" />
                            <div className="flex gap-2">
                                <button onClick={handleCancel} className="flex-1 py-2 rounded-lg text-xs font-bold bg-gray-700 hover:bg-gray-600 text-white"><MdClose size={14} /> Cancel</button>
                                <button onClick={handleSaveAvatar} className="flex-1 py-2 rounded-lg text-xs font-bold bg-primary hover:bg-primary-dark text-white"><MdSave size={14} /> Save</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* CARTEIRA */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                        <MdMonetizationOn className="text-yellow-400" /> Wallet
                    </h3>
                    
                    <div className="text-center mb-6">
                        <span className="text-4xl font-bold text-white block">{user?.coins || 0}</span>
                        <span className="text-xs text-gray-400 uppercase tracking-widest">Coins Available</span>
                    </div>

                    <div className="space-y-3">
                        <button onClick={() => handleBuyCoins(1)} disabled={buying} className="w-full flex items-center justify-between bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg transition-all text-sm font-bold">
                            <span>Buy 10 Coins</span> <span>$1.00</span>
                        </button>
                        <button onClick={() => handleBuyCoins(5)} disabled={buying} className="w-full flex items-center justify-between bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg transition-all text-sm font-bold">
                            <span>Buy 50 Coins</span> <span>$5.00</span>
                        </button>
                        
                        <div className="h-px bg-white/10 my-4"></div>

                        <button onClick={handleLevelUp} disabled={buying || (user?.coins < 100)} className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white px-4 py-3 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                            <MdArrowUpward /> Level Up (100 Coins)
                        </button>
                        <p className="text-[10px] text-gray-500 text-center mt-2">Reach Level 100 to remove ads.</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Stats</h3>
                    <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-3">
                        <span className="text-sm text-gray-300">Published Works</span>
                        <span className="text-white font-bold">{minhasObras.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Role</span>
                        <span className="text-primary text-xs font-bold uppercase bg-primary/10 px-2 py-1 rounded border border-primary/20">{user?.role || 'User'}</span>
                    </div>
                </div>
            </div>

            {/* DIREITA - OBRAS */}
            <div className="w-full md:w-2/3">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6"><MdPerson className="text-primary" /> My Works</h2>
                {loadingObras ? <div className="loading-spinner"></div> : minhasObras.length === 0 ? (
                    <div className="text-center py-16 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <MdImage size={48} className="mx-auto text-gray-600 mb-4" />
                        <h3 className="text-lg font-bold text-gray-300">No stories yet</h3>
                        <p className="text-gray-500 text-sm max-w-xs mx-auto mt-2">Start writing your first masterpiece!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                        {minhasObras.map(obra => <StoryCard key={obra.id} data={obra} />)}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}