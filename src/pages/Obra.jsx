import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../services/firebaseConnection';
import { 
  doc, getDoc, collection, query, where, orderBy, getDocs, addDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { 
  MdEdit, MdMenuBook, MdPerson, MdStar, MdBookmarkAdded, MdBookmarkBorder, 
  MdInfoOutline, MdVisibility, MdCalendarToday, MdList
} from 'react-icons/md';
import Recomendacoes from '../components/Recomendacoes';
import RatingWidget from '../components/RatingWidget';
import SkeletonObra from '../components/SkeletonObra';
import DOMPurify from 'dompurify';
import toast from 'react-hot-toast';

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
          toast.error("Book not found!");
          setLoading(false);
          return;
        }

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
      
      const qLib = query(collection(db, "biblioteca"), where("userId", "==", user.uid), where("obraId", "==", id));
      const snapLib = await getDocs(qLib);
      if (!snapLib.empty) {
        setEstaNaBiblioteca(true);
        setIdBiblioteca(snapLib.docs[0].id);
      } else {
        setEstaNaBiblioteca(false);
        setIdBiblioteca(null);
      }

      try {
        const qHist = query(collection(db, "historico"), where("userId", "==", user.uid), where("obraId", "==", id));
        const snapHist = await getDocs(qHist);
        if (!snapHist.empty) setPodeAvaliar(true);
        else setPodeAvaliar(false);
      } catch (err) { console.log(err); }
    }
    checkLibraryAndHistory();
  }, [id, user]);

  async function toggleBiblioteca() {
    if(!user) return toast.error("Login to add to library.");
    const loadingToast = toast.loading("Updating library...");
    try {
        if(estaNaBiblioteca) {
            await deleteDoc(doc(db, "biblioteca", idBiblioteca));
            setEstaNaBiblioteca(false);
            setIdBiblioteca(null);
            toast.success("Removed from library", { id: loadingToast });
        } else {
            const docRef = await addDoc(collection(db, "biblioteca"), {
                userId: user.uid, obraId: id, tituloObra: obra.titulo, status: 'reading', dataAdicao: serverTimestamp()
            });
            setEstaNaBiblioteca(true);
            setIdBiblioteca(docRef.id);
            toast.success("Added to library!", { id: loadingToast });
        }
    } catch (error) {
        toast.error("Error updating library", { id: loadingToast });
    }
  }

  const handleRatingUpdate = (newRating, newVotes) => {
      setObra(prev => ({ ...prev, rating: newRating, votes: newVotes }));
  };

  if (loading) return <SkeletonObra />;

  if (obra.status === 'private' && user?.uid !== obra.autorId) {
     return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500">
            <h2 className="text-2xl font-bold mb-2">🔒 This book is private</h2>
            <Link to="/" className="text-primary hover:underline">Go Home</Link>
        </div>
     );
  }

  return (
    <div className="min-h-screen pb-20 relative">
        
        {/* --- BACKDROP DE FUNDO (Efeito de Luz) --- */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/10 to-[#121212] blur-[100px] pointer-events-none z-0"></div>

        <div className="max-w-6xl mx-auto px-4 relative z-10 pt-10">
            
            {/* --- SEÇÃO PRINCIPAL (HEADER DO LIVRO) --- */}
            <div className="flex flex-col md:flex-row gap-8 lg:gap-12 mb-12">
                
                {/* 1. CAPA (Poster Style) */}
                <div className="w-full md:w-64 lg:w-72 shrink-0 mx-auto md:mx-0">
                    <div className="relative aspect-[2/3] rounded-lg shadow-2xl shadow-black/50 overflow-hidden border border-white/10 group">
                        {obra.capa ? (
                            <img src={obra.capa} alt={obra.titulo} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center text-center p-4">
                                <span className="text-6xl font-serif text-gray-700 font-bold select-none mb-2">{obra.titulo?.charAt(0)}</span>
                                <span className="text-xs text-gray-500 uppercase tracking-widest">No Cover</span>
                            </div>
                        )}
                    </div>

                    {/* Botões de Ação Mobile (aparecem aqui em telas pequenas) */}
                    <div className="flex md:hidden gap-3 mt-6">
                        {capitulos.length > 0 && (
                            <Link to={`/ler/${capitulos[0].id}`} className="flex-1 btn-primary py-3 rounded-full text-center justify-center">Read</Link>
                        )}
                        <button onClick={toggleBiblioteca} className={`flex-1 border-2 font-bold py-2.5 rounded-full flex items-center justify-center gap-2 transition ${estaNaBiblioteca ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-primary text-primary hover:bg-primary/10'}`}>
                            {estaNaBiblioteca ? <MdBookmarkAdded size={20} /> : <MdBookmarkBorder size={20} />}
                        </button>
                    </div>
                </div>

                {/* 2. INFORMAÇÕES (Detalhes) */}
                <div className="flex-1 flex flex-col">
                    
                    {/* Título e Autor */}
                    <div className="mb-4 text-center md:text-left">
                        <h1 className="text-3xl md:text-5xl font-serif font-bold text-white mb-3 leading-tight">
                            {obra.titulo}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-400">
                            <Link to={`/usuario/${obra.autorId}`} className="flex items-center gap-2 hover:text-primary transition font-medium">
                                <MdPerson size={18} /> {obra.autor || "Unknown"}
                            </Link>
                            <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                            <div className="flex items-center gap-1 text-yellow-500 font-bold">
                                <MdStar size={18} /> {(obra.rating || 0).toFixed(1)}
                                <span className="text-gray-500 font-normal ml-1">({obra.votes || 0} votes)</span>
                            </div>
                            <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                            <div className="flex items-center gap-1">
                                <MdVisibility size={16} /> {obra.views || 0} Views
                            </div>
                        </div>
                    </div>

                    {/* Categorias */}
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-6">
                        {obra.categorias?.map((cat, index) => (
                            <span key={index} className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-gray-300 uppercase tracking-wider font-semibold hover:bg-white/10 transition cursor-default">
                                {cat}
                            </span>
                        ))}
                    </div>

                    {/* Sinopse */}
                    <div className="bg-[#1f1f1f]/80 backdrop-blur-sm border border-white/5 p-6 rounded-xl mb-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                        <h3 className="text-white font-bold mb-2 flex items-center gap-2"><MdInfoOutline /> Synopsis</h3>
                        <div 
                            className="text-gray-300 leading-relaxed font-serif text-sm md:text-base"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(obra.sinopse || "No synopsis available.") }}
                        />
                    </div>

                    {/* Botões de Ação Desktop */}
                    <div className="hidden md:flex gap-4 items-center mb-8">
                        {capitulos.length > 0 ? (
                            <Link to={`/ler/${capitulos[0].id}`} className="btn-primary px-8 py-3 rounded-full text-lg shadow-xl shadow-blue-500/20 hover:scale-105 transition-transform">
                                <MdMenuBook size={22} /> Start Reading
                            </Link>
                        ) : (
                            <button disabled className="bg-gray-700 text-gray-400 px-8 py-3 rounded-full font-bold cursor-not-allowed">No Chapters Yet</button>
                        )}

                        <button onClick={toggleBiblioteca} className={`px-6 py-2.5 rounded-full font-bold flex items-center gap-2 border-2 transition hover:scale-105 ${estaNaBiblioteca ? 'border-red-500 text-red-500 hover:bg-red-500/10' : 'border-gray-600 text-gray-300 hover:border-primary hover:text-primary hover:bg-primary/5'}`}>
                            {estaNaBiblioteca ? <><MdBookmarkAdded size={20} /> Library</> : <><MdBookmarkBorder size={20} /> Add to Library</>}
                        </button>

                        {user?.uid === obra.autorId && (
                            <Link to={`/editar-obra/${obra.id}`} className="ml-auto flex items-center gap-2 text-gray-400 hover:text-white px-4 py-2 hover:bg-white/5 rounded-lg transition">
                                <MdEdit /> Edit Book
                            </Link>
                        )}
                    </div>

                    {/* Widget de Avaliação */}
                    {user && podeAvaliar && (
                        <div className="bg-[#151515] border border-white/5 p-4 rounded-lg flex items-center justify-between gap-4 max-w-md">
                            <span className="text-sm text-gray-400 font-medium">Enjoying the story? Leave a rating:</span>
                            <RatingWidget obraId={id} onRatingUpdate={handleRatingUpdate} />
                        </div>
                    )}
                </div>
            </div>

            {/* --- SEÇÃO DE CAPÍTULOS --- */}
            <div className="mt-16">
                <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                        <MdList className="text-primary" /> Chapters <span className="text-sm font-normal text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{capitulos.length}</span>
                    </h3>
                </div>

                {capitulos.length === 0 ? (
                    <div className="text-center py-12 bg-[#151515] border border-white/5 rounded-xl text-gray-500">
                        <p>No chapters released yet.</p>
                    </div>
                ) : (
                    <div className="bg-[#1a1a1a] border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
                        {capitulos.map((cap, index) => (
                            <Link 
                                to={`/ler/${cap.id}`} 
                                key={cap.id} 
                                className="flex items-center justify-between p-4 hover:bg-white/5 transition group"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-gray-600 font-mono text-sm w-6 text-center group-hover:text-primary">#{index + 1}</span>
                                    <div>
                                        <h4 className="text-gray-200 font-medium group-hover:text-primary transition-colors">{cap.titulo}</h4>
                                        <span className="text-xs text-gray-500 md:hidden block mt-1">{cap.data ? new Date(cap.data.seconds * 1000).toLocaleDateString() : '-'}</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-6 text-sm text-gray-500">
                                    <span className="hidden md:flex items-center gap-1"><MdCalendarToday size={14} /> {cap.data ? new Date(cap.data.seconds * 1000).toLocaleDateString() : '-'}</span>
                                    <span className="flex items-center gap-1"><MdVisibility size={14} /> {cap.views || 0}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* --- RECOMENDAÇÕES --- */}
            {obra.categorias && (
                <div className="mt-20">
                    <Recomendacoes tags={obra.categorias} currentId={id} title="You Might Also Like" />
                </div>
            )}

        </div>
    </div>
  );
}