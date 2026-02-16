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

  // Filtra obras por status
  const publishedBooks = obras.filter(o => o.status !== 'draft');
  const draftBooks = obras.filter(o => o.status === 'draft'); // Assuming 'draft' status

  const [activeTab, setActiveTab] = useState('published');

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 min-h-screen">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mb-8 gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Author Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your stories</p>
        </div>
        <Link to="/escrever" className="btn-primary shadow-lg shadow-blue-500/20 group">
          <MdAdd size={22} className="group-hover:rotate-90 transition-transform duration-300" /> Create New Book
        </Link>
      </div>

      {/* TABS */}
      <div className="flex gap-6 mb-8 border-b border-white/5">
        <button
          onClick={() => setActiveTab('published')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'published' ? 'border-primary text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          Published ({publishedBooks.length})
        </button>
        <button
          onClick={() => setActiveTab('drafts')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'drafts' ? 'border-primary text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          Drafts ({draftBooks.length})
        </button>
      </div>

      {(activeTab === 'published' ? publishedBooks : draftBooks).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#1a1a1a] border border-[#333] rounded-xl text-center">
          <MdEdit size={40} className="text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">{activeTab === 'published' ? 'No published books yet' : 'No drafts yet'}</h3>
          <p className="text-gray-500 mb-6 text-sm">{activeTab === 'published' ? 'Get started by creating your first story!' : 'Save your ideas as drafts to work on them later.'}</p>
          <Link to="/escrever" className="btn-primary">Write Your First Story</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {(activeTab === 'published' ? publishedBooks : draftBooks).map(obra => (
            <div key={obra.id} className="bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden flex flex-col sm:flex-row hover:border-primary/40 transition-all group shadow-lg">
              <div className="sm:w-36 h-48 sm:h-auto relative shrink-0 bg-[#222]">
                {/* CAPA COM FALLBACK */}
                <img
                  src={obra.capa || '/logo-ah.png'}
                  alt={obra.titulo}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.onerror = null; e.target.src = '/logo-ah.png'; }}
                />
                {obra.status === 'draft' && <div className="absolute top-2 left-2 bg-yellow-500/90 text-black text-[10px] font-bold px-2 py-0.5 rounded uppercase">Draft</div>}
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-bold text-white">{obra.titulo}</h2>
                  <span className={`text-[10px] px-2 py-1 rounded text-gray-300 uppercase ${obra.status === 'draft' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-white/10'}`}>{obra.status}</span>
                </div>
                {obra.status !== 'draft' && (
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
                    <div className="flex items-center gap-1"><MdBarChart className="text-blue-400" /> {obra.views || 0} reads</div>
                    <div className="flex items-center gap-1"><MdStar className="text-yellow-500" /> {obra.rating ? obra.rating.toFixed(1) : '0.0'}</div>
                  </div>
                )}
                {obra.status === 'draft' && (
                  <p className="text-gray-500 text-sm mb-6 italic">This book is not visible to the public.</p>
                )}

                <div className="mt-auto pt-4 border-t border-white/5 flex flex-wrap gap-3">
                  <Link to={`/escrever?obraId=${obra.id}`} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                    <MdAdd /> {obra.status === 'draft' ? 'Continue Writing' : 'New Chapter'}
                  </Link>
                  <Link to={`/editar-obra/${obra.id}`} className="bg-[#2a2a2a] hover:bg-[#333] text-gray-200 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 border border-white/10">
                    <MdEdit /> Settings
                  </Link>
                  {obra.status !== 'draft' && (
                    <Link to={`/obra/${obra.id}`} className="bg-[#2a2a2a] hover:bg-[#333] text-gray-200 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 border border-white/10">
                      <MdVisibility /> View
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}