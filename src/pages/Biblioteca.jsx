import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { 
  collection, query, where, getDocs, doc, updateDoc, deleteDoc, getDoc, orderBy 
} from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { 
  MdPlayArrow, MdLibraryBooks, MdCheckCircle, MdSchedule, 
  MdChevronLeft, MdChevronRight, MdFirstPage, MdLastPage,
  MdFavorite, MdFavoriteBorder
} from 'react-icons/md';
import toast from 'react-hot-toast';

export default function Biblioteca() {
  const { user } = useContext(AuthContext);
  const [livros, setLivros] = useState([]);
  const [abaAtual, setAbaAtual] = useState('reading'); 
  const [loading, setLoading] = useState(true);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;

  useEffect(() => {
    async function loadBiblioteca() {
      if (!user?.uid) return;

      try {
        const q = query(collection(db, "biblioteca"), where("userId", "==", user.uid));
        const snapshot = await getDocs(q);
        
        const listaPromessas = snapshot.docs.map(async (docSnapshot) => {
            const dadosLib = docSnapshot.data();
            let capaUrl = "";
            let tituloObra = dadosLib.tituloObra || "Unknown";
            let progresso = 0;
            let ultimoCapituloLido = "Not started";
            let ultimoCapituloId = null;

            try {
                const obraRef = doc(db, "obras", dadosLib.obraId);
                const obraSnap = await getDoc(obraRef);
                if(obraSnap.exists()) {
                    const dataObra = obraSnap.data();
                    capaUrl = dataObra.capa || "";
                    tituloObra = dataObra.titulo;
                }

                const histRef = doc(db, "historico", `${user.uid}_${dadosLib.obraId}`);
                const histSnap = await getDoc(histRef);
                let lastChapterId = null;
                
                if (histSnap.exists()) {
                    const dataHist = histSnap.data();
                    lastChapterId = dataHist.lastChapterId;
                    ultimoCapituloLido = dataHist.lastChapterTitle;
                    ultimoCapituloId = lastChapterId;
                }

                const qCaps = query(
                    collection(db, "capitulos"), 
                    where("obraId", "==", dadosLib.obraId),
                    orderBy("data", "asc")
                );
                const snapCaps = await getDocs(qCaps);
                const totalCaps = snapCaps.size;
                
                if (totalCaps > 0 && lastChapterId) {
                    const index = snapCaps.docs.findIndex(doc => doc.id === lastChapterId);
                    if (index !== -1) {
                        progresso = Math.round(((index + 1) / totalCaps) * 100);
                    }
                }

            } catch (err) { console.log("Erro ao carregar detalhes:", err); }

            return { 
                id: docSnapshot.id, 
                ...dadosLib, 
                tituloObra,
                capa: capaUrl,
                progresso,
                ultimoCapituloLido,
                ultimoCapituloId,
                isFavorite: dadosLib.isFavorite || false
            };
        });

        const listaCompleta = await Promise.all(listaPromessas);
        listaCompleta.sort((a, b) => b.dataAdicao?.seconds - a.dataAdicao?.seconds);
        setLivros(listaCompleta);
      } catch (error) { console.error(error); toast.error("Error loading library."); } finally { setLoading(false); }
    }
    loadBiblioteca();
  }, [user]);

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
            setLivros(livros.map(item => item.id === idDoc ? { ...item, status: novoStatus } : item));
            toast.success("Status updated!");
        } catch(e) { toast.error("Error updating status."); }
    }
  }

  async function toggleFavorite(item) {
      const novoEstado = !item.isFavorite;
      try {
          await updateDoc(doc(db, "biblioteca", item.id), { isFavorite: novoEstado });
          setLivros(livros.map(book => book.id === item.id ? { ...book, isFavorite: novoEstado } : book));
          toast.success(novoEstado ? "Added to Favorites" : "Removed from Favorites");
      } catch (error) { toast.error("Error updating favorite."); }
  }

  const livrosFiltrados = livros.filter(item => {
      if (abaAtual === 'favorites') return item.isFavorite === true;
      const status = item.status || 'reading';
      return status === abaAtual;
  });

  const indexUltimoItem = paginaAtual * itensPorPagina;
  const indexPrimeiroItem = indexUltimoItem - itensPorPagina;
  const livrosAtuais = livrosFiltrados.slice(indexPrimeiroItem, indexUltimoItem);
  const totalPaginas = Math.ceil(livrosFiltrados.length / itensPorPagina);

  const irParaProxima = () => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas));
  const irParaAnterior = () => setPaginaAtual(prev => Math.max(prev - 1, 1));
  const irParaInicio = () => setPaginaAtual(1);
  const irParaFim = () => setPaginaAtual(totalPaginas);

  const mudarAba = (novaAba) => { setAbaAtual(novaAba); setPaginaAtual(1); }

  if(loading) return <div className="loading-spinner"></div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 30, borderBottom: '1px solid #333', paddingBottom: 15 }}>
          <MdLibraryBooks size={28} color="#4a90e2" />
          <h2 style={{ color: 'white', margin: 0 }}>My Library</h2>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
          <button onClick={() => mudarAba('reading')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${abaAtual === 'reading' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#252525] text-gray-400 hover:bg-[#333]'}`}><MdPlayArrow size={18} /> Lendo</button>
          <button onClick={() => mudarAba('plan')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${abaAtual === 'plan' ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/20' : 'bg-[#252525] text-gray-400 hover:bg-[#333]'}`}><MdSchedule size={18} /> A Ler</button>
          <button onClick={() => mudarAba('completed')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${abaAtual === 'completed' ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'bg-[#252525] text-gray-400 hover:bg-[#333]'}`}><MdCheckCircle size={18} /> Lidos</button>
          <div className="w-px h-8 bg-[#333] mx-1 hidden sm:block"></div>
          <button onClick={() => mudarAba('favorites')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${abaAtual === 'favorites' ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-[#252525] text-gray-400 hover:bg-[#333]'}`}><MdFavorite size={18} /> Favoritos</button>
      </div>

      {livrosFiltrados.length > 0 && (
        <div style={{ color: '#777', marginBottom: 15, fontSize: '0.85rem', textAlign: 'right' }}>
             Showing {indexPrimeiroItem + 1}-{Math.min(indexUltimoItem, livrosFiltrados.length)} of {livrosFiltrados.length} books
        </div>
      )}

      <div className="flex flex-col gap-4">
          {livrosAtuais.length === 0 ? (
              <div className="text-center py-16 bg-[#1f1f1f] rounded-xl border border-dashed border-[#444]">
                  <p className="text-gray-500 text-lg mb-4">No books found in this section.</p>
                  <Link to="/" className="btn-primary inline-flex items-center gap-2 px-6 py-2">Discover New Books</Link>
              </div>
          ) : (
              livrosAtuais.map(item => (
                <div key={item.id} className="bg-[#1f1f1f] rounded-xl overflow-hidden border border-[#333] flex flex-col sm:flex-row transition-all hover:border-blue-500/30 group relative">
                    <button 
                        onClick={() => toggleFavorite(item)}
                        className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all opacity-0 group-hover:opacity-100"
                        title={item.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                    >
                        {item.isFavorite ? <MdFavorite className="text-red-500" /> : <MdFavoriteBorder />}
                    </button>

                    {/* CAPA COM FALLBACK PARA LOGO */}
                    <Link to={`/obra/${item.obraId}`} className="sm:w-32 h-48 sm:h-auto shrink-0 relative bg-[#111]">
                        <img 
                            src={item.capa || '/logo-ah.png'} 
                            alt={item.tituloObra} 
                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                            onError={(e) => { e.target.onerror = null; e.target.src = '/logo-ah.png'; }}
                        />
                        {item.isFavorite && <div className="absolute top-0 left-2 w-4 h-6 bg-red-600 shadow-lg clip-path-ribbon"></div>}
                    </Link>

                    <div className="flex-1 p-5 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start">
                                <Link to={`/obra/${item.obraId}`} className="text-decoration-none">
                                    <h3 className="text-white font-bold text-lg leading-tight mb-1 group-hover:text-blue-400 transition-colors">{item.tituloObra}</h3>
                                </Link>
                            </div>
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
      </div>

      {livrosFiltrados.length > itensPorPagina && (
            <div className="flex justify-center items-center gap-4 mt-8 py-4 bg-[#1f1f1f] rounded-xl border border-[#333]">
                <button onClick={irParaInicio} disabled={paginaAtual === 1} className="text-gray-500 hover:text-white disabled:opacity-30"><MdFirstPage size={24} /></button>
                <button onClick={irParaAnterior} disabled={paginaAtual === 1} className="bg-[#333] hover:bg-[#444] text-white px-3 py-1 rounded disabled:opacity-30"><MdChevronLeft /></button>
                <span className="text-sm font-bold text-gray-300">Page {paginaAtual} / {totalPaginas}</span>
                <button onClick={irParaProxima} disabled={paginaAtual === totalPaginas} className="bg-[#333] hover:bg-[#444] text-white px-3 py-1 rounded disabled:opacity-30"><MdChevronRight /></button>
                <button onClick={irParaFim} disabled={paginaAtual === totalPaginas} className="text-gray-500 hover:text-white disabled:opacity-30"><MdLastPage size={24} /></button>
            </div>
      )}

      <style>{`.clip-path-ribbon { clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%); }`}</style>
    </div>
  );
}