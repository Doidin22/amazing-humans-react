import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { MdMonetizationOn, MdWorkspacePremium, MdCheck, MdLock, MdStar } from 'react-icons/md';
import { FiGitBranch, FiFileText } from 'react-icons/fi';
import { getFunctions, httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';

export default function Subscription() {
  const { user } = useContext(AuthContext);
  const functions = getFunctions();
  const [loading, setLoading] = useState(false);

  async function handleCheckout(type, id, coinsAmount = 0) {
    if (!user) return toast.error("Please login first");
    setLoading(true);
    const createStripeCheckout = httpsCallable(functions, 'createStripeCheckout');
    try {
      const { data } = await createStripeCheckout({ type, packId: id, coinsAmount });
      if (data?.url) window.location.href = data.url;
    } catch (error) {
      console.error(error);
      if (error.message.includes("requirements")) {
        toast.error("You need at least 1 published book with 10+ chapters!");
      } else {
        toast("In Development 🚧", { icon: '🚧' });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">Support & Upgrade</h1>
        <p className="text-gray-400">Get coins to support authors or subscribe for premium benefits.</p>
        <div className="mt-6 inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-4 py-2 rounded-full">
          <span className="text-yellow-500 font-bold text-sm">🚧 FEATURE IN DEVELOPMENT</span>
        </div>
      </div>

      {/* SEÇÃO 1: MOEDAS */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-yellow-500 mb-6 flex items-center gap-2">
          <MdMonetizationOn /> Buy Coins
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1f1f1f] border border-[#333] p-6 rounded-xl hover:border-yellow-500/50 transition-all">
            <h3 className="text-xl font-bold text-white">Starter Pack</h3>
            <div className="text-3xl font-bold text-yellow-500 my-4">5 Coins</div>
            <p className="text-gray-400 text-sm mb-6">$0.50 USD</p>
            <button disabled={loading} onClick={() => handleCheckout('coin_pack', 'price_dummy_coins_5', 5)} className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-lg transition-colors">Buy Now</button>
          </div>
          <div className="bg-[#1f1f1f] border border-yellow-500 p-6 rounded-xl relative transform md:-translate-y-2">
            <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
            <h3 className="text-xl font-bold text-white">Reader Pack</h3>
            <div className="text-3xl font-bold text-yellow-500 my-4">50 Coins</div>
            <p className="text-gray-400 text-sm mb-6">$5.00 USD</p>
            <button disabled={loading} onClick={() => handleCheckout('coin_pack', 'price_dummy_coins_50', 50)} className="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors">Buy Now</button>
          </div>
          <div className="bg-[#1f1f1f] border border-[#333] p-6 rounded-xl hover:border-yellow-500/50 transition-all">
            <h3 className="text-xl font-bold text-white">Supporter Pack</h3>
            <div className="text-3xl font-bold text-yellow-500 my-4">100 Coins</div>
            <p className="text-gray-400 text-sm mb-6">$10.00 USD</p>
            <button disabled={loading} onClick={() => handleCheckout('coin_pack', 'price_dummy_coins_100', 100)} className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-lg transition-colors">Buy Now</button>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: ASSINATURAS */}
      <div>
        <h2 className="text-2xl font-bold text-blue-500 mb-6 flex items-center gap-2">
          <MdWorkspacePremium /> Monthly Subscriptions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">

          {/* Plano Leitor */}
          <div className="bg-[#1f1f1f] border border-blue-500/30 p-8 rounded-2xl flex flex-col">
            <h3 className="text-2xl font-bold text-white">Reader Tier</h3>
            <div className="text-4xl font-bold text-blue-400 my-4">$2<span className="text-lg text-gray-500 font-normal">/mo</span></div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-center gap-2 text-gray-300"><MdCheck className="text-green-500" /> No Ads</li>
              <li className="flex items-center gap-2 text-gray-300"><MdCheck className="text-green-500" /> Support the Platform</li>
              <li className="flex items-center gap-2 text-gray-300"><MdCheck className="text-green-500" /> Reader Badge</li>
            </ul>
            <button
              disabled={loading || user?.subscriptionType === 'reader'}
              onClick={() => handleCheckout('subscription', 'price_dummy_reader')}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors"
            >
              {user?.subscriptionType === 'reader' ? 'Current Plan' : 'Subscribe'}
            </button>
          </div>

          {/* Plano Autor */}
          <div className="bg-gradient-to-b from-[#1f1f1f] to-[#2a1f2a] border border-purple-500 p-8 rounded-2xl flex flex-col relative overflow-hidden shadow-xl shadow-purple-900/20">
            <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-4 py-1 rounded-bl-xl">CREATORS ONLY</div>
            <h3 className="text-2xl font-bold text-white">Author Tier</h3>
            <div className="text-4xl font-bold text-purple-400 my-4">$5<span className="text-lg text-gray-500 font-normal">/mo</span></div>
            <ul className="space-y-3 mb-4 flex-1">
              <li className="flex items-center gap-2 text-gray-300"><MdCheck className="text-green-500" /> Everything in Reader Tier</li>
              <li className="flex items-center gap-2 text-gray-300"><MdStar className="text-yellow-500" /> <strong>Withdrawal Unlocked</strong></li>
              <li className="flex items-center gap-2 text-gray-300"><MdCheck className="text-green-500" /> Custom Referral Code</li>

              {/* PREMIUM EXCLUSIVES */}
              <li className="mt-4 pt-4 border-t border-purple-500/30">
                <p className="text-purple-300 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MdWorkspacePremium size={13} /> Exclusive Creator Features
                </p>
                <ul className="space-y-2.5">
                  <li className="flex items-start gap-2.5 text-gray-200">
                    <FiGitBranch className="text-purple-400 mt-0.5 shrink-0" size={15} />
                    <div>
                      <span className="font-bold text-sm">Interactive Stories</span>
                      <p className="text-gray-500 text-xs">Build branching "Choose Your Adventure" stories with a visual node editor — readers make choices that change the outcome.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5 text-gray-200">
                    <FiFileText className="text-purple-400 mt-0.5 shrink-0" size={15} />
                    <div>
                      <span className="font-bold text-sm">PDF & Word Import</span>
                      <p className="text-gray-500 text-xs">Import chapters directly from PDF or Word documents — the platform auto-splits chapters and preserves formatting.</p>
                    </div>
                  </li>
                </ul>
              </li>

              <li className="text-xs text-gray-500 mt-2 pt-2 border-t border-white/10">
                <MdLock className="inline mr-1" /> Requirement: 1 Book with 10+ Chapters
              </li>
            </ul>
            <button
              disabled={loading || user?.subscriptionType === 'author'}
              onClick={() => handleCheckout('subscription', 'price_dummy_author')}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-purple-900/30"
            >
              {user?.subscriptionType === 'author' ? 'Current Plan ✓' : 'Join as Creator'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}


