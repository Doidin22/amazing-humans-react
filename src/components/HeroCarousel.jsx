import React, { useState, useEffect } from 'react';
import { db } from '../services/firebaseConnection';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { MdPlayArrow, MdStar, MdInfoOutline } from 'react-icons/md';

export default function HeroCarousel() {
  const [featured, setFeatured] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeatured() {
      try {
        const q = query(
          collection(db, "obras"),
          where("status", "==", "public"),
          orderBy("views", "desc"),
          limit(5)
        );
        const snap = await getDocs(q);
        let lista = [];
        snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
        
        // Filtra apenas obras que tenham capa válida para não quebrar o layout
        // Se quiser mostrar mesmo sem capa, remova o filter
        setFeatured(lista);
      } catch (e) {
        console.error("Erro carousel:", e);
      } finally {
        setLoading(false);
      }
    }
    loadFeatured();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev === featured.length - 1 ? 0 : prev + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, [featured]);

  if (loading || featured.length === 0) return null;

  const item = featured[current];
  
  // Helper para garantir que a imagem exista, senão usa o logo
  // Adiciona aspas na URL para o CSS funcionar corretamente
  const bgImage = (item.capa && item.capa.startsWith('http')) ? item.capa : '/logo-ah.png';

  return (
    <div className="relative w-full h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-2xl mb-12 group bg-[#111]">
      
      {/* Background Image (Blurred) - CORRIGIDO: Adicionado aspas na url("${bgImage}") */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 transform scale-105 opacity-50"
        style={{ backgroundImage: `url("${bgImage}")` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/90 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#121212] via-[#121212]/70 to-transparent"></div>
      </div>

      {/* Conteúdo */}
      <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 flex flex-col md:flex-row items-end md:items-center gap-8">
        
        {/* Capa Menor (Poster) */}
        <div className="hidden md:block w-48 aspect-[2/3] rounded-lg shadow-2xl overflow-hidden border-2 border-white/20 relative z-10 shrink-0 transform group-hover:-translate-y-2 transition-transform duration-500 bg-[#222]">
            <img 
                src={item.capa} 
                className="w-full h-full object-cover" 
                alt={item.titulo}
                onError={(e) => { e.target.src = '/logo-ah.png'; }} // Fallback se a imagem quebrar
            />
        </div>

        {/* Textos */}
        <div className="flex-1 max-w-2xl relative z-10 animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
                <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded uppercase">Top Rated</span>
                <span className="flex items-center gap-1 text-yellow-400 text-xs font-bold"><MdStar /> {item.rating ? item.rating.toFixed(1) : 'N/A'}</span>
            </div>
            
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-4 leading-tight drop-shadow-lg line-clamp-2">
                {item.titulo}
            </h2>
            
            <p className="text-gray-300 text-sm md:text-base line-clamp-2 md:line-clamp-3 mb-6 max-w-lg drop-shadow-md">
                {item.sinopse?.replace(/<[^>]*>?/gm, '')}
            </p>

            <div className="flex gap-4">
                <Link to={`/obra/${item.id}`} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg hover:shadow-blue-500/30 transition-all transform hover:scale-105">
                    <MdPlayArrow size={24} /> Read Now
                </Link>
                <Link to={`/obra/${item.id}`} className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all">
                    <MdInfoOutline size={20} /> Details
                </Link>
            </div>
        </div>
      </div>

      {/* Indicadores (Dots) */}
      <div className="absolute bottom-6 right-6 md:right-12 flex gap-2 z-20">
        {featured.map((_, idx) => (
            <button 
                key={idx} 
                onClick={() => setCurrent(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${current === idx ? 'w-8 bg-blue-500' : 'w-2 bg-gray-600 hover:bg-gray-400'}`}
            />
        ))}
      </div>
    </div>
  );
}