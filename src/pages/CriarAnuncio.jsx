import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db, storage, functions } from '../services/firebaseConnection'; // Importe functions
import { httpsCallable } from 'firebase/functions'; // Importe o chamador
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { MdCloudUpload, MdLocalOffer, MdAccessTime, MdAttachMoney, MdDiamond } from 'react-icons/md';
import { FaPaypal, FaCreditCard, FaStripe } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function CriarAnuncio() {
  const { user } = useContext(AuthContext);
  
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [link, setLink] = useState('');
  const [tags, setTags] = useState('');
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);

  // Preço em Reais (BRL) já que a conta é BR
  const PRICE_PER_DAY = 5.00; // Exemplo: R$ 5,00 por dia
  const VIP_DISCOUNT = 0.50; 
  
  const finalPricePerDay = user?.isVip ? (PRICE_PER_DAY * VIP_DISCOUNT) : PRICE_PER_DAY;
  const totalPrice = (days * finalPricePerDay).toFixed(2);
  const originalPrice = (days * PRICE_PER_DAY).toFixed(2);

  function handleFile(e) {
    if(e.target.files[0]){
      const image = e.target.files[0];
      if(image.type === 'image/jpeg' || image.type === 'image/png'){
        setImage(image);
        setPreviewUrl(URL.createObjectURL(image));
      } else {
        toast.error("Format not supported. Use PNG or JPEG.");
      }
    }
  }

  async function handleCreateAd() {
    if(!image || !link || !tags) return toast.error("Please fill all fields.");
    if(days < 1) return toast.error("Minimum 1 day.");

    setLoading(true);
    try {
        // 1. Upload
        const currentUid = user.uid;
        const uploadRef = ref(storage, `ads/${currentUid}/${Date.now()}`);
        const snapshot = await uploadBytes(uploadRef, image);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        const tagsArray = tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== '');

        // 2. Salva rascunho como 'pending_payment'
        const docRef = await addDoc(collection(db, "anuncios"), {
            userId: user.uid,
            userName: user.name,
            imageUrl: downloadUrl,
            targetLink: link,
            tags: tagsArray,
            days: parseInt(days),
            startDate: serverTimestamp(),
            endDate: new Date(Date.now() + (days * 24 * 60 * 60 * 1000)), 
            status: 'pending_payment', // Aguardando pagamento
            pricePaid: parseFloat(totalPrice),
            views: 0,
            clicks: 0,
            createdAt: serverTimestamp()
        });

        // 3. Chamar Cloud Function para criar Checkout
        const createStripeCheckout = httpsCallable(functions, 'createStripeCheckout');
        
        const response = await createStripeCheckout({
            type: 'ad',
            docId: docRef.id,
            amount: parseFloat(totalPrice),
            successUrl: `${window.location.origin}/dashboard`, // Volta para dashboard após pagar
            cancelUrl: `${window.location.origin}/criar-anuncio`
        });

        // 4. Redirecionar para o Stripe
        if (response.data.url) {
            window.location.href = response.data.url;
        } else {
            toast.error("Error connecting to Stripe");
            setLoading(false);
        }
        
    } catch (error) {
        console.error(error);
        toast.error("Error: " + error.message);
        setLoading(false);
    }
  }

  return (
    <div className="min-h-screen py-10 px-4 bg-[#121212] text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Create Ad Campaign</h1>
        <p className="text-gray-400 mb-6">Promote your stories. (Test Mode Active)</p>

        {/* ... (Blocos de aviso VIP mantidos iguais) ... */}
        {user?.isVip ? (
            <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-500/30 p-4 rounded-lg mb-8 flex items-center gap-3">
                <MdDiamond className="text-green-400 text-2xl flex-shrink-0" />
                <div><h3 className="text-green-400 font-bold">VIP Active! 50% OFF Applied.</h3></div>
            </div>
        ) : (
             <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 p-4 rounded-lg mb-8 flex items-center gap-3">
                <MdLocalOffer className="text-yellow-400 text-2xl flex-shrink-0" />
                <div><h3 className="text-yellow-400 font-bold">Get 50% OFF with VIP Premium.</h3></div>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* FORMULÁRIO (Mantido igual ao anterior, apenas resumido aqui) */}
            <div className="space-y-6">
                <div className="bg-[#1f1f1f] p-6 rounded-xl border border-white/5">
                    <label className="block text-sm font-bold text-gray-400 mb-2">Ad Image</label>
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-primary hover:bg-white/5 transition">
                        <input type="file" className="hidden" onChange={handleFile} />
                        {previewUrl ? <img src={previewUrl} className="h-full object-contain" /> : <MdCloudUpload size={30} />}
                    </label>
                </div>
                <div className="bg-[#1f1f1f] p-6 rounded-xl border border-white/5 space-y-4">
                    <input type="text" placeholder="Target Link" value={link} onChange={e=>setLink(e.target.value)} className="w-full bg-[#121212] border border-gray-700 rounded p-3 text-white" />
                    <input type="text" placeholder="Tags (Fantasy, Action...)" value={tags} onChange={e=>setTags(e.target.value)} className="w-full bg-[#121212] border border-gray-700 rounded p-3 text-white" />
                    <div className="flex items-center gap-4">
                        <input type="number" min="1" value={days} onChange={e=>setDays(e.target.value)} className="w-24 bg-[#121212] border border-gray-700 rounded p-3 text-white" />
                        <span className="text-gray-400">Days</span>
                    </div>
                </div>
            </div>

            {/* PAGAMENTO */}
            <div className="space-y-6">
                <div className="bg-gradient-to-br from-[#222] to-[#1a1a1a] p-6 rounded-xl border border-white/10 shadow-xl relative">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><MdAttachMoney className="text-primary" /> Checkout</h3>
                    
                    <div className="space-y-2 mb-6 border-b border-white/5 pb-4">
                        <div className="flex justify-between text-gray-400"><span>Price per Day</span><span>R$ {PRICE_PER_DAY.toFixed(2)}</span></div>
                        <div className="flex justify-between text-white font-bold text-xl mt-2"><span>Total</span><span>R$ {totalPrice}</span></div>
                    </div>

                    {/* BOTÕES DE PAGAMENTO */}
                    <div className="flex flex-col gap-3">
                        {/* Botão Stripe */}
                        <button 
                            onClick={handleCreateAd}
                            disabled={loading}
                            className="w-full py-4 rounded-lg bg-[#635bff] hover:bg-[#534ac2] text-white font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                        >
                            <FaStripe size={28} /> Pay with Card / Pix
                        </button>

                        {/* Botão PayPal (Desativado) */}
                        <div className="relative group w-full">
                            <button disabled className="w-full py-4 rounded-lg bg-[#003087]/50 border border-[#003087] text-gray-400 font-bold text-lg flex items-center justify-center gap-3 cursor-not-allowed opacity-60">
                                <FaPaypal size={24} /> PayPal
                            </button>
                            {/* Tooltip */}
                            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/80 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                Coming Soon
                            </div>
                        </div>

                         <Link to="/dashboard" className="block text-center text-gray-500 text-sm hover:text-white mt-2">Cancel and Return</Link>
                    </div>
                    
                    <p className="text-center text-xs text-gray-600 mt-4">Safe payment processed by Stripe.</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}