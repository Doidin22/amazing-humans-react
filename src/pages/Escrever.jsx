import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { 
  collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc, setDoc, writeBatch
} from 'firebase/firestore';
import { Editor } from '@tinymce/tinymce-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MdEdit, MdBook, MdCheckCircle, MdCancel } from 'react-icons/md'; // MdCancel adicionado
import toast from 'react-hot-toast';

export default function Escrever() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const obraIdUrl = searchParams.get('obraId');
  const [modo, setModo] = useState(obraIdUrl ? 'capitulo' : 'nova');
  const [minhasObras, setMinhasObras] = useState([]);

  // Form Fields
  const [tituloObra, setTituloObra] = useState('');
  const [capa, setCapa] = useState('');
  const [sinopse, setSinopse] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [obraSelecionada, setObraSelecionada] = useState(obraIdUrl || '');
  const [tituloCapitulo, setTituloCapitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [notaAutor, setNotaAutor] = useState('');
  const [loadingPost, setLoadingPost] = useState(false);

  useEffect(() => {
    async function loadObras() {
      if(user?.uid) {
        const q = query(collection(db, "obras"), where("autorId", "==", user.uid));
        const snap = await getDocs(q);
        let lista = [];
        snap.forEach(d => lista.push({id: d.id, titulo: d.data().titulo}));
        setMinhasObras(lista);
      }
    }
    loadObras();
  }, [user]);

  const handleCategoria = (e) => {
    const valor = e.target.value;
    if (e.target.checked) { setCategorias([...categorias, valor]); } else { setCategorias(categorias.filter(c => c !== valor)); }
  };

  function contarPalavras(html) {
      const textoLimpo = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (!textoLimpo) return 0;
      return textoLimpo.split(' ').length;
  }

  async function enviarNotificacoes(nomeObra, tituloCap, idCapitulo) {
    try {
        const qSeg = query(collection(db, "seguidores"), where("seguidoId", "==", user.uid));
        const snapSeg = await getDocs(qSeg);
        if (snapSeg.empty) return;
        const batch = writeBatch(db);
        snapSeg.forEach(seguidorDoc => {
            const seguidor = seguidorDoc.data();
            const notifRef = doc(collection(db, "notificacoes"));
            batch.set(notifRef, {
                paraId: seguidor.seguidorId,
                mensagem: `<strong>${user.name}</strong> updated "${nomeObra}": ${tituloCap}`,
                tipo: 'chapter',
                linkDestino: `/ler/${idCapitulo}`, 
                lida: false,
                data: serverTimestamp()
            });
        });
        await batch.commit();
    } catch (error) { console.error("Error notifying:", error); }
  }

  async function verificarLimiteDiario() {
      const hoje = new Date().toISOString().split('T')[0];
      const statusRef = doc(db, "status_usuario", user.uid);
      const statusSnap = await getDoc(statusRef);
      let dadosStatus = { postsHoje: 0, dataUltimoPost: hoje };
      if (statusSnap.exists()) {
          const dados = statusSnap.data();
          if (dados.dataUltimoPost === hoje) { dadosStatus.postsHoje = dados.postsHoje; }
      }
      if (dadosStatus.postsHoje >= 10) { throw new Error("Daily limit reached (10 chapters). Try again tomorrow."); }
      return { statusRef, novoContador: dadosStatus.postsHoje + 1, hoje };
  }

  async function handlePublicar() {
    if (!user) return toast.error("You must be logged in!");
    
    if (modo === 'nova') { 
        if(!tituloObra || !sinopse) return toast.error("Please fill in Book Title and Synopsis."); 
    } else { 
        if(!obraSelecionada) return toast.error("Select a book."); 
    }
    
    if(!tituloCapitulo || !conteudo) return toast.error("Please fill in Chapter Title and Content.");
    
    const totalPalavras = contarPalavras(conteudo);
    if (totalPalavras < 500) return toast.error(`Chapter too short! Minimum 500 words. (Current: ${totalPalavras})`);
    
    setLoadingPost(true);
    const toastId = toast.loading("Publishing...");

    try {
        const { statusRef, novoContador, hoje } = await verificarLimiteDiario();
        let idFinalObra = obraSelecionada;
        let nomeFinalObra = "";
        
        if (modo === 'nova') {
            const docRef = await addDoc(collection(db, "obras"), {
                titulo: tituloObra, capa: capa, sinopse: sinopse, categorias: categorias, autor: user.name, autorId: user.uid, dataCriacao: serverTimestamp(), tituloBusca: tituloObra.toLowerCase(), views: 0, rating: 0, votes: 0, status: 'public'
            });
            idFinalObra = docRef.id; nomeFinalObra = tituloObra;
        } else {
            const obraObj = minhasObras.find(o => o.id === obraSelecionada);
            nomeFinalObra = obraObj ? obraObj.titulo : "Unknown";
        }
        
        const capRef = await addDoc(collection(db, "capitulos"), {
            obraId: idFinalObra, nomeObra: nomeFinalObra, titulo: tituloCapitulo, conteudo: conteudo, authorNote: notaAutor, autor: user.name, autorId: user.uid, data: serverTimestamp(), views: 0
        });
        
        await setDoc(statusRef, { postsHoje: novoContador, dataUltimoPost: hoje }, { merge: true });
        await enviarNotificacoes(nomeFinalObra, tituloCapitulo, capRef.id);
        
        toast.success(`Success! Published (${totalPalavras} words).`, { id: toastId });
        navigate(`/obra/${idFinalObra}`);

    } catch (error) { 
        console.error(error); 
        toast.error("Error: " + error.message, { id: toastId }); 
    } finally { 
        setLoadingPost(false); 
    }
  }

  const OPEN_SOURCE_TINY = "https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.2/tinymce.min.js";
  const editorConfig = { height: 400, menubar: false, plugins: 'anchor autolink charmap emoticons link lists searchreplace visualblocks wordcount', toolbar: 'undo redo | blocks fontsize | bold italic underline | align lineheight | numlist bullist | emoticons charmap | removeformat', skin: 'oxide-dark', content_css: 'dark', body_class: 'my-editor-content' };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Cabeçalho com Botão de Cancelar */}
        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <MdEdit className="text-primary" /> Editor Studio
            </h1>
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                <MdCancel size={20} /> Cancel
            </button>
        </div>

        <div className="flex gap-4 mb-8 bg-[#1f1f1f] p-1 rounded-lg w-fit border border-[#333]">
            <button 
                onClick={() => setModo('nova')}
                className={`px-6 py-2 rounded-md font-bold transition-all ${modo === 'nova' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
                Create New Book
            </button>
            <button 
                onClick={() => setModo('capitulo')}
                className={`px-6 py-2 rounded-md font-bold transition-all ${modo === 'capitulo' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
                New Chapter Only
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-1 space-y-6">
                {modo === 'nova' ? (
                    <div className="bg-[#1f1f1f] border border-[#333] p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><MdBook className="text-yellow-500" /> Book Details</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Book Title</label>
                                <input type="text" value={tituloObra} onChange={(e)=>setTituloObra(e.target.value)} placeholder="Ex: The Lord of the Rings" className="w-full bg-[#151515] border border-[#333] rounded-lg p-3 text-white focus:border-primary outline-none transition-colors" />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cover URL</label>
                                <input type="text" value={capa} onChange={(e)=>setCapa(e.target.value)} placeholder="http://..." className="w-full bg-[#151515] border border-[#333] rounded-lg p-3 text-white focus:border-primary outline-none transition-colors" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Synopsis</label>
                                <Editor tinymceScriptSrc={OPEN_SOURCE_TINY} init={{...editorConfig, height: 200}} onEditorChange={(content) => setSinopse(content)} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Categories</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Fantasy','Sci-Fi','Romance','Horror','Adventure','RPG','Mystery','Action','Isekai','FanFic'].map(cat => (
                                        <label key={cat} className={`cursor-pointer text-xs px-3 py-1.5 rounded-full border transition-all ${categorias.includes(cat) ? 'bg-primary/20 border-primary text-primary' : 'bg-[#151515] border-[#333] text-gray-400 hover:border-gray-500'}`}>
                                            <input type="checkbox" value={cat} onChange={handleCategoria} className="hidden" /> {cat}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-[#1f1f1f] border border-[#333] p-6 rounded-xl">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Select Book to Update</label>
                        <select value={obraSelecionada} onChange={(e)=>setObraSelecionada(e.target.value)} className="w-full bg-[#151515] border border-[#333] rounded-lg p-3 text-white focus:border-primary outline-none cursor-pointer">
                            <option value="">-- Select a Book --</option>
                            {minhasObras.map(o => <option key={o.id} value={o.id}>{o.titulo}</option>)}
                        </select>
                    </div>
                )}
            </div>

            <div className="lg:col-span-2">
                <div className="bg-[#1f1f1f] border border-[#333] p-6 rounded-xl relative">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <MdEdit className="text-green-500" /> {modo === 'nova' ? "First Chapter" : "New Chapter Content"}
                    </h3>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Chapter Title</label>
                            <input type="text" value={tituloCapitulo} onChange={(e)=>setTituloCapitulo(e.target.value)} placeholder="Ex: Chapter 1 - The Beginning" className="w-full bg-[#151515] border border-[#333] rounded-lg p-3 text-white focus:border-green-500 outline-none transition-colors font-bold text-lg" />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                Story Content <span className="text-red-400 ml-1">(Min: 500 words)</span>
                            </label>
                            <Editor tinymceScriptSrc={OPEN_SOURCE_TINY} init={{...editorConfig, height: 600}} onEditorChange={(content) => setConteudo(content)} />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-blue-400 uppercase mb-1">Author Note (Optional)</label>
                            <div className="border-l-4 border-blue-500 pl-4">
                                <Editor tinymceScriptSrc={OPEN_SOURCE_TINY} init={{...editorConfig, height: 150}} onEditorChange={(content) => setNotaAutor(content)} />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end pt-6 border-t border-white/10 gap-3">
                        {/* Botão Cancelar Inferior */}
                        <button onClick={() => navigate('/')} className="bg-transparent border border-[#444] hover:bg-[#333] text-gray-300 font-bold py-3 px-6 rounded-lg transition-all">
                            Cancel
                        </button>

                        <button 
                            onClick={handlePublicar} 
                            disabled={loadingPost} 
                            className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-green-900/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loadingPost ? "Publishing..." : <><MdCheckCircle size={20} /> Publish Now</>}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
}