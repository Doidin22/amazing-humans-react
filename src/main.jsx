import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { HelmetProvider } from 'react-helmet-async';
import ErrorBoundary from './components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext'; // Removed usage, check App.jsx

// Configuração do Cache (Mantive a sua configuração de economia de leituras)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 10,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>

        {/* 2. IMPORTANTE: O AuthProvider está em App.jsx, não duplicar aqui */}
        <HelmetProvider>
          <App />
        </HelmetProvider>

      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)

// LIMPEZA: Remove Service Workers antigos para evitar cache agressivo
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
}