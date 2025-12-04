import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db, functions } from '../services/firebaseConnection';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Link } from 'react-router-dom';
import { MdAdd, MdEdit, MdVisibility, MdStar, MdBarChart, MdAttachMoney, MdAccountBalanceWallet, MdVpnKey, MdRefresh } from 'react-icons/md';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user, isVip } = useContext(AuthContext);
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados da Carteira
  const [wallet, setWallet] = useState({ disponivel: 0, pendente: 0 });
  const [myCode, setMyCode] = useState(null);
  const [chapterCount, setChapterCount] = useState(0);
  const [loadingCode, setLoadingCode] = useState(false);
  const [refreshingWallet, setRefreshingWallet] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    // 1. Monitora a carteira em tempo real e o código
    const unsubUser = onSnapshot(doc(db, "usuarios", user.uid), (docSnap) => {
        if(docSnap.exists()) {
            const data = docSnap.data();
            setWallet({
                disponivel: data.carteira?.saldoDisponivel || 0,
                pendente: data.carteira?.saldoPendente || 0
            });
            setMyCode(data.referralCode || null);
        }
    });

    // 2. Carrega obras e conta capítulos
    async function loadWorkData() {
      const q = query(collection(db, "obras"), where("autorId", "==", user.uid));
      const snapshot = await getDocs(q);
      
      let lista = [];
      snapshot.forEach((doc) => {
        lista.push({ id: doc.id, ...doc.data() });
      });
      setObras(lista);

      // Conta total de capítulos para saber se é elegível
      const qCaps = query(collection(db, "capitulos"), where("autorId", "==", user.uid));
      const snapCaps = await getDocs(qCaps);
      setChapterCount(snapCaps.size);
      
      setLoading(false);
    }

    loadWorkData();
    return () => unsubUser();
  }, [user]);

  // Função: Atualizar Saldo (Mover Pendente -> Disponível)
  const handleRefreshWallet = async () => {
      setRefreshingWallet(true);
      try {
          const refreshFn = httpsCallable(functions, 'refreshWallet');
          const result = await refreshFn();
          if (result.data.moved > 0) {
              toast.success(`$${result.data.moved.toFixed(2)} moved to Available Balance!`);
          } else {
              toast("No funds ready to release yet.", { icon: '⏳' });
          }
      } catch(e) {
          console.error(e);
      } finally {
          setRefreshingWallet(false);
      }
  };

  // Função: Gerar Código
  const handleGenerateCode = async () => {
      if (!isVip()) return toast.error("You must be Premium.");
      if (chapterCount < 10) return toast.error("You need 10 published chapters.");
      
      setLoadingCode(true);
      try {
          const genCodeFn = httpsCallable(functions, 'generateReferralCode');
          const res = await genCodeFn();
          setMyCode(res.data.code);
          toast.success("Code generated!");
      } catch (error) {
          toast.error(error.message);
      } finally {
          setLoadingCode(false);
      }
  };

  // Função: Sacar
  const handleWithdraw = async () => {
      const confirm = window.confirm("Confirm withdrawal request?");
      if(!confirm) return;

      const toastId = toast.loading("Processing...");
      try {
          const withdrawFn = httpsCallable(functions, 'withdrawFunds');
          await withdrawFn();
          toast.success("Withdrawal successful!", { id: toastId });
      } catch (error) {
          toast.error(error.message, { id: toastId });
      }
  };

  if (loading) return <div className="loading-spinner"></div>;

  const isWithdrawWindow = new Date().getDate() >= 28 || new Date().getDate() <= 5;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mb-10 gap-4 border-b border-white/10 pb-6">
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Author Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Manage stories & finances</p>
        </div>
        <Link to="/escrever" className="btn-primary shadow-lg shadow-blue-500/20 group">
          <MdAdd size={22} className="group-hover:rotate-90 transition-transform duration-300" /> Create New Book
        </Link>
      </div>

      {/* --- SEÇÃO CARTEIRA (NOVO) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          
          {/* Card 1: Saldos */}
          <div className="lg:col-span-2 bg-[#1f1f1f] border border-[#333] rounded-xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><MdAccountBalanceWallet size={100} /></div>
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2"><MdAttachMoney className="text-green-500" /> Author Wallet</h3>
                  <button onClick={handleRefreshWallet} disabled={refreshingWallet} className="text-xs flex items-center gap-1 text-blue-400 hover:text-white transition">
                      <MdRefresh className={refreshingWallet ? "animate-spin" : ""} /> Update Balance
                  </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-8 relative z-10">
                  <div>
                      <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Available to Withdraw</p>
                      <p className="text-4xl font-bold text-white">${wallet.disponivel.toFixed(2)}</p>
                      <p className="text-[10px] text-gray-500 mt-1">Window: 28th to 5th</p>
                  </div>
                  <div className="w-px bg-white/10 hidden sm:block"></div>
                  <div>
                      <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Pending (Releases next month)</p>
                      <p className="text-4xl font-bold text-gray-400">${wallet.pendente.toFixed(2)}</p>
                  </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 relative z-10">
                  <button 
                    onClick={handleWithdraw} 
                    disabled={!isWithdrawWindow || wallet.disponivel < 10}
                    className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${isWithdrawWindow && wallet.disponivel >= 10 ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-[#333] text-gray-500 cursor-not-allowed'}`}
                  >
                      {isWithdrawWindow ? "Withdraw Funds" : "Withdrawals Closed (Wait for 28th)"}
                  </button>
                  {wallet.disponivel < 10 && isWithdrawWindow && <span className="ml-3 text-xs text-red-400">Min $10.00</span>}
              </div>
          </div>

          {/* Card 2: Código de Convite */}
          <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-xl p-6 shadow-xl flex flex-col justify-center items-center text-center">
              <MdVpnKey size={40} className="text-blue-400 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Referral Program</h3>
              
              {myCode ? (
                  <div className="w-full">
                      <p className="text-gray-400 text-xs mb-3">Share this code. Users save $1, you earn $1.</p>
                      <div className="bg-black/40 border border-blue-500/50 p-3 rounded-lg text-2xl font-mono text-blue-300 tracking-widest select-all cursor-pointer" onClick={() => {navigator.clipboard.writeText(myCode); toast.success("Copied!")}}>
                          {myCode}
                      </div>
                  </div>
              ) : (
                  <div>
                      <p className="text-gray-400 text-xs mb-4">Requirements: Premium Member + 10 Chapters Published.</p>
                      <div className="flex justify-center gap-4 text-xs font-bold mb-4">
                          <span className={isVip() ? "text-green-400" : "text-red-400"}>{isVip() ? "✔ Premium" : "✖ Not Premium"}</span>
                          <span className={chapterCount >= 10 ? "text-green-400" : "text-red-400"}>{chapterCount >= 10 ? "✔ 10+ Chapters" : `✖ ${chapterCount}/10 Chapters`}</span>
                      </div>
                      <button 
                        onClick={handleGenerateCode} 
                        disabled={loadingCode || !isVip() || chapterCount < 10}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg disabled:opacity-50 transition-all"
                      >
                          {loadingCode ? "Generating..." : "Generate Invite Code"}
                      </button>
                  </div>
              )}
          </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-6 border-l-4 border-primary pl-3">My Books</h2>

      {/* --- LISTA DE OBRAS (MANTIDA) --- */}
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
                <div className="sm:w-36 h-48 sm:h-auto relative shrink-0">
                    {obra.capa ? (
                        <img src={obra.capa} alt={obra.titulo} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-[#222] flex items-center justify-center text-5xl font-bold text-gray-600">{obra.titulo?.charAt(0)}</div>
                    )}
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