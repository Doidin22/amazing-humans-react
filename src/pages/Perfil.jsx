import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'; 
import { MdSave, MdEdit, MdPerson, MdEmail, MdLink, MdClose, MdImage } from 'react-icons/md';
import StoryCard from '../components/StoryCard'; // Reaproveitando o card de histórias
import toast from 'react-hot-toast';

export default function Perfil() {
  const { user } = useContext(AuthContext);
  
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [preview, setPreview] = useState('');
  
  const [minhasObras, setMinhasObras] = useState([]);
  const [loadingObras, setLoadingObras] = useState(true);

  // Carrega as obras do usuário
  useEffect(() => {
    async function loadObras() {
        if(!user?.uid) return;
        try {
            const q = query(collection(db, "obras"), where("autorId", "==", user.uid));
            const snapshot = await getDocs(q);
            let lista = [];
            snapshot.forEach((doc) => {
                lista.push({ id: doc.id, ...doc.data() });
            });
            setMinhasObras(lista);
        } catch(err) {
            console.error("Erro ao buscar obras", err);
        } finally {
            setLoadingObras(false);
        }
    }
    loadObras();
  }, [user]);

  // Inicializa o input com a foto atual
  useEffect(() => {
      if(user?.avatar) {
          setAvatarUrl(user.avatar);
          setPreview(user.avatar);
      }
  }, [user]);

  // Atualiza o preview ao digitar (se for uma URL válida visualmente)
  function handleUrlChange(e) {
      const url = e.target.value;
      setAvatarUrl(url);
      if(url.length > 10) setPreview(url);
  }

  // Salva no Firestore
  async function handleSaveAvatar() {
      if(!user?.uid) return;
      
      try {
          const userRef = doc(db, "usuarios", user.uid);
          await updateDoc(userRef, {
              foto: avatarUrl
          });
          toast.success("Profile picture updated!");
          setIsEditing(false);
      } catch(error) {
          console.error(error);
          toast.error("Error updating profile.");
      }
  }

  // Cancela a edição e volta ao original
  function handleCancel() {
      setIsEditing(false);
      setAvatarUrl(user?.avatar || '');
      setPreview(user?.avatar || '');
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-fade-in">
        
        <div className="flex flex-col md:flex-row gap-8 items-start">
            
            {/* COLUNA DA ESQUERDA - INFO DO USUÁRIO */}
            <div className="w-full md:w-1/3 flex flex-col gap-6">
                
                {/* Cartão de Perfil (Glass Effect) */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center relative overflow-hidden group">
                    
                    {/* Background Decorativo Suave */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-purple-900/10 opacity-50 -z-10"></div>

                    <div className="relative mb-4">
                        {/* Imagem de Perfil */}
                        <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-primary to-purple-500 shadow-xl relative">
                            <img 
                                src={isEditing ? preview : (user?.avatar)} 
                                alt="Avatar" 
                                className="w-full h-full rounded-full object-cover bg-[#222]"
                                onError={(e) => { e.target.onerror = null; e.target.src = "https://ui-avatars.com/api/?name=User&background=random"; }}
                            />
                            
                            {/* Botão Flutuante de Editar */}
                            {!isEditing && (
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className="absolute bottom-0 right-0 bg-[#222] text-white p-2 rounded-full border border-gray-600 hover:bg-primary hover:border-primary transition-all shadow-lg"
                                    title="Change Photo"
                                >
                                    <MdEdit size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-1">{user?.name}</h2>
                    <p className="text-gray-400 text-sm mb-6 flex items-center gap-2 justify-center opacity-80">
                        <MdEmail size={14} /> {user?.email}
                    </p>

                    {/* MODO DE EDIÇÃO */}
                    {isEditing && (
                        <div className="w-full bg-black/20 p-4 rounded-xl border border-white/5 animate-fade-in">
                            <label className="text-xs font-bold text-primary mb-2 block text-left flex items-center gap-1">
                                <MdLink /> IMAGE URL
                            </label>
                            <input 
                                type="text" 
                                value={avatarUrl}
                                onChange={handleUrlChange}
                                placeholder="https://imgur.com/..."
                                className="w-full bg-[#121212] text-sm text-gray-200 p-3 rounded-lg border border-gray-700 focus:border-primary focus:outline-none mb-3"
                            />
                            
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleCancel}
                                    className="flex-1 py-2 rounded-lg text-xs font-bold bg-gray-700 hover:bg-gray-600 text-white transition-colors flex items-center justify-center gap-1"
                                >
                                    <MdClose size={14} /> Cancel
                                </button>
                                <button 
                                    onClick={handleSaveAvatar}
                                    className="flex-1 py-2 rounded-lg text-xs font-bold bg-primary hover:bg-primary-dark text-white transition-colors flex items-center justify-center gap-1 shadow-lg shadow-primary/20"
                                >
                                    <MdSave size={14} /> Save
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 text-left">
                                Tip: Right-click an image online and choose "Copy Image Link".
                            </p>
                        </div>
                    )}
                </div>

                {/* Estatísticas Rápidas (Opcional) */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Stats</h3>
                    <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-3">
                        <span className="text-sm text-gray-300">Published Works</span>
                        <span className="text-white font-bold">{minhasObras.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Role</span>
                        <span className="text-primary text-xs font-bold uppercase bg-primary/10 px-2 py-1 rounded border border-primary/20">
                            {user?.role || 'User'}
                        </span>
                    </div>
                </div>

            </div>

            {/* COLUNA DA DIREITA - OBRAS DO USUÁRIO */}
            <div className="w-full md:w-2/3">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <MdPerson className="text-primary" /> My Works
                    </h2>
                    {/* Botão para criar nova obra se quiser adicionar aqui */}
                    {/* <Link to="/escrever" className="...">Nova Obra</Link> */}
                </div>

                {loadingObras ? (
                    <div className="flex justify-center py-20"><div className="loading-spinner"></div></div>
                ) : minhasObras.length === 0 ? (
                    <div className="text-center py-16 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <MdImage size={48} className="mx-auto text-gray-600 mb-4" />
                        <h3 className="text-lg font-bold text-gray-300">No stories yet</h3>
                        <p className="text-gray-500 text-sm max-w-xs mx-auto mt-2">
                            You haven't published any stories yet. Start writing your first masterpiece!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                        {minhasObras.map(obra => (
                            <StoryCard key={obra.id} data={obra} />
                        ))}
                    </div>
                )}
            </div>

        </div>
    </div>
  );
}