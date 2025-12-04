import React, { useContext, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { functions } from '../services/firebaseConnection';
import { httpsCallable } from 'firebase/functions';
import { MdStar, MdCheck, MdDiamond, MdLocalOffer } from 'react-icons/md';
import toast from 'react-hot-toast';

export default function Assinatura() {
  const { isVip, user } = useContext(AuthContext);
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAssinar = async () => {
      if (!user) return toast.error("Please login first.");
      setLoading(true);
      const toastId = toast.loading("Processing subscription...");

      try {
          const subscribeFn = httpsCallable(functions, 'subscribePremium');
          // Envia o código (pode ser string vazia se não tiver)
          const result = await subscribeFn({ referralCode: referralCode.trim() });
          
          toast.success(result.data.message, { id: toastId });
          // O AuthContext vai atualizar automaticamente via onSnapshot, mas pode demorar uns segundos
          setTimeout(() => window.location.reload(), 1500); 

      } catch (error) {
          console.error(error);
          let msg = "Error processing payment.";
          if (error.message.includes('código')) msg = "Invalid Referral Code.";
          if (error.message.includes('próprio')) msg = "Cannot use your own code.";
          toast.error(msg, { id: toastId });
      } finally {
          setLoading(false);
      }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '20px', textAlign: 'center' }}>
      <MdDiamond size={60} color="#00d2ff" style={{ marginBottom: 20 }} />
      <h1 style={{ color: 'white', fontSize: '2.5rem', margin: '0 0 10px 0' }}>Premium Membership</h1>
      <p style={{ color: '#aaa', marginBottom: '50px', fontSize: '1.1rem' }}>
        Support the platform, unlock free books, and earn rewards.
      </p>

      {isVip() ? (
        <div className="bg-gradient-to-br from-green-800 to-green-600 p-10 rounded-2xl shadow-2xl border border-green-500">
          <h2 className="flex items-center justify-center gap-3 text-2xl font-bold text-white mb-2">
             <MdCheck size={32} /> You are Premium!
          </h2>
          <p className="text-green-100">Enjoy your exclusive benefits and free books.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: '#1f1f1f', border: '2px solid #3da6f5', borderRadius: 20, padding: 40, maxWidth: 450, width: '100%', position: 'relative', boxShadow: '0 0 30px rgba(61, 166, 245, 0.1)' }}>
              <div style={{ position: 'absolute', top: -15, left: '50%', transform: 'translateX(-50%)', background: '#3da6f5', color: 'white', padding: '5px 20px', borderRadius: 20, fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '1px' }}>
                BEST VALUE
              </div>
              
              <h3 style={{ color: 'white', fontSize: '1.8rem', margin: '10px 0' }}>Monthly VIP</h3>
              
              {/* Preço Dinâmico */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 5, margin: '20px 0' }}>
                {referralCode.length >= 5 ? (
                    <>
                        <span className="text-gray-500 line-through text-xl">$5.00</span>
                        <span style={{ fontSize: '3.5rem', color: '#4ade80', fontWeight: 'bold' }}>$4.00</span>
                    </>
                ) : (
                    <span style={{ fontSize: '3.5rem', color: 'white', fontWeight: 'bold' }}>$5.00</span>
                )}
                <span style={{ fontSize: '1.2rem', color: '#3da6f5', fontWeight: 'bold' }}>/mo</span>
              </div>

              {/* Benefícios */}
              <ul className="text-left text-gray-300 mb-8 space-y-3">
                <li className="flex items-center gap-3"><MdStar color="#ffd700" /> Access Premium-Only Books</li>
                <li className="flex items-center gap-3"><MdStar color="#ffd700" /> No ads while reading</li>
                <li className="flex items-center gap-3"><MdStar color="#ffd700" /> Exclusive profile badge</li>
                <li className="flex items-center gap-3"><MdStar color="#ffd700" /> Support platform & authors</li>
              </ul>

              {/* Input de Código */}
              <div className="mb-6 bg-[#151515] p-3 rounded-lg border border-[#333] flex items-center gap-2">
                  <MdLocalOffer className="text-yellow-500" />
                  <input 
                    type="text" 
                    placeholder="Enter Invite Code (Save $1)" 
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="bg-transparent border-none outline-none text-white w-full text-sm font-bold placeholder-gray-600 uppercase"
                  />
                  {referralCode.length >= 5 && <MdCheck className="text-green-500" />}
              </div>

              <button 
                onClick={handleAssinar} 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg disabled:opacity-50"
              >
                {loading ? "Processing..." : (referralCode.length >= 5 ? "Subscribe for $4" : "Subscribe for $5")}
              </button>
            </div>
        </div>
      )}
    </div>
  );
}