import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../services/firebaseConnection';
import { 
  doc, getDoc, collection, query, where, orderBy, getDocs, addDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { 
  MdEdit, MdMenuBook, MdPerson, MdStar, MdBookmarkAdded, MdBookmarkBorder, MdInfoOutline 
} from 'react-icons/md';
import Recomendacoes from '../components/Recomendacoes';
import RatingWidget from '../components/RatingWidget';
import DOMPurify from 'dompurify'; // <--- IMPORTANTE

export default function Obra() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);

  const [obra, setObra] = useState(null);
  const [capitulos, setCapitulos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [estaNaBiblioteca, setEstaNaBiblioteca] = useState(false);
  const [idBiblioteca, setIdBiblioteca] = useState(null);
  
  const [podeAvaliar, setPodeAvaliar] = useState(false);

  useEffect(() => {
    async function loadObra() {
      try {
        const docRef = doc(db, "obras", id);
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) {
          alert("Book not found!");
          setLoading(false);
          return;
        }

        // Tenta pegar nome atualizado do autor
        const dadosObra = { id: snapshot.id, ...snapshot.data() };
        try {
            if (dadosObra.autorId) {
                const userDocRef = doc(db, "usuarios", dadosObra.autorId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    dadosObra.autor = userDocSnap.data().nome; 
                }
            }
        } catch (err) { console.log(err); }

        setObra(dadosObra);

        const q = query(collection(db, "capitulos"), where("obraId", "==", id), orderBy("data", "asc"));
        const capsSnapshot = await getDocs(q);
        let listaCaps = [];
        capsSnapshot.forEach((doc) => listaCaps.push({ id: doc.id, ...doc.data() }));
        setCapitulos(listaCaps);

      } catch (error) {
        console.log("Error loading book:", error);
      } finally {
        setLoading(false);
      }
    }
    loadObra();
  }, [id]);

  useEffect(() => {
    async function checkLibraryAndHistory() {
      if (!user?.uid || !id) return;
      
      // 1. Checa Biblioteca
      const qLib = query(collection(db, "biblioteca"), where("userId", "==", user.uid), where("obraId", "==", id));
      const snapLib = await getDocs(qLib);
      if (!snapLib.empty) {
        setEstaNaBiblioteca(true);
        setIdBiblioteca(snapLib.docs[0].id);
      } else {
        setEstaNaBiblioteca(false);
        setIdBiblioteca(null);
      }

      // 2. CHECA HISTÓRICO (CORRIGIDO: Usa Query em vez de getDoc)
      // Isso evita o erro de permissão quando o documento não existe
      try {
        const qHist = query(
            collection(db, "historico"),
            where("userId", "==", user.uid),
            where("obraId", "==", id)
        );
        const snapHist = await getDocs(qHist);
        
        if (!snapHist.empty) {
            console.log("History found! Enabling rating.");
            setPodeAvaliar(true);
        } else {
            setPodeAvaliar(false);
        }
      } catch (err) {
          console.log("Error checking history:", err);
      }
    }
    checkLibraryAndHistory();
  }, [id, user]);

  async function toggleBiblioteca() {
      if(!user) return alert("Login to add to library.");
      if(estaNaBiblioteca) {
          await deleteDoc(doc(db, "biblioteca", idBiblioteca));
          setEstaNaBiblioteca(false);
          setIdBiblioteca(null);
      } else {
          const docRef = await addDoc(collection(db, "biblioteca"), {
              userId: user.uid, obraId: id, tituloObra: obra.titulo, status: 'reading', dataAdicao: serverTimestamp()
          });
          setEstaNaBiblioteca(true);
          setIdBiblioteca(docRef.id);
      }
  }

  const handleRatingUpdate = (newRating, newVotes) => {
      setObra(prev => ({
          ...prev,
          rating: newRating,
          votes: newVotes
      }));
  };

  if (loading) return <div className="loading-spinner"></div>;

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
        
        <div id="detalhesObra" style={{ display: 'flex', gap: '30px', padding: '30px', background: '#1f1f1f', borderRadius: '10px', marginBottom: '40px', border: '1px solid #333', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 200px', display: 'flex', justifyContent: 'center' }}>
                {obra.capa ? (
                    <img src={obra.capa} alt={obra.titulo} style={{ width: '100%', maxWidth: '200px', borderRadius: '5px', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', objectFit: 'cover' }} />
                ) : (
                    <div className="cover-placeholder" style={{ width: '200px', height: '300px', fontSize: '5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{obra.titulo?.charAt(0)}</div>
                )}
            </div>

            <div style={{ flex: 1, minWidth: '300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', marginBottom: '5px' }}>
                    <h1 style={{ color: '#4a90e2', fontSize: '2.5rem', margin: 0, lineHeight: 1.2 }}>{obra.titulo}</h1>
                    {user?.uid === obra.autorId && (
                        <Link to={`/escrever?obraId=${obra.id}`} style={{ background: '#333', color: 'white', border: '1px solid #555', padding: '5px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none', fontSize: '0.9rem' }}><MdEdit /> Edit Book</Link>
                    )}
                </div>

                <p style={{ color: '#aaa', fontSize: '1.1rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <MdPerson /> By: 
                    <Link to={`/usuario/${obra.autorId}`} style={{ color: '#4a90e2', textDecoration: 'none' }}>{obra.autor || "Unknown"}</Link>
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                    <span style={{ color: '#ffd700', fontSize: '1.2rem' }}><MdStar /></span>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{(obra.rating || 0).toFixed(1)}</span>
                    <span style={{ color: '#777', fontSize: '0.9rem' }}>({obra.votes || 0} votes)</span>
                </div>

                <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {obra.categorias?.map((cat, index) => <span key={index} style={{ background: '#333', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', color: '#aaa' }}>{cat}</span>)}
                </div>

                <div style={{ background: '#252525', padding: '15px', borderRadius: '5px', borderLeft: '3px solid #666', marginBottom: '20px' }}>
                    <h4 style={{ color: '#ddd', margin: '0 0 5px 0' }}>Synopsis</h4>
                    {/* CORREÇÃO DA SINOPSE (Renderiza HTML) */}
                    <div 
                        style={{ color: '#bbb', fontStyle: 'italic', lineHeight: '1.6' }} 
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(obra.sinopse || "No synopsis.") }}
                    />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 20, flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {capitulos.length > 0 && (
                            <Link to={`/ler/${capitulos[0].id}`} className="btn-primary" style={{ padding: '10px 20px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}><MdMenuBook /> Read</Link>
                        )}
                        <button onClick={toggleBiblioteca} style={{ background: estaNaBiblioteca ? '#d9534f' : 'transparent', border: estaNaBiblioteca ? 'none' : '2px solid #4a90e2', color: estaNaBiblioteca ? 'white' : '#4a90e2', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 'bold' }}>
                            {estaNaBiblioteca ? <><MdBookmarkAdded /> In Library</> : <><MdBookmarkBorder /> Add to Library</>}
                        </button>
                    </div>

                    {/* WIDGET DE AVALIAÇÃO */}
                    {user ? (
                        podeAvaliar ? (
                            <RatingWidget obraId={id} onRatingUpdate={handleRatingUpdate} />
                        ) : (
                            <div style={{ marginTop: 15, padding: 15, border: '1px solid #444', borderRadius: 5, color: '#777', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <MdInfoOutline /> Read at least one chapter to rate this story.
                            </div>
                        )
                    ) : null}
                </div>
            </div>
        </div>

        <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '10px', color: 'white' }}>Chapters</h3>
        <div className="stories-grid" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {capitulos.length === 0 ? ( <p style={{ color: '#777' }}>No chapters yet.</p> ) : (
                capitulos.map(cap => (
                    <Link to={`/ler/${cap.id}`} key={cap.id} style={{ textDecoration: 'none', display: 'block', background: '#252525', padding: '15px', borderRadius: '5px', borderLeft: '4px solid #4a90e2', marginBottom: '10px' }}>
                        <h4 style={{ color: 'white', margin: '0 0 5px 0' }}>{cap.titulo}</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#777' }}>
                            <span>{cap.data ? new Date(cap.data.seconds * 1000).toLocaleDateString() : 'Date unknown'}</span>
                            <span>👁️ {cap.views || 0}</span>
                        </div>
                    </Link>
                ))
            )}
        </div>

        {obra.categorias && <Recomendacoes tags={obra.categorias} currentId={id} title="Similar Stories" />}
    </div>
  );
}