import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { 
  doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, orderBy 
} from 'firebase/firestore';
import { Editor } from '@tinymce/tinymce-react';
import { MdSave, MdDelete, MdEdit, MdArrowBack, MdVisibility, MdAdd } from 'react-icons/md';
import toast from 'react-hot-toast'; // <--- IMPORTANTE

export default function EditarObra() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [titulo, setTitulo] = useState('');
  const [capa, setCapa] = useState('');
  const [sinopse, setSinopse] = useState('');
  const [status, setStatus] = useState('public');
  const [capitulos, setCapitulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const OPEN_SOURCE_TINY = "https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.2/tinymce.min.js";
  const editorConfig = {
    height: 300,
    menubar: false,
    plugins: 'anchor autolink charmap emoticons link lists searchreplace visualblocks wordcount',
    toolbar: 'undo redo | blocks fontsize | bold italic underline | align lineheight | numlist bullist | emoticons charmap | removeformat',
    skin: 'oxide-dark',
    content_css: 'dark',
    body_class: 'my-editor-content'
  };

  useEffect(() => {
    async function loadDados() {
      try {
        const docRef = doc(db, "obras", id);
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) {
          toast.error("Book not found.");
          return navigate("/dashboard");
        }

        const dados = snapshot.data();
        if (dados.autorId !== user?.uid) {
          toast.error("You do not have permission to edit this book.");
          return navigate("/dashboard");
        }

        setTitulo(dados.titulo);
        setCapa(dados.capa || '');
        setSinopse(dados.sinopse || '');
        setStatus(dados.status || 'public');

        const q = query(
            collection(db, "capitulos"), 
            where("obraId", "==", id), 
            orderBy("data", "asc")
        );
        const snapCaps = await getDocs(q);
        let lista = [];
        snapCaps.forEach(d => lista.push({ id: d.id, ...d.data() }));
        setCapitulos(lista);

        setLoading(false);

      } catch (error) {
        console.log(error);
        setLoading(false);
      }
    }
    if(user?.uid) loadDados();
  }, [id, user, navigate]);

  async function handleSave() {
    setSaving(true);
    const toastId = toast.loading("Saving...");
    try {
      await updateDoc(doc(db, "obras", id), { titulo, capa, sinopse, status });
      toast.success("Book updated successfully!", { id: toastId });
    } catch (error) { 
      toast.error("Error saving.", { id: toastId }); 
    } finally { setSaving(false); }
  }

  async function handleDeleteBook() {
    const confirmacao = window.prompt("To delete this book and ALL chapters, type 'DELETE':");
    if (confirmacao !== "DELETE") return;
    
    const toastId = toast.loading("Deleting book...");
    try {
      await deleteDoc(doc(db, "obras", id));
      const q = query(collection(db, "capitulos"), where("obraId", "==", id));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
      
      toast.success("Book deleted.", { id: toastId });
      navigate("/dashboard");
    } catch (error) { 
      toast.error("Error deleting: " + error.message, { id: toastId }); 
    }
  }

  async function handleDeleteChapter(idCap, tituloCap) {
    if(!window.confirm(`Are you sure you want to delete the chapter "${tituloCap}"?`)) return;
    const toastId = toast.loading("Deleting chapter...");
    try {
      await deleteDoc(doc(db, "capitulos", idCap));
      setCapitulos(capitulos.filter(c => c.id !== idCap));
      toast.success("Chapter deleted", { id: toastId });
    } catch (error) { 
      toast.error("Error deleting chapter.", { id: toastId }); 
    }
  }

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
      
      {/* CABEÇALHO */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link to="/dashboard" style={{ color: '#aaa', textDecoration: 'none', display: 'flex', alignItems: 'center', fontSize: '1.1rem' }}>
                <MdArrowBack size={24} /> Back
            </Link>
            <h2 style={{ color: 'white', margin: 0, fontSize: '1.8rem' }}>Edit Book</h2>
        </div>
        <Link to={`/obra/${id}`} style={{ background: '#333', color: '#ccc', padding: '8px 15px', borderRadius: 5, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.9rem' }}>
            <MdVisibility /> View Public Page
        </Link>
      </div>

      {/* LAYOUT RESPONSIVO (GRID) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '40px' }}>
        
        {/* --- COLUNA 1: DETALHES --- */}
        <div className="form-container" style={{ background: '#1f1f1f', padding: '25px', borderRadius: '8px', border: '1px solid #333' }}>
            <h3 style={{ color: '#4a90e2', borderBottom: '1px solid #333', paddingBottom: 15, marginTop: 0, marginBottom: 20 }}>
                Book Details
            </h3>
            
            <div style={{ marginBottom: 20 }}>
                <label style={{ color: '#ffd700', display:'block', marginBottom:8, fontWeight: 'bold', fontSize: '0.9rem' }}>VISIBILITY</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '100%', padding: 12, background: '#2a2a2a', color: 'white', border: '1px solid #444', borderRadius: 5, fontSize: '1rem', outline: 'none' }}>
                    <option value="public">🌎 Public (Visible to everyone)</option>
                    <option value="private">🔒 Private (Only you can see)</option>
                </select>
            </div>
            <div style={{ marginBottom: 20 }}>
                <label style={{ color: '#aaa', display:'block', marginBottom:8, fontSize: '0.9rem' }}>TITLE</label>
                <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} style={{ width: '100%', padding: 12, background: '#2a2a2a', color: 'white', border: '1px solid #444', borderRadius: 5, fontSize: '1rem' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
                <label style={{ color: '#aaa', display:'block', marginBottom:8, fontSize: '0.9rem' }}>COVER IMAGE (URL)</label>
                <input type="text" value={capa} onChange={(e) => setCapa(e.target.value)} style={{ width: '100%', padding: 12, background: '#2a2a2a', color: 'white', border: '1px solid #444', borderRadius: 5, fontSize: '1rem' }} />
            </div>
            <div style={{ marginBottom: 25 }}>
                <label style={{ color: '#aaa', display:'block', marginBottom:8, fontSize: '0.9rem' }}>SYNOPSIS</label>
                <Editor tinymceScriptSrc={OPEN_SOURCE_TINY} init={editorConfig} value={sinopse} onEditorChange={(content) => setSinopse(content)} />
            </div>

            <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, fontWeight: 'bold' }}>
                <MdSave size={20} /> {saving ? "Saving..." : "Save Changes"}
            </button>
            <div style={{ marginTop: 30, borderTop: '1px solid #333', paddingTop: 20 }}>
                <button onClick={handleDeleteBook} className="btn-danger" style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, background: '#d9534f', border: 'none', color: 'white', borderRadius: 5, cursor: 'pointer' }}>
                    <MdDelete size={20} /> Delete Book
                </button>
            </div>
        </div>

        {/* --- COLUNA 2: CAPÍTULOS --- */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ color: 'white', margin: 0 }}>Chapters ({capitulos.length})</h3>
                <Link to={`/escrever?obraId=${id}`} className="btn-primary" style={{ textDecoration: 'none', padding: '8px 15px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <MdAdd /> Add New
                </Link>
            </div>
            <div style={{ background: '#1f1f1f', border: '1px solid #333', borderRadius: 8, flex: 1, minHeight: '400px', maxHeight: '800px', overflowY: 'auto' }}>
                {capitulos.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 20, color: '#777' }}>
                        <p style={{ fontSize: '1.1rem' }}>No chapters yet.</p>
                        <p style={{ fontSize: '0.9rem' }}>Start writing your story!</p>
                    </div>
                ) : (
                    capitulos.map((cap, index) => (
                        <div key={cap.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid #333', background: index % 2 === 0 ? '#252525' : '#1f1f1f' }}>
                            <div style={{ overflow: 'hidden', marginRight: 15 }}>
                                <strong style={{ color: '#e0e0e0', display: 'block', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cap.titulo}</strong>
                                <span style={{ fontSize: '0.8rem', color: '#666' }}>{cap.data ? new Date(cap.data.seconds * 1000).toLocaleDateString() : 'Draft'} • 👁️ {cap.views || 0}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Link to={`/editar-capitulo/${cap.id}`} title="Edit Chapter" style={{ background: '#d9a404', color: '#000', width: 35, height: 35, borderRadius: 5, display:'flex', alignItems:'center', justifyContent:'center', transition: '0.2s' }}><MdEdit size={18} /></Link>
                                <button onClick={() => handleDeleteChapter(cap.id, cap.titulo)} title="Delete Chapter" style={{ background: '#d9534f', color: 'white', border: 'none', width: 35, height: 35, borderRadius: 5, cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><MdDelete size={18} /></button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>
    </div>
  );
}