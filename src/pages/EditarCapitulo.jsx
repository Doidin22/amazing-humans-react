import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Editor } from '@tinymce/tinymce-react';
import { MdSave, MdArrowBack } from 'react-icons/md';
import toast from 'react-hot-toast'; // <--- IMPORTANTE

export default function EditarCapitulo() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [notaAutor, setNotaAutor] = useState('');
  const [obraId, setObraId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const OPEN_SOURCE_TINY = "https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.2/tinymce.min.js";
  const editorConfig = { height: 500, menubar: false, plugins: 'anchor autolink charmap emoticons link lists searchreplace visualblocks wordcount', toolbar: 'undo redo | blocks fontsize | bold italic underline | align lineheight | numlist bullist | emoticons charmap | removeformat', skin: 'oxide-dark', content_css: 'dark', body_class: 'my-editor-content' };

  useEffect(() => {
    async function loadCap() {
      try {
        const docRef = doc(db, "capitulos", id);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) {
          toast.error("Chapter not found.");
          return navigate("/dashboard");
        }
        const dados = snapshot.data();
        if (dados.autorId !== user?.uid) {
          toast.error("Permission denied.");
          return navigate("/dashboard");
        }
        setTitulo(dados.titulo);
        setConteudo(dados.conteudo);
        setNotaAutor(dados.authorNote || '');
        setObraId(dados.obraId);
        setLoading(false);
      } catch (error) {
        console.log(error);
        setLoading(false);
      }
    }
    if(user?.uid) loadCap();
  }, [id, user, navigate]);

  async function handleSave() {
    if(!titulo || !conteudo) return toast.error("Please fill in title and content.");
    setSaving(true);
    const toastId = toast.loading("Saving...");
    try {
      await updateDoc(doc(db, "capitulos", id), { titulo, conteudo, authorNote: notaAutor });
      toast.success("Chapter updated!", { id: toastId });
      navigate(`/editar-obra/${obraId}`);
    } catch (error) {
      toast.error("Error saving.", { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, borderBottom: '1px solid #444', paddingBottom: 15 }}>
            <Link to={`/editar-obra/${obraId}`} style={{ color: '#aaa', textDecoration: 'none', display: 'flex', alignItems: 'center' }}><MdArrowBack /> Back</Link>
            <h2 style={{ color: 'white', margin: 0 }}>Edit Chapter</h2>
        </div>

        <div className="animeLeft">
            <label style={{ color: '#aaa', display:'block', marginBottom:5 }}>Chapter Title</label>
            <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} style={{ width: '100%', padding: 10, background: '#222', color: 'white', border: '1px solid #444', borderRadius: 5, marginBottom: 20 }} />
            <label style={{ color: '#aaa', display:'block', marginBottom:5 }}>Content</label>
            <Editor tinymceScriptSrc={OPEN_SOURCE_TINY} init={editorConfig} value={conteudo} onEditorChange={(content) => setConteudo(content)} />
            <label style={{ color: '#4a90e2', display:'block', marginTop: 20, marginBottom:5 }}>Author Note (Optional)</label>
            <Editor tinymceScriptSrc={OPEN_SOURCE_TINY} init={{...editorConfig, height: 200}} value={notaAutor} onEditorChange={(content) => setNotaAutor(content)} />
            <div style={{ textAlign: 'right', marginTop: 30 }}>
                <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ padding: '12px 30px', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <MdSave /> {saving ? "Saving..." : "Save Chapter"}
                </button>
            </div>
        </div>
    </div>
  );
}