import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { 
  collection, query, where, onSnapshot, // Removi orderBy daqui
  addDoc, doc, updateDoc, deleteDoc, serverTimestamp, 
  arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { MdReply, MdArrowUpward, MdDelete, MdChatBubbleOutline } from 'react-icons/md';

// --- SUBCOMPONENTE DE ITEM ---
const CommentItem = ({ 
    dados, 
    profundidade = 0, 
    comentarios, 
    user, 
    respondendoA, 
    setRespondendoA, 
    textoResposta, 
    setTextoResposta, 
    handleLike, 
    handleDelete, 
    handleEnviar 
}) => {
    const respostas = comentarios.filter(c => c.parentId === dados.id);
    const jaCurtiu = dados.likes?.includes(user?.uid);
    const isOwner = user?.uid === dados.autorId;

    return (
      <div style={{ marginTop: 15, position: 'relative' }}>
        <div style={{ display: 'flex', gap: 10 }}>
            
            {/* COLUNA ESQUERDA (AVATAR + LINHA) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img 
                    src={dados.autorFoto || "https://via.placeholder.com/40"} 
                    alt="user" 
                    style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} 
                />
                {/* LINHA CONECTORA */}
                {respostas.length > 0 && (
                    <div style={{ 
                        flex: 1, 
                        width: 2, 
                        backgroundColor: '#343536', 
                        marginTop: 5, 
                        marginBottom: 5
                    }}></div>
                )}
            </div>

            {/* COLUNA DIREITA (CONTEÚDO) */}
            <div style={{ flex: 1 }}>
                
                {/* CABEÇALHO */}
                <div style={{ fontSize: '0.75rem', color: '#818384', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <strong style={{ color: '#D7DADC' }}>{dados.autorNome}</strong>
                    <span>•</span>
                    {/* Se data for null (envio imediato), mostra 'now' */}
                    <span>{dados.data ? new Date(dados.data.seconds * 1000).toLocaleDateString() : 'now'}</span>
                </div>

                {/* TEXTO */}
                <div style={{ color: '#D7DADC', fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', marginBottom: 5 }}>
                    {dados.texto}
                </div>

                {/* BARRA DE AÇÕES */}
                <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                    <button 
                        onClick={() => handleLike(dados.id, dados.likes)}
                        style={{ background: 'none', border: 'none', color: jaCurtiu ? '#ff4500' : '#818384', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 'bold' }}
                    >
                        <MdArrowUpward size={16} /> {dados.likes?.length || 0}
                    </button>

                    <button 
                        onClick={() => {
                            if (respondendoA === dados.id) {
                                setRespondendoA(null);
                                setTextoResposta('');
                            } else {
                                setRespondendoA(dados.id);
                                setTextoResposta('');
                            }
                        }}
                        style={{ background: 'none', border: 'none', color: '#818384', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 'bold' }}
                    >
                        <MdChatBubbleOutline size={16} /> Reply
                    </button>

                    {isOwner && (
                        <button 
                            onClick={() => handleDelete(dados.id)}
                            style={{ background: 'none', border: 'none', color: '#d9534f', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                            <MdDelete size={16} />
                        </button>
                    )}
                </div>

                {/* INPUT DE RESPOSTA */}
                {respondendoA === dados.id && (
                    <div className="animeLeft" style={{ marginTop: 10, marginBottom: 10, display: 'flex', gap: 5 }}>
                         <div style={{ width: 2, background: '#343536', marginRight: 10 }}></div>
                         <div style={{ flex: 1 }}>
                            <textarea 
                                autoFocus
                                value={textoResposta}
                                onChange={(e) => setTextoResposta(e.target.value)}
                                placeholder={`Replying to ${dados.autorNome}...`}
                                style={{ width: '100%', background: '#272729', border: '1px solid #343536', color: 'white', padding: 8, borderRadius: 4, minHeight: 60 }}
                            />
                            <div style={{ textAlign: 'right', marginTop: 5, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button 
                                    onClick={() => {
                                        setRespondendoA(null);
                                        setTextoResposta('');
                                    }}
                                    style={{ background: 'transparent', color: '#818384', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                                >
                                    Cancel
                                </button>
                                <button onClick={() => handleEnviar(dados.id)} className="btn-primary" style={{ padding: '5px 15px', fontSize: '0.8rem' }}>Reply</button>
                            </div>
                         </div>
                    </div>
                )}

                {/* FILHOS (RECURSIVIDADE) */}
                {respostas.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                        {respostas.map(resp => (
                            <CommentItem 
                                key={resp.id} 
                                dados={resp} 
                                profundidade={profundidade + 1}
                                comentarios={comentarios}
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
                )}
            </div>
        </div>
      </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
export default function Comentarios({ targetId, targetType = 'capitulo' }) {
  const { user } = useContext(AuthContext);
  
  const [comentarios, setComentarios] = useState([]);
  const [novoTexto, setNovoTexto] = useState('');
  
  // Estados compartilhados para respostas
  const [respondendoA, setRespondendoA] = useState(null); 
  const [textoResposta, setTextoResposta] = useState('');

  // 1. CARREGAR (CORRIGIDO: Ordenação no Cliente para evitar lag do serverTimestamp)
  useEffect(() => {
    // Removemos o orderBy("data", "asc") da query para pegar tudo, inclusive o que acabou de ser criado
    const q = query(
      collection(db, "comentarios"), 
      where("targetId", "==", targetId)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      let lista = [];
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
      
      // Ordenação via Javascript (Mais confiável para tempo real)
      // Se data for null (acabou de criar), considera como infinito (final da lista)
      lista.sort((a, b) => {
          const dateA = a.data ? a.data.seconds : Infinity;
          const dateB = b.data ? b.data.seconds : Infinity;
          return dateA - dateB;
      });

      setComentarios(lista);
    });

    return () => unsub();
  }, [targetId]);

  // 2. ENVIAR
  async function handleEnviar(parentId = null) {
    if (!user) return alert("Login to comment.");
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

      // Limpeza imediata
      if (parentId) {
        setRespondendoA(null);
        setTextoResposta('');
      } else {
        setNovoTexto('');
      }
      
    } catch (error) {
      console.error(error);
      alert("Error sending comment.");
    }
  }

  // 3. LIKE
  async function handleLike(id, likesAtuais) {
    if (!user) return alert("Login to vote.");
    const docRef = doc(db, "comentarios", id);
    if (likesAtuais?.includes(user.uid)) {
      await updateDoc(docRef, { likes: arrayRemove(user.uid) });
    } else {
      await updateDoc(docRef, { likes: arrayUnion(user.uid) });
    }
  }

  // 4. DELETAR
  async function handleDelete(id) {
    if (window.confirm("Delete comment?")) {
      await deleteDoc(doc(db, "comentarios", id));
    }
  }

  // Filtra apenas os comentários principais (sem pai)
  const raiz = comentarios.filter(c => !c.parentId);

  return (
    <div style={{ marginTop: 40, borderTop: '1px solid #333', paddingTop: 20 }}>
        <h3 style={{ color: '#D7DADC', fontSize: '1.1rem', marginBottom: 20 }}>
            Discussion <span style={{ color: '#818384', fontSize: '0.9rem' }}>({comentarios.length})</span>
        </h3>
        
        {/* INPUT NOVO COMENTÁRIO (PRINCIPAL) */}
        <div style={{ border: '1px solid #343536', borderRadius: 4, overflow: 'hidden', marginBottom: 30, background: '#1a1a1b' }}>
            <textarea 
                placeholder={user ? "What are your thoughts?" : "Login to comment..."}
                value={novoTexto}
                onChange={(e) => setNovoTexto(e.target.value)}
                disabled={!user}
                style={{ width: '100%', background: 'transparent', border: 'none', color: '#D7DADC', padding: 10, minHeight: 80, outline: 'none' }}
            />
            <div style={{ background: '#272729', padding: '5px 10px', textAlign: 'right', borderTop: '1px solid #343536', display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center' }}>
                
                {/* BOTÃO CANCELAR (Limpar) */}
                {novoTexto.length > 0 && (
                    <button 
                        onClick={() => setNovoTexto('')}
                        style={{ background: 'transparent', color: '#818384', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                    >
                        Cancel
                    </button>
                )}

                <button 
                    onClick={() => handleEnviar(null)}
                    disabled={!user || !novoTexto.trim()}
                    style={{ background: '#D7DADC', color: '#1a1a1b', border: 'none', padding: '5px 15px', borderRadius: 20, fontWeight: 'bold', cursor: 'pointer', opacity: (!user || !novoTexto.trim()) ? 0.5 : 1 }}
                >
                    Comment
                </button>
            </div>
        </div>

        {/* LISTA */}
        <div>
            {raiz.map(c => (
                <CommentItem 
                    key={c.id} 
                    dados={c} 
                    comentarios={comentarios}
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
        
        {raiz.length === 0 && <p style={{ color: '#818384', textAlign: 'center', marginTop: 40 }}>No comments yet.</p>}
    </div>
  );
}