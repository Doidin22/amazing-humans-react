import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../services/firebaseConnection';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { 
  MdEdit, 
  MdMenuBook, 
  MdPerson, 
  MdStar, 
  MdBookmarkAdded, 
  MdBookmarkBorder 
} from 'react-icons/md';

export default function Obra() {
  const { id } = useParams(); // Pega o ID da URL
  const { user } = useContext(AuthContext);

  const [obra, setObra] = useState(null);
  const [capitulos, setCapitulos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para o Botão da Biblioteca
  const [estaNaBiblioteca, setEstaNaBiblioteca] = useState(false);
  const [idBiblioteca, setIdBiblioteca] = useState(null);

  // 1. CARREGA DADOS DA OBRA E CAPÍTULOS
  useEffect(() => {
    async function loadObra() {
      try {
        // Busca os detalhes do livro
        const docRef = doc(db, "obras", id);
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) {
          alert("Livro não encontrado!");
          setLoading(false);
          return;
        }

        setObra({ id: snapshot.id, ...snapshot.data() });

        // Busca os capítulos deste livro
        const q = query(
          collection(db, "capitulos"), 
          where("obraId", "==", id), 
          orderBy("data", "asc")
        );
        
        const capsSnapshot = await getDocs(q);
        let listaCaps = [];
        
        capsSnapshot.forEach((doc) => {
          listaCaps.push({
            id: doc.id,
            ...doc.data()
          });
        });

        setCapitulos(listaCaps);

      } catch (error) {
        console.log("Erro ao carregar obra:", error);
      } finally {
        setLoading(false);
      }
    }

    loadObra();
  }, [id]);

  // 2. VERIFICA SE ESTÁ NA BIBLIOTECA
  useEffect(() => {
    async function checkLibrary() {
      if (!user?.uid || !id) return;
      
      const q = query(
        collection(db, "biblioteca"), 
        where("userId", "==", user.uid), 
        where("obraId", "==", id)
      );
      
      const snap = await getDocs(q);
      if (!snap.empty) {
        setEstaNaBiblioteca(true);
        setIdBiblioteca(snap.docs[0].id);
      } else {
        setEstaNaBiblioteca(false);
        setIdBiblioteca(null);
      }
    }
    checkLibrary();
  }, [id, user]);

  // 3. FUNÇÃO PARA ADICIONAR/REMOVER DA BIBLIOTECA
  async function toggleBiblioteca() {
      if(!user) return alert("Faça login para adicionar à biblioteca.");

      if(estaNaBiblioteca) {
          // Remover
          await deleteDoc(doc(db, "biblioteca", idBiblioteca));
          setEstaNaBiblioteca(false);
          setIdBiblioteca(null);
      } else {
          // Adicionar
          const docRef = await addDoc(collection(db, "biblioteca"), {
              userId: user.uid,
              obraId: id,
              tituloObra: obra.titulo,
              status: 'reading', // Padrão ao adicionar
              dataAdicao: serverTimestamp()
          });
          setEstaNaBiblioteca(true);
          setIdBiblioteca(docRef.id);
      }
  }

  if (loading) {
    return <div className="loading-spinner"></div>;
  }

  // Se o autor marcou como privado e você não é o dono, esconde.
  if (obra.status === 'private' && user?.uid !== obra.autorId) {
     return (
        <div style={{ textAlign: 'center', padding: 50, color: '#aaa' }}>
            <h2>🔒 This book is private</h2>
            <Link to="/" style={{ color: '#4a90e2' }}>Go Home</Link>
        </div>
     );
  }

  return (
    <div style={{ paddingBottom: 50 }}>
        
        {/* --- CABEÇALHO DA OBRA --- */}
        <div id="detalhesObra" style={{ 
            display: 'flex', gap: '30px', padding: '30px', 
            background: '#1f1f1f', borderRadius: '10px', 
            marginBottom: '40px', border: '1px solid #333', flexWrap: 'wrap' 
        }}>
            {/* CAPA */}
            <div style={{ flex: '0 0 200px', display: 'flex', justifyContent: 'center' }}>
                {obra.capa ? (
                    <img src={obra.capa} alt={obra.titulo} style={{ width: '100%', maxWidth: '200px', borderRadius: '5px', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', objectFit: 'cover' }} />
                ) : (
                    <div className="cover-placeholder" style={{ width: '200px', height: '300px', fontSize: '5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {obra.titulo?.charAt(0)}
                    </div>
                )}
            </div>

            {/* INFORMAÇÕES */}
            <div style={{ flex: 1, minWidth: '300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', marginBottom: '5px' }}>
                    <h1 style={{ color: '#4a90e2', fontSize: '2.5rem', margin: 0, lineHeight: 1.2 }}>{obra.titulo}</h1>
                    {/* Botão de Editar (Só aparece para o dono) */}
                    {user?.uid === obra.autorId && (
                        <Link to={`/escrever?obraId=${obra.id}`} style={{ background: '#333', color: 'white', border: '1px solid #555', padding: '5px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none', fontSize: '0.9rem' }}>
                           <MdEdit /> Edit Book
                        </Link>
                    )}
                </div>

                {/* Nome do Autor com Link para Perfil */}
                <p style={{ color: '#aaa', fontSize: '1.1rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <MdPerson /> By: 
                    <Link to={`/usuario/${obra.autorId}`} style={{ color: '#4a90e2', textDecoration: 'none' }}>
                        {obra.autor || "Unknown"}
                    </Link>
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                    <span style={{ color: '#ffd700', fontSize: '1.2rem' }}><MdStar /></span>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{(obra.rating || 0).toFixed(1)}</span>
                    <span style={{ color: '#777', fontSize: '0.9rem' }}>({obra.votes || 0} votes)</span>
                </div>

                {/* Categorias */}
                <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {obra.categorias?.map((cat, index) => (
                        <span key={index} style={{ background: '#333', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', color: '#aaa' }}>
                            {cat}
                        </span>
                    ))}
                </div>

                {/* Sinopse */}
                <div style={{ background: '#252525', padding: '15px', borderRadius: '5px', borderLeft: '3px solid #666', marginBottom: '20px' }}>
                    <h4 style={{ color: '#ddd', margin: '0 0 5px 0' }}>Synopsis</h4>
                    <p style={{ color: '#bbb', fontStyle: 'italic', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                        {obra.sinopse || "No synopsis."}
                    </p>
                </div>

                {/* Botões de Ação */}
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    {/* Botão Ler Agora (Vai para o primeiro capítulo) */}
                    {capitulos.length > 0 && (
                        <Link to={`/ler/${capitulos[0].id}`} className="btn-primary" style={{ padding: '10px 20px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
                            <MdMenuBook /> Ler
                        </Link>
                    )}

                    {/* Botão Biblioteca */}
                    <button 
                        onClick={toggleBiblioteca}
                        style={{ 
                            background: estaNaBiblioteca ? '#d9534f' : 'transparent', 
                            border: estaNaBiblioteca ? 'none' : '2px solid #4a90e2',
                            color: estaNaBiblioteca ? 'white' : '#4a90e2',
                            padding: '8px 20px', 
                            borderRadius: '20px', 
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 5,
                            fontWeight: 'bold'
                        }}
                    >
                        {estaNaBiblioteca ? <><MdBookmarkAdded /> Na Biblioteca</> : <><MdBookmarkBorder /> Adicionar</>}
                    </button>
                </div>
            </div>
        </div>

        {/* --- LISTA DE CAPÍTULOS --- */}
        <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '10px', color: 'white' }}>Chapters</h3>
        
        <div className="stories-grid" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {capitulos.length === 0 ? (
                <p style={{ color: '#777' }}>No chapters yet.</p>
            ) : (
                capitulos.map(cap => (
                    <Link 
                        to={`/ler/${cap.id}`} 
                        key={cap.id} 
                        style={{ textDecoration: 'none', display: 'block', background: '#252525', padding: '15px', borderRadius: '5px', borderLeft: '4px solid #4a90e2', marginBottom: '10px' }}
                    >
                        <h4 style={{ color: 'white', margin: '0 0 5px 0' }}>{cap.titulo}</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#777' }}>
                            <span>{cap.data ? new Date(cap.data.seconds * 1000).toLocaleDateString() : 'Date unknown'}</span>
                            <span>👁️ {cap.views || 0}</span>
                        </div>
                    </Link>
                ))
            )}
        </div>

    </div>
  );
}