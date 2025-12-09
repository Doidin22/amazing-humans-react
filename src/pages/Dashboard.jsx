import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { MdAdd, MdEdit, MdVisibility, MdStar, MdBarChart, MdCampaign } from 'react-icons/md'; // Adicionei MdCampaign

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    async function loadWorkData() {
      const q = query(collection(db, "obras"), where("autorId", "==", user.uid));
      const snapshot = await getDocs(q);
      
      let lista = [];
      snapshot.forEach((doc) => {
        lista.push({ id: doc.id, ...doc.data() });
      });
      setObras(lista);
      setLoading(false);
    }

    loadWorkData();
  }, [user]);

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mb-10 gap-4 border-b border-white/10 pb-6">
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Author Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Manage your stories and campaigns</p>
        </div>
        <Link to="/escrever" className="btn-primary shadow-lg shadow-blue-500/20 group">
          <MdAdd size={22} className="group-hover:rotate-90 transition-transform duration-300" /> Create New Book
        </Link>
      </div>

      {/* ÁREA DE MARKETING / AÇÕES RÁPIDAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Card de Criar Anúncio */}
          <Link to="/criar-anuncio" className="bg-[#1f1f1f] p-6 rounded-xl border border-white/5 hover:border-primary transition-all group flex flex-col items-center text-center gap-4 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 relative overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                  <MdCampaign size={32} className="text-green-500" />
              </div>
              <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-green-400 transition-colors">Promote Stories</h3>
                  <p className="text-sm text-gray-500 mt-2">Create ads to reach more readers.</p>
              </div>
              {user?.isVip && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-widest bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/20 animate-pulse">
                      VIP: 50% OFF
                  </span>
              )}
          </Link>

          {/* Espaço para futuros widgets (ex: Estatísticas gerais) */}
      </div>

      <h2 className="text-xl font-bold text-white mb-6 border-l-4 border-primary pl-3">My Books</h2>

      {obras.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#1a1a1a] border border-[#333] rounded-xl text-center">
          <MdEdit size={40} className="text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No books yet</h3>
          <Link to="/escrever" className="btn-primary">Write Your First Story</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {obras.map(obra => (
            <div key={obra.id} className="bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden flex flex-col sm:flex-row hover:border-primary/40 transition-all group shadow-lg">
                <div className="sm:w-36 h-48 sm:h-auto relative shrink-0 bg-[#222]">
                    {/* CAPA COM FALLBACK */}
                    <img 
                        src={obra.capa || '/logo-ah.png'} 
                        alt={obra.titulo} 
                        className="w-full h-full object-cover" 
                        onError={(e) => { e.target.onerror = null; e.target.src = '/logo-ah.png'; }}
                    />
                </div>
                <div className="p-5 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2">
                        <h2 className="text-xl font-bold text-white">{obra.titulo}</h2>
                        <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-gray-300 uppercase">{obra.status}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
                        <div className="flex items-center gap-1"><MdBarChart className="text-blue-400" /> {obra.views || 0} reads</div>
                        <div className="flex items-center gap-1"><MdStar className="text-yellow-500" /> {obra.rating ? obra.rating.toFixed(1) : '0.0'}</div>
                    </div>
                    <div className="mt-auto pt-4 border-t border-white/5 flex flex-wrap gap-3">
                        <Link to={`/escrever?obraId=${obra.id}`} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                            <MdAdd /> New Chapter
                        </Link>
                        <Link to={`/editar-obra/${obra.id}`} className="bg-[#2a2a2a] hover:bg-[#333] text-gray-200 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 border border-white/10">
                            <MdEdit /> Edit
                        </Link>
                        <Link to={`/obra/${obra.id}`} className="bg-[#2a2a2a] hover:bg-[#333] text-gray-200 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 border border-white/10">
                            <MdVisibility /> View
                        </Link>
                    </div>
                </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}