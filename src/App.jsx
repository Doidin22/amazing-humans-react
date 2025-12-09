import { useEffect, Suspense, lazy } from 'react'; 
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import { useRegisterSW } from 'virtual:pwa-register/react';

import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';

// --- IMPORTS DINÂMICOS (LAZY LOADING) ---
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Obra = lazy(() => import('./pages/Obra'));
const Ler = lazy(() => import('./pages/Ler'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Escrever = lazy(() => import('./pages/Escrever'));
const Perfil = lazy(() => import('./pages/Perfil'));
const PerfilPublico = lazy(() => import('./pages/PerfilPublico'));
const Biblioteca = lazy(() => import('./pages/Biblioteca'));
const Historico = lazy(() => import('./pages/Historico'));
const Notificacoes = lazy(() => import('./pages/Notificacoes'));
const HowItWorks = lazy(() => import('./pages/HowItWorks'));
const Admin = lazy(() => import('./pages/Admin'));
const EditarObra = lazy(() => import('./pages/EditarObra'));
const EditarCapitulo = lazy(() => import('./pages/EditarCapitulo'));
// ADICIONADO AQUI: Import da página de Assinatura
const Assinatura = lazy(() => import('./pages/Assinatura')); 
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Manutencao = lazy(() => import('./pages/Manutencao'));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#121212]">
    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function App() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      r && setInterval(() => {
        r.update();
      }, 60 * 60 * 1000); 
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  const EM_MANUTENCAO = false; 

  if (EM_MANUTENCAO) {
    return (
      <Suspense fallback={<div className="bg-[#121212] h-screen" />}>
        <Manutencao />
      </Suspense>
    );
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Header />
        
        <Toaster 
          position="top-center" 
          toastOptions={{
            style: { background: '#333', color: '#fff', border: '1px solid #4a90e2' },
            success: { iconTheme: { primary: '#4a90e2', secondary: '#fff' } },
          }}
        />

        <main className="min-h-screen">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/obra/:id" element={<Obra />} />
              <Route path="/ler/:id" element={<Ler />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/escrever" element={<Escrever />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/usuario/:id" element={<PerfilPublico />} />
              <Route path="/biblioteca" element={<Biblioteca />} />
              <Route path="/historico" element={<Historico />} />
              <Route path="/notificacoes" element={<Notificacoes />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/admin" element={<Admin />} />
              
              {/* ADICIONADO AQUI: Rota da Assinatura */}
              <Route path="/assinatura" element={<Assinatura />} /> 
              
              <Route path="/editar-obra/:id" element={<EditarObra />} />
              <Route path="/editar-capitulo/:id" element={<EditarCapitulo />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
            </Routes>
          </Suspense>
        </main>

        <Footer />
        
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;