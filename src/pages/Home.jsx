import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { MdSearch, MdList, MdAutoAwesome, MdCheck } from 'react-icons/md';
import StoryCard from '../components/StoryCard';
import SkeletonCard from '../components/SkeletonCard';
import Recomendacoes from '../components/Recomendacoes';

export default function Home() {
  const { user } = useContext(AuthContext);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para o Filtro Customizado
  const [category, setCategory] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  
  const [lastTags, setLastTags] = useState([]);

  // Lista de categorias para o menu
  const categoriesList = [
      "All", "Fantasy", "Sci-Fi", "Romance", "Horror", 
      "Adventure", "RPG", "Mystery", "Action", "Isekai", "FanFic"
  ];

  // 1. Busca histórico
  useEffect(() => {
    async function fetchUserHistory() {
      if (!user?.uid) return;
      try {
        const q = query(collection(db, "historico"), where("userId", "==", user.uid), orderBy("accessedAt", "desc"), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const obraId = snap.docs[0].data().obraId;
            const obraRef = collection(db, "obras");
            const qObra = query(obraRef, where("__name__", "==", obraId)); 
            const snapObra = await getDocs(qObra);
            if(!snapObra.empty) setLastTags(snapObra.docs[0].data().categorias || []);
        }
      } catch (err) { console.log("Erro histórico:", err); }
    }
    fetchUserHistory();
  }, [user]);

  // 2. Busca Livros (COM LÓGICA DE TAGS ATUALIZADA)
  useEffect(() => {
    async function loadBooks() {
      setLoading(true);
      const storiesRef = collection(db, "obras");
      try {
        const q = query(storiesRef, where("status", "==", "public"), orderBy("dataCriacao", "desc"), limit(20));
        const querySnapshot = await getDocs(q);
        const lista = [];
        querySnapshot.forEach((doc) => lista.push({ id: doc.id, ...doc.data() }));
        
        const listaFiltrada = lista.filter(item => {
            const term = searchTerm.toLowerCase().trim();

            // 1. Verifica Título
            const matchTitle = item.tituloBusca ? item.tituloBusca.includes(term) : false;

            // 2. Verifica Tags (NOVA LÓGICA)
            // Se o livro tiver tags, verifica se ALGUMA delas contém o termo digitado
            const matchTags = item.tags ? item.tags.some(tag => tag.toLowerCase().includes(term)) : false;

            // O termo de busca é aceito se estiver no Título OU nas Tags
            const matchSearch = term === '' ? true : (matchTitle || matchTags);

            // 3. Verifica Categoria (Dropdown)
            const matchCat = (category && category !== "All") ? (item.categorias && item.categorias.includes(category)) : true;

            // Retorna verdadeiro apenas se passar na Busca E no Filtro de Categoria
            return matchSearch && matchCat;
        });
        
        setStories(listaFiltrada);
      } catch (error) { console.log("Error loading:", error); } finally { setLoading(false); }
    }
    loadBooks();
  }, [searchTerm, category]);

  return (
    <div className="pb-20 max-w-[1200px] mx-auto px-4" onClick={() => setShowFilter(false)}>
      
      {/* --- TOPO: CONTROLES --- */}
      <div className="flex flex-col-reverse md:flex-row justify-between items-end md:items-center mt-8 mb-4 gap-4 min-h-[40px]">
        
        <div className="flex-1">
            {lastTags.length > 0 && (
                <div className="flex items-center gap-2 text-yellow-500 animate-pulse">
                    <MdAutoAwesome />
                    <h3 className="font-bold text-sm tracking-wider uppercase">BASED ON WHAT YOU READ</h3>
                </div>
            )}
        </div>

        {/* PESQUISA E FILTRO */}
        <div className="flex w-full md:w-auto h-10 shadow-lg relative" onClick={(e) => e.stopPropagation()}>
            <div className="relative flex-1 md:w-72 group">
                <input 
                    type="text" 
                    placeholder="Search title or tags..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="w-full h-full bg-[#1a1a1a] border border-[#333] border-r-0 rounded-l-md text-gray-200 pl-10 pr-4 text-sm outline-none focus:border-primary transition-colors"
                />
                <MdSearch className="absolute left-3 top-2.5 text-gray-500 group-focus-within:text-primary" size={20} />
            </div>

            {/* BOTÃO DE FILTRO (Dropdown Customizado) */}
            <div className="relative">
                <button 
                    onClick={() => setShowFilter(!showFilter)}
                    className={`h-full w-12 flex items-center justify-center border border-l-0 rounded-r-md transition-colors ${showFilter ? 'bg-blue-600 border-blue-600 text-white' : 'bg-[#1a1a1a] border-[#333] text-gray-400 hover:text-white hover:bg-[#252525]'}`}
                    title="Filter by Category"
                >
                    <MdList size={22} />
                </button>

                {/* LISTA SUSPENSA */}
                {showFilter && (
                    <div className="absolute right-0 top-12 w-48 bg-[#1f1f1f] border border-[#333] rounded-lg shadow-2xl py-2 z-50 animate-fade-in origin-top-right">
                        <div className="px-4 py-2 border-b border-[#333] mb-1">
                            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Select Category</span>
                        </div>
                        {categoriesList.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => { setCategory(cat); setShowFilter(false); }}
                                className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-[#2a2a2a] transition-colors ${category === cat ? 'text-primary font-bold bg-primary/10' : 'text-gray-300'}`}
                            >
                                {cat}
                                {category === cat && <MdCheck size={16} />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </div>

      {lastTags.length > 0 && (
          <div className="-mt-6 mb-12"> 
             <Recomendacoes tags={lastTags} title="" />
          </div>
      )}

      <div className="flex items-center gap-3 border-b border-white/10 pb-3 mb-6 mt-2">
        <div className="h-6 w-1.5 bg-primary rounded-full shadow-[0_0_10px_rgba(74,144,226,0.5)]"></div>
        <h2 className="text-xl font-bold text-white m-0 tracking-wide">New Releases</h2>
        {category && category !== "All" && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded border border-primary/30">
                Filtered by: {category}
            </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 place-items-start">
        {loading ? (
            Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
            stories.length === 0 ? ( 
                <div className="col-span-full w-full py-16 bg-[#1f1f1f] border border-[#333] rounded-lg text-center flex flex-col items-center justify-center gap-3">
                    <MdSearch size={40} className="text-gray-600" />
                    <p className="text-gray-400 font-medium">No stories found.</p>
                    {category && (
                        <button onClick={() => setCategory('')} className="text-primary text-sm hover:underline">Clear Filters</button>
                    )}
                </div>
            ) : (
                stories.map(livro => (
                    <div key={livro.id} className="w-full max-w-[170px] mx-auto">
                        <StoryCard data={livro} />
                    </div>
                ))
            )
        )}
      </div>

    </div>
  );
}