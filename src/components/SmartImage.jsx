import React, { useState } from 'react';
import { MdImageNotSupported } from 'react-icons/md';

// --- CONFIGURAÇÃO CLOUDINARY ---
const getOptimizedUrl = (url, width) => {
  if (!url) return '';
  if (url.includes('base64')) return url;
  if (url.includes('cloudinary')) return url; // Já otimizada
  if (url.includes('firebasestorage')) return url; // Firebase Storage (Skip Cloudinary)
  if (url.startsWith('/')) return url; // Imagem local

  // SEU CLOUD NAME CONFIGURADO AQUI
  const cloudName = 'dovuk0ozg';

  // Configurações: auto format (f_auto), auto quality (q_auto), largura fixa, crop limit
  return `https://res.cloudinary.com/${cloudName}/image/fetch/f_auto,q_auto,w_${width},c_limit/${url}`;
};

export default function SmartImage({ src, alt, className, width = 500, ...props }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Gera a URL otimizada
  const finalSrc = getOptimizedUrl(src, width);

  const handleLoad = () => setLoaded(true);
  const handleError = () => {
    // Se der erro no Cloudinary (ex: URL inválida), tenta carregar a original como fallback
    if (!error) {
      console.warn("Cloudinary error, trying original:", src);
    }
    setError(true);
    setLoaded(true);
  };

  return (
    <div className={`relative overflow-hidden bg-[#222] ${className}`}>

      {/* Skeleton (Pisca enquanto carrega) */}
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#222] via-[#333] to-[#222] animate-pulse z-10" />
      )}

      {/* Se der erro total, mostra ícone */}
      {error && !src ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 bg-[#1a1a1a]">
          <MdImageNotSupported size={24} />
        </div>
      ) : (
        <img
          src={error ? src : finalSrc} // Se der erro na otimizada, usa a original
          alt={alt}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          {...props}
        />
      )}
    </div>
  );
}