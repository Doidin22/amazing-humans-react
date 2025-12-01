import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { 
  doc, getDoc, collection, query, where, orderBy, limit, getDocs, 
  setDoc, serverTimestamp 
} from 'firebase/firestore';
import DOMPurify from 'dompurify';
import { 
  MdArrowBack, MdNavigateBefore, MdNavigateNext, MdSettings, 
  MdClose, MdFormatSize, MdFormatLineSpacing, MdTextFields
} from 'react-icons/md';
import Comentarios from '../components/Comentarios';
import toast from 'react-hot-toast';

export default function Ler() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [capitulo, setCapitulo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prevId, setPrevId] = useState(null);
  const [nextId, setNextId] = useState(null);

  // --- ESTADOS DE CONFIGURAÇÃO DE LEITURA ---
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    fontSize: 18,       // Tamanho da fonte (px)
    lineHeight: 1.8,    // Altura da linha
    fontFamily: 'serif',// 'serif', 'sans', 'mono'
    maxWidth: 800       // Largura do texto (px)
  });

  // 1. Carregar Configurações Salvas
  useEffect(() => {
    const savedSettings = localStorage.getItem('ah_reader_settings');
    if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // 2. Salvar Configurações Automaticamente
  useEffect(() => {
    localStorage.setItem('ah_reader_settings', JSON.stringify(settings));
  }, [settings]);

  // 3. Carregar Capítulo
  useEffect(() => {
    async function loadCapitulo() {
      setLoading(true);
      try {
        const docRef = doc(db, "capitulos", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          toast.error("Chapter not found.");
          navigate("/");
          return;
        }

        const data = docSnap.data();
        setCapitulo({ id: docSnap.id, ...data });

        // Histórico
        if (user?.uid && data.obraId) {
            const historyRef = doc(db, "historico", `${user.uid}_${data.obraId}`);
            await setDoc(historyRef, {
                userId: user.uid,
                obraId: data.obraId,
                bookTitle: data.nomeObra || "Unknown Book",
                lastChapterId: docSnap.id,
                lastChapterTitle: data.titulo,
                accessedAt: serverTimestamp()
            }, { merge: true });
        }

        // Navegação Prev/Next
        const qAnt = query(collection(db, "capitulos"), where("obraId", "==", data.obraId), where("data", "<", data.data), orderBy("data", "desc"), limit(1));
        const snapAnt = await getDocs(qAnt);
        setPrevId(!snapAnt.empty ? snapAnt.docs[0].id : null);

        const qProx = query(collection(db, "capitulos"), where("obraId", "==", data.obraId), where("data", ">", data.data), orderBy("data", "asc"), limit(1));
        const snapProx = await getDocs(qProx);
        setNextId(!snapProx.empty ? snapProx.docs[0].id : null);

      } catch (error) {
        console.error("Erro ao carregar:", error);
      } finally {
        setLoading(false);
        window.scrollTo(0, 0); // Rola para o topo ao mudar de capítulo
      }
    }
    loadCapitulo();
  }, [id, navigate, user]);

  // Funções de Ajuste
  const updateSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  // Classes de Fonte do Tailwind baseadas na escolha
  const getFontClass = () => {
      switch(settings.fontFamily) {
          case 'sans': return 'font-sans';
          case 'mono': return 'font-mono';
          default: return 'font-serif';
      }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const cleanContent = DOMPurify.sanitize(capitulo.conteudo);
  const cleanNote = capitulo.authorNote ? DOMPurify.sanitize(capitulo.authorNote) : null;

  return (
    <div className="min-h-screen pb-20 relative bg-[#121212]">
        
        {/* --- MENU DE CONFIGURAÇÕES (FLUTUANTE) --- */}
        <div className="fixed top-24 right-4 z-50 flex flex-col items-end gap-2">
            <button 
                onClick={() => setShowSettings(!showSettings)} 
                className="bg-[#1f1f1f] border border-[#333] text-gray-300 p-3 rounded-full shadow-lg hover:text-white hover:border-primary transition-all"
                title="Reader Settings"
            >
                {showSettings ? <MdClose size={24} /> : <MdSettings size={24} />}
            </button>

            {showSettings && (
                <div className="bg-[#1f1f1f] border border-[#333] p-5 rounded-xl shadow-2xl w-72 animate-fade-in space-y-5">
                    
                    {/* Tamanho da Fonte */}
                    <div>
                        <div className="flex justify-between text-xs text-gray-500 uppercase font-bold mb-2">
                            <span>Font Size</span>
                            <span>{settings.fontSize}px</span>
                        </div>
                        <div className="flex items-center gap-3 bg-[#151515] p-2 rounded-lg border border-[#333]">
                            <MdFormatSize size={16} className="text-gray-500" />
                            <input 
                                type="range" min="14" max="32" step="1" 
                                value={settings.fontSize}
                                onChange={(e) => updateSetting('fontSize', Number(e.target.value))}
                                className="w-full accent-primary h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <MdFormatSize size={24} className="text-gray-300" />
                        </div>
                    </div>

                    {/* Tipo de Fonte */}
                    <div>
                        <div className="text-xs text-gray-500 uppercase font-bold mb-2">Font Family</div>
                        <div className="flex gap-2 bg-[#151515] p-1 rounded-lg border border-[#333]">
                            {['serif', 'sans', 'mono'].map(font => (
                                <button 
                                    key={font}
                                    onClick={() => updateSetting('fontFamily', font)}
                                    className={`flex-1 py-1.5 rounded text-sm font-medium transition-all ${settings.fontFamily === font ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    {font === 'serif' ? 'Serif' : font === 'sans' ? 'Sans' : 'Mono'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Espaçamento (Line Height) */}
                    <div>
                        <div className="text-xs text-gray-500 uppercase font-bold mb-2">Line Spacing</div>
                        <div className="flex gap-2 bg-[#151515] p-1 rounded-lg border border-[#333]">
                            {[1.4, 1.8, 2.2].map(h => (
                                <button 
                                    key={h}
                                    onClick={() => updateSetting('lineHeight', h)}
                                    className={`flex-1 py-1.5 rounded text-sm font-medium transition-all ${settings.lineHeight === h ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    {h === 1.4 ? 'Tight' : h === 1.8 ? 'Normal' : 'Wide'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Largura do Texto */}
                    <div>
                        <div className="text-xs text-gray-500 uppercase font-bold mb-2">Page Width</div>
                        <div className="flex gap-2 bg-[#151515] p-1 rounded-lg border border-[#333]">
                            {[600, 800, 1200].map(w => (
                                <button 
                                    key={w}
                                    onClick={() => updateSetting('maxWidth', w)}
                                    className={`flex-1 py-1.5 rounded text-sm font-medium transition-all ${settings.maxWidth === w ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    {w === 600 ? 'S' : w === 800 ? 'M' : 'L'}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            )}
        </div>

        {/* --- CONTEÚDO PRINCIPAL (COM ESTILOS DINÂMICOS) --- */}
        <div 
            className="mx-auto px-4 pt-8 transition-all duration-300 ease-in-out"
            style={{ maxWidth: `${settings.maxWidth}px` }}
        >
            <Link to={`/obra/${capitulo.obraId}`} className="inline-flex items-center gap-2 text-gray-400 hover:text-primary mb-8 font-medium transition-colors">
                <MdArrowBack /> Back to Book
            </Link>

            <h1 className="text-3xl md:text-4xl font-serif font-bold text-white text-center border-b border-[#333] pb-6 mb-8">
                {capitulo.titulo}
            </h1>

            {/* TEXTO DO CAPÍTULO */}
            <div 
                className={`text-gray-300 ${getFontClass()} selection:bg-primary/30 selection:text-white`}
                style={{ 
                    fontSize: `${settings.fontSize}px`, 
                    lineHeight: settings.lineHeight 
                }}
                dangerouslySetInnerHTML={{ __html: cleanContent }} 
            />

            {/* NOTA DO AUTOR */}
            {cleanNote && (
                <div className="mt-12 bg-[#1a1a1a] border-l-4 border-primary p-6 rounded-r-lg">
                    <h4 className="text-primary font-bold mb-2 text-sm uppercase tracking-wide">Author Note</h4>
                    <div className="text-gray-400 italic text-sm" dangerouslySetInnerHTML={{ __html: cleanNote }} />
                </div>
            )}

            {/* NAVEGAÇÃO RODAPÉ */}
            <div className="flex justify-between items-center mt-16 pt-8 border-t border-[#333]">
                {prevId ? (
                    <Link to={`/ler/${prevId}`} className="flex items-center gap-2 bg-[#1f1f1f] hover:bg-[#333] text-gray-200 px-5 py-3 rounded-lg font-bold transition-all border border-[#333]">
                        <MdNavigateBefore size={24} /> Prev
                    </Link>
                ) : (
                    <div className="opacity-0">Prev</div> // Espaço vazio para manter layout
                )}

                {nextId ? (
                    <Link to={`/ler/${nextId}`} className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-lg shadow-blue-500/20">
                        Next <MdNavigateNext size={24} />
                    </Link>
                ) : (
                    <div className="text-gray-500 font-medium">End of Story</div>
                )}
            </div>

            {/* SEÇÃO DE COMENTÁRIOS */}
            <div className="mt-16">
                <Comentarios 
                    targetId={id} 
                    targetType="capitulo"
                    targetAuthorId={capitulo.autorId} 
                    targetTitle={capitulo.titulo} 
                />
            </div>

        </div>
    </div>
  );
}