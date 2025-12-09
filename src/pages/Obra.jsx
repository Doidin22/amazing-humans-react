import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../services/firebaseConnection';
import { 
  doc, getDoc, collection, query, where, orderBy, getDocs, addDoc, deleteDoc, serverTimestamp, 
  limit, startAfter 
} from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { 
  MdEdit, MdMenuBook, MdPerson, MdStar, MdBookmarkAdded, MdBookmarkBorder, 
  MdInfoOutline, MdVisibility, MdList, MdLabel, MdFlag, MdPlayArrow, MdVerified, MdNavigateNext, MdNavigateBefore
} from 'react-icons/md';
import Recomendacoes from '../components/Recomendacoes';
import SkeletonObra from '../components/SkeletonObra';
import Reviews from '../components/Reviews'; 
import RatingWidget from '../components/RatingWidget'; 
import SmartImage from '../components/SmartImage';
import AdBanner from '../components/AdBanner';
import DOMPurify from 'dompurify';
import toast from 'react-hot-toast';
import { Helmet } from 'react-helmet-async'; 
import ReportModal from '../components/ReportModal';

// Constantes ficam FORA do componente
const CHAPTERS_PER_PAGE = 10;

export default function Obra() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);

  // --- TODOS OS STATES (HOOKS) DEVEM FICAR AQUI DENTRO ---
  const [obra, setObra] = useState(null);
  
  // Paginação e Controle
  const [capitulos, setCapitulos] = useState([]); 
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMoreDocs, setHasMoreDocs] = useState(true); // O hook deve estar AQUI
  const [chaptersCache, setChaptersCache] = useState({}); 
  const [lastDocsMap, setLastDocsMap] = useState({}); 
  const [loadingCaps, setLoadingCaps] = useState(false);

  // Estados Gerais
  const [loading, setLoading] = useState(true);
  const [estaNaBiblioteca, setEstaNaBiblioteca] = useState(false);
  const [idBiblioteca, setIdBiblioteca] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [lastReadId, setLastReadId] = useState(null);
  
  // --- EFEITO: Carregar Obra ---
  useEffect(() => {
    async function loadObra() {
      try {
        const docRef = doc(db, "obras", id);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) { toast.error("Book not found!"); setLoading(false); return; }

        const dadosObra = { id: snapshot.id, ...snapshot.data() };
        
        // Cálculo visual de páginas
        const totalCaps = dadosObra.totalChapters || 0;
        setTotalPages(totalCaps > 0 ? Math.ceil(totalCaps / CHAPTERS_PER_PAGE) : 1);

        if (dadosObra.autorId) {
            const userDoc = await getDoc(doc(db, "usuarios", dadosObra.autorId));
            if (userDoc.exists()) {
                const uData = userDoc.data();
                dadosObra.autor = uData.nome;
                dadosObra.autorBadges = uData.badges || [];
            }
        }
        setObra(dadosObra);
        
        // Carrega primeiros capítulos
        loadChapters(1);

        // Verifica Histórico
        if (user?.uid) {
            const histRef = doc(db, "historico", `${user.uid}_${id}`);
            const histSnap = await getDoc(histRef);
            if (histSnap.exists()) { 
                setLastReadId(histSnap.data().lastChapterId); 
            }
        }
      } catch (error) { console.log(error); } finally { setLoading(false); }
    }
    loadObra();
  }, [id, user]);

  // --- FUNÇÃO: Carregar Capítulos ---
  async function loadChapters(targetPage) {
      // 1. Verifica Cache
      if (chaptersCache[targetPage]) {
          setCapitulos(chaptersCache[targetPage]);
          setPage(targetPage);
          setHasMoreDocs(chaptersCache[targetPage].length === CHAPTERS_PER_PAGE); 
          return;
      }

      setLoadingCaps(true);
      try {
        const capsRef = collection(db, "capitulos");
        
        // Query base
        let q = query(
            capsRef, 
            where("obraId", "==", id), 
            orderBy("data", "asc"), 
            limit(CHAPTERS_PER_PAGE)
        );

        // Se não for pág 1, usa cursor
        if (targetPage > 1) {
            const prevPageLastDoc = lastDocsMap[targetPage - 1];
            if (prevPageLastDoc) {
                q = query(q, startAfter(prevPageLastDoc));
            } else {
                loadChapters(1); // Fallback
                return;
            }
        }

        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const listaCaps = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            
            // Verifica se a página veio cheia (indica que pode haver mais)
            const isFullPage = querySnapshot.docs.length === CHAPTERS_PER_PAGE;
            setHasMoreDocs(isFullPage);

            // Atualiza Cache e Cursor
            setChaptersCache(prev => ({ ...prev, [targetPage]: listaCaps }));
            const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
            setLastDocsMap(prev => ({ ...prev, [targetPage]: lastDoc }));

            setCapitulos(listaCaps);
            setPage(targetPage);
        } else {
            if(targetPage === 1) setCapitulos([]);
            setHasMoreDocs(false);
        }

      } catch (err) {
          console.error("Error loading chapters:", err);
          // Omitindo toast de erro para evitar spam na UI se for erro de índice
      } finally {
          setLoadingCaps(false);
      }
  }

  const handleNextPage = () => {
      if (hasMoreDocs) loadChapters(page + 1);
  };

  const handlePrevPage = () => {
      if (page > 1) loadChapters(page - 1);
  };

  // --- EFEITO: Checar Biblioteca ---
  useEffect(() => {
    async function checkLibrary() {
      if (!user?.uid || !id) return;
      const qLib = query(collection(db, "biblioteca"), where("userId", "==", user.uid), where("obraId", "==", id));
      const snapLib = await getDocs(qLib);
      if (!snapLib.empty) { setEstaNaBiblioteca(true); setIdBiblioteca(snapLib.docs[0].id); } 
      else { setEstaNaBiblioteca(false); setIdBiblioteca(null); }
    }
    checkLibrary();
  }, [id, user]);

  // --- FUNÇÃO: Toggle Biblioteca ---
  async function toggleBiblioteca() {
    if(!user) return toast.error("Login required.");
    try {
        if(estaNaBiblioteca) {
            await deleteDoc(doc(db, "biblioteca", idBiblioteca));
            setEstaNaBiblioteca(false);
            toast.success("Removed from library");
        } else {
            const docRef = await addDoc(collection(db, "biblioteca"), {
                userId: user.uid, obraId: id, tituloObra: obra.titulo, status: 'reading', dataAdicao: serverTimestamp()
            });
            setEstaNaBiblioteca(true);
            setIdBiblioteca(docRef.id);
            toast.success("Added to library!");
        }
    } catch (error) { toast.error("Error updating library"); }
  }

  // --- RENDER ---
  const isAuthor = user?.uid === obra?.autorId;

  if (loading) return <SkeletonObra />;
  
  const cleanSinopse = obra.sinopse ? obra.sinopse.replace(/<[^>]*>?/gm, '').substring(0, 160) + '...' : 'Read on Amazing Humans.';

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Book",
    "name": obra?.titulo,
    "author": { "@type": "Person", "name": obra?.autor },
    "description": cleanSinopse,
    "image": obra?.capa,
    "publisher": {
      "@type": "Organization",
      "name": "Amazing Humans",
      "logo": { "@type": "ImageObject", "url": "https://amazing-humans-react.web.app/logo-ah.png" }
    }
  };

  return (
    <div className="min-h-screen pb-20 relative">
        <Helmet>
            <title>{obra.titulo} | Amazing Humans</title>
            <meta name="description" content={cleanSinopse} />
            <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
        </Helmet>

        <ReportModal isOpen={showReport} onClose={() => setShowReport(false)} targetId={id} targetType="book" targetName={obra.titulo} />

        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/10 to-[#121212] blur-[100px] pointer-events-none z-0"></div>

        <div className="max-w-6xl mx-auto px-4 relative z-10 pt-10">
            <div className="flex flex-col md:flex-row gap-8 lg:gap-12 mb-12">
                
                {/* CAPA */}
                <div className="w-full md:w-64 lg:w-72 shrink-0 mx-auto md:mx-0">
                    <div className="relative aspect-[2/3] rounded-lg shadow-2xl overflow-hidden border border-white/10 bg-[#222]">
                        <SmartImage src={obra.capa} alt={obra.titulo} className="w-full h-full object-cover" />
                    </div>
                </div>

                {/* INFO */}
                <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-start">
                        <h1 className="text-3xl md:text-5xl font-serif font-bold text-white mb-3 leading-tight">{obra.titulo}</h1>
                        <button onClick={() => setShowReport(true)} className="text-gray-500 hover:text-red-500 p-2 rounded-full hover:bg-white/5 transition-colors"><MdFlag size={20} /></button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-6">
                        <Link to={`/usuario/${obra.autorId}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                            <MdPerson /> {obra.autor || "Unknown"}
                            {obra.autorBadges?.includes('pioneer') && <MdVerified className="text-yellow-400" />}
                        </Link>
                        <div className="flex items-center gap-1 text-yellow-500"><MdStar /> {(obra.rating || 0).toFixed(1)}</div>
                        <div className="flex items-center gap-1"><MdVisibility /> {obra.views || 0} Views</div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                        {obra.categorias?.map((cat, i) => (<span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-gray-300 font-bold uppercase">{cat}</span>))}
                    </div>

                    <div className="bg-[#1f1f1f]/80 backdrop-blur-sm border border-white/5 p-6 rounded-xl mb-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                        <h3 className="text-white font-bold mb-2 flex items-center gap-2"><MdInfoOutline /> Synopsis</h3>
                        <div className="text-gray-300 leading-relaxed font-serif text-sm md:text-base" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(obra.sinopse) }} />
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                        <Link to={`/ler/${lastReadId || (capitulos[0]?.id)}`} className={`btn-primary px-8 py-3 rounded-full text-lg shadow-xl hover:scale-105 transition-transform flex items-center gap-2 ${(!capitulos.length && !lastReadId) ? 'opacity-50 pointer-events-none' : ''}`}>
                            <MdMenuBook /> {lastReadId ? "Continue Reading" : "Read Now"}
                        </Link>
                        
                        <button onClick={toggleBiblioteca} className={`px-6 py-2.5 rounded-full font-bold flex items-center gap-2 border-2 transition ${estaNaBiblioteca ? 'border-red-500 text-red-500' : 'border-gray-600 text-gray-300'}`}>
                            {estaNaBiblioteca ? <><MdBookmarkAdded /> Library</> : <><MdBookmarkBorder /> Add</>}
                        </button>
                        {isAuthor && <Link to={`/editar-obra/${obra.id}`} className="ml-auto hidden md:flex items-center gap-2 text-gray-400 hover:text-white px-4 py-2 hover:bg-white/5 rounded-lg transition"><MdEdit /> Edit</Link>}
                    </div>
                </div>
            </div>

            {/* ADS */}
            <div className="md:hidden my-6"><AdBanner /></div>
            <div className="hidden md:block my-8"><AdBanner /></div>

            {/* CAPÍTULOS */}
            <div className="mt-16 md:mt-8">
                <div className="flex justify-between items-end mb-6">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2"><MdList className="text-primary" /> Chapters</h3>
                    <span className="text-sm text-gray-500">Page {page} {totalPages > 1 && `of ${totalPages}`}</span>
                </div>
                
                {loadingCaps ? (
                   <div className="p-8 text-center text-gray-500">Loading chapters...</div>
                ) : (
                    <div className="bg-[#1a1a1a] border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
                        {capitulos.map((cap, i) => {
                            const isLastRead = cap.id === lastReadId;
                            const absoluteIndex = ((page - 1) * CHAPTERS_PER_PAGE) + (i + 1);
                            
                            return (
                                <Link to={`/ler/${cap.id}`} key={cap.id} className={`flex items-center justify-between p-4 hover:bg-white/5 transition group ${isLastRead ? 'bg-primary/10 border-l-4 border-primary' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-xs w-8 text-center ${isLastRead ? 'text-primary font-bold' : 'text-gray-600'}`}>#{absoluteIndex}</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`${isLastRead ? 'text-primary font-bold' : 'text-gray-200 group-hover:text-primary'}`}>{cap.titulo}</span>
                                            {isLastRead && <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><MdVisibility /> Last Read</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm text-gray-500 hidden sm:block">{cap.data ? new Date(cap.data.seconds * 1000).toLocaleDateString() : '-'}</span>
                                        {isLastRead && <MdPlayArrow className="text-primary" />}
                                    </div>
                                </Link>
                            );
                        })}
                        {capitulos.length === 0 && <div className="p-6 text-center text-gray-500 text-sm">No chapters released yet.</div>}
                    </div>
                )}

                {/* PAGINAÇÃO */}
                {(capitulos.length > 0 || page > 1) && (
                    <div className="flex justify-center items-center gap-4 mt-8">
                        <button 
                            onClick={handlePrevPage} 
                            disabled={page === 1 || loadingCaps}
                            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#222] hover:bg-[#333] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <MdNavigateBefore size={20} /> Prev
                        </button>

                        <div className="flex gap-2">
                             <span className="text-gray-400 font-bold bg-[#111] px-4 py-2 rounded-lg border border-white/5">
                                 Page {page}
                             </span>
                        </div>

                        <button 
                            onClick={handleNextPage} 
                            disabled={!hasMoreDocs || loadingCaps}
                            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary hover:bg-primary/80 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                        >
                            Next <MdNavigateNext size={20} />
                        </button>
                    </div>
                )}
            </div>

            {/* AVALIAÇÃO */}
            {user && lastReadId && (
                <div className="max-w-2xl mx-auto mt-16 mb-8">
                    <RatingWidget obraId={id} />
                </div>
            )}

            <Reviews obraId={id} obraTitulo={obra.titulo} autorId={obra.autorId} />
            {obra.categorias && <div className="mt-20"><Recomendacoes tags={obra.categorias} currentId={id} title="Similar Stories" /></div>}
        </div>
    </div>
  );
}