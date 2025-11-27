import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { 
  collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc, setDoc, writeBatch
} from 'firebase/firestore';
import { Editor } from '@tinymce/tinymce-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast'; // <--- IMPORTANTE

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
    if (!user) return toast.error("You must be logged in!"); // Toast
    
    if (modo === 'nova') { 
        if(!tituloObra || !sinopse) return toast.error("Please fill in Book Title and Synopsis."); 
    } else { 
        if(!obraSelecionada) return toast.error("Select a book."); 
    }
    
    if(!tituloCapitulo || !conteudo) return toast.error("Please fill in Chapter Title and Content.");
    
    const totalPalavras = contarPalavras(conteudo);
    if (totalPalavras < 500) return toast.error(`Chapter too short! Minimum 500 words. (Current: ${totalPalavras})`);
    if (totalPalavras > 15000) return toast.error(`Chapter too long! Maximum 15,000 words. (Current: ${totalPalavras})`);

    setLoadingPost(true);
    const toastId = toast.loading("Publishing..."); // Loading Toast

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
        
        toast.success(`Success! Published (${totalPalavras} words).`, { id: toastId }); // Atualiza o toast de loading
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
    <div className="form-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '30px' }}>
        <h2 style={{ borderBottom: '1px solid #444', paddingBottom: 10, marginBottom: 20, color: 'white' }}>Editor Studio</h2>
        {/* ... (O resto do JSX permanece igual) ... */}
        <div style={{ marginBottom: 20, paddingBottom: 15, borderBottom: '1px solid #444' }}>
            <label style={{ marginRight: 20, cursor: 'pointer', color: modo==='nova'?'#4a90e2':'#aaa' }}>
                <input type="radio" checked={modo === 'nova'} onChange={() => setModo('nova')} /> Create New Book
            </label>
            <label style={{ cursor: 'pointer', color: modo==='capitulo'?'#4a90e2':'#aaa' }}>
                <input type="radio" checked={modo === 'capitulo'} onChange={() => setModo('capitulo')} /> New Chapter Only
            </label>
        </div>

        {modo === 'nova' && (
            <div className="animeLeft">
                <h3 style={{color:'white', marginTop:0}}>Book Details</h3>
                <label style={{color: '#4a90e2'}}>Book Title</label>
                <input type="text" value={tituloObra} onChange={(e)=>setTituloObra(e.target.value)} placeholder="Ex: The Lord of the Rings" />
                <label style={{color: '#4a90e2'}}>Cover URL (Image Link)</label>
                <input type="text" value={capa} onChange={(e)=>setCapa(e.target.value)} placeholder="http://..." />
                <label style={{color: '#4a90e2'}}>Synopsis</label>
                <Editor tinymceScriptSrc={OPEN_SOURCE_TINY} init={{...editorConfig, height: 200}} onEditorChange={(content) => setSinopse(content)} />
                <label style={{color: '#4a90e2', display:'block', marginTop: 20}}>Categories</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', background: '#252525', padding: 10, borderRadius: 5, marginBottom: 30 }}>
                    {['Fantasy','Sci-Fi','Romance','Horror','Adventure','RPG','Mystery','Action','Isekai'].map(cat => (
                        <label key={cat} style={{cursor:'pointer', fontSize:'0.9rem'}}>
                            <input type="checkbox" value={cat} onChange={handleCategoria} /> {cat}
                        </label>
                    ))}
                </div>
            </div>
        )}

        <div className="animeLeft">
            <hr style={{ borderColor: '#444', margin: '30px 0', borderWidth: 2 }} />
            {modo === 'capitulo' && (
                <>
                    <label style={{color: '#4a90e2'}}>Select Book</label>
                    <select value={obraSelecionada} onChange={(e)=>setObraSelecionada(e.target.value)} style={{marginBottom: 20}}>
                        <option value="">Select...</option>
                        {minhasObras.map(o => <option key={o.id} value={o.id}>{o.titulo}</option>)}
                    </select>
                </>
            )}
            <h3 style={{color:'white', marginTop:0}}>{modo === 'nova' ? "First Chapter" : "New Chapter"}</h3>
            <label style={{color: '#aaa'}}>Chapter Title</label>
            <input type="text" value={tituloCapitulo} onChange={(e)=>setTituloCapitulo(e.target.value)} placeholder="Ex: Chapter 1 - The Beginning" />
            <label style={{color: '#aaa'}}>Story Content <small style={{color:'#d9534f'}}>(Min: 500 words)</small></label>
            <Editor tinymceScriptSrc={OPEN_SOURCE_TINY} init={{...editorConfig, height: 500}} onEditorChange={(content) => setConteudo(content)} />
            <label style={{color: '#4a90e2', marginTop: 20, display:'block'}}>Author Note (Optional)</label>
            <Editor tinymceScriptSrc={OPEN_SOURCE_TINY} init={{...editorConfig, height: 200}} onEditorChange={(content) => setNotaAutor(content)} />
        </div>

        <div style={{ marginTop: 30, textAlign: 'right' }}>
            <button className="btn-primary" onClick={handlePublicar} disabled={loadingPost} style={{ padding: '15px 30px', fontSize: '1.1rem' }}>
                {loadingPost ? "Publishing..." : "Publish All"}
            </button>
        </div>
    </div>
  );
}