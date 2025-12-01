import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db, auth } from '../services/firebaseConnection';
import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { MdSave, MdDeleteForever, MdWarning, MdPerson } from 'react-icons/md';
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

  // Estado local para garantir que a imagem não quebre
  const [avatarUrl, setAvatarUrl] = useState("https://via.placeholder.com/150");

  useEffect(() => {
    async function loadPerfil() {
      if (!user?.uid) return;
      
      // Define a imagem inicial (do user ou gerada)
      setAvatarUrl(user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`);

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
        // Mantemos o email no banco por segurança, mas não exibimos na tela
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
    <div className="min-h-screen py-10 px-4 flex justify-center items-start">
      
      <div className="w-full max-w-2xl bg-[#1f1f1f] border border-white/5 rounded-2xl shadow-2xl overflow-hidden relative">
        
        {/* Header Decorativo (Gradiente) */}
        <div className="h-32 bg-gradient-to-r from-blue-900 to-slate-900 relative">
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                <div className="relative group">
                    {/* Efeito Glow atrás da foto */}
                    <div className="absolute inset-0 bg-blue-500 blur-xl opacity-50 rounded-full group-hover:opacity-75 transition-opacity"></div>
                    <img 
                        src={avatarUrl} 
                        alt="Profile" 
                        onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`; }}
                        className="w-24 h-24 rounded-full border-4 border-[#1f1f1f] relative z-10 object-cover bg-[#222]" 
                    />
                </div>
            </div>
        </div>

        <div className="pt-14 pb-8 px-8">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                {/* EMAIL REMOVIDO DAQUI */}
            </div>

            <div className="space-y-6">
                
                {/* Seção: Informações Básicas */}
                <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide">Display Name</label>
                    <div className="relative">
                        <MdPerson className="absolute left-4 top-3.5 text-gray-500 text-lg" />
                        <input 
                            type="text" 
                            value={nome} 
                            onChange={(e) => setNome(e.target.value)} 
                            className="w-full bg-[#151515] border border-[#333] rounded-xl py-3 pl-12 pr-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                            placeholder="Your public name"
                        />
                    </div>
                </div>

                <div className="border-t border-white/5 my-6"></div>

                {/* Seção: Links Sociais (Grid) */}
                <div>
                    <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wide">Social Links</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Patreon */}
                        <div className="relative group">
                            <FaPatreon className="absolute left-4 top-3.5 text-[#f96854] text-lg group-focus-within:text-white transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Patreon URL" 
                                value={social.patreon} 
                                onChange={(e) => setSocial({...social, patreon: e.target.value})} 
                                className="w-full bg-[#151515] border border-[#333] rounded-xl py-3 pl-12 pr-4 text-white text-sm focus:border-[#f96854] transition-all outline-none placeholder-gray-600"
                            />
                        </div>

                        {/* Ko-fi */}
                        <div className="relative group">
                            <FaCoffee className="absolute left-4 top-3.5 text-[#13C3FF] text-lg group-focus-within:text-white transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Ko-fi URL" 
                                value={social.kofi} 
                                onChange={(e) => setSocial({...social, kofi: e.target.value})} 
                                className="w-full bg-[#151515] border border-[#333] rounded-xl py-3 pl-12 pr-4 text-white text-sm focus:border-[#13C3FF] transition-all outline-none placeholder-gray-600"
                            />
                        </div>

                        {/* Discord */}
                        <div className="relative group">
                            <FaDiscord className="absolute left-4 top-3.5 text-[#5865F2] text-lg group-focus-within:text-white transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Discord Invite" 
                                value={social.discord} 
                                onChange={(e) => setSocial({...social, discord: e.target.value})} 
                                className="w-full bg-[#151515] border border-[#333] rounded-xl py-3 pl-12 pr-4 text-white text-sm focus:border-[#5865F2] transition-all outline-none placeholder-gray-600"
                            />
                        </div>

                        {/* Twitter */}
                        <div className="relative group">
                            <FaTwitter className="absolute left-4 top-3.5 text-[#1da1f2] text-lg group-focus-within:text-white transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Twitter URL" 
                                value={social.twitter} 
                                onChange={(e) => setSocial({...social, twitter: e.target.value})} 
                                className="w-full bg-[#151515] border border-[#333] rounded-xl py-3 pl-12 pr-4 text-white text-sm focus:border-[#1da1f2] transition-all outline-none placeholder-gray-600"
                            />
                        </div>
                    </div>
                </div>

                {/* Botão Salvar */}
                <button 
                    onClick={handleSave} 
                    disabled={saving || deleting} 
                    className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                    <MdSave size={20} /> {saving ? "Saving..." : "Save Changes"}
                </button>

                {/* Danger Zone */}
                <div className="mt-10 pt-6 border-t border-white/10">
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
                        <h4 className="text-red-400 font-bold flex items-center gap-2 mb-2">
                            <MdWarning /> Danger Zone
                        </h4>
                        <p className="text-gray-500 text-xs mb-4">
                            Once you delete your account, there is no going back. Please be certain.
                        </p>
                        <button 
                            onClick={handleDeleteAccount} 
                            disabled={deleting} 
                            className="w-full bg-transparent border border-red-900 text-red-500 hover:bg-red-900/20 hover:text-red-400 font-semibold py-2 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                        >
                            <MdDeleteForever size={18} /> {deleting ? "Deleting..." : "Delete Account"}
                        </button>
                    </div>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
}