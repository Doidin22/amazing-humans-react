import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../services/firebaseConnection';
import { doc, getDoc, updateDoc, increment, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import DOMPurify from 'dompurify';
import { MdArrowBack, MdNavigateBefore, MdNavigateNext } from 'react-icons/md';
import Comentarios from '../components/Comentarios'; // Componente de comentários

export default function Ler() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [capitulo, setCapitulo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [prevId, setPrevId] = useState(null);
  const [nextId, setNextId] = useState(null);

  useEffect(() => {
    async function loadCapitulo() {
      setLoading(true);
      try {
        const docRef = doc(db, "capitulos", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          alert("Capítulo não encontrado.");
          navigate("/");
          return;
        }

        const dados = docSnap.data();
        setCapitulo({ id: docSnap.id, ...dados });

        updateDoc(docRef, { views: increment(1) });
        updateDoc(doc(db, "obras", dados.obraId), { views: increment(1) });

        // Navegação Anterior
        const qAnt = query(
            collection(db, "capitulos"), 
            where("obraId", "==", dados.obraId), 
            where("data", "<", dados.data), 
            orderBy("data", "desc"), 
            limit(1)
        );
        const snapAnt = await getDocs(qAnt);
        setPrevId(!snapAnt.empty ? snapAnt.docs[0].id : null);

        // Navegação Próximo
        const qProx = query(
            collection(db, "capitulos"), 
            where("obraId", "==", dados.obraId), 
            where("data", ">", dados.data), 
            orderBy("data", "asc"), 
            limit(1)
        );
        const snapProx = await getDocs(qProx);
        setNextId(!snapProx.empty ? snapProx.docs[0].id : null);

      } catch (error) {
        console.log("Erro:", error);
      } finally {
        setLoading(false);
      }
    }
    loadCapitulo();
  }, [id, navigate]);

  if (loading) return <div className="loading-spinner"></div>;

  const cleanContent = DOMPurify.sanitize(capitulo.conteudo);
  const cleanNote = capitulo.authorNote ? DOMPurify.sanitize(capitulo.authorNote) : null;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 20px 100px 20px', minHeight: '100vh' }}>
        
        <Link to={`/obra/${capitulo.obraId}`} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 20, textDecoration: 'none' }}>
            <MdArrowBack /> Voltar para o Livro
        </Link>

        <h1 style={{ color: '#4a90e2', textAlign: 'center', borderBottom: '1px solid #444', paddingBottom: '20px' }}>
            {capitulo.titulo}
        </h1>

        <div 
            style={{ fontSize: '1.2rem', lineHeight: '1.8', color: '#e0e0e0', marginTop: '30px', whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif' }}
            dangerouslySetInnerHTML={{ __html: cleanContent }} 
        />

        {cleanNote && (
            <div style={{ backgroundColor: '#1a1a1a', borderLeft: '4px solid #4a90e2', padding: '20px', marginTop: '40px' }}>
                <h4 style={{ color: '#4a90e2', margin: '0 0 10px 0' }}>Author Note</h4>
                <div style={{ fontStyle: 'italic', color: '#ccc' }} dangerouslySetInnerHTML={{ __html: cleanNote }} />
            </div>
        )}

        {/* --- CORREÇÃO DOS BOTÕES DE NAVEGAÇÃO --- */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '60px', borderTop: '1px solid #444', paddingTop: '30px', gap: '20px' }}>
            {prevId ? (
                <Link to={`/ler/${prevId}`} style={{ background: '#333', color: 'white', padding: '12px 25px', textDecoration: 'none', borderRadius: '5px', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                    <MdNavigateBefore size={24} /> Prev
                </Link>
            ) : (
                <div style={{ opacity: 0.3, padding: '12px 25px', color: 'white' }}>Prev</div>
            )}

            {nextId ? (
                <Link to={`/ler/${nextId}`} style={{ background: '#333', color: 'white', padding: '12px 25px', textDecoration: 'none', borderRadius: '5px', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                    Next <MdNavigateNext size={24} />
                </Link>
            ) : (
                <div style={{ opacity: 0.3, padding: '12px 25px', color: 'white' }}>Next</div>
            )}
        </div>

        {/* ÁREA DE COMENTÁRIOS */}
        <div style={{ marginTop: '60px' }}>
            <Comentarios targetId={id} targetType="capitulo" />
        </div>

    </div>
  );
}