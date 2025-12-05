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
  MdDelete, MdSort, MdKeyboardArrowDown, MdKeyboardArrowUp,
  MdChevronLeft, MdChevronRight 
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
        <div className="flex gap-3 mb-3 group pl-4 border-l-2 border-white/5">
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
                <div className="text-sm text-gray-300 leading-snug mb-1">
                    {renderText(dados.texto)}
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => handleLike(dados.id, dados.likes)} className="flex items-center gap-1 p-1.5 rounded-full hover:bg-white/10 text-gray-400">
                        {jaCurtiu ? <MdThumbUp size={12} className="text-blue-400" /> : <MdThumbUpOffAlt size={12} />}
                        <span className="text-[10px]">{dados.likes?.length || 0}</span>
                    </button>
                    {isOwner && (
                        <button onClick={() => handleDelete(dados.id)} className="ml-auto p-1.5 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MdDelete size={12} />
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
      <div className="flex gap-4 mb-6 group bg-white/5 p-4 rounded-xl border border-white/5">
        <Link to={`/usuario/${dados.autorId}`} className="shrink-0">
            <img 
                src={dados.autorFoto || getFallbackAvatar(dados.autorNome)} 
                alt="user" className="w-10 h-10 rounded-full object-cover border border-white/10" 
                onError={(e) => { e.target.src = getFallbackAvatar(dados.autorNome); }}
            />
        </Link>

        <div className="flex-1">
            <div className="flex items-center gap-2 text-xs mb-1">
                <span className="font-bold text-white cursor-pointer hover:text-blue-400 transition-colors">
                    @{dados.autorNome?.replace(/\s+/g, '').toLowerCase()}
                </span>
                <span className="text-gray-500 text-[11px]">{timeString}</span>
            </div>

            <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap mb-3">
                {dados.texto}
            </div>

            <div className="flex items-center gap-3 mb-2 border-b border-white/5 pb-2">
                <button onClick={() => handleLike(dados.id, dados.likes)} className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors">
                    {jaCurtiu ? <MdThumbUp size={16} className="text-blue-500" /> : <MdThumbUpOffAlt size={16} />}
                    <span className="text-xs font-medium">{dados.likes?.length || 0}</span>
                </button>
                
                <button 
                    onClick={() => prepararResposta(dados.autorNome)} 
                    className="text-xs font-bold text-gray-500 hover:text-white transition-colors"
                >
                    Reply
                </button>

                {isOwner && (
                    <button onClick={() => handleDelete(dados.id)} className="ml-auto text-gray-600 hover:text-red-500 transition-colors">
                        <MdDelete size={16} />
                    </button>
                )}
            </div>

            {respondendoA === dados.id && (
                <div className="mt-3 mb-4 flex gap-3 animate-fade-in">
                     <div className="flex-1">
                        <input 
                            autoFocus 
                            value={textoResposta} 
                            onChange={(e) => setTextoResposta(e.target.value)} 
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
                            placeholder="Write a reply..."
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => { setRespondendoA(null); setTextoResposta(''); }} className="px-3 py-1 rounded text-xs font-bold text-gray-400 hover:text-white">Cancel</button>
                            <button onClick={() => handleEnviar(dados.id)} disabled={!textoResposta.trim()} className="px-4 py-1 rounded bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 disabled:opacity-50">Reply</button>
                        </div>
                     </div>
                </div>
            )}

            {minhasRespostas.length > 0 && (
                <div className="mt-2">
                    {mostrarRespostas ? (
                        <div className="animate-fade-in">
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
                            <button 
                                onClick={() => setMostrarRespostas(false)}
                                className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-white mt-2 ml-4"
                            >
                                <MdKeyboardArrowUp /> Hide replies
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setMostrarRespostas(true)}
                            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors"
                        >
                            <MdKeyboardArrowDown /> View {minhasRespostas.length} replies
                        </button>
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

  // Paginação
  const [pagina, setPagina] = useState(1);
  const ITENS_POR_PAGINA = 10;

  useEffect(() => {
    const q = query(collection(db, "comentarios"), where("targetId", "==", targetId));
    const unsub = onSnapshot(q, (snap) => {
      let lista = [];
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
      // Ordena por data (mais recente primeiro)
      lista.sort((a, b) => { 
          const dateA = a.data ? a.data.seconds : 0; 
          const dateB = b.data ? b.data.seconds : 0; 
          return dateB - dateA; 
      });
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
      else { setNovoTexto(''); setIsFocused(false); setPagina(1); } // Volta pra página 1 ao comentar
      
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

  // Lógica de Paginação
  const raiz = comentarios.filter(c => !c.parentId); // Apenas comentários principais
  const respostas = comentarios.filter(c => c.parentId);

  const totalPaginas = Math.ceil(raiz.length / ITENS_POR_PAGINA);
  const inicio = (pagina - 1) * ITENS_POR_PAGINA;
  const comentariosVisiveis = raiz.slice(inicio, inicio + ITENS_POR_PAGINA);

  const irParaAnterior = () => setPagina(p => Math.max(p - 1, 1));
  const irParaProxima = () => setPagina(p => Math.min(p + 1, totalPaginas));

  return (
    <div className="max-w-3xl mx-auto mt-12 px-4">
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {raiz.length} Comments <span className="text-xs font-normal text-gray-500">(Total)</span>
            </h3>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
                <MdSort /> <span>Newest First</span>
            </div>
        </div>

        <div className="flex gap-4 mb-10">
            <img src={user?.avatar || getFallbackAvatar(user?.name)} className="w-10 h-10 rounded-full object-cover border border-white/10" />
            <div className="flex-1">
                <div className={`bg-[#1a1a1a] border ${isFocused ? 'border-blue-500' : 'border-[#333]'} rounded-xl p-2 transition-colors`}>
                    <textarea 
                        placeholder="Add a comment..." 
                        value={novoTexto} 
                        onChange={(e) => setNovoTexto(e.target.value)} 
                        onFocus={() => setIsFocused(true)}
                        disabled={!user}
                        rows={isFocused ? 3 : 1}
                        className="w-full bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none resize-none"
                    />
                    {(isFocused || novoTexto) && (
                        <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-white/5">
                            <button onClick={() => { setIsFocused(false); setNovoTexto(''); }} className="px-4 py-1.5 rounded-full hover:bg-white/5 text-xs font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
                            <button onClick={() => handleEnviar(null)} disabled={!user || !novoTexto.trim()} className={`px-5 py-1.5 rounded-full font-bold text-xs transition-all ${!novoTexto.trim() ? 'bg-white/10 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg'}`}>Comment</button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="space-y-2">
            {comentariosVisiveis.map(c => (
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

        {/* PAGINAÇÃO */}
        {totalPaginas > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8 pt-6 border-t border-white/5">
                <button 
                    onClick={irParaAnterior} 
                    disabled={pagina === 1} 
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-white transition-colors"
                >
                    <MdChevronLeft size={24} />
                </button>
                <span className="text-sm font-bold text-gray-400">
                    Page {pagina} of {totalPaginas}
                </span>
                <button 
                    onClick={irParaProxima} 
                    disabled={pagina === totalPaginas} 
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-white transition-colors"
                >
                    <MdChevronRight size={24} />
                </button>
            </div>
        )}
    </div>
  );
}