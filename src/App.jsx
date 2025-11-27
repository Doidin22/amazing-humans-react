import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast'; // <--- IMPORTAR O TOASTER

import Header from './components/Header';
import Footer from './components/Footer';

import Home from './pages/Home';
import Login from './pages/Login';
import Obra from './pages/Obra';
import Ler from './pages/Ler';
import Dashboard from './pages/Dashboard';
import Escrever from './pages/Escrever';
import Perfil from './pages/Perfil';
import PerfilPublico from './pages/PerfilPublico';
import Biblioteca from './pages/Biblioteca';
import Historico from './pages/Historico';
import Notificacoes from './pages/Notificacoes';
import EditarObra from './pages/EditarObra';
import EditarCapitulo from './pages/EditarCapitulo';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        
        {/* CONFIGURAÇÃO VISUAL DAS NOTIFICAÇÕES */}
        <Toaster 
          position="top-center" 
          toastOptions={{
            style: {
              background: '#333',
              color: '#fff',
              border: '1px solid #4a90e2',
            },
            success: {
              iconTheme: {
                primary: '#4a90e2',
                secondary: '#fff',
              },
            },
          }}
        />

        <main>
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
            
            <Route path="/editar-obra/:id" element={<EditarObra />} />
            <Route path="/editar-capitulo/:id" element={<EditarCapitulo />} />
            
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
          </Routes>
        </main>

        <Footer />
        
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;