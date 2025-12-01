import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../services/firebaseConnection';
import { 
  doc, getDoc, collection, query, where, orderBy, getDocs, addDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { 
  MdEdit, MdMenuBook, MdPerson, MdStar, MdBookmarkAdded, MdBookmarkBorder, 
  MdInfoOutline, MdVisibility, MdCalendarToday, MdList, MdLabel
} from 'react-icons/md';
import Recomendacoes from '../components/Recomendacoes';
import RatingWidget from '../components/RatingWidget';
import SkeletonObra from '../components/SkeletonObra';
import Reviews from '../components/Reviews'; // IMPORTANDO REVIEWS
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

  useEffect(() => {
    async function loadObra() {
      try {
        const docRef = doc(db, "obras", id);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) { toast.error("Book not found!"); setLoading(false); return; }

        const dadosObra = { id: snapshot.id, ...snapshot.data() };
        
        // Carrega nome do autor se necessário
        if (dadosObra.autorId && !dadosObra.autor) {
            const userDoc = await getDoc(doc(db, "usuarios", dadosObra.autorId));
            if (userDoc.exists()) dadosObra.autor = userDoc.data().nome;
        }

        setObra(dadosObra);

        const q = query(collection(db, "capitulos"), where("obraId", "==", id), orderBy("data", "asc"));
        const capsSnapshot = await getDocs(q);
        let listaCaps = [];
        capsSnapshot.forEach((doc) => listaCaps.push({ id: doc.id, ...doc.data() }));
        setCapitulos(listaCaps);

      } catch (error) { console.log(error); } finally { setLoading(false); }
    }
    loadObra();
  }, [id]);

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

  if (loading) return <SkeletonObra />;

  return (
    <div className="min-h-screen pb-20 relative">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/10 to-[#121212] blur-[100px] pointer-events-none z-0"></div>

        <div className="max-w-6xl mx-auto px-4 relative z-10 pt-10">
            <div className="flex flex-col md:flex-row gap-8 lg:gap-12 mb-12">
                
                {/* Capa */}
                <div className="w-full md:w-64 lg:w-72 shrink-0 mx-auto md:mx-0">
                    <div className="relative aspect-[2/3] rounded-lg shadow-2xl overflow-hidden border border-white/10">
                        {obra.capa ? <img src={obra.capa} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#222] flex items-center justify-center text-4xl font-bold">{obra.titulo?.charAt(0)}</div>}
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col">
                    <h1 className="text-3xl md:text-5xl font-serif font-bold text-white mb-3 leading-tight">{obra.titulo}</h1>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-6">
                        <Link to={`/usuario/${obra.autorId}`} className="flex items-center gap-2 hover:text-primary"><MdPerson /> {obra.autor || "Unknown"}</Link>
                        <div className="flex items-center gap-1 text-yellow-500"><MdStar /> {(obra.rating || 0).toFixed(1)}</div>
                        <div className="flex items-center gap-1"><MdVisibility /> {obra.views || 0} Views</div>
                    </div>

                    {/* Genres (Categorias) */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {obra.categorias?.map((cat, i) => (
                            <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-gray-300 font-bold uppercase">{cat}</span>
                        ))}
                    </div>

                    {/* TAGS (NOVO) */}
                    {obra.tags && obra.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                            {obra.tags.map((tag, i) => (
                                <span key={i} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[11px] rounded flex items-center gap-1 border border-blue-500/20">
                                    <MdLabel size={10} /> {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="bg-[#1f1f1f]/80 backdrop-blur-sm border border-white/5 p-6 rounded-xl mb-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                        <h3 className="text-white font-bold mb-2 flex items-center gap-2"><MdInfoOutline /> Synopsis</h3>
                        <div className="text-gray-300 leading-relaxed font-serif text-sm md:text-base" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(obra.sinopse) }} />
                    </div>

                    <div className="flex gap-4 items-center">
                        {capitulos.length > 0 && (
                            <Link to={`/ler/${capitulos[0].id}`} className="btn-primary px-8 py-3 rounded-full text-lg shadow-xl hover:scale-105 transition-transform"><MdMenuBook /> Read First</Link>
                        )}
                        <button onClick={toggleBiblioteca} className={`px-6 py-2.5 rounded-full font-bold flex items-center gap-2 border-2 transition ${estaNaBiblioteca ? 'border-red-500 text-red-500' : 'border-gray-600 text-gray-300'}`}>
                            {estaNaBiblioteca ? <><MdBookmarkAdded /> Library</> : <><MdBookmarkBorder /> Add</>}
                        </button>
                        {user?.uid === obra.autorId && (
                            <Link to={`/editar-obra/${obra.id}`} className="ml-auto flex items-center gap-2 text-gray-400 hover:text-white px-4 py-2 hover:bg-white/5 rounded-lg transition"><MdEdit /> Edit</Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Lista Capítulos */}
            <div className="mt-16">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><MdList className="text-primary" /> Chapters</h3>
                <div className="bg-[#1a1a1a] border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
                    {capitulos.map((cap, i) => (
                        <Link to={`/ler/${cap.id}`} key={cap.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition group">
                            <div className="flex items-center gap-4"><span className="text-gray-600 w-6">#{i + 1}</span><span className="text-gray-200 group-hover:text-primary">{cap.titulo}</span></div>
                            <span className="text-sm text-gray-500">{cap.data ? new Date(cap.data.seconds * 1000).toLocaleDateString() : '-'}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* --- REVIEWS (NOVO COMPONENTE) --- */}
            <Reviews obraId={id} obraTitulo={obra.titulo} autorId={obra.autorId} />

            {/* Recomendações */}
            {obra.categorias && <div className="mt-20"><Recomendacoes tags={obra.categorias} currentId={id} title="Similar Stories" /></div>}
        </div>
    </div>
  );
}