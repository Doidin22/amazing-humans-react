import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { 
  collection, query, where, getDocs, doc, updateDoc, deleteDoc, getDoc, orderBy, limit, startAfter 
} from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { 
  MdPlayArrow, MdLibraryBooks, MdCheckCircle, MdSchedule, 
  MdFavorite, MdFavoriteBorder, MdExpandMore, MdDelete
} from 'react-icons/md';
import toast from 'react-hot-toast';

export default function Biblioteca() {
  const { user } = useContext(AuthContext);
  
  const [livros, setLivros] = useState([]);
  const [abaAtual, setAbaAtual] = useState('reading'); 
  const [loading, setLoading] = useState(true);
  
  // Paginação
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const ITEMS_PER_PAGE = 10;

  // Recarrega quando muda a aba ou o usuário
  useEffect(() => {
    setLivros([]); // Limpa lista visualmente para evitar confusão
    setLastDoc(null);
    setHasMore(true);
    if(user?.uid) {
        loadBiblioteca(true);
    }
  }, [user, abaAtual]);

  async function loadBiblioteca(isNew = false) {
      if (!user?.uid) return;
      if (isNew) setLoading(true); else setLoadingMore(true);

      try {
        const libRef = collection(db, "biblioteca");
        let constraints = [
            where("userId", "==", user.uid),
            orderBy("dataAdicao", "desc"),
            limit(ITEMS_PER_PAGE)
        ];

        // Filtro Server-Side (Economiza leituras)
        if (abaAtual === 'favorites') {
            constraints.push(where("isFavorite", "==", true));
        } else {
            // Nota: Requer índice composto (userId + status + dataAdicao) no Firestore.
            // O console do navegador vai dar o link se faltar.
            constraints.push(where("status", "==", abaAtual));
        }

        // Paginação
        if (!isNew && lastDoc) {
            constraints.push(startAfter(lastDoc));
        }

        const q = query(libRef, ...constraints);
        const snapshot = await getDocs(q);

        // Atualiza Cursor
        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        setLastDoc(lastVisible);
        if (snapshot.docs.length < ITEMS_PER_PAGE) setHasMore(false);

        // --- FETCH DE DETALHES (SÓ PARA OS 10 ITENS ATUAIS) ---
        // Aqui está a grande economia: só buscamos detalhes do lote atual.
        const listaPromessas = snapshot.docs.map(async (docSnapshot) => {
            const dadosLib = docSnapshot.data();
            
            // Valores padrão (rápido)
            let detalhes = {
                id: docSnapshot.id,
                ...dadosLib,
                tituloObra: dadosLib.tituloObra || "Unknown",
                capa: "",
                progresso: 0,
                ultimoCapituloLido: "Not started",
                ultimoCapituloId: null,
                isFavorite: dadosLib.isFavorite || false
            };

            // Busca Detalhes da Obra (Capa)
            try {
                // 1. Capa
                const obraRef = doc(db, "obras", dadosLib.obraId);
                const obraSnap = await getDoc(obraRef);
                if(obraSnap.exists()) {
                    detalhes.capa = obraSnap.data().capa || "";
                    detalhes.tituloObra = obraSnap.data().titulo;
                }

                // 2. Histórico de Leitura
                const histRef = doc(db, "historico", `${user.uid}_${dadosLib.obraId}`);
                const histSnap = await getDoc(histRef);
                
                if (histSnap.exists()) {
                    const dataHist = histSnap.data();
                    detalhes.ultimoCapituloId = dataHist.lastChapterId;
                    detalhes.ultimoCapituloLido = dataHist.lastChapterTitle;
                    
                    // Cálculo de progresso (Opcional: Pode ser pesado, remover se quiser ultra-performance)
                    // Para ultra-performance, o ideal seria salvar o "totalCapitulos" na obra e não contar collection
                    const qCaps = query(collection(db, "capitulos"), where("obraId", "==", dadosLib.obraId), orderBy("data", "asc"));
                    const snapCaps = await getDocs(qCaps);
                    if (!snapCaps.empty && detalhes.ultimoCapituloId) {
                        const index = snapCaps.docs.findIndex(d => d.id === detalhes.ultimoCapituloId);
                        if (index !== -1) {
                            detalhes.progresso = Math.round(((index + 1) / snapCaps.size) * 100);
                        }
                    }
                }
            } catch (err) { console.error("Erro detalhes:", err); }

            return detalhes;
        });

        const novosLivros = await Promise.all(listaPromessas);

        if (isNew) {
            setLivros(novosLivros);
        } else {
            setLivros(prev => [...prev, ...novosLivros]);
        }

      } catch (error) { 
          console.error(error); 
          toast.error("Error loading library."); 
      } finally { 
          setLoading(false); 
          setLoadingMore(false); 
      }
  }

  async function handleStatusChange(idDoc, novoStatus) {
    if(novoStatus === 'remove') {
        if(window.confirm("Remove from library?")) {
            try {
                await deleteDoc(doc(db, "biblioteca", idDoc));
                setLivros(livros.filter(item => item.id !== idDoc));
                toast.success("Book removed.");
            } catch(e) { toast.error("Error removing book."); }
        }
    } else {
        try {
            await updateDoc(doc(db, "biblioteca", idDoc), { status: novoStatus });
            // Remove da lista visualmente se mudar de aba (ex: de Lendo para Lido)
            if (abaAtual !== 'favorites') { // Em favoritos não remove
                 setLivros(livros.filter(item => item.id !== idDoc));
            } else {
                 // Se estiver na aba Favoritos, apenas atualiza o estado interno
                 setLivros(livros.map(item => item.id === idDoc ? { ...item, status: novoStatus } : item));
            }
            toast.success("Status updated!");
        } catch(e) { toast.error("Error updating status."); }
    }
  }

  async function toggleFavorite(item) {
      const novoEstado = !item.isFavorite;
      try {
          await updateDoc(doc(db, "biblioteca", item.id), { isFavorite: novoEstado });
          
          if (abaAtual === 'favorites' && !novoEstado) {
              setLivros(livros.filter(book => book.id !== item.id));
          } else {
              setLivros(livros.map(book => book.id === item.id ? { ...book, isFavorite: novoEstado } : book));
          }
          toast.success(novoEstado ? "Added to Favorites" : "Removed from Favorites");
      } catch (error) { toast.error("Error updating favorite."); }
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px', paddingBottom: '80px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 30, borderBottom: '1px solid #333', paddingBottom: 15 }}>
          <MdLibraryBooks size={28} color="#4a90e2" />
          <h2 style={{ color: 'white', margin: 0 }}>My Library</h2>
      </div>

      {/* ABAS (Mudam a Query) */}
      <div className="flex flex-wrap gap-3 mb-8">
          <button onClick={() => setAbaAtual('reading')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${abaAtual === 'reading' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#252525] text-gray-400 hover:bg-[#333]'}`}><MdPlayArrow size={18} /> Lendo</button>
          <button onClick={() => setAbaAtual('plan')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${abaAtual === 'plan' ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/20' : 'bg-[#252525] text-gray-400 hover:bg-[#333]'}`}><MdSchedule size={18} /> A Ler</button>
          <button onClick={() => setAbaAtual('completed')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${abaAtual === 'completed' ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'bg-[#252525] text-gray-400 hover:bg-[#333]'}`}><MdCheckCircle size={18} /> Lidos</button>
          <div className="w-px h-8 bg-[#333] mx-1 hidden sm:block"></div>
          <button onClick={() => setAbaAtual('favorites')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${abaAtual === 'favorites' ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-[#252525] text-gray-400 hover:bg-[#333]'}`}><MdFavorite size={18} /> Favoritos</button>
      </div>

      {loading ? (
          <div className="loading-spinner"></div>
      ) : (
          <div className="flex flex-col gap-4">
              {livros.length === 0 ? (
                  <div className="text-center py-16 bg-[#1f1f1f] rounded-xl border border-dashed border-[#444]">
                      <p className="text-gray-500 text-lg mb-4">No books found in this section.</p>
                      <Link to="/" className="btn-primary inline-flex items-center gap-2 px-6 py-2">Discover New Books</Link>
                  </div>
              ) : (
                  livros.map(item => (
                    <div key={item.id} className="bg-[#1f1f1f] rounded-xl overflow-hidden border border-[#333] flex flex-col sm:flex-row transition-all hover:border-blue-500/30 group relative">
                        <button 
                            onClick={() => toggleFavorite(item)}
                            className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all opacity-0 group-hover:opacity-100"
                            title={item.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                        >
                            {item.isFavorite ? <MdFavorite className="text-red-500" /> : <MdFavoriteBorder />}
                        </button>

                        {/* CAPA */}
                        <Link to={`/obra/${item.obraId}`} className="sm:w-32 h-48 sm:h-auto shrink-0 relative bg-[#111]">
                            <img 
                                src={item.capa || '/logo-ah.png'} 
                                loading="lazy" 
                                alt={item.tituloObra} 
                                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                                onError={(e) => { e.target.onerror = null; e.target.src = '/logo-ah.png'; }}
                            />
                            {item.isFavorite && <div className="absolute top-0 left-2 w-4 h-6 bg-red-600 shadow-lg clip-path-ribbon"></div>}
                        </Link>

                        <div className="flex-1 p-5 flex flex-col justify-between">
                            <div>
                                <Link to={`/obra/${item.obraId}`} className="text-decoration-none">
                                    <h3 className="text-white font-bold text-lg leading-tight mb-1 group-hover:text-blue-400 transition-colors">{item.tituloObra}</h3>
                                </Link>
                                <div className="mt-3">
                                    <div className="flex justify-between items-center text-xs text-gray-400 mb-1 font-bold uppercase tracking-wide">
                                        <span>Progress</span>
                                        <span className={item.progresso === 100 ? "text-green-500" : "text-blue-400"}>{item.progresso}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                                        <div className={`h-full transition-all duration-1000 ${item.progresso === 100 ? 'bg-green-600' : 'bg-blue-600'}`} style={{ width: `${item.progresso}%` }}></div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Last read: <span className="text-gray-300 italic">{item.ultimoCapituloLido}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-[#2a2a2a]">
                                <div className="flex items-center gap-2">
                                    <select 
                                        value={item.status || 'reading'} 
                                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
                                        className="bg-[#252525] text-gray-400 text-xs py-1.5 px-3 rounded-lg border border-[#444] outline-none cursor-pointer focus:border-blue-500 transition-colors"
                                    >
                                        <option value="reading">Lendo</option>
                                        <option value="completed">Lido</option>
                                        <option value="plan">A Ler</option>
                                        <option value="remove">Remover</option>
                                    </select>
                                </div>
                                <Link 
                                    to={item.ultimoCapituloId ? `/ler/${item.ultimoCapituloId}` : `/obra/${item.obraId}`}
                                    className={`px-5 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${item.progresso === 100 ? 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'}`}
                                >
                                    <MdPlayArrow size={16} /> {item.ultimoCapituloId ? "Continuar" : "Começar"}
                                </Link>
                            </div>
                        </div>
                    </div>
                  ))
              )}
              
              {/* Botão Load More (Otimizado) */}
              {hasMore && (
                  <button 
                    onClick={() => loadBiblioteca(false)} 
                    disabled={loadingMore}
                    className="mt-4 mx-auto px-6 py-2 bg-[#252525] hover:bg-[#333] border border-[#444] rounded-full text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                  >
                      {loadingMore ? 'Loading...' : <>Load More <MdExpandMore size={18} /></>}
                  </button>
              )}
          </div>
      )}
      
      <style>{`.clip-path-ribbon { clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%); }`}</style>
    </div>
  );
}