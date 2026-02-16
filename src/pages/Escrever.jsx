import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db, storage } from '../services/firebaseConnection'; // ADICIONADO storage
import {
    collection, addDoc, serverTimestamp, query, where, getDocs, doc, writeBatch, updateDoc, increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // ADICIONADO
import { Editor } from '@tinymce/tinymce-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MdEdit, MdBook, MdCheckCircle, MdCancel, MdClose, MdInfoOutline, MdWarning, MdSchedule } from 'react-icons/md';
import toast from 'react-hot-toast';

const genresList = ['Fantasy', 'Sci-Fi', 'Romance', 'Horror', 'Adventure', 'RPG', 'Mystery', 'Action', 'Isekai', 'FanFic', 'HFY'];

const OPEN_SOURCE_TINY = "https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.2/tinymce.min.js";
const editorConfig = {
    height: 400, menubar: false, plugins: 'anchor autolink charmap emoticons link lists searchreplace visualblocks wordcount', toolbar: 'undo redo | blocks fontsize | bold italic underline | align lineheight | numlist bullist | emoticons charmap | removeformat', skin: 'oxide-dark', content_css: 'dark', body_class: 'my-editor-content'
};

function countWords(htmlString) {
    if (!htmlString) return 0;
    const text = htmlString.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length === 0 ? 0 : text.split(' ').length;
}

export default function Escrever() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const obraIdUrl = searchParams.get('obraId');
    const [modo, setModo] = useState(obraIdUrl ? 'capitulo' : 'nova');
    const [minhasObras, setMinhasObras] = useState([]);

    // Campos do Formulário
    const [tituloObra, setTituloObra] = useState('');
    const [capa, setCapa] = useState('');
    const [coverFileName, setCoverFileName] = useState(null);
    const [sinopse, setSinopse] = useState('');
    const [categorias, setCategorias] = useState([]);

    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');

    const [obraSelecionada, setObraSelecionada] = useState(obraIdUrl || '');
    const [tituloCapitulo, setTituloCapitulo] = useState('');
    const [conteudo, setConteudo] = useState('');
    const [notaAutor, setNotaAutor] = useState('');

    // NOVO: Estado para agendamento
    const [dataAgendada, setDataAgendada] = useState('');

    const [loadingPost, setLoadingPost] = useState(false);

    useEffect(() => {
        async function loadObras() {
            if (user?.uid) {
                const q = query(collection(db, "obras"), where("autorId", "==", user.uid));
                const snap = await getDocs(q);
                let lista = [];
                snap.forEach(d => lista.push({ id: d.id, titulo: d.data().titulo }));
                setMinhasObras(lista);
            }
        }
        loadObras();
    }, [user]);

    const handleCategoria = (e) => {
        const valor = e.target.value;
        if (e.target.checked) { setCategorias([...categorias, valor]); } else { setCategorias(categorias.filter(c => c !== valor)); }
    };

    const handleCoverFile = async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File too large (Max 5MB).");
                return;
            }

            setCoverFileName(file.name);
            const toastId = toast.loading("Uploading cover...");

            try {
                const storageRef = ref(storage, `covers/${user.uid}/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                const url = await getDownloadURL(snapshot.ref);

                setCapa(url);
                toast.success("Cover uploaded!", { id: toastId });
            } catch (error) {
                console.error("Upload error:", error);
                toast.error("Upload failed.", { id: toastId });
            }
        }
    };

    const handleTagKeyDown = React.useCallback((e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = tagInput.trim();
            if (val && !tags.includes(val) && tags.length < 10) {
                setTags(prev => [...prev, val]);
                setTagInput('');
            }
        }
    }, [tagInput, tags]);

    const removeTag = React.useCallback((tagToRemove) => {
        setTags(prev => prev.filter(tag => tag !== tagToRemove));
    }, []);

    // Placeholder to prevent ReferenceError if this was called somewhere else
    async function enviarNotificacoes() {
        console.log("Notification logic moved to backend.");
    }





    async function handlePublicar(status = 'public') {
        if (!user) return toast.error("You must be logged in!");

        if (modo === 'nova') {
            if (!tituloObra) return toast.error("Please fill in Book Title.");
            // Sinopse can be empty for draft? Let's keep it required for now to avoid broken UI.
            if (!sinopse) return toast.error("Please fill in Synopsis.");
        } else {
            if (!obraSelecionada) return toast.error("Select a book.");
        }

        if (!tituloCapitulo) return toast.error("Please fill in Chapter Title.");

        // Drafts can be shorter/incomplete
        const wordCount = countWords(conteudo);
        if (status === 'public') {
            if (!conteudo) return toast.error("Please fill in Content.");
            if (wordCount < 500) {
                return toast.error(`Chapter too short! Minimum 500 words required. (Current: ${wordCount})`);
            }
            if (wordCount > 15000) {
                return toast.error(`Chapter too long! Maximum 15,000 words allowed. (Current: ${wordCount})`);
            }
        }

        setLoadingPost(true);
        const toastId = toast.loading(status === 'draft' ? "Saving draft..." : "Publishing...");

        try {
            let idFinalObra = obraSelecionada;
            let nomeFinalObra = "";

            // REGRA: Se for nova obra, forçar dataAgendada a ser nula (publicação imediata) se for PUBLIC
            let dataFinalParaUso = dataAgendada;

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
                    status: status, // 'public' or 'draft'
                    totalChapters: 0
                });
                idFinalObra = docRef.id;
                nomeFinalObra = tituloObra;
                dataFinalParaUso = '';
            } else {
                const obraObj = minhasObras.find(o => o.id === obraSelecionada);
                nomeFinalObra = obraObj ? obraObj.titulo : "Unknown";
            }

            const dataPublicacao = dataFinalParaUso ? new Date(dataFinalParaUso) : new Date();

            const capRef = await addDoc(collection(db, "capitulos"), {
                obraId: idFinalObra,
                nomeObra: nomeFinalObra,
                titulo: tituloCapitulo,
                conteudo: conteudo || '',
                authorNote: notaAutor,
                autor: user.name,
                autorId: user.uid,
                data: dataPublicacao,
                status: status, // 'public' or 'draft'
                views: 0
            });

            const bookRef = doc(db, 'obras', idFinalObra);
            await updateDoc(bookRef, {
                totalChapters: increment(1), // Should we count drafts? Maybe not public chapters count.
                // But for now keeping simple.
                lastUpdated: serverTimestamp()
            });

            if (status === 'draft') {
                toast.success("Draft saved successfully!", { id: toastId });
                // Stay on page or redirect? Maybe redirect to edit?
                // For now, let's redirect to edit chapter so they can continue working
                navigate(`/editar-capitulo/${capRef.id}`);
            } else {
                // ... existing success logic
                let msg = "Published successfully!";
                if (dataFinalParaUso) {
                    // ... existing formatting
                    const dateObj = new Date(dataFinalParaUso);
                    const formattedDate = dateObj.toLocaleString('en-US', {
                        month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true
                    });
                    msg = `Scheduled for ${formattedDate}`;
                }
                toast.success(msg, { id: toastId });
                navigate(`/ler/${capRef.id}`);
            }

        } catch (error) {
            console.error(error);
            toast.error("Error: " + error.message, { id: toastId });
        } finally {
            setLoadingPost(false);
        }
    }



    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3"><MdEdit className="text-primary" /> Editor Studio</h1>
                <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white flex items-center gap-1 transition-colors"><MdCancel size={20} /> Cancel</button>
            </div>

            {/* BOTÕES DE MODO */}
            <div className="flex gap-4 mb-8 bg-[#1f1f1f] p-1 rounded-lg w-fit border border-[#333]">
                <button onClick={() => setModo('nova')} className={`px-6 py-2 rounded-md font-bold transition-all ${modo === 'nova' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Create New Book</button>
                <button onClick={() => setModo('capitulo')} className={`px-6 py-2 rounded-md font-bold transition-all ${modo === 'capitulo' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>New Chapter Only</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    {/* COLUNA DA ESQUERDA (Inputs do Livro) */}
                    {modo === 'nova' ? (
                        <div className="bg-[#1f1f1f] border border-[#333] p-6 rounded-xl">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><MdBook className="text-yellow-500" /> Book Details</h3>
                            <div className="space-y-4">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Book Title</label><input type="text" value={tituloObra} onChange={(e) => setTituloObra(e.target.value)} className="w-full bg-[#151515] border border-[#333] rounded-lg p-3 text-white focus:border-primary outline-none" /></div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cover Image (Upload)</label>
                                    <div className="flex items-center gap-2 mb-2">
                                        <label htmlFor="cover-upload-book" className="cursor-pointer bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md text-xs font-bold transition-all shadow-lg">
                                            Choose File
                                        </label>
                                        <input id="cover-upload-book" type="file" onChange={handleCoverFile} className="hidden" accept="image/png, image/jpeg" />
                                        <span className="text-[10px] text-gray-400">{coverFileName || "No file chosen"}</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Genres</label>
                                    <div className="flex flex-wrap gap-2">{genresList.map(cat => (<label key={cat} className={`cursor-pointer text-xs px-3 py-1.5 rounded-full border transition-all ${categorias.includes(cat) ? 'bg-primary/20 border-primary text-primary' : 'bg-[#151515] border-[#333] text-gray-400'}`}><input type="checkbox" value={cat} onChange={handleCategoria} className="hidden" /> {cat}</label>))}</div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Synopsis</label><Editor tinymceScriptSrc={OPEN_SOURCE_TINY} init={{ ...editorConfig, height: 200 }} onEditorChange={(content) => setSinopse(content)} /></div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-[#1f1f1f] border border-[#333] p-6 rounded-xl">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Select Book</label>
                            <select value={obraSelecionada} onChange={(e) => setObraSelecionada(e.target.value)} className="w-full bg-[#151515] border border-[#333] rounded-lg p-3 text-white focus:border-primary outline-none cursor-pointer">
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
                                <input type="text" value={tituloCapitulo} onChange={(e) => setTituloCapitulo(e.target.value)} className="w-full bg-[#151515] border border-[#333] rounded-lg p-3 text-white focus:border-green-500 outline-none font-bold text-lg" />
                            </div>

                            {/* LÓGICA DE AGENDAMENTO */}
                            {modo === 'nova' ? (
                                <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg flex items-start gap-3">
                                    <MdInfoOutline className="text-blue-500 text-xl flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-blue-500 text-sm font-bold mb-1">First Chapter Policy</h4>
                                        <p className="text-gray-400 text-xs">The first chapter of a new book must be published immediately to ensure the book listing is active.</p>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="text-xs font-bold text-blue-400 uppercase mb-1 flex items-center gap-1">
                                        <MdSchedule /> Schedule Publication (Optional)
                                    </label>
                                    {/* O input type="datetime-local" segue o padrão do navegador, mas a lógica foi tratada */}
                                    <input
                                        type="datetime-local"
                                        value={dataAgendada}
                                        onChange={(e) => setDataAgendada(e.target.value)}
                                        className="w-full bg-[#151515] border border-[#333] rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">Leave blank to publish immediately. Format: Month/Day/Year Time</p>
                                </div>
                            )}

                            <div>
                                <div className="flex justify-between mb-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Content</label>
                                    <span className={`text-xs font-bold ${countWords(conteudo) < 500 ? 'text-red-400' : 'text-green-400'}`}>
                                        {countWords(conteudo)} words (Min: 500)
                                    </span>
                                </div>
                                <Editor tinymceScriptSrc={OPEN_SOURCE_TINY} init={{ ...editorConfig, height: 600 }} onEditorChange={(content) => setConteudo(content)} />
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <label className="text-xs font-bold text-blue-400 uppercase mb-2 block tracking-wider">Author Note (Optional)</label>
                                <div className="border border-[#333] rounded-lg overflow-hidden">
                                    <Editor tinymceScriptSrc={OPEN_SOURCE_TINY} init={{ ...editorConfig, height: 200, statusbar: false }} onEditorChange={(content) => setNotaAutor(content)} />
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-white/10">
                            <button onClick={() => handlePublicar('draft')} disabled={loadingPost} className="bg-[#333] hover:bg-[#444] text-gray-300 font-bold py-3 px-6 rounded-lg flex items-center gap-2 disabled:opacity-50">
                                <MdEdit /> Save Draft
                            </button>
                            <button onClick={() => handlePublicar('public')} disabled={loadingPost} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center gap-2 disabled:opacity-50">
                                {loadingPost ? "Processing..." : (dataAgendada && modo !== 'nova') ? <><MdSchedule size={20} /> Schedule</> : <><MdCheckCircle size={20} /> Publish</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}