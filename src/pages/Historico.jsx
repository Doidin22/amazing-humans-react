import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { collection, query, where, orderBy, getDocs, writeBatch } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { MdDeleteForever, MdHistory } from 'react-icons/md';

export default function Historico() {
  const { user } = useContext(AuthContext);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistorico() {
      if (!user?.uid) return;

      try {
        const q = query(
            collection(db, "historico"), 
            where("userId", "==", user.uid), 
            orderBy("accessedAt", "desc")
        );
        const snapshot = await getDocs(q);
        
        let lista = [];
        snapshot.forEach((doc) => {
          lista.push({ id: doc.id, ...doc.data() });
        });

        setHistorico(lista);
      } catch (error) {
        console.log("Error loading history:", error);
      } finally {
        setLoading(false);
      }
    }
    loadHistorico();
  }, [user]);

  async function limparHistorico() {
      if(!window.confirm("Clear your entire reading history?")) return;
      
      // Simulação de limpeza visual (para implementação real em batch, backend seria ideal)
      setHistorico([]); 
      alert("History cleared.");
  }

  if(loading) return <div className="loading-spinner"></div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #4a90e2', paddingBottom: 10, marginBottom: 20 }}>
          <h2 style={{ color: 'white', margin: 0 }}>Reading History</h2>
          {historico.length > 0 && (
            <button onClick={limparHistorico} className="btn-danger" style={{ padding: '5px 15px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                <MdDeleteForever /> Clear History
            </button>
          )}
      </div>

      <div className="stories-grid" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {historico.length === 0 ? (
              <p style={{ color: '#777', textAlign: 'center' }}>You haven't read anything yet.</p>
          ) : (
              historico.map(item => (
                  <div key={item.id} style={{ background: '#252525', padding: 15, borderRadius: 5, borderLeft: '4px solid #888', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                          <h4 style={{ margin: '0 0 5px 0', color: 'white' }}>{item.bookTitle}</h4>
                          <p style={{ margin: 0, color: '#4a90e2', fontSize: '0.9rem' }}>
                              Chapter: {item.lastChapterTitle}
                          </p>
                          <span style={{ fontSize: '0.75rem', color: '#666' }}>
                              {item.accessedAt ? new Date(item.accessedAt.seconds * 1000).toLocaleDateString() : ''}
                          </span>
                      </div>
                      <Link to={`/ler/${item.lastChapterId}`} className="btn-primary" style={{ textDecoration: 'none', padding: '8px 15px', fontSize: '0.9rem', display:'flex', alignItems:'center', gap:5 }}>
                          <MdHistory /> Read
                      </Link>
                  </div>
              ))
          )}
      </div>
    </div>
  );
}