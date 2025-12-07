import React, { useState, useEffect, useContext } from 'react';
import { db, functions } from '../services/firebaseConnection';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { AuthContext } from '../contexts/AuthContext';
import { MdCasino, MdAttachMoney, MdPeople, MdWarning, MdStar } from 'react-icons/md';
import StoryCard from '../components/StoryCard';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export default function Sorteio() {
  const { user } = useContext(AuthContext);
  const [poolData, setPoolData] = useState({ pool: 0, count: 0 });
  const [topStories, setTopStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [alreadyJoined, setAlreadyJoined] = useState(false);

  useEffect(() => {
    async function loadData() {
        try {
            // 1. DADOS DO SORTEIO (ATUALIZADO)
            // Agora lemos de 'lottery_state' que contém a rodada atual
            const lotteryRef = doc(db, "stats", "lottery_state");
            const lotterySnap = await getDoc(lotteryRef);
            
            let currentRound = 1;

            if(lotterySnap.exists()) {
                const data = lotterySnap.data();
                setPoolData({
                    pool: data.pool || 0,
                    count: data.participants_count || 0
                });
                currentRound = data.current_round || 1;
            }

            // 2. Histórias "High Rollers" (> 10k moedas)
            const q = query(
                collection(db, "obras"),
                where("total_coins", ">=", 10000),
                orderBy("total_coins", "desc"),
                limit(10)
            );
            const booksSnap = await getDocs(q);
            let books = [];
            booksSnap.forEach(d => books.push({ id: d.id, ...d.data() }));
            setTopStories(books);

            // 3. VERIFICA SE JÁ PARTICIPO NA RODADA ATUAL (ATUALIZADO)
            if(user?.uid) {
                // Busca na subcoleção da rodada específica (ex: round_1)
                const partRef = doc(db, "stats", "lottery_state", `round_${currentRound}`, user.uid);
                const partSnap = await getDoc(partRef);
                setAlreadyJoined(partSnap.exists());
            }

        } catch(e) { console.error(e); } finally { setLoading(false); }
    }
    loadData();
  }, [user]);

  async function handleJoin() {
      if(!user) return toast.error("Login required.");
      setJoining(true);
      const joinFunc = httpsCallable(functions, 'enterLottery');
      const toastId = toast.loading("Verifying requirements...");

      try {
          const res = await joinFunc();
          if(res.data.success) {
              toast.success(`You entered! Your Ticket: #${res.data.ticket}`, { id: toastId, duration: 6000 });
              setAlreadyJoined(true);
              setPoolData(prev => ({ 
                  pool: prev.pool + 10, 
                  count: prev.count + 1 
              }));
          } else {
              toast.error(res.data.message, { id: toastId, duration: 5000 });
          }
      } catch(error) {
          toast.error("Error joining.", { id: toastId });
      } finally {
          setJoining(false);
      }
  }

  // Prêmio do Vencedor (50% do total)
  const winnerPrizeCoins = Math.floor(poolData.pool * 0.5);
  // Valor aproximado em Dólar (10 moedas = $1)
  const winnerPrizeDollars = (winnerPrizeCoins / 10).toFixed(2);

  if(loading) return <div className="loading-spinner"></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-fade-in">
        
        {/* HERO DO SORTEIO */}
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden shadow-2xl border border-white/10 mb-16">
            {/* Background Pattern (Opcional) */}
            <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            </div>
            
            <MdCasino className="text-8xl text-yellow-400 mx-auto mb-4 animate-bounce" />
            
            <h1 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tight">
                Monthly <span className="text-yellow-400">Jackpot</span>
            </h1>
            <p className="text-purple-200 text-lg mb-8">Try your luck! The winner takes 50% of the treasure.</p>

            <div className="flex flex-col md:flex-row justify-center gap-8 mb-10">
                <div className="bg-black/30 p-6 rounded-2xl backdrop-blur-sm border border-white/10 min-w-[200px]">
                    <span className="block text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Current Prize</span>
                    <span className="text-4xl font-bold text-green-400 flex items-center justify-center gap-1">
                        <MdAttachMoney />{winnerPrizeDollars}
                    </span>
                    <span className="text-xs text-gray-500">({winnerPrizeCoins} Coins)</span>
                </div>
                <div className="bg-black/30 p-6 rounded-2xl backdrop-blur-sm border border-white/10 min-w-[200px]">
                    <span className="block text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Participants</span>
                    <span className="text-4xl font-bold text-blue-400 flex items-center justify-center gap-1">
                        <MdPeople />{poolData.count}
                    </span>
                </div>
            </div>

            {alreadyJoined ? (
                <div className="inline-block bg-green-500/20 border border-green-500 text-green-400 px-8 py-3 rounded-full font-bold text-lg animate-pulse">
                    ✅ You are in the draw! Good luck.
                </div>
            ) : (
                <button 
                    onClick={handleJoin} 
                    disabled={joining}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xl px-10 py-4 rounded-full shadow-lg hover:shadow-yellow-500/50 transition-all transform hover:-translate-y-1 disabled:opacity-50"
                >
                    {joining ? 'Checking...' : 'Join Now (10 Coins)'}
                </button>
            )}

            <div className="mt-6 text-xs text-purple-300 max-w-lg mx-auto bg-black/20 p-3 rounded-lg border border-white/5">
                <strong className="flex items-center justify-center gap-1 mb-1"><MdWarning className="text-yellow-500" /> Requirements to Join:</strong>
                Rate 5 stories & Read 15 chapters of each.
            </div>
        </div>

        {/* LISTA DE HISTÓRIAS DE OURO (High Earners) */}
        <div className="mb-8 flex items-center gap-3">
            <div className="bg-yellow-500/20 p-2 rounded-lg text-yellow-500"><MdStar size={24} /></div>
            <div>
                <h2 className="text-2xl font-bold text-white">Golden Stories</h2>
                <p className="text-sm text-gray-400">Works that have earned over 10,000 coins.</p>
            </div>
        </div>

        {topStories.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-gray-700 rounded-2xl bg-[#1a1a1a]">
                <p className="text-gray-500 mb-4">No stories have reached the Golden Tier yet. Be the first to support one!</p>
                <Link to="/" className="text-primary font-bold hover:underline">Browse Library</Link>
            </div>
        ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {topStories.map(obra => <StoryCard key={obra.id} data={obra} />)}
            </div>
        )}

    </div>
  );
}