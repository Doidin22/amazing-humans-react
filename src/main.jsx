import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { HelmetProvider } from 'react-helmet-async';
import ErrorBoundary from './components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // <--- IMPORT

// Configuração do Cache
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Não gasta leitura se o usuário trocar de aba no navegador
      staleTime: 1000 * 60 * 10,   // Cache válido por 10 minutos (Economia Monstruosa)
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}> {/* <--- ENVOLVA AQUI */}
        <HelmetProvider>
            <App />
        </HelmetProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)