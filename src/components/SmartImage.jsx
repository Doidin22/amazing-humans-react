import React, { useState } from 'react';
import { MdImageNotSupported } from 'react-icons/md';

export default function SmartImage({ src, alt, className, ...props }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = () => setLoaded(true);
  const handleError = () => {
      setError(true);
      setLoaded(true); // Para remover o skeleton
  };

  return (
    <div className={`relative overflow-hidden bg-[#222] ${className}`}>
      
      {/* 1. Skeleton de Carregamento (pisca enquanto baixa) */}
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#222] via-[#333] to-[#222] animate-pulse z-10" />
      )}

      {/* 2. Estado de Erro */}
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 bg-[#1a1a1a]">
            <MdImageNotSupported size={24} />
            <span className="text-[10px] uppercase mt-1 font-bold">No Image</span>
        </div>
      ) : (
        /* 3. A Imagem Real */
        <img 
            src={src || '/logo-ah.png'} 
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