import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { 
  collection, addDoc, serverTimestamp, query, where, getDocs, doc, writeBatch
} from 'firebase/firestore';
import { Editor } from '@tinymce/tinymce-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
// Adicionei MdInfoOutline e MdWarning nos imports
import { MdEdit, MdBook, MdCheckCircle, MdCancel, MdClose, MdInfoOutline, MdWarning } from 'react-icons/md';
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
  
  const [tags, setTags] = useState([]); 
  const [tagInput, setTagInput] = useState('');

  const [obraSelecionada, setObraSelecionada] = useState(obraIdUrl || '');
  const [tituloCapitulo, setTituloCapitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [notaAutor, setNotaAutor] = useState('');
  const [loadingPost, setLoadingPost] = useState(false);

  const genresList = ['Fantasy','Sci-Fi','Romance','Horror','Adventure','RPG','Mystery','Action','Isekai','FanFic'];

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

  const handleTagKeyDown = (e) => {
      if(e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const val = tagInput.trim();
          if(val && !tags.includes(val) && tags.length < 10) {
              setTags([...tags, val]);
              setTagInput('');
          }
      }
  };

  const removeTag = (tagToRemove) => {
      setTags(tags.filter(tag => tag !== tagToRemove));
  };

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

  async function handlePublicar() {
    if (!user) return toast.error("You must be logged in!");
    
    if (modo === 'nova') { 
        if(!tituloObra || !sinopse) return toast.error("Please fill in Book Title and Synopsis."); 
    } else { 
        if(!obraSelecionada) return toast.error("Select a book."); 
    }
    
    if(!tituloCapitulo || !conteudo) return toast.error("Please fill in Chapter Title and Content.");
    
    setLoadingPost(true);
    const toastId = toast.loading("Publishing...");

    try {
        let idFinalObra = obraSelecionada;
        let nomeFinalObra = "";
        
        if (modo === 'nova') {
            const docRef = await addDoc(collection(db, "obras"), {
                titulo: tituloObra, 
                capa: capa, 
                sinopse: sinopse, 
                categorias: categorias, 
                tags: tags, 
                autor: user.name, 
                autorId: user.uid, 
                dataCriacao: serverTimestamp(), 
                tituloBusca: tituloObra.toLowerCase(), 
                views: 0, rating: 0, votes: 0, 
                status: 'public',
                
                // Sem campos de preço/premium
                tipo: 'free',
                preco: 0
            });
            idFinalObra = docRef.id; nomeFinalObra = tituloObra;
        } else {
            const obraObj = minhasObras.find(o => o.id === obraSelecionada);
            nomeFinalObra = obraObj ? obraObj.titulo : "Unknown";
        }
        
        const capRef = await addDoc(collection(db, "capitulos"), {
            obraId: idFinalObra, 
            nomeObra: nomeFinalObra, 
            titulo: tituloCapitulo, 
            conteudo: conteudo, 
            authorNote: notaAutor, 
            autor: user.name, 
            autorId: user.uid, 
            data: serverTimestamp(), 
            views: 0
        });
        
        await enviarNotificacoes(nomeFinalObra, tituloCapitulo, capRef.id);
        
        toast.success(`Success! Published.`, { id: toastId });
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
        
        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <MdEdit className="text-primary" /> Editor Studio
            </h1>
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                <MdCancel size={20} /> Cancel
            </button>
        </div>

        <div className="flex gap-4 mb-8 bg-[#1f1f1f] p-1 rounded-lg w-fit border border-[#333]">
            <button onClick={() => setModo('nova')} className={`px-6 py-2 rounded-md font-bold transition-all ${modo === 'nova' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Create New Book</button>
            <button onClick={() => setModo('capitulo')} className={`px-6 py-2 rounded-md font-bold transition-all ${modo === 'capitulo' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>New Chapter Only</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-1 space-y-6">
                {modo === 'nova' ? (
                    <div className="bg-[#1f1f1f] border border-[#333] p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><MdBook className="text-yellow-500" /> Book Details</h3>
                        
                        {/* --- NOVO AVISO DE SEGURANÇA E REGRAS --- */}
                        <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg mb-6">
                            <h4 className="text-blue-400 font-bold text-xs uppercase flex items-center gap-2 mb-3">
                                <MdInfoOutline size={16} /> Important Guidelines
                            </h4>
                            <ul className="text-[11px] text-gray-300 space-y-2.5 leading-relaxed">
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-500">•</span>
                                    <span>
                                        <strong>Fanfiction:</strong> If your story is based on an existing work, please ensure you select the <strong className="text-white">FanFic</strong> category below.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-500">•</span>
                                    <span>
                                        <strong>Verification:</strong> If this story is published on another platform, please mention it in the synopsis or link your profile there so we can verify your identity.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2 pt-1 border-t border-blue-500/20">
                                    <MdWarning className="text-red-400 shrink-0" size={14} />
                                    <span className="text-red-300">
                                        <strong>Plagiarism Policy:</strong> Publishing content that is not yours will result in a suspension of <strong>30 to 180 days</strong> or a permanent ban.
                                    </span>
                                </li>
                            </ul>
                        </div>
                        {/* --- FIM DO AVISO --- */}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Book Title</label>
                                <input type="text" value={tituloObra} onChange={(e)=>setTituloObra(e.target.value)} className="w-full bg-[#151515] border border-[#333] rounded-lg p-3 text-white focus:border-primary outline-none transition-colors" />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cover URL</label>
                                <input type="text" value={capa} onChange={(e)=>setCapa(e.target.value)} className="w-full bg-[#151515] border border-[#333] rounded-lg p-3 text-white focus:border-primary outline-none transition-colors" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Genres</label>
                                <div className="flex flex-wrap gap-2">
                                    {genresList.map(cat => (
                                        <label key={cat} className={`cursor-pointer text-xs px-3 py-1.5 rounded-full border transition-all ${categorias.includes(cat) ? 'bg-primary/20 border-primary text-primary' : 'bg-[#151515] border-[#333] text-gray-400 hover:border-gray-500'}`}>
                                            <input type="checkbox" value={cat} onChange={handleCategoria} className="hidden" /> {cat}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tags</label>
                                <div className="bg-[#151515] border border-[#333] rounded-lg p-2 flex flex-wrap gap-2">
                                    {tags.map((tag, i) => (
                                        <span key={i} className="bg-blue-600/20 text-blue-400 text-xs px-2 py-1 rounded flex items-center gap-1 border border-blue-600/30">
                                            {tag}
                                            <MdClose size={14} className="cursor-pointer hover:text-white" onClick={() => removeTag(tag)} />
                                        </span>
                                    ))}
                                    <input 
                                        type="text" 
                                        value={tagInput} 
                                        onChange={(e) => setTagInput(e.target.value)} 
                                        onKeyDown={handleTagKeyDown}
                                        placeholder="Add tag..." 
                                        className="bg-transparent text-sm outline-none text-white flex-1 min-w-[80px]" 
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Synopsis</label>
                                <Editor tinymceScriptSrc={OPEN_SOURCE_TINY} init={{...editorConfig, height: 200}} onEditorChange={(content) => setSinopse(content)} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-[#1f1f1f] border border-[#333] p-6 rounded-xl">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Select Book</label>
                        <select value={obraSelecionada} onChange={(e)=>setObraSelecionada(e.target.value)} className="w-full bg-[#151515] border border-[#333] rounded-lg p-3 text-white focus:border-primary outline-none cursor-pointer">
                            <option value="">-- Select --</option>
                            {minhasObras.map(o => <option key={o.id} value={o.id}>{o.titulo}</option>)}
                        </select>
                    </div>
                )}
            </div>

            <div className="lg:col-span-2">
                <div className="bg-[#1f1f1f] border border-[#333] p-6 rounded-xl relative">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <MdEdit className="text-green-500" /> Content Editor
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Chapter Title</label>
                            <input type="text" value={tituloCapitulo} onChange={(e)=>setTituloCapitulo(e.target.value)} className="w-full bg-[#151515] border border-[#333] rounded-lg p-3 text-white focus:border-green-500 outline-none font-bold text-lg" />
                        </div>
                        <div>
                            <Editor tinymceScriptSrc={OPEN_SOURCE_TINY} init={{...editorConfig, height: 600}} onEditorChange={(content) => setConteudo(content)} />
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <label className="text-xs font-bold text-blue-400 uppercase mb-2 block tracking-wider">Author Note (Optional)</label>
                            <div className="border border-[#333] rounded-lg overflow-hidden">
                                <Editor 
                                    tinymceScriptSrc={OPEN_SOURCE_TINY} 
                                    init={{...editorConfig, height: 200, statusbar: false}} 
                                    onEditorChange={(content) => setNotaAutor(content)} 
                                />
                            </div>
                        </div>

                    </div>
                    <div className="mt-8 flex justify-end pt-6 border-t border-white/10">
                        <button onClick={handlePublicar} disabled={loadingPost} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center gap-2 disabled:opacity-50">
                            {loadingPost ? "Publishing..." : <><MdCheckCircle size={20} /> Publish</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}