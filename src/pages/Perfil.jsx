import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { doc, updateDoc, collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore'; 
import { 
    MdSave, MdEdit, MdPerson, MdLink, MdClose, MdImage, 
    MdVerified, MdPeople, MdPersonAdd, MdLibraryBooks, MdTimeline, MdAutoStories 
} from 'react-icons/md';
import { FaInstagram, FaTwitter, FaGlobe, FaPatreon, FaPaypal } from 'react-icons/fa';
import StoryCard from '../components/StoryCard';
import toast from 'react-hot-toast';

export default function Perfil() {
  const { user } = useContext(AuthContext);
  
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [social, setSocial] = useState({ website: '', twitter: '', instagram: '', patreon: '', paypal: '' });
  
  const [minhasObras, setMinhasObras] = useState([]);
  const [libraryCount, setLibraryCount] = useState(0);
  const [loadingObras, setLoadingObras] = useState(true);

  const leituras = user?.leituras || 0;
  const currentLevel = Math.floor(leituras / 20) + 1;
  const nextLevelLeituras = currentLevel * 20;
  const progress = ((leituras % 20) / 20) * 100;

  useEffect(() => {
    async function loadData() {
        if(!user?.uid) return;
        try {
            const qObras = query(collection(db, "obras"), where("autorId", "==", user.uid));
            const snap = await getDocs(qObras);
            let lista = [];
            snap.forEach((doc) => lista.push({ id: doc.id, ...doc.data() }));
            setMinhasObras(lista);

            const qLib = query(collection(db, "biblioteca"), where("userId", "==", user.uid));
            const snapLib = await getCountFromServer(qLib);
            setLibraryCount(snapLib.data().count);
        } catch(err) { console.error(err); } finally { setLoadingObras(false); }
    }
    loadData();
  }, [user]);

  useEffect(() => {
      if(user) { 
          setAvatarUrl(user.avatar || '');
          setSocial({
              website: user.website || '',
              twitter: user.twitter || '',
              instagram: user.instagram || '',
              patreon: user.patreon || '',
              paypal: user.paypal || ''
          });
      }
  }, [user]);

  async function handleSaveProfile() {
      if(!user?.uid) return;
      try {
          const userRef = doc(db, "usuarios", user.uid);
          await updateDoc(userRef, { 
              foto: avatarUrl,
              website: social.website,
              twitter: social.twitter,
              instagram: social.instagram,
              patreon: social.patreon,
              paypal: social.paypal
          });
          toast.success("Profile updated!");
          setIsEditing(false);
      } catch(error) { toast.error("Error updating profile."); }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-fade-in">
        <div className="flex flex-col md:flex-row gap-8 items-start">
            
            <div className="w-full md:w-1/3 flex flex-col gap-6">
                <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center relative overflow-hidden border border-white/5 bg-[#1a1a1a]">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-purple-900/10 opacity-50 -z-10"></div>
                    
                    <div className="relative mb-4">
                        <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-primary to-purple-500 shadow-xl relative">
                            <img src={avatarUrl || user?.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover bg-[#222]" onError={(e) => { e.target.src = "https://ui-avatars.com/api/?name=User"; }} />
                            {!isEditing && <button onClick={() => setIsEditing(true)} className="absolute bottom-0 right-0 bg-[#222] text-white p-2 rounded-full border border-gray-600 hover:bg-primary transition-all shadow-lg"><MdEdit size={16} /></button>}
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-center w-full mb-4">
                        <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                            {user?.name}
                            {user?.badges?.includes('pioneer') && <MdVerified className="text-yellow-400 text-xl" />}
                        </h2>
                        <span className="text-primary font-bold text-xs uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20">Lvl {currentLevel} Reader</span>
                    </div>

                    {!isEditing && (
                        <div className="flex flex-col gap-4 mb-6 w-full px-4">
                            <div className="flex justify-center gap-4">
                                {user?.website && <a href={user.website} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white transition-colors"><FaGlobe size={20} /></a>}
                                {user?.twitter && <a href={user.twitter} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors"><FaTwitter size={20} /></a>}
                                {user?.instagram && <a href={user.instagram} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-pink-500 transition-colors"><FaInstagram size={20} /></a>}
                            </div>
                            {(user?.patreon || user?.paypal) && (
                                <div className="flex gap-2 justify-center mt-2 border-t border-white/5 pt-4">
                                    {user.patreon && <a href={user.patreon} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-[#ff424d]/10 text-[#ff424d] hover:bg-[#ff424d] hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all border border-[#ff424d]/20"><FaPatreon /> Support</a>}
                                    {user.paypal && <a href={user.paypal} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-[#00457C]/10 text-[#00457C] hover:bg-[#00457C] hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all border border-[#00457C]/20"><FaPaypal /> Donate</a>}
                                </div>
                            )}
                        </div>
                    )}

                    {isEditing && (
                        <div className="w-full bg-black/20 p-4 rounded-xl border border-white/5 mt-4 animate-fade-in text-left">
                            <div className="space-y-3 mb-4">
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Avatar URL</label><input type="text" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="input-modern w-full text-xs" /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Website</label><input type="text" value={social.website} onChange={(e) => setSocial({...social, website: e.target.value})} className="input-modern w-full text-xs" /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Twitter</label><input type="text" value={social.twitter} onChange={(e) => setSocial({...social, twitter: e.target.value})} className="input-modern w-full text-xs" /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Instagram</label><input type="text" value={social.instagram} onChange={(e) => setSocial({...social, instagram: e.target.value})} className="input-modern w-full text-xs" /></div>
                                <div className="pt-2 border-t border-gray-700 mt-2">
                                    <p className="text-[10px] text-yellow-500 font-bold mb-2">Monetization</p>
                                    <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Patreon</label><input type="text" value={social.patreon} onChange={(e) => setSocial({...social, patreon: e.target.value})} className="input-modern w-full text-xs" /></div>
                                    <div className="mt-2"><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">PayPal</label><input type="text" value={social.paypal} onChange={(e) => setSocial({...social, paypal: e.target.value})} className="input-modern w-full text-xs" /></div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setIsEditing(false)} className="flex-1 py-2 rounded-lg text-xs font-bold bg-gray-700 hover:bg-gray-600 text-white">Cancel</button>
                                <button onClick={handleSaveProfile} className="flex-1 py-2 rounded-lg text-xs font-bold bg-primary hover:bg-primary-dark text-white">Save</button>
                            </div>
                        </div>
                    )}

                    <div className="w-full mt-2 space-y-4">
                        <div className="w-full px-2">
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1 uppercase font-bold">
                                <span>{leituras} Reads</span>
                                <span>Next: {nextLevelLeituras}</span>
                            </div>
                            <div className="w-full h-2 bg-[#111] rounded-full overflow-hidden border border-[#333]">
                                <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col items-center">
                                <span className="text-xl font-bold text-white">{user?.followersCount || 0}</span>
                                <span className="text-[10px] text-gray-400 uppercase tracking-widest flex items-center gap-1"><MdPeople /> Followers</span>
                            </div>
                            <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col items-center">
                                <span className="text-xl font-bold text-white">{user?.followingCount || 0}</span>
                                <span className="text-[10px] text-gray-400 uppercase tracking-widest flex items-center gap-1"><MdPersonAdd /> Following</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-[#1a1a1a] border border-white/5 p-6 rounded-2xl">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2"><MdTimeline className="text-green-500" /> Reader Stats</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-[#111] rounded-lg border border-[#333]">
                            <div className="flex items-center gap-3"><div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><MdLibraryBooks size={20} /></div><span className="text-sm text-gray-300">In Library</span></div>
                            <span className="text-white font-bold">{libraryCount} Books</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-[#111] rounded-lg border border-[#333]">
                            <div className="flex items-center gap-3"><div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg"><MdAutoStories size={20} /></div><span className="text-sm text-gray-300">Chapters Read</span></div>
                            <span className="text-white font-bold">{leituras}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full md:w-2/3">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><MdPerson className="text-primary" /> My Works</h2>
                    {minhasObras.length > 0 && <span className="text-xs bg-white/10 text-gray-300 px-3 py-1 rounded-full">{minhasObras.length} Stories</span>}
                </div>
                {loadingObras ? <div className="loading-spinner"></div> : minhasObras.length === 0 ? (
                    <div className="text-center py-16 bg-white/5 rounded-2xl border border-dashed border-white/10">
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