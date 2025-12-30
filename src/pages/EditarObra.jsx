import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import {
  doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, orderBy
} from 'firebase/firestore';
import { Editor } from '@tinymce/tinymce-react';
import { MdSave, MdDelete, MdArrowBack, MdVisibility, MdAdd, MdLock, MdPublic, MdCancel, MdEdit } from 'react-icons/md';
import toast from 'react-hot-toast';

// Lista fixa de categorias para o editor - HFY ADICIONADO
const categoriesList = [
  'Fantasy', 'Sci-Fi', 'Romance', 'Horror', 'Adventure',
  'RPG', 'Mystery', 'Action', 'Isekai', 'FanFic', 'HFY'
];

const OPEN_SOURCE_TINY = "https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.2/tinymce.min.js";
const editorConfig = {
  height: 250,
  menubar: false,
  plugins: 'anchor autolink charmap emoticons link lists searchreplace visualblocks wordcount',
  toolbar: 'undo redo | blocks fontsize | bold italic underline | align lineheight | numlist bullist | emoticons charmap | removeformat',
  skin: 'oxide-dark',
  content_css: 'dark',
  body_class: 'my-editor-content'
};

export default function EditarObra() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [titulo, setTitulo] = useState('');
  const [capa, setCapa] = useState('');
  const [sinopse, setSinopse] = useState('');
  const [status, setStatus] = useState('public');
  const [categorias, setCategorias] = useState([]);
  const [capitulos, setCapitulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadDados() {
      if (!user?.uid) return; // Garante que tem usuário antes de buscar

      try {
        const docRef = doc(db, "obras", id);
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) {
          toast.error("Book not found.");
          return navigate("/dashboard");
        }

        const dados = snapshot.data();
        if (dados.autorId !== user?.uid) {
          toast.error("Permission denied.");
          return navigate("/dashboard");
        }

        setTitulo(dados.titulo || '');
        setCapa(dados.capa || '');
        setSinopse(dados.sinopse || '');
        setStatus(dados.status || 'public');
        setCategorias(dados.categorias || []); // Garante array vazio se não existir

        // Carregar Capítulos
        const q = query(collection(db, "capitulos"), where("obraId", "==", id), orderBy("data", "asc"));
        const snapCaps = await getDocs(q);
        let lista = [];
        snapCaps.forEach(d => lista.push({ id: d.id, ...d.data() }));
        setCapitulos(lista);

      } catch (error) {
        console.error("Erro ao carregar obra:", error);
        toast.error("Error loading book data.");
      } finally {
        setLoading(false);
      }
    }

    loadDados();
  }, [id, user, navigate]);

  const handleCategoria = (cat) => {
    if (categorias.includes(cat)) {
      setCategorias(categorias.filter(c => c !== cat));
    } else {
      setCategorias([...categorias, cat]);
    }
  };

  async function handleSave() {
    if (!titulo.trim()) return toast.error("Title is required.");

    setSaving(true);
    const toastId = toast.loading("Saving...");
    try {
      await updateDoc(doc(db, "obras", id), {
        titulo,
        capa,
        sinopse,
        status,
        categorias,
        tituloBusca: titulo.toLowerCase() // Atualiza também o índice de busca
      });
      toast.success("Saved!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Error saving.", { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBook() {
    const confirmText = window.prompt("Type 'DELETE' to confirm deletion of this book and all chapters:");
    if (confirmText !== "DELETE") return;

    const toastId = toast.loading("Deleting...");
    try {
      // 1. Deleta a Obra
      await deleteDoc(doc(db, "obras", id));

      // 2. Deleta os Capítulos
      const q = query(collection(db, "capitulos"), where("obraId", "==", id));
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      toast.success("Deleted.", { id: toastId });
      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      toast.error("Error deleting.", { id: toastId });
    }
  }

  // --- LOADER ---
  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-white/10 pb-4 gap-4">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-gray-400 hover:text-white transition flex items-center gap-1">
            <MdArrowBack size={24} /> Back
          </Link>
          <h1 className="text-2xl font-bold text-white">Edit Book</h1>
        </div>
        <Link to={`/obra/${id}`} className="bg-[#2a2a2a] hover:bg-[#333] text-gray-300 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-white/10">
          <MdVisibility /> View Public Page
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* --- COLUNA 1: CONFIGURAÇÕES DA OBRA --- */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#1f1f1f] border border-[#333] rounded-xl p-6 shadow-lg">

            {/* Visibilidade */}
            <div className="mb-6">
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">Visibility</label>
              <div className="flex gap-2 bg-[#151515] p-1 rounded-lg border border-[#333]">
                <button
                  onClick={() => setStatus('public')}
                  className={`flex-1 py-2 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-all ${status === 'public' ? 'bg-green-600/20 text-green-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <MdPublic /> Public
                </button>
                <button
                  onClick={() => setStatus('private')}
                  className={`flex-1 py-2 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-all ${status === 'private' ? 'bg-red-600/20 text-red-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <MdLock /> Private
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Title</label>
              <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full bg-[#151515] border border-[#333] rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all" />
            </div>

            <div className="mb-4">
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Cover URL</label>
              <input type="text" value={capa} onChange={(e) => setCapa(e.target.value)} className="w-full bg-[#151515] border border-[#333] rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all" placeholder="https://..." />
            </div>

            {/* Categorias */}
            <div className="mb-6">
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Categories</label>
              <div className="flex flex-wrap gap-2 bg-[#151515] p-3 rounded-lg border border-[#333]">
                {categoriesList.map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleCategoria(cat)}
                    className={`text-[10px] px-2.5 py-1 rounded border transition-all ${categorias.includes(cat) ? 'bg-blue-500/20 border-blue-500 text-blue-400 font-bold' : 'bg-[#1f1f1f] border-[#333] text-gray-400 hover:border-gray-500'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Synopsis</label>
              <div className="rounded-lg overflow-hidden border border-[#333]">
                <Editor tinymceScriptSrc={OPEN_SOURCE_TINY} init={editorConfig} value={sinopse} onEditorChange={(c) => setSinopse(c)} />
              </div>
            </div>

            <div className="flex gap-3 mb-6">
              <Link to={`/obra/${id}`} className="flex-1 bg-transparent border border-[#444] text-gray-300 hover:bg-[#333] hover:text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all">
                <MdCancel size={18} /> Cancel
              </Link>

              <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50">
                <MdSave size={18} /> {saving ? "Saving..." : "Save"}
              </button>
            </div>

            <button onClick={handleDeleteBook} className="w-full bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all text-sm">
              <MdDelete size={16} /> Delete Book Permanently
            </button>
          </div>
        </div>

        {/* --- COLUNA 2: LISTA DE CAPÍTULOS --- */}
        <div className="lg:col-span-2">
          <div className="bg-[#1f1f1f] border border-[#333] rounded-xl overflow-hidden shadow-lg flex flex-col h-full max-h-[800px]">
            <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#252525]">
              <h3 className="text-white font-bold flex items-center gap-2">
                Chapters <span className="bg-[#333] text-gray-400 text-xs px-2 py-0.5 rounded-full">{capitulos.length}</span>
              </h3>
              <Link to={`/escrever?obraId=${id}`} className="text-xs bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-1 transition-colors shadow-lg shadow-green-900/20">
                <MdAdd size={16} /> Add New Chapter
              </Link>
            </div>

            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {capitulos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                  <p>No chapters yet.</p>
                  <p className="text-sm">Click "Add New Chapter" to start.</p>
                </div>
              ) : (
                capitulos.map((cap, index) => (
                  <div key={cap.id} className="p-3 rounded-lg hover:bg-[#2a2a2a] flex justify-between items-center group transition border border-transparent hover:border-[#333]">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-600 font-mono text-xs w-6 text-center">#{index + 1}</span>
                      <div>
                        <p className="text-gray-200 font-medium text-sm group-hover:text-blue-400 transition-colors">{cap.titulo}</p>
                        <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-0.5">
                          <span>{cap.data ? new Date(cap.data.seconds * 1000).toLocaleDateString() : 'Draft'}</span>
                          {cap.views !== undefined && <span>👁️ {cap.views}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        to={`/editar-capitulo/${cap.id}`}
                        className="p-2 bg-[#333] text-yellow-500 rounded hover:bg-yellow-500/20 hover:text-yellow-400 transition-colors"
                        title="Edit Chapter"
                      >
                        <MdEdit size={16} />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}