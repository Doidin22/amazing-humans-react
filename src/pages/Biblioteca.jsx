import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { 
  MdPlayArrow, MdLibraryBooks, MdCheckCircle, MdSchedule, 
  MdChevronLeft, MdChevronRight, MdFirstPage, MdLastPage 
} from 'react-icons/md';

export default function Biblioteca() {
  const { user } = useContext(AuthContext);
  const [livros, setLivros] = useState([]);
  const [abaAtual, setAbaAtual] = useState('reading'); 
  const [loading, setLoading] = useState(true);

  // Estados de Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;

  useEffect(() => {
    async function loadBiblioteca() {
      if (!user?.uid) return;

      const q = query(collection(db, "biblioteca"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      
      const listaPromessas = snapshot.docs.map(async (docSnapshot) => {
          const dadosLib = docSnapshot.data();
          let capaUrl = "";
          
          try {
              const obraRef = doc(db, "obras", dadosLib.obraId);
              const obraSnap = await getDoc(obraRef);
              if(obraSnap.exists()) {
                  capaUrl = obraSnap.data().capa || "";
              }
          } catch (err) {
              console.log("Erro ao buscar capa:", err);
          }

          return { 
              id: docSnapshot.id, 
              ...dadosLib, 
              capa: capaUrl 
          };
      });

      const listaCompleta = await Promise.all(listaPromessas);
      setLivros(listaCompleta);
      setLoading(false);
    }
    loadBiblioteca();
  }, [user]);

  async function handleStatusChange(idDoc, novoStatus) {
    if(novoStatus === 'remove') {
        if(window.confirm("Remove from library?")) {
            await deleteDoc(doc(db, "biblioteca", idDoc));
            setLivros(livros.filter(item => item.id !== idDoc));
        }
    } else {
        await updateDoc(doc(db, "biblioteca", idDoc), { status: novoStatus });
        const novaLista = livros.map(item => {
            if(item.id === idDoc) return { ...item, status: novoStatus };
            return item;
        });
        setLivros(novaLista);
    }
  }

  // Filtra e Pagina
  const livrosFiltrados = livros.filter(item => {
      const status = item.status || 'reading';
      return status === abaAtual;
  });

  const indexUltimoItem = paginaAtual * itensPorPagina;
  const indexPrimeiroItem = indexUltimoItem - itensPorPagina;
  const livrosAtuais = livrosFiltrados.slice(indexPrimeiroItem, indexUltimoItem);
  const totalPaginas = Math.ceil(livrosFiltrados.length / itensPorPagina);

  // Funções de Navegação
  const irParaProxima = () => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas));
  const irParaAnterior = () => setPaginaAtual(prev => Math.max(prev - 1, 1));
  const irParaInicio = () => setPaginaAtual(1);
  const irParaFim = () => setPaginaAtual(totalPaginas);

  // Reseta página ao trocar de aba
  const mudarAba = (novaAba) => {
      setAbaAtual(novaAba);
      setPaginaAtual(1);
  }

  if(loading) return <div className="loading-spinner"></div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 30, borderBottom: '1px solid #333', paddingBottom: 15 }}>
          <MdLibraryBooks size={28} color="#4a90e2" />
          <h2 style={{ color: 'white', margin: 0 }}>My Library</h2>
      </div>

      {/* --- ABAS --- */}
      <div style={{ display: 'flex', gap: 15, marginBottom: 30 }}>
          <button onClick={() => mudarAba('reading')} style={{ background: abaAtual === 'reading' ? '#4a90e2' : '#252525', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s', display: 'flex', alignItems: 'center', gap: 5 }}><MdPlayArrow /> Reading</button>
          <button onClick={() => mudarAba('completed')} style={{ background: abaAtual === 'completed' ? '#2d8a56' : '#252525', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s', display: 'flex', alignItems: 'center', gap: 5 }}><MdCheckCircle /> Completed</button>
          <button onClick={() => mudarAba('plan')} style={{ background: abaAtual === 'plan' ? '#d9a404' : '#252525', color: abaAtual === 'plan' ? 'black' : 'white', border: 'none', padding: '10px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s', display: 'flex', alignItems: 'center', gap: 5 }}><MdSchedule /> Plan to Read</button>
      </div>

      {/* --- CONTADOR DE PÁGINA (Topo) --- */}
      {livrosFiltrados.length > 0 && (
        <div style={{ color: '#777', marginBottom: 15, fontSize: '0.9rem', textAlign: 'right' }}>
             Showing {indexPrimeiroItem + 1}-{Math.min(indexUltimoItem, livrosFiltrados.length)} of {livrosFiltrados.length} books
        </div>
      )}

      {/* --- LISTA VERTICAL --- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {livrosAtuais.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, background: '#1f1f1f', borderRadius: 10, border: '1px dashed #444' }}>
                  <p style={{ color: '#777', fontSize: '1.1rem' }}>No books found in this shelf.</p>
                  <Link to="/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block', marginTop: 10 }}>Discover Books</Link>
              </div>
          ) : (
              livrosAtuais.map(item => (
                <div key={item.id} style={{ background: '#1f1f1f', borderRadius: '10px', overflow: 'hidden', border: '1px solid #333', display: 'flex', transition: '0.3s' }}>
                    
                    {/* CAPA (Esquerda Fixa) */}
                    <Link to={`/obra/${item.obraId}`} style={{ width: '100px', flexShrink: 0 }}>
                        {item.capa ? (
                            <img src={item.capa} alt={item.tituloObra} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '100%', height: '150px', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#555', fontWeight: 'bold' }}>
                                {item.tituloObra?.charAt(0)}
                            </div>
                        )}
                    </Link>

                    {/* CONTEÚDO (Direita) */}
                    <div style={{ flex: 1, padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        
                        <div>
                            <Link to={`/obra/${item.obraId}`} style={{ textDecoration: 'none', color: 'white' }}>
                                <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>{item.tituloObra}</h3>
                            </Link>
                            
                            {item.lastReadChapterId ? (
                                <p style={{ color: '#4a90e2', fontSize: '0.85rem', margin: 0 }}>
                                    <span style={{ color: '#888' }}>Last read:</span> {item.lastReadChapterTitle}
                                </p>
                            ) : (
                                <p style={{ color: '#777', fontSize: '0.85rem', margin: 0 }}>Not started yet</p>
                            )}
                        </div>

                        {/* BARRA DE AÇÕES */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #2a2a2a' }}>
                            
                            <select 
                                value={item.status || 'reading'} 
                                onChange={(e) => handleStatusChange(item.id, e.target.value)}
                                style={{ padding: '6px 10px', borderRadius: '5px', background: '#252525', color: '#aaa', border: '1px solid #444', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
                            >
                                <option value="reading">Reading</option>
                                <option value="completed">Completed</option>
                                <option value="plan">Plan to Read</option>
                                <option value="remove">Delete</option>
                            </select>

                            <Link 
                                to={item.lastReadChapterId ? `/ler/${item.lastReadChapterId}` : `/obra/${item.obraId}`}
                                className="btn-primary"
                                style={{ textDecoration: 'none', fontSize: '0.85rem', padding: '8px 20px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: 5 }}
                            >
                                <MdPlayArrow /> {item.lastReadChapterId ? "Continue" : "Start Reading"}
                            </Link>
                        </div>
                    </div>
                </div>
              ))
          )}
      </div>

      {/* --- PAGINAÇÃO (Rodapé) --- */}
      {livrosFiltrados.length > itensPorPagina && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 15, marginTop: 30, padding: 20, background: '#1f1f1f', borderRadius: 8, border: '1px solid #333' }}>
                <button onClick={irParaInicio} disabled={paginaAtual === 1} style={{ background: 'none', border: 'none', color: paginaAtual === 1 ? '#444' : '#4a90e2', cursor: paginaAtual === 1 ? 'default' : 'pointer' }} title="First Page"><MdFirstPage size={28} /></button>
                <button onClick={irParaAnterior} disabled={paginaAtual === 1} style={{ background: '#333', border: 'none', color: paginaAtual === 1 ? '#555' : 'white', padding: '8px 15px', borderRadius: 5, cursor: paginaAtual === 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center' }}><MdChevronLeft size={24} /> Prev</button>
                <span style={{ color: 'white', fontWeight: 'bold' }}>{paginaAtual} / {totalPaginas}</span>
                <button onClick={irParaProxima} disabled={paginaAtual === totalPaginas} style={{ background: '#333', border: 'none', color: paginaAtual === totalPaginas ? '#555' : 'white', padding: '8px 15px', borderRadius: 5, cursor: paginaAtual === totalPaginas ? 'default' : 'pointer', display: 'flex', alignItems: 'center' }}>Next <MdChevronRight size={24} /></button>
                <button onClick={irParaFim} disabled={paginaAtual === totalPaginas} style={{ background: 'none', border: 'none', color: paginaAtual === totalPaginas ? '#444' : '#4a90e2', cursor: paginaAtual === totalPaginas ? 'default' : 'pointer' }} title="Last Page"><MdLastPage size={28} /></button>
            </div>
      )}

    </div>
  );
}