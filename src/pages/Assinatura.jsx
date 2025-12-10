<<<<<<< HEAD
import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { functions } from '../services/firebaseConnection';
import { httpsCallable } from 'firebase/functions';
import { MdCheck, MdDiamond, MdClose, MdVerified, MdFace, MdLocalOffer } from 'react-icons/md';
import { FaPaypal, FaCreditCard, FaStripe } from 'react-icons/fa';
import toast from 'react-hot-toast';
=======
import React from 'react';
import { MdCheck, MdDiamond, MdClose, MdVerified, MdFace, MdLocalOffer } from 'react-icons/md'; // Adicionado MdLocalOffer
import { FaPaypal, FaCreditCard } from 'react-icons/fa';
>>>>>>> b7236764c4138fdd645fca09756e6b9c7614f320

export default function Assinatura() {
  const { user } = useContext(AuthContext);

  async function handleSubscribe(planType) {
      if (!user) return toast.error("Please login first.");

      if (planType === 'Basic Plan') {
          return toast("Basic plan is manual. Please contact support.", { icon: 'ℹ️' });
      }

      const toastId = toast.loading("Connecting to Stripe...");

      try {
        console.log("Starting createStripeCheckout call...");
        
        const createStripeCheckout = httpsCallable(functions, 'createStripeCheckout');
        
        const response = await createStripeCheckout({
            type: 'vip',
            docId: user.uid,
            amount: 2.00,
            successUrl: `${window.location.origin}/dashboard`,
            cancelUrl: `${window.location.origin}/assinatura`
        });

        console.log("Server response:", response);

        if (response.data && response.data.url) {
            window.location.href = response.data.url;
        } else {
            console.error("URL missing in response", response);
            toast.error("Error: Payment link missing.", { id: toastId });
        }

      } catch (error) {
          console.error("Payment Error:", error);
          // CORREÇÃO: Mensagens em Inglês
          toast.error(`Failed: ${error.message}`, { id: toastId, duration: 6000 });
          alert(`Technical Error: ${error.message}\n\nPlease check the console (F12) for more details.`);
      }
  }

  return (
    <div className="min-h-screen py-20 px-4 max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
          Upgrade your <span className="text-primary">Experience</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Support the platform, remove ads, and unlock exclusive rewards.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* BASIC PLAN */}
        <div className="bg-[#1f1f1f] border border-[#333] rounded-3xl p-8 flex flex-col relative overflow-hidden group hover:border-gray-500 transition-all">
            <h3 className="text-2xl font-bold text-white mb-2">Ad-Free Basic</h3>
            <p className="text-gray-400 text-sm mb-6">Just want to read without interruptions?</p>
            <div className="mb-8"><span className="text-4xl font-black text-white">$1.00</span><span className="text-gray-500"> / month</span></div>
            <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-gray-300"><div className="p-1 rounded-full bg-green-500/20 text-green-500"><MdCheck size={14} /></div>Remove All Ads</li>
                <li className="flex items-center gap-3 text-gray-300"><div className="p-1 rounded-full bg-green-500/20 text-green-500"><MdCheck size={14} /></div>Support the Servers</li>
                <li className="flex items-center gap-3 text-gray-500 opacity-50"><div className="p-1 rounded-full bg-gray-700 text-gray-500"><MdClose size={14} /></div>No Exclusive Badges</li>
            </ul>
            <button onClick={() => handleSubscribe("Basic Plan")} className="w-full py-4 rounded-xl font-bold border border-white/20 text-white hover:bg-white/10 transition-colors">Choose Basic</button>
        </div>

        {/* VIP PLAN */}
        <div className="bg-gradient-to-b from-blue-900/40 to-[#1f1f1f] border border-blue-500 rounded-3xl p-8 flex flex-col relative overflow-hidden transform md:-translate-y-4 shadow-2xl shadow-blue-900/20">
            <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-black px-4 py-1 rounded-bl-xl uppercase tracking-wider">Limited Offer</div>
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">VIP Premium <MdDiamond className="text-blue-400" /></h3>
            <p className="text-blue-200 text-sm mb-6">The full experience with exclusive perks.</p>
            <div className="mb-2">
                <span className="text-gray-500 line-through text-lg mr-2">$3.00</span>
                <span className="text-5xl font-black text-white">$2.00</span>
                <span className="text-yellow-400 font-bold text-xs ml-2 uppercase bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">2 Months Included!</span>
            </div>
            <p className="text-xs text-gray-400 mb-8">Pay $2.00 once for 60 days. Then $3.00/mo.</p>
            
            <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-white font-bold">
                    <div className="p-1 rounded-full bg-blue-500 text-white"><MdCheck size={14} /></div>
                    Remove All Ads
                </li>
<<<<<<< HEAD
=======
                
                {/* Benefício 1: Badges */}
>>>>>>> b7236764c4138fdd645fca09756e6b9c7614f320
                <li className="flex items-center gap-3 text-gray-200">
                    <div className="p-1 rounded-full bg-blue-500/20 text-blue-400"><MdVerified size={14} /></div>
                    <span>
                        <strong className="text-white">Exclusive Profile Badges</strong><br/>
                        <span className="text-xs text-gray-500 font-normal">Get the Golden Supporter Badge.</span>
                    </span>
                </li>
<<<<<<< HEAD
=======

                {/* Benefício 2: Stickers */}
>>>>>>> b7236764c4138fdd645fca09756e6b9c7614f320
                <li className="flex items-center gap-3 text-gray-200">
                    <div className="p-1 rounded-full bg-purple-500/20 text-purple-400"><MdFace size={14} /></div>
                    <span>
                        <strong className="text-white">Custom Stickers</strong><br/>
                        <span className="text-xs text-gray-500 font-normal">Unlock 20+ unique stickers.</span>
                    </span>
                </li>
<<<<<<< HEAD
=======

                {/* NOVO BENEFÍCIO: Desconto em Anúncios */}
>>>>>>> b7236764c4138fdd645fca09756e6b9c7614f320
                <li className="flex items-center gap-3 text-gray-200">
                    <div className="p-1 rounded-full bg-green-500/20 text-green-400"><MdLocalOffer size={14} /></div>
                    <span>
                        <strong className="text-white">50% OFF on Ads</strong><br/>
                        <span className="text-xs text-gray-500 font-normal">Promote your stories for half the price.</span>
                    </span>
                </li>
            </ul>

<<<<<<< HEAD
            {/* STRIPE BUTTON */}
            <button onClick={() => handleSubscribe("vip")} className="w-full py-4 rounded-xl font-bold bg-[#635bff] hover:bg-[#534ac2] text-white shadow-lg flex items-center justify-center gap-2 mb-3 transition-all transform hover:scale-105">
                <FaStripe size={24} /> Get VIP Access
            </button>
            
            <div className="relative group w-full">
                <button disabled className="w-full py-3 rounded-xl bg-[#003087]/30 border border-[#003087]/50 text-gray-500 font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                    <FaPaypal size={20} /> PayPal
                </button>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/80 text-white text-xs font-bold rounded-xl transition-opacity">
                    Coming Soon
                </div>
            </div>

            <p className="text-center text-[10px] text-gray-500 mt-4">Secure payment via Stripe.</p>
=======
            <button onClick={() => handleSubscribe("VIP Promo")} className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg transition-all transform hover:scale-105">Get VIP Access</button>
            <p className="text-center text-[10px] text-gray-500 mt-4">Secure payment via PayPal or Card.</p>
>>>>>>> b7236764c4138fdd645fca09756e6b9c7614f320
        </div>
      </div>

      <div className="max-w-2xl mx-auto mt-20 text-center border-t border-white/10 pt-10">
          <h4 className="text-gray-300 font-bold mb-4">Why subscribe?</h4>
          <p className="text-gray-500 text-sm leading-relaxed">Your support helps us keep the servers running and allows us to develop new features for the community. Plus, you get cool badges!</p>
          <div className="flex justify-center gap-4 mt-6 opacity-50"><FaStripe size={30} /><FaCreditCard size={30} /></div>
      </div>
    </div>
  );
}