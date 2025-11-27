import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { MdSearch, MdTune } from 'react-icons/md';
import StoryCard from '../components/StoryCard';
import SkeletonCard from '../components/SkeletonCard'; // <--- IMPORTANTE
import Recomendacoes from '../components/Recomendacoes';

export default function Home() {
  const { user } = useContext(AuthContext);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  
  const [lastTags, setLastTags] = useState([]);

  useEffect(() => {
    async function fetchUserHistory() {
      if (!user?.uid) return;
      try {
        const q = query(
            collection(db, "historico"),
            where("userId", "==", user.uid),
            orderBy("accessedAt", "desc"),
            limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
            const obraId = snap.docs[0].data().obraId;
            const obraRef = collection(db, "obras");
            const qObra = query(obraRef, where("__name__", "==", obraId)); 
            const snapObra = await getDocs(qObra);
            
            if(!snapObra.empty) {
                setLastTags(snapObra.docs[0].data().categorias || []);
            }
        }
      } catch (err) {
          console.log("Erro histórico:", err);
      }
    }
    fetchUserHistory();
  }, [user]);

  useEffect(() => {
    async function loadBooks() {
      setLoading(true);
      const storiesRef = collection(db, "obras");
      let q;
      try {
        q = query(storiesRef, where("status", "==", "public"), orderBy("dataCriacao", "desc"), limit(20));
        const querySnapshot = await getDocs(q);
        const lista = [];
        querySnapshot.forEach((doc) => lista.push({ id: doc.id, ...doc.data() }));
        const listaFiltrada = lista.filter(item => {
            const matchNome = item.tituloBusca ? item.tituloBusca.includes(searchTerm.toLowerCase()) : true;
            const matchCat = category ? (item.categorias && item.categorias.includes(category)) : true;
            return matchNome && matchCat;
        });
        // Pequeno delay artificial só para você ver o efeito (pode remover depois)
        // await new Promise(resolve => setTimeout(resolve, 800)); 
        setStories(listaFiltrada);
      } catch (error) { console.log("Error loading:", error); } finally { setLoading(false); }
    }
    loadBooks();
  }, [searchTerm, category]);

  return (
    <div>
      <div className="controls-header" style={{ marginTop: '20px' }}>
        <div className="rr-search-container">
            <div className="rr-input-group">
                <input type="text" placeholder="Search title..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <button><MdSearch size={20} /></button>
            </div>
            <div className="rr-adv-btn" title="Filter by Category">
                <MdTune size={20} color="white" />
                <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer' }}>
                    <option value="">All Categories</option>
                    <option value="Fantasy">Fantasy</option>
                    <option value="Sci-Fi">Sci-Fi</option>
                    <option value="Romance">Romance</option>
                    <option value="Horror">Horror</option>
                    <option value="Adventure">Adventure</option>
                    <option value="RPG">RPG</option>
                    <option value="Mystery">Mystery</option>
                    <option value="Action">Action</option>
                    <option value="Isekai">Isekai</option>
                </select>
            </div>
        </div>
      </div>

      {lastTags.length > 0 && (
          <Recomendacoes tags={lastTags} title="Based on what you read" />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: 'white' }}>New Releases</h2>
        <span style={{ fontSize: '0.8rem', color: '#777' }}>Latest Updates</span>
      </div>

      {/* --- LÓGICA DE LOADING COM SKELETON --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
        {loading ? (
            // Mostra 8 cartões falsos pulsando enquanto carrega
            Array.from({ length: 8 }).map((_, index) => (
                <SkeletonCard key={index} />
            ))
        ) : (
            // Quando termina, mostra o conteúdo real
            stories.length === 0 ? ( 
                <p style={{ color: '#aaa', gridColumn: '1/-1', textAlign:'center' }}>No stories found.</p> 
            ) : (
                stories.map(livro => <StoryCard key={livro.id} data={livro} />)
            )
        )}
      </div>

    </div>
  );
}