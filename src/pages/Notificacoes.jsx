import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore'; // <--- writeBatch adicionado
import { useNavigate } from 'react-router-dom';
import { MdNotifications, MdPersonAdd, MdComment, MdMenuBook, MdDeleteForever } from 'react-icons/md'; // <--- Ícone novo
import DOMPurify from 'dompurify';

export default function Notificacoes() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
        collection(db, "notificacoes"), 
        where("paraId", "==", user.uid), 
        orderBy("data", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let lista = [];
      snapshot.forEach((doc) => {
        lista.push({ id: doc.id, ...doc.data() });
      });
      setNotificacoes(lista);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  async function handleClick(notif) {
      if (!notif.lida) {
          const docRef = doc(db, "notificacoes", notif.id);
          await updateDoc(docRef, { lida: true });
      }

      let destino = notif.linkDestino || "/";
      destino = destino.replace('.html', '');
      
      if(destino.includes('perfil_publico?uid=')) destino = destino.replace('perfil_publico?uid=', 'usuario/');
      if(destino.includes('obra?id=')) destino = destino.replace('obra?id=', 'obra/');
      if(destino.includes('ler?id=')) destino = destino.replace('ler?id=', 'ler/');

      navigate(destino);
  }

  // --- NOVA FUNÇÃO: LIMPAR TUDO ---
  async function limparNotificacoes() {
      if(!window.confirm("Clear all notifications?")) return;

      try {
        const batch = writeBatch(db);
        notificacoes.forEach(notif => {
            const docRef = doc(db, "notificacoes", notif.id);
            batch.delete(docRef);
        });

        await batch.commit();
        // Não precisa atualizar o estado manual, o onSnapshot fará isso
      } catch(error) {
          console.error("Error clearing notifications:", error);
          alert("Error clearing notifications.");
      }
  }

  const getIcon = (tipo) => {
      switch(tipo) {
          case 'follow': return <MdPersonAdd size={24} />;
          case 'chapter': return <MdMenuBook size={24} />;
          case 'comment': return <MdComment size={24} />;
          default: return <MdNotifications size={24} />;
      }
  };

  if(loading) return <div className="loading-spinner"></div>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #4a90e2', paddingBottom: 10, marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: 10 }}>
              <MdNotifications /> Notifications
          </h2>
          
          {/* BOTÃO DE LIMPAR */}
          {notificacoes.length > 0 && (
            <button onClick={limparNotificacoes} className="btn-danger" style={{ padding: '5px 15px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                <MdDeleteForever /> Clear All
            </button>
          )}
      </div>

      <div className="notif-list">
        {notificacoes.length === 0 ? (
            <p style={{ color: '#777', textAlign: 'center', marginTop: 20 }}>No notifications yet.</p>
        ) : (
            notificacoes.map(item => (
                <div 
                    key={item.id} 
                    className={`notif-item ${!item.lida ? 'unread' : ''}`}
                    onClick={() => handleClick(item)}
                    style={{ 
                        background: item.lida ? '#1f1f1f' : '#2a2a2a',
                        borderLeft: item.lida ? '1px solid #333' : '4px solid #4a90e2',
                        padding: 15, marginBottom: 10, borderRadius: 5, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 15
                    }}
                >
                    <div className="notif-icon" style={{ color: '#4a90e2' }}>
                        {getIcon(item.tipo)}
                    </div>
                    
                    <div className="notif-content" style={{ flex: 1 }}>
                        <div 
                            className="notif-text" 
                            style={{ color: item.lida ? '#aaa' : 'white', fontSize: '0.95rem' }}
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.mensagem) }} 
                        />
                        <div className="notif-date" style={{ fontSize: '0.75rem', color: '#666', marginTop: 5 }}>
                            {item.data ? new Date(item.data.seconds * 1000).toLocaleDateString() : "Just now"}
                        </div>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
}