import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { MdPlayArrow } from 'react-icons/md';

export default function Biblioteca() {
  const { user } = useContext(AuthContext);
  const [livros, setLivros] = useState([]);
  const [abaAtual, setAbaAtual] = useState('reading'); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBiblioteca() {
      if (!user?.uid) return;
      const q = query(collection(db, "biblioteca"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      let lista = [];
      snapshot.forEach((doc) => lista.push({ id: doc.id, ...doc.data() }));
      setLivros(lista);
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

  const livrosFiltrados = livros.filter(item => {
      const status = item.status || 'reading';
      return status === abaAtual;
  });

  if(loading) return <div className="loading-spinner"></div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: 20 }}>
      <h2 style={{ borderBottom: '3px solid #4a90e2', paddingBottom: 10, color: 'white' }}>My Library</h2>
      <div className="shelf-tabs">
          <button className={`tab-btn ${abaAtual === 'reading' ? 'active' : ''}`} onClick={() => setAbaAtual('reading')}>Reading</button>
          <button className={`tab-btn ${abaAtual === 'completed' ? 'active' : ''}`} onClick={() => setAbaAtual('completed')}>Completed</button>
          <button className={`tab-btn ${abaAtual === 'plan' ? 'active' : ''}`} onClick={() => setAbaAtual('plan')}>Plan to Read</button>
      </div>

      <div className="stories-grid" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {livrosFiltrados.length === 0 ? (
              <p style={{ color: '#777', textAlign: 'center', padding: 20 }}>No books on this shelf.</p>
          ) : (
              livrosFiltrados.map(item => (
                <div key={item.id} className="story-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', borderTop: 'none', borderLeft: '4px solid #4a90e2', padding: 15, background: '#252525' }}>
                    <div style={{ flex: 1 }}>
                        <Link to={`/obra/${item.obraId}`} style={{ textDecoration: 'none', color: 'white' }}>
                            <h3 style={{ margin: '0 0 5px 0' }}>{item.tituloObra}</h3>
                        </Link>
                        {item.lastReadChapterId ? (
                            <p style={{ color: '#4a90e2', fontSize: '0.8rem', margin: 0 }}>Left off at: {item.lastReadChapterTitle}</p>
                        ) : (
                            <p style={{ color: '#777', fontSize: '0.8rem', margin: 0 }}>Not started</p>
                        )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 140 }}>
                        <Link to={item.lastReadChapterId ? `/ler/${item.lastReadChapterId}` : `/obra/${item.obraId}`} className="btn-primary" style={{ textDecoration: 'none', fontSize: '0.8rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                            <MdPlayArrow /> Continue
                        </Link>
                        <select className="shelf-selector" value={item.status || 'reading'} onChange={(e) => handleStatusChange(item.id, e.target.value)} style={{ padding: 5, borderRadius: 5, background: '#333', color: '#ccc', border: '1px solid #444' }}>
                            <option value="reading">Reading</option>
                            <option value="completed">Completed</option>
                            <option value="plan">Plan to Read</option>
                            <option value="remove">❌ Remove</option>
                        </select>
                    </div>
                </div>
              ))
          )}
      </div>
    </div>
  );
}