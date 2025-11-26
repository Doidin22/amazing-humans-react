import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { MdAdd } from 'react-icons/md';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMyWorks() {
      if (!user?.uid) return;
      
      const q = query(collection(db, "obras"), where("autorId", "==", user.uid));
      const snapshot = await getDocs(q);
      
      let lista = [];
      snapshot.forEach((doc) => {
        lista.push({ id: doc.id, ...doc.data() });
      });
      
      setObras(lista);
      setLoading(false);
    }

    loadMyWorks();
  }, [user]);

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, borderBottom: '3px solid #4a90e2', paddingBottom: 15 }}>
        <h2 style={{ color: 'white', margin: 0 }}>Author Dashboard</h2>
        <Link to="/escrever" className="btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
          <MdAdd size={24} /> Create New Book
        </Link>
      </div>

      {obras.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, background: '#1f1f1f', borderRadius: 8 }}>
          <p style={{ color: '#aaa', marginBottom: 20 }}>You haven't published any books yet.</p>
          <Link to="/escrever" className="btn-primary" style={{ textDecoration: 'none' }}>Write Your First Story</Link>
        </div>
      ) : (
        <div className="stories-grid">
          {obras.map(obra => (
            <div key={obra.id} className="story-card" style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Capa Pequena */}
              <div style={{ height: '150px', overflow: 'hidden', position: 'relative' }}>
                {obra.capa ? (
                  <img src={obra.capa} alt={obra.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className="cover-placeholder" style={{ height: '100%', fontSize: '2rem' }}>{obra.titulo.charAt(0)}</div>
                )}
              </div>
              
              <div className="card-info">
                <h3 style={{ fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{obra.titulo}</h3>
                <p style={{ color: '#4a90e2', fontSize: '0.8rem', marginBottom: 15 }}>
                   👁️ {obra.views || 0} reads
                </p>

                {/* Ações Rápidas */}
                <div style={{ marginTop: 'auto', display: 'flex', gap: 5, flexDirection: 'column' }}>
                  <Link to={`/escrever?obraId=${obra.id}`} style={{ background: '#2d8a56', color: 'white', padding: 8, borderRadius: 4, textAlign: 'center', textDecoration: 'none', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <MdAdd /> New Chapter
                  </Link>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <Link to={`/obra/${obra.id}`} style={{ flex: 1, background: '#333', color: '#ccc', padding: 8, borderRadius: 4, textAlign: 'center', textDecoration: 'none', fontSize: '0.8rem' }}>
                       View
                    </Link>
                    
                    {/* AQUI ESTAVA O ERRO: Trocamos o botão com alert pelo Link correto */}
                    <Link 
                        to={`/editar-obra/${obra.id}`} 
                        style={{ flex: 1, background: '#d9a404', color: '#000', padding: 8, borderRadius: 4, textAlign: 'center', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 'bold' }}
                    >
                       Edit
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}