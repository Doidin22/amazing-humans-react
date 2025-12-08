import React from 'react';
import { MdImage } from 'react-icons/md';

export default function SkeletonHero() {
  return (
    <div className="relative w-full h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-2xl mb-12 bg-[#111] border border-white/5 animate-pulse">
      
      {/* Background Fake */}
      <div className="absolute inset-0 bg-[#1a1a1a]"></div>
      
      {/* Conteúdo Fake */}
      <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 flex flex-col md:flex-row items-end md:items-center gap-8">
        
        {/* Capa Menor (Poster) */}
        <div className="hidden md:block w-48 aspect-[2/3] rounded-lg bg-[#222] border border-white/10 relative z-10 shrink-0">
             <div className="w-full h-full flex items-center justify-center text-[#333]">
                <MdImage size={40} />
             </div>
        </div>

        {/* Textos */}
        <div className="flex-1 w-full max-w-2xl relative z-10 space-y-4">
            {/* Badge e Rating */}
            <div className="flex gap-2">
                <div className="h-5 w-20 bg-[#2a2a2a] rounded"></div>
                <div className="h-5 w-12 bg-[#2a2a2a] rounded"></div>
            </div>
            
            {/* Título */}
            <div className="h-10 w-3/4 bg-[#2a2a2a] rounded"></div>
            <div className="h-10 w-1/2 bg-[#2a2a2a] rounded hidden md:block"></div>
            
            {/* Sinopse */}
            <div className="space-y-2 pt-2">
                <div className="h-4 w-full bg-[#222] rounded"></div>
                <div className="h-4 w-5/6 bg-[#222] rounded"></div>
            </div>

            {/* Botões */}
            <div className="flex gap-4 pt-4">
                <div className="h-12 w-40 bg-[#222] rounded-full"></div>
                <div className="h-12 w-32 bg-[#222] rounded-full"></div>
            </div>
        </div>
      </div>
    </div>
  );
}