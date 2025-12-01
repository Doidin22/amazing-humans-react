import React from 'react';
import { Link } from 'react-router-dom';
import { MdStar } from 'react-icons/md';

export default function StoryCard({ data }) {
  const temCapa = data.capa && data.capa.length > 5;

  return (
    <Link to={`/obra/${data.id}`} className="group flex flex-col w-full text-decoration-none" title={data.titulo}>
      
      {/* CAPA - Aspect Ratio 2:3 (Padrão Livro) */}
      <div className="relative w-full aspect-[2/3] overflow-hidden bg-[#222] shadow-lg border border-[#333] group-hover:border-blue-500/50 transition-all">
        {temCapa ? (
          <img 
            src={data.capa} 
            alt={data.titulo} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} 
          />
        ) : null}

        {/* Fallback se não tiver capa */}
        <div 
          className={`w-full h-full flex flex-col items-center justify-center p-2 text-center bg-gradient-to-b from-[#333] to-[#1a1a1a] ${temCapa ? 'hidden' : 'flex'}`}
        >
          {/* Efeito Lombada */}
          <div className="absolute left-1 top-0 bottom-0 w-[2px] bg-white/10"></div>
          <span className="text-5xl font-serif text-[#444] font-bold select-none">
            {data.titulo ? data.titulo.charAt(0).toUpperCase() : '?'}
          </span>
        </div>

        {/* Rating Badge */}
        {data.rating > 0 && (
            <div className="absolute top-0 right-0 bg-[#337ab7] text-white text-[10px] font-bold px-1.5 py-0.5 shadow-sm">
                {data.rating.toFixed(1)}
            </div>
        )}
      </div>

      {/* Título e Info */}
      <div className="mt-2">
        <h4 className="text-[#ddd] font-bold text-sm leading-tight line-clamp-2 group-hover:text-blue-400 transition-colors h-[2.5em]">
          {data.titulo}
        </h4>
        
        <div className="flex flex-wrap gap-1 mt-1">
            {data.categorias && data.categorias.slice(0, 1).map((cat, i) => (
                <span key={i} className="text-[9px] uppercase font-semibold text-gray-500 bg-[#1a1a1a] border border-[#333] px-1 rounded-[2px]">
                    {cat}
                </span>
            ))}
        </div>
      </div>

    </Link>
  );
}