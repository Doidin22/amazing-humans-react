import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { Link } from 'react-router-dom';
import { 
  collection, query, where, onSnapshot, 
  addDoc, doc, updateDoc, deleteDoc, serverTimestamp, 
  arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { 
  MdThumbUp, MdThumbUpOffAlt, MdThumbDownOffAlt, 
  MdDelete, MdSort, MdKeyboardArrowDown, MdKeyboardArrowUp 
} from 'react-icons/md';
import toast from 'react-hot-toast';

// Helper para avatar
const getFallbackAvatar = (name) => `https://ui-avatars.com/api/?name=${name || 'User'}&background=random`;

const ReplyItem = ({ dados, user, handleLike, handleDelete, handleResponderClick }) => {
    const jaCurtiu = dados.likes?.includes(user?.uid);
    const isOwner = user?.uid === dados.autorId;
    const timeString = dados.data ? new Date(dados.data.seconds * 1000).toLocaleDateString() : 'just now';

    const renderText = (text) => {
        const parts = text.split(' ');
        return parts.map((part, i) => {
            if (part.startsWith('@') && i === 0) { 
                return <span key={i} className="text-blue-400 font-bold mr-1">{part}</span>;
            }
            return part + ' ';
        });
    };

    return (
        <div className="flex gap-3 mb-3 group">
            <Link to={`/usuario/${dados.autorId}`} className="shrink-0">
                <img 
                    src={dados.autorFoto || getFallbackAvatar(dados.autorNome)} 
                    alt="user" className="w-6 h-6 rounded-full object-cover" 
                    onError={(e) => { e.target.src = getFallbackAvatar(dados.autorNome); }}
                />
            </Link>
            <div className="flex-1">
                <div className="flex items-center gap-2 text-[11px] mb-0.5">
                    <span className="font-bold text-white hover:text-gray-300 cursor-pointer">
                        @{dados.autorNome?.replace(/\s+/g, '').toLowerCase()}
                    </span>
                    <span className="text-gray-500">{timeString}</span>
                </div>
                <div className="text-sm text-gray-200 leading-snug mb-1">
                    {renderText(dados.texto)}
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => handleLike(dados.id, dados.likes)} className="flex items-center gap-1 p-1.5 rounded-full hover:bg-white/10 text-gray-400">
                        {jaCurtiu ? <MdThumbUp size={14} className="text-white" /> : <MdThumbUpOffAlt size={14} />}
                        <span className="text-[10px]">{dados.likes?.length || 0}</span>
                    </button>
                    <button className="p-1.5 rounded-full hover:bg-white/10 text-gray-400"><MdThumbDownOffAlt size={14} /></button>
                    <button 
                        onClick={() => handleResponderClick(dados.autorNome)} 
                        className="ml-2 px-2 py-1 rounded-full hover:bg-white/10 text-[10px] font-bold text-gray-400 hover:text-white"
                    >
                        Reply
                    </button>
                    {isOwner && (
                        <button onClick={() => handleDelete(dados.id)} className="ml-auto p-1.5 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100">
                            <MdDelete size={14} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const CommentThread = ({ 
    dados, todasRespostas, user, 
    respondendoA, setRespondendoA, textoResposta, setTextoResposta, 
    handleLike, handleDelete, handleEnviar 
}) => {
    const [mostrarRespostas, setMostrarRespostas] = useState(false);
    
    const minhasRespostas = todasRespostas.filter(r => r.parentId === dados.id);
    const jaCurtiu = dados.likes?.includes(user?.uid);
    const isOwner = user?.uid === dados.autorId;
    const timeString = dados.data ? new Date(dados.data.seconds * 1000).toLocaleDateString() : 'just now';

    const prepararResposta = (nomeUsuario) => {
        setRespondendoA(dados.id);
        setTextoResposta(`@${nomeUsuario?.replace(/\s+/g, '').toLowerCase()} `);
    };

    return (
      <div className="flex gap-4 mb-6 group">
        <Link to={`/usuario/${dados.autorId}`} className="shrink-0">
            <img 
                src={dados.autorFoto || getFallbackAvatar(dados.autorNome)} 
                alt="user" className="w-10 h-10 rounded-full object-cover" 
                onError={(e) => { e.target.src = getFallbackAvatar(dados.autorNome); }}
            />
        </Link>

        <div className="flex-1">
            <div className="flex items-center gap-2 text-xs mb-1">
                <span className="font-semibold text-white cursor-pointer hover:text-gray-300">
                    @{dados.autorNome?.replace(/\s+/g, '').toLowerCase()}
                </span>
                <span className="text-gray-500 text-[11px]">{timeString}</span>
            </div>

            <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap mb-2">
                {dados.texto}
            </div>

            <div className="flex items-center gap-1 mb-2">
                <button onClick={() => handleLike(dados.id, dados.likes)} className="flex items-center gap-1.5 p-2 rounded-full hover:bg-white/10 text-gray-400">
                    {jaCurtiu ? <MdThumbUp size={16} className="text-white" /> : <MdThumbUpOffAlt size={16} />}
                    <span className="text-xs">{dados.likes?.length || 0}</span>
                </button>
                <button className="p-2 rounded-full hover:bg-white/10 text-gray-400"><MdThumbDownOffAlt size={16} /></button>
                <button 
                    onClick={() => prepararResposta(dados.autorNome)} 
                    className="ml-2 px-3 py-1.5 rounded-full hover:bg-white/10 text-xs font-semibold text-gray-400 hover:text-white"
                >
                    Reply
                </button>
                {isOwner && (
                    <button onClick={() => handleDelete(dados.id)} className="ml-auto p-2 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100">
                        <MdDelete size={18} />
                    </button>
                )}
            </div>

            {respondendoA === dados.id && (
                <div className="mt-2 mb-4 flex gap-3 animate-fade-in">
                     <img src={user?.avatar || getFallbackAvatar(user?.name)} className="w-6 h-6 rounded-full" />
                     <div className="flex-1">
                        <input 
                            autoFocus 
                            value={textoResposta} 
                            onChange={(e) => setTextoResposta(e.target.value)} 
                            className="w-full bg-transparent border-b border-gray-700 text-white pb-1 text-sm focus:border-white focus:outline-none"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => { setRespondendoA(null); setTextoResposta(''); }} className="px-3 py-1.5 rounded-full hover:bg-white/10 text-sm font-medium text-white">Cancel</button>
                            <button onClick={() => handleEnviar(dados.id)} disabled={!textoResposta.trim()} className="px-3 py-1.5 rounded-full bg-blue-600 text-black font-bold text-sm hover:bg-blue-500 disabled:opacity-50">Reply</button>
                        </div>
                     </div>
                </div>
            )}

            {minhasRespostas.length > 0 && (
                <div>
                    <button 
                        onClick={() => setMostrarRespostas(!mostrarRespostas)}
                        className="flex items-center gap-2 text-blue-400 hover:bg-blue-500/10 px-3 py-1.5 rounded-full text-sm font-bold transition-colors mb-2"
                    >
                        {mostrarRespostas ? <MdKeyboardArrowUp /> : <MdKeyboardArrowDown />}
                        {minhasRespostas.length} replies
                    </button>

                    {mostrarRespostas && (
                        <div className="pl-0">
                            {minhasRespostas.map(resp => (
                                <ReplyItem 
                                    key={resp.id} 
                                    dados={resp} 
                                    user={user} 
                                    handleLike={handleLike} 
                                    handleDelete={handleDelete}
                                    handleResponderClick={prepararResposta} 
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    );
};

export default function Comentarios({ targetId, targetType = 'capitulo', targetAuthorId, targetTitle }) {
  const { user } = useContext(AuthContext);
  const [comentarios, setComentarios] = useState([]);
  const [novoTexto, setNovoTexto] = useState('');
  const [respondendoA, setRespondendoA] = useState(null); 
  const [textoResposta, setTextoResposta] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "comentarios"), where("targetId", "==", targetId));
    const unsub = onSnapshot(q, (snap) => {
      let lista = [];
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
      lista.sort((a, b) => { const dateA = a.data ? a.data.seconds : 0; const dateB = b.data ? b.data.seconds : 0; return dateB - dateA; });
      setComentarios(lista);
    });
    return () => unsub();
  }, [targetId]);

  async function handleEnviar(parentId = null) {
    if (!user) return toast.error("Login to comment.");
    const textoFinal = parentId ? textoResposta : novoTexto;
    if (!textoFinal.trim()) return; 
    
    try {
      await addDoc(collection(db, "comentarios"), { 
          texto: textoFinal, 
          autorId: user.uid, 
          autorNome: user.name, 
          autorFoto: user.avatar, 
          targetId: targetId, 
          targetType: targetType, 
          parentId: parentId, 
          likes: [], 
          data: serverTimestamp() 
      });

      let paraId = null;
      let mensagem = "";
      if (parentId) {
          const comentarioPai = comentarios.find(c => c.id === parentId);
          if (comentarioPai) { paraId = comentarioPai.autorId; mensagem = `<strong>${user.name}</strong> replied to your comment.`; }
      } else {
          if (targetAuthorId) { paraId = targetAuthorId; mensagem = `<strong>${user.name}</strong> commented on "<strong>${targetTitle || 'your story'}</strong>".`; }
      }
      if (paraId && paraId !== user.uid) {
          await addDoc(collection(db, "notificacoes"), { paraId: paraId, mensagem: mensagem, tipo: 'comment', linkDestino: `/ler/${targetId}`, lida: false, data: serverTimestamp() });
      }

      if (parentId) { setRespondendoA(null); setTextoResposta(''); } 
      else { setNovoTexto(''); setIsFocused(false); }
      
      toast.success("Comment posted!");
    } catch (error) { toast.error("Error sending comment."); }
  }

  async function handleLike(id, likesAtuais) {
    if (!user) return toast.error("Login to like.");
    const docRef = doc(db, "comentarios", id);
    if (likesAtuais?.includes(user.uid)) { await updateDoc(docRef, { likes: arrayRemove(user.uid) }); } 
    else { await updateDoc(docRef, { likes: arrayUnion(user.uid) }); }
  }

  async function handleDelete(id) {
    if (window.confirm("Delete comment?")) { await deleteDoc(doc(db, "comentarios", id)); }
  }

  const raiz = comentarios.filter(c => !c.parentId);
  const respostas = comentarios.filter(c => c.parentId);

  return (
    <div className="max-w-4xl mx-auto mt-10">
        <div className="flex items-center gap-8 mb-6">
            <h3 className="text-xl font-bold text-white">{comentarios.length} Comments</h3>
            <div className="flex items-center gap-2 text-gray-400 font-semibold text-sm cursor-pointer hover:text-white transition-colors">
                <MdSort size={20} /> <span>Sort by</span>
            </div>
        </div>

        <div className="flex gap-4 mb-10">
            <img src={user?.avatar || getFallbackAvatar(user?.name)} className="w-10 h-10 rounded-full object-cover" />
            <div className="flex-1">
                <input 
                    placeholder="Add a comment..." 
                    value={novoTexto} 
                    onChange={(e) => setNovoTexto(e.target.value)} 
                    onFocus={() => setIsFocused(true)}
                    disabled={!user}
                    className="w-full bg-transparent border-b border-gray-700 pb-2 text-white placeholder-gray-500 text-sm focus:border-white focus:outline-none transition-colors"
                />
                {(isFocused || novoTexto) && (
                    <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => { setIsFocused(false); setNovoTexto(''); }} className="px-4 py-2 rounded-full hover:bg-white/10 text-sm font-medium text-white">Cancel</button>
                        <button onClick={() => handleEnviar(null)} disabled={!user || !novoTexto.trim()} className={`px-4 py-2 rounded-full font-medium text-sm ${!novoTexto.trim() ? 'bg-white/10 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-black hover:bg-blue-500'}`}>Comment</button>
                    </div>
                )}
            </div>
        </div>

        <div className="space-y-4">
            {raiz.map(c => (
                <CommentThread 
                    key={c.id} 
                    dados={c} 
                    todasRespostas={respostas} 
                    user={user} 
                    respondendoA={respondendoA} 
                    setRespondendoA={setRespondendoA} 
                    textoResposta={textoResposta} 
                    setTextoResposta={setTextoResposta} 
                    handleLike={handleLike} 
                    handleDelete={handleDelete} 
                    handleEnviar={handleEnviar} 
                />
            ))}
        </div>
    </div>
  );
}