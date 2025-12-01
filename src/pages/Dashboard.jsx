import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { MdAdd, MdEdit, MdVisibility, MdStar, MdBarChart } from 'react-icons/md';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMyWorks() {
      if (!user?.uid) return;
      
      const q = query(collection(db, "obras"), where("autorId", "==", user.uid));
      const snapshot = await getDocs(q);
      
      let lista = [];
      snapshot.forEach((doc) => {
        lista.push({ id: doc.id, ...doc.data() });
      });
      
      setObras(lista);
      setLoading(false);
    }

    loadMyWorks();
  }, [user]);

  if (loading) return (
    <div className="flex justify-center items-center h-[50vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 min-h-screen">
      
      {/* --- HEADER DO DASHBOARD --- */}
      <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mb-10 gap-4 border-b border-white/10 pb-6">
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Author Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Manage your stories and track performance</p>
        </div>
        <Link to="/escrever" className="btn-primary shadow-lg shadow-blue-500/20 group">
          <MdAdd size={22} className="group-hover:rotate-90 transition-transform duration-300" /> Create New Book
        </Link>
      </div>

      {/* --- LISTA DE OBRAS (LAYOUT HORIZONTAL) --- */}
      {obras.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#1a1a1a] border border-[#333] rounded-xl text-center">
          <div className="w-20 h-20 bg-[#222] rounded-full flex items-center justify-center mb-4">
             <MdEdit size={40} className="text-gray-600" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No books yet</h3>
          <p className="text-gray-400 mb-6 max-w-sm">You haven't published any books. Start your journey as an author today!</p>
          <Link to="/escrever" className="btn-primary">Write Your First Story</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {obras.map(obra => (
            <div key={obra.id} className="bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden flex flex-col sm:flex-row hover:border-primary/40 transition-all group shadow-lg">
                
                {/* 1. CAPA (Esquerda) */}
                <div className="sm:w-36 h-48 sm:h-auto relative shrink-0">
                    {obra.capa ? (
                        <img src={obra.capa} alt={obra.titulo} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-5xl font-serif text-gray-600 font-bold select-none">
                            {obra.titulo ? obra.titulo.charAt(0).toUpperCase() : '?'}
                        </div>
                    )}
                    {/* Gradiente sobre a imagem para destacar borda */}
                    <div className="absolute inset-0 border-r border-white/5 pointer-events-none"></div>
                </div>

                {/* 2. CONTEÚDO (Direita) */}
                <div className="p-5 flex flex-col flex-1">
                    
                    {/* Título e Status */}
                    <div className="flex justify-between items-start mb-2">
                        <h2 className="text-xl font-bold text-white group-hover:text-primary transition-colors line-clamp-1">{obra.titulo}</h2>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            obra.status === 'private' 
                            ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                            : 'bg-green-500/10 text-green-400 border-green-500/20'
                        }`}>
                            {obra.status || 'Public'}
                        </span>
                    </div>

                    {/* Estatísticas */}
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-6 bg-[#222] w-fit px-3 py-1.5 rounded-lg border border-[#333]">
                        <div className="flex items-center gap-1.5" title="Total Reads">
                            <MdBarChart className="text-blue-400" />
                            <span className="text-gray-200 font-semibold">{obra.views || 0}</span>
                            <span className="text-xs">reads</span>
                        </div>
                        <div className="w-px h-4 bg-gray-600"></div>
                        <div className="flex items-center gap-1.5" title="Rating">
                            <MdStar className="text-yellow-500" />
                            <span className="text-gray-200 font-semibold">{obra.rating ? obra.rating.toFixed(1) : '0.0'}</span>
                        </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="mt-auto pt-4 border-t border-white/5 flex flex-wrap gap-3">
                        
                        {/* Botão Principal: Novo Capítulo */}
                        <Link 
                            to={`/escrever?obraId=${obra.id}`} 
                            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 hover:-translate-y-0.5"
                        >
                            <MdAdd size={18} /> New Chapter
                        </Link>
                        
                        {/* Botões Secundários */}
                        <div className="flex gap-2 flex-1 sm:flex-none">
                            <Link 
                                to={`/editar-obra/${obra.id}`} 
                                className="flex-1 bg-[#2a2a2a] hover:bg-[#333] text-gray-200 px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors border border-white/10 hover:border-white/20"
                            >
                                <MdEdit size={16} className="text-yellow-500" /> Edit
                            </Link>
                            <Link 
                                to={`/obra/${obra.id}`} 
                                className="flex-1 bg-[#2a2a2a] hover:bg-[#333] text-gray-200 px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors border border-white/10 hover:border-white/20"
                            >
                                <MdVisibility size={16} className="text-blue-400" /> View
                            </Link>
                        </div>

                    </div>
                </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}