import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { db, functions } from '../services/firebaseConnection'; 
import { httpsCallable } from 'firebase/functions'; 
import { 
  doc, getDoc, collection, query, where, orderBy, limit, getDocs, 
  setDoc, serverTimestamp 
} from 'firebase/firestore';
import DOMPurify from 'dompurify';
import { 
  MdArrowBack, MdNavigateBefore, MdNavigateNext, MdSettings, 
  MdClose, MdFormatSize, MdTextFields, MdPhotoSizeSelectSmall, MdMenuBook, 
  MdColorLens, MdAutorenew, MdVolumeUp, MdPause, MdStop, MdFlag
} from 'react-icons/md';
import Comentarios from '../components/Comentarios';
import AdBanner from '../components/AdBanner'; 
import toast from 'react-hot-toast';
import ReportModal from '../components/ReportModal';

export default function Ler() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [capitulo, setCapitulo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prevId, setPrevId] = useState(null);
  const [nextId, setNextId] = useState(null);
  const [showReport, setShowReport] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  
  // Configurações padrão
  const defaultSettings = {
    fontSize: 18,       
    lineHeight: 1.8,    
    fontFamily: 'serif',
    widthClass: 'max-w-2xl', 
    theme: 'dark'
  };

  const [settings, setSettings] = useState(defaultSettings);

  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const scrollInterval = useRef(null);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthesisRef = useRef(window.speechSynthesis);
  const utteranceRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('ah_reader_settings');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (typeof parsed.widthClass !== 'string') {
                parsed.widthClass = 'max-w-2xl';
            }
            setSettings({ ...defaultSettings, ...parsed });
        } catch (e) {
            console.error("Erro ao carregar configs, resetando...", e);
            localStorage.removeItem('ah_reader_settings');
        }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ah_reader_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    async function loadCapitulo() {
      setLoading(true);
      stopAutoScroll();
      stopSpeaking();

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

        if (user?.uid) {
            const historyRef = doc(db, "historico", `${user.uid}_${data.obraId}`);
            await setDoc(historyRef, {
                userId: user.uid,
                obraId: data.obraId,
                bookTitle: data.nomeObra || "Unknown Book",
                lastChapterId: docSnap.id,
                lastChapterTitle: data.titulo,
                accessedAt: serverTimestamp()
            }, { merge: true });

            const registerReading = httpsCallable(functions, 'registerReading');
            registerReading({ 
                obraId: data.obraId, 
                capituloId: docSnap.id
            }).catch(err => console.error("Reading register error:", err));
        }

        const qAnt = query(collection(db, "capitulos"), where("obraId", "==", data.obraId), where("data", "<", data.data), orderBy("data", "desc"), limit(1));
        const snapAnt = await getDocs(qAnt);
        setPrevId(!snapAnt.empty ? snapAnt.docs[0].id : null);

        const qProx = query(collection(db, "capitulos"), where("obraId", "==", data.obraId), where("data", ">", data.data), orderBy("data", "asc"), limit(1));
        const snapProx = await getDocs(qProx);
        setNextId(!snapProx.empty ? snapProx.docs[0].id : null);

      } catch (error) { console.error("Erro ao carregar:", error); } finally { setLoading(false); window.scrollTo(0, 0); }
    }
    loadCapitulo();
    
    return () => {
        stopAutoScroll();
        stopSpeaking();
    };
  }, [id, navigate, user]);

  const updateSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const getThemeStyles = () => {
      switch(settings.theme) {
          case 'light': return { bg: 'bg-[#f8f9fa]', text: 'text-gray-800', title: 'text-gray-900', secondaryBg: 'bg-white', border: 'border-gray-200' };
          case 'sepia': return { bg: 'bg-[#f4ecd8]', text: 'text-[#433422]', title: 'text-[#2b2115]', secondaryBg: 'bg-[#eaddcf]', border: 'border-[#d3c4bc]' };
          default: return { bg: 'bg-[#0F0F0F]', text: 'text-gray-300', title: 'text-gray-100', secondaryBg: 'bg-[#18181b]', border: 'border-[#27272a]' };
      }
  };
  const currentTheme = getThemeStyles();

  const toggleAutoScroll = () => {
      if (isAutoScrolling) stopAutoScroll();
      else startAutoScroll();
  };

  const startAutoScroll = () => {
      setIsAutoScrolling(true);
      scrollInterval.current = setInterval(() => {
          window.scrollBy(0, 1);
          if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
              stopAutoScroll();
          }
      }, 50 / scrollSpeed);
  };

  const stopAutoScroll = () => {
      setIsAutoScrolling(false);
      if (scrollInterval.current) clearInterval(scrollInterval.current);
  };

  const toggleSpeaking = () => {
      if (isSpeaking) {
          synthesisRef.current.cancel();
          setIsSpeaking(false);
      } else {
          const text = document.getElementById('chapter-content')?.innerText;
          if (!text) return;

          utteranceRef.current = new SpeechSynthesisUtterance(text);
          utteranceRef.current.onend = () => setIsSpeaking(false);
          synthesisRef.current.speak(utteranceRef.current);
          setIsSpeaking(true);
      }
  };

  const stopSpeaking = () => {
      if (synthesisRef.current) {
          synthesisRef.current.cancel();
          setIsSpeaking(false);
      }
  };

  if (loading) return <div className="loading-spinner"></div>;

  const cleanContent = DOMPurify.sanitize(capitulo.conteudo);
  const cleanNote = capitulo.authorNote ? DOMPurify.sanitize(capitulo.authorNote) : null;

  return (
    <div className={`min-h-screen pb-24 md:pb-20 relative transition-colors duration-500 ${currentTheme.bg}`}>
        
        {/* --- CONTROLES DE LEITURA (RESPONSIVO) --- */}
        
        {/* 1. VERSÃO DESKTOP (Flutuante na direita, como antes) */}
        <div className="hidden md:flex fixed top-24 right-4 z-50 flex-col items-end gap-2">
            <div className="flex flex-col gap-2">
                <button 
                    onClick={toggleSpeaking}
                    className={`p-3 rounded-full shadow-lg border transition-all ${isSpeaking ? 'bg-green-600 text-white border-green-500 animate-pulse' : `${currentTheme.secondaryBg} ${currentTheme.text} ${currentTheme.border} hover:border-primary`}`}
                    title={isSpeaking ? "Stop Reading" : "Read Aloud"}
                >
                    {isSpeaking ? <MdStop size={24} /> : <MdVolumeUp size={24} />}
                </button>

                <button 
                    onClick={toggleAutoScroll}
                    className={`p-3 rounded-full shadow-lg border transition-all ${isAutoScrolling ? 'bg-blue-600 text-white border-blue-500' : `${currentTheme.secondaryBg} ${currentTheme.text} ${currentTheme.border} hover:border-primary`}`}
                    title="Auto Scroll"
                >
                    {isAutoScrolling ? <MdPause size={24} /> : <MdAutorenew size={24} />}
                </button>
            </div>

            <button onClick={() => setShowSettings(!showSettings)} className={`${currentTheme.secondaryBg} ${currentTheme.border} ${currentTheme.text} p-3 rounded-full shadow-lg border hover:border-primary transition-all mt-2`}>
                {showSettings ? <MdClose size={24} /> : <MdSettings size={24} />}
            </button>
        </div>

        {/* 2. VERSÃO MOBILE (Barra Fixa no Rodapé) */}
        <div className={`md:hidden fixed bottom-0 left-0 w-full z-[100] border-t px-6 py-3 flex justify-between items-center safe-area-pb ${currentTheme.secondaryBg} ${currentTheme.border} shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]`}>
            
            <button 
                onClick={toggleSpeaking}
                className={`p-2 rounded-full transition-colors ${isSpeaking ? 'text-green-500 bg-green-500/10' : `${currentTheme.text}`}`}
            >
                {isSpeaking ? <MdStop size={28} /> : <MdVolumeUp size={28} />}
            </button>

            <button 
                onClick={toggleAutoScroll}
                className={`p-2 rounded-full transition-colors ${isAutoScrolling ? 'text-blue-500 bg-blue-500/10' : `${currentTheme.text}`}`}
            >
                {isAutoScrolling ? <MdPause size={28} /> : <MdAutorenew size={28} />}
            </button>

            <button 
                onClick={() => setShowSettings(!showSettings)} 
                className={`p-2 rounded-full transition-colors ${showSettings ? 'text-primary' : `${currentTheme.text}`}`}
            >
                {showSettings ? <MdClose size={28} /> : <MdSettings size={28} />}
            </button>
        </div>

        {/* --- MENU DE CONFIGURAÇÕES (Comum a ambos) --- */}
        {showSettings && (
            <>
                {/* Mobile Overlay para fechar ao clicar fora */}
                <div className="fixed inset-0 z-[101] bg-black/50 md:hidden" onClick={() => setShowSettings(false)}></div>

                <div className={`
                    fixed z-[102] 
                    /* Mobile Styles */
                    bottom-20 left-4 right-4 
                    /* Desktop Styles */
                    md:bottom-auto md:left-auto md:top-24 md:right-20 md:w-72 
                    
                    ${currentTheme.secondaryBg} ${currentTheme.border} p-5 rounded-xl shadow-2xl animate-fade-in space-y-5 border
                `}>
                    
                    {/* Tema */}
                    <div>
                        <div className={`text-xs uppercase font-bold mb-2 flex items-center gap-2 ${currentTheme.text} opacity-70`}><MdColorLens /> Theme</div>
                        <div className="flex gap-2">
                            {['dark', 'light', 'sepia'].map(t => (
                                <button key={t} onClick={() => updateSetting('theme', t)} className={`flex-1 py-2 rounded-lg border text-xs font-bold capitalize transition-all ${settings.theme === t ? 'ring-2 ring-blue-500' : ''}`} style={{ backgroundColor: t === 'light' ? '#f5f5f5' : t === 'sepia' ? '#f4ecd8' : '#121212', color: t === 'light' ? '#000' : t === 'sepia' ? '#5b4636' : '#fff', borderColor: t === settings.theme ? '#4a90e2' : 'transparent' }}>{t}</button>
                            ))}
                        </div>
                    </div>

                    {/* Tamanho da Fonte */}
                    <div>
                        <div className={`flex justify-between text-xs uppercase font-bold mb-2 ${currentTheme.text} opacity-70`}><span>Size</span><span>{settings.fontSize}px</span></div>
                        <div className={`flex items-center gap-3 p-2 rounded-lg border ${currentTheme.bg} ${currentTheme.border}`}>
                            <MdFormatSize size={16} className={currentTheme.text} />
                            <input type="range" min="14" max="28" step="1" value={settings.fontSize} onChange={(e) => updateSetting('fontSize', Number(e.target.value))} className="w-full accent-blue-500 h-1 rounded-lg appearance-none cursor-pointer" />
                            <MdFormatSize size={24} className={currentTheme.text} />
                        </div>
                    </div>

                    {/* Fonte */}
                    <div>
                        <div className={`text-xs uppercase font-bold mb-2 flex items-center gap-2 ${currentTheme.text} opacity-70`}><MdTextFields /> Font</div>
                        <div className={`flex gap-2 p-1 rounded-lg border ${currentTheme.bg} ${currentTheme.border}`}>
                            {['serif', 'sans', 'mono'].map(font => (
                                <button key={font} onClick={() => updateSetting('fontFamily', font)} className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${settings.fontFamily === font ? 'bg-blue-600 text-white' : `${currentTheme.text} hover:opacity-80`}`}>{font === 'serif' ? 'Serif' : font === 'sans' ? 'Sans' : 'Mono'}</button>
                            ))}
                        </div>
                    </div>

                    {/* Largura (Apenas Desktop) */}
                    <div className="hidden md:block">
                        <div className={`text-xs uppercase font-bold mb-2 flex items-center gap-2 ${currentTheme.text} opacity-70`}><MdPhotoSizeSelectSmall /> Width</div>
                        <div className={`flex gap-2 p-1 rounded-lg border ${currentTheme.bg} ${currentTheme.border}`}>
                            {[
                                { label: 'S', cls: 'max-w-lg' },
                                { label: 'M', cls: 'max-w-2xl' }, 
                                { label: 'L', cls: 'max-w-4xl' }
                            ].map(w => (
                                <button key={w.label} onClick={() => updateSetting('widthClass', w.cls)} className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${settings.widthClass === w.cls ? 'bg-blue-600 text-white' : `${currentTheme.text} hover:opacity-80`}`}>{w.label}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </>
        )}

        {/* CONTAINER DO TEXTO */}
        <div className={`mx-auto px-6 pt-12 transition-all duration-300 ease-in-out ${settings.widthClass}`}>
            
            <Link to={`/obra/${capitulo.obraId}`} className={`inline-flex items-center gap-2 mb-8 font-medium transition-colors ${currentTheme.text} hover:text-blue-500 opacity-70 hover:opacity-100`}>
                <MdArrowBack /> Back to Book
            </Link>

            <h1 className={`text-3xl md:text-5xl font-bold text-center border-b border-white/5 pb-8 mb-10 ${currentTheme.title} font-${settings.fontFamily === 'serif' ? 'serif' : settings.fontFamily === 'mono' ? 'mono' : 'sans'}`}>
                {capitulo.titulo}
            </h1>

            {/* CONTEÚDO DO CAPÍTULO */}
            <div 
                id="chapter-content"
                className={`
                    ${currentTheme.text} 
                    font-${settings.fontFamily === 'serif' ? 'serif' : settings.fontFamily === 'mono' ? 'mono' : 'sans'}
                    selection:bg-blue-500/30 leading-relaxed
                `}
                style={{ fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight }}
                dangerouslySetInnerHTML={{ __html: cleanContent }} 
            />

            {/* 1. NOTA DO AUTOR (Se houver, aparece PRIMEIRO) */}
            {cleanNote && (
                <div className={`mt-16 border-l-4 border-blue-500 p-6 rounded-r-lg ${currentTheme.secondaryBg}`}>
                    <h4 className="text-blue-500 font-bold mb-2 text-sm uppercase tracking-wide">Author Note</h4>
                    <div className={`${currentTheme.text} italic text-sm`} dangerouslySetInnerHTML={{ __html: cleanNote }} />
                </div>
            )}

            {/* 2. ANÚNCIO (AGORA ABAIXO DA NOTA - POSIÇÃO ESTRATÉGICA) */}
            {/* Margem superior grande para não colar no texto, mas perto da navegação */}
            <AdBanner className={`mt-16 mb-8 border-none bg-transparent`} />

            {/* REPORTAR */}
            <div className="flex justify-end mt-4 mb-2">
                <button 
                    onClick={() => setShowReport(true)}
                    className={`text-xs flex items-center gap-1 ${currentTheme.text} opacity-40 hover:opacity-100 hover:text-red-500 transition-all`}
                >
                    <MdFlag /> Report Chapter
                </button>
            </div>

            {/* NAVEGAÇÃO (BOTÕES PRÓXIMO/ANTERIOR) */}
            <div className={`flex justify-between items-center mt-8 pt-8 border-t ${currentTheme.border}`}>
                {prevId ? (
                    <Link to={`/ler/${prevId}`} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all border ${currentTheme.secondaryBg} ${currentTheme.text} ${currentTheme.border} hover:border-blue-500 hover:-translate-x-1`}>
                        <MdNavigateBefore size={24} /> <span className="hidden sm:inline">Prev</span>
                    </Link>
                ) : ( <div className="w-24 opacity-0"></div> )}

                <Link 
                    to={`/obra/${capitulo.obraId}`} 
                    className={`flex flex-col items-center justify-center transition-colors group ${currentTheme.text} opacity-60 hover:opacity-100`}
                    title="View Book & Chapters"
                >
                    <MdMenuBook size={28} className="group-hover:text-blue-500 transition-colors mb-1" />
                    <span className="text-[10px] uppercase font-bold tracking-widest hidden sm:block">Chapters</span>
                </Link>

                {nextId ? (
                    <Link to={`/ler/${nextId}`} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-1">
                        <span className="hidden sm:inline">Next</span> <MdNavigateNext size={24} />
                    </Link>
                ) : ( <div className={`${currentTheme.text} font-medium w-24 text-right opacity-50`}>End</div> )}
            </div>

            <div className="mt-20">
                <Comentarios targetId={id} targetType="capitulo" targetAuthorId={capitulo.autorId} targetTitle={capitulo.titulo} />
            </div>

        </div>
    </div>
  );
}