import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { Link } from 'react-router-dom';
import { 
  collection, query, where, onSnapshot, 
  addDoc, doc, updateDoc, deleteDoc, serverTimestamp, 
  arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { MdArrowUpward, MdDelete, MdChatBubbleOutline } from 'react-icons/md';

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
            
            {/* COLUNA ESQUERDA (AVATAR) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 40 }}>
                {dados.autorId ? (
                    <Link to={`/usuario/${dados.autorId}`}>
                        <img 
                            src={dados.autorFoto || "https://via.placeholder.com/40"} 
                            alt="user" 
                            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid #444' }} 
                        />
                    </Link>
                ) : (
                    <img src="https://via.placeholder.com/40" alt="user" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                )}
                
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
                <div style={{ fontSize: '0.8rem', color: '#818384', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {/* NOME DO USUÁRIO (LINK) */}
                    {dados.autorId ? (
                        <Link 
                            to={`/usuario/${dados.autorId}`} 
                            style={{ color: '#D7DADC', fontWeight: 'bold', textDecoration: 'none' }}
                            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                        >
                            {dados.autorNome || "Unknown"}
                        </Link>
                    ) : (
                        <span style={{ color: '#D7DADC', fontWeight: 'bold' }}>{dados.autorNome || "Unknown"}</span>
                    )}
                    
                    <span>•</span>
                    <span>{dados.data ? new Date(dados.data.seconds * 1000).toLocaleDateString() : 'now'}</span>
                </div>

                {/* TEXTO */}
                <div style={{ color: '#e0e0e0', fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                    {dados.texto}
                </div>

                {/* BARRA DE AÇÕES */}
                <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                    <button 
                        onClick={() => handleLike(dados.id, dados.likes)}
                        style={{ background: 'none', border: 'none', color: jaCurtiu ? '#ff4500' : '#818384', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 'bold' }}
                    >
                        <MdArrowUpward size={18} /> {dados.likes?.length || 0}
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
                        <MdChatBubbleOutline size={18} /> Reply
                    </button>

                    {isOwner && (
                        <button 
                            onClick={() => handleDelete(dados.id)}
                            style={{ background: 'none', border: 'none', color: '#d9534f', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                            <MdDelete size={18} />
                        </button>
                    )}
                </div>

                {/* INPUT DE RESPOSTA */}
                {respondendoA === dados.id && (
                    <div className="animeLeft" style={{ marginTop: 10, marginBottom: 10, display: 'flex', gap: 10 }}>
                         <div style={{ width: 2, background: '#343536', marginLeft: 15 }}></div>
                         <div style={{ flex: 1 }}>
                            <textarea 
                                autoFocus
                                value={textoResposta}
                                onChange={(e) => setTextoResposta(e.target.value)}
                                placeholder={`Replying to ${dados.autorNome}...`}
                                style={{ width: '100%', background: '#272729', border: '1px solid #343536', color: 'white', padding: 10, borderRadius: 4, minHeight: 80 }}
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

                {/* FILHOS */}
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
export default function Comentarios({ targetId, targetType = 'capitulo', targetAuthorId, targetTitle }) {
  const { user } = useContext(AuthContext);
  
  const [comentarios, setComentarios] = useState([]);
  const [novoTexto, setNovoTexto] = useState('');
  
  const [respondendoA, setRespondendoA] = useState(null); 
  const [textoResposta, setTextoResposta] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, "comentarios"), 
      where("targetId", "==", targetId)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      let lista = [];
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
      
      lista.sort((a, b) => {
          const dateA = a.data ? a.data.seconds : Infinity;
          const dateB = b.data ? b.data.seconds : Infinity;
          return dateA - dateB;
      });

      setComentarios(lista);
    });

    return () => unsub();
  }, [targetId]);

  async function handleEnviar(parentId = null) {
    if (!user) return alert("Login to comment.");
    const textoFinal = parentId ? textoResposta : novoTexto;
    
    if (!textoFinal.trim()) return; 

    try {
      console.log("Tentando enviar comentário...");

      // 1. Salvar Comentário
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

      console.log("Comentário salvo!");

      // 2. Lógica de Notificação
      let paraId = null;
      let mensagem = "";

      if (parentId) {
          // Resposta -> Busca dono do comentário pai
          const comentarioPai = comentarios.find(c => c.id === parentId);
          if (comentarioPai) {
              paraId = comentarioPai.autorId;
              mensagem = `<strong>${user.name}</strong> replied to your comment.`;
              console.log("Respondendo a:", paraId);
          } else {
              console.log("Comentário pai não encontrado na lista local.");
          }
      } else {
          // Comentário Novo -> Busca dono do capítulo
          if (targetAuthorId) {
              paraId = targetAuthorId;
              mensagem = `<strong>${user.name}</strong> commented on "<strong>${targetTitle || 'your story'}</strong>".`;
              console.log("Comentando no post de:", paraId);
          } else {
              console.log("Autor do capítulo não identificado (targetAuthorId vazio). É um post antigo?");
          }
      }

      // Cria notificação se houver destino e não for auto-notificação
      if (paraId && paraId !== user.uid) {
          await addDoc(collection(db, "notificacoes"), {
              paraId: paraId,
              mensagem: mensagem,
              tipo: 'comment',
              linkDestino: `/ler/${targetId}`,
              lida: false,
              data: serverTimestamp()
          });
          console.log("Notificação enviada para:", paraId);
      } else {
          console.log("Notificação ignorada (auto-comentário ou sem destino).");
      }

      // Limpa campos
      if (parentId) {
        setRespondendoA(null);
        setTextoResposta('');
      } else {
        setNovoTexto('');
      }
      
    } catch (error) {
      console.error("Erro ao comentar:", error);
      alert("Error sending comment.");
    }
  }

  // Funções auxiliares (Like, Delete) continuam iguais
  async function handleLike(id, likesAtuais) {
    if (!user) return alert("Login to vote.");
    const docRef = doc(db, "comentarios", id);
    if (likesAtuais?.includes(user.uid)) {
      await updateDoc(docRef, { likes: arrayRemove(user.uid) });
    } else {
      await updateDoc(docRef, { likes: arrayUnion(user.uid) });
    }
  }

  async function handleDelete(id) {
    if (window.confirm("Delete comment?")) {
      await deleteDoc(doc(db, "comentarios", id));
    }
  }

  const raiz = comentarios.filter(c => !c.parentId);

  return (
    <div style={{ marginTop: 40, borderTop: '1px solid #333', paddingTop: 20 }}>
        <h3 style={{ color: '#D7DADC', fontSize: '1.1rem', marginBottom: 20 }}>
            Discussion <span style={{ color: '#818384', fontSize: '0.9rem' }}>({comentarios.length})</span>
        </h3>
        
        <div style={{ border: '1px solid #343536', borderRadius: 4, overflow: 'hidden', marginBottom: 30, background: '#1a1a1b' }}>
            <textarea 
                placeholder={user ? "What are your thoughts?" : "Login to comment..."}
                value={novoTexto}
                onChange={(e) => setNovoTexto(e.target.value)}
                disabled={!user}
                style={{ width: '100%', background: 'transparent', border: 'none', color: '#D7DADC', padding: 10, minHeight: 80, outline: 'none' }}
            />
            <div style={{ background: '#272729', padding: '5px 10px', textAlign: 'right', borderTop: '1px solid #343536', display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center' }}>
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