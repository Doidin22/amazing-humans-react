import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { 
    doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs 
} from 'firebase/firestore';
import { MdStar, MdStarBorder } from 'react-icons/md';

export default function RatingWidget({ obraId, onRatingUpdate }) {
  const { user } = useContext(AuthContext);
  
  const [userRating, setUserRating] = useState(0); // Nota que o usuário deu
  const [hoverRating, setHoverRating] = useState(0); // Efeito visual ao passar o mouse
  const [loading, setLoading] = useState(false);

  // 1. Verifica se o usuário já votou nesta obra
  useEffect(() => {
    async function checkUserRating() {
      if (!user?.uid || !obraId) return;

      const docRef = doc(db, "avaliacoes", `${obraId}_${user.uid}`);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setUserRating(docSnap.data().rating);
      }
    }
    checkUserRating();
  }, [obraId, user]);

  // 2. Função para salvar o voto
  async function handleRate(nota) {
    if (!user) return alert("Please login to rate.");
    setLoading(true);

    try {
      // A. Salva/Atualiza o voto individual
      // Usamos um ID composto (obraId_userId) para garantir 1 voto por pessoa por livro
      await setDoc(doc(db, "avaliacoes", `${obraId}_${user.uid}`), {
        obraId: obraId,
        userId: user.uid,
        rating: nota,
        updatedAt: new Date()
      });

      setUserRating(nota);

      // B. Recalcula a Média Geral do Livro
      // (Lê todos os votos deste livro para fazer a média exata)
      const q = query(collection(db, "avaliacoes"), where("obraId", "==", obraId));
      const snapshot = await getDocs(q);
      
      let soma = 0;
      snapshot.forEach(doc => {
        soma += doc.data().rating;
      });

      const novaMedia = soma / snapshot.size;
      const totalVotos = snapshot.size;

      // C. Atualiza o documento do Livro com a nova média
      await updateDoc(doc(db, "obras", obraId), {
        rating: novaMedia,
        votes: totalVotos
      });

      // D. Atualiza a tela pai (Obra.jsx) se necessário
      if(onRatingUpdate) onRatingUpdate(novaMedia, totalVotos);

      alert("Rating saved!");

    } catch (error) {
      console.error("Erro ao avaliar:", error);
      alert("Error saving rating.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 15, padding: 15, background: '#252525', borderRadius: 5, border: '1px solid #444' }}>
      <p style={{ margin: '0 0 10px 0', color: '#aaa', fontSize: '0.9rem' }}>
        {userRating > 0 ? "Your rating:" : "Rate this story:"}
      </p>
      
      <div style={{ display: 'flex', gap: 5, cursor: 'pointer' }} onMouseLeave={() => setHoverRating(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <div 
            key={star}
            onClick={() => !loading && handleRate(star)}
            onMouseEnter={() => !loading && setHoverRating(star)}
            style={{ transition: '0.2s', transform: (hoverRating >= star || (!hoverRating && userRating >= star)) ? 'scale(1.1)' : 'scale(1)' }}
          >
            {/* Lógica: Mostra estrela cheia se (mouse em cima >= star) OU (sem mouse e nota salva >= star) */}
            {(hoverRating >= star || (!hoverRating && userRating >= star)) ? (
              <MdStar size={32} color="#ffd700" />
            ) : (
              <MdStarBorder size={32} color="#555" />
            )}
          </div>
        ))}
      </div>
      
      {loading && <span style={{ fontSize: '0.8rem', color: '#4a90e2' }}>Saving...</span>}
    </div>
  );
}