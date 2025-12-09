import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db, storage } from '../services/firebaseConnection';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { MdCloudUpload, MdLocalOffer, MdAccessTime, MdAttachMoney, MdDiamond } from 'react-icons/md';
import { FaPaypal, FaCreditCard, FaStripe } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom'; // <--- Importei Link e useNavigate
import toast from 'react-hot-toast';

export default function CriarAnuncio() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [link, setLink] = useState('');
  const [tags, setTags] = useState('');
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);

  const PRICE_PER_DAY = 1.00;
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
    if(!image || !link || !tags) {
        return toast.error("Please fill all fields and upload an image.");
    }
    if(days < 1) return toast.error("Minimum 1 day.");

    setLoading(true);
    try {
        const currentUid = user.uid;
        const uploadRef = ref(storage, `ads/${currentUid}/${Date.now()}`);
        const snapshot = await uploadBytes(uploadRef, image);
        const downloadUrl = await getDownloadURL(snapshot.ref);

        const tagsArray = tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== '');

        await addDoc(collection(db, "anuncios"), {
            userId: user.uid,
            userName: user.name,
            imageUrl: downloadUrl,
            targetLink: link,
            tags: tagsArray,
            days: parseInt(days),
            startDate: serverTimestamp(),
            endDate: new Date(Date.now() + (days * 24 * 60 * 60 * 1000)), 
            status: 'active',
            pricePaid: parseFloat(totalPrice),
            views: 0,
            clicks: 0,
            createdAt: serverTimestamp()
        });

        toast.success("Ad campaign created successfully!");
        navigate('/dashboard'); // Redireciona após sucesso
        
    } catch (error) {
        console.log(error);
        toast.error("Error creating ad.");
    } finally {
        setLoading(false);
    }
  }

  return (
    <div className="min-h-screen py-10 px-4 bg-[#121212] text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Create Ad Campaign</h1>
        <p className="text-gray-400 mb-6">Promote your stories to readers who love your genre.</p>

        {user?.isVip ? (
            <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-500/30 p-4 rounded-lg mb-8 flex items-center gap-3">
                <MdDiamond className="text-green-400 text-2xl flex-shrink-0" />
                <div>
                    <h3 className="text-green-400 font-bold flex items-center gap-2">VIP Premium Status Active!</h3>
                    <p className="text-sm text-gray-300">You get a <span className="text-green-400 font-bold">50% discount</span> on all ad campaigns.</p>
                </div>
            </div>
        ) : (
             <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 p-4 rounded-lg mb-8 flex items-center gap-3">
                <MdLocalOffer className="text-yellow-400 text-2xl flex-shrink-0" />
                <div>
                    <h3 className="text-yellow-400 font-bold flex items-center gap-2">Want a 50% Discount?</h3>
                    <p className="text-sm text-gray-300">Upgrade to <a href="/assinatura" className="text-yellow-400 underline hover:text-yellow-300">VIP Premium</a> and pay half the price for ads!</p>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            
            {/* FORMULÁRIO */}
            <div className="space-y-6">
                <div className="bg-[#1f1f1f] p-6 rounded-xl border border-white/5">
                    <label className="block text-sm font-bold text-gray-400 mb-2">Ad Image (300x250 or similar)</label>
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-primary hover:bg-white/5 transition">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <MdCloudUpload className="w-8 h-8 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500">Click to upload image</p>
                        </div>
                        <input type="file" className="hidden" onChange={handleFile} />
                    </label>
                </div>

                <div className="bg-[#1f1f1f] p-6 rounded-xl border border-white/5 space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Target URL (Your Book Link)</label>
                        <input 
                            type="text" 
                            placeholder="https://amazinghumans.com/obra/..."
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-white focus:border-primary outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Target Categories (Tags)</label>
                        <input 
                            type="text" 
                            placeholder="Fantasy, Romance, Action (comma separated)"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-white focus:border-primary outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">We show your ad to readers reading these genres.</p>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Duration (Days)</label>
                        <div className="flex items-center gap-4">
                            <input 
                                type="number" 
                                min="1"
                                value={days}
                                onChange={(e) => setDays(e.target.value)}
                                className="w-24 bg-[#121212] border border-gray-700 rounded-lg p-3 text-white focus:border-primary outline-none"
                            />
                            <span className="text-gray-400 flex items-center gap-1"><MdAccessTime /> Ends on: {new Date(Date.now() + (days * 24 * 60 * 60 * 1000)).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* PREVIEW E PAGAMENTO */}
            <div className="space-y-6">
                <div className="bg-[#1f1f1f] p-6 rounded-xl border border-white/5">
                    <h3 className="text-gray-400 font-bold mb-4">Ad Preview</h3>
                    <div className="bg-[#121212] p-4 rounded-lg flex flex-col items-center justify-center min-h-[250px] border border-gray-800">
                        {previewUrl ? (
                            <img src={previewUrl} alt="Ad Preview" className="max-w-full h-auto rounded-md shadow-lg object-contain" />
                        ) : (
                            <span className="text-gray-600">Image will appear here</span>
                        )}
                        {previewUrl && <span className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest border border-gray-700 px-1 rounded">Sponsored</span>}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-[#222] to-[#1a1a1a] p-6 rounded-xl border border-white/10 shadow-xl relative overflow-hidden">
                    
                    {user?.isVip && (
                        <div className="absolute top-0 right-0 bg-green-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider flex items-center gap-1">
                            <MdLocalOffer size={14} /> 50% OFF APPLIED
                        </div>
                    )}
                    
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <MdAttachMoney className="text-primary" /> Order Summary
                    </h3>
                    
                    <div className="space-y-2 mb-6 border-b border-white/5 pb-4">
                        <div className="flex justify-between text-gray-400">
                            <span>Duration</span>
                            <span>{days} Days</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                            <span>Price per Day</span>
                            <span>${PRICE_PER_DAY.toFixed(2)}</span>
                        </div>
                        {user?.isVip && (
                            <div className="flex justify-between text-green-400 font-bold">
                                <span className="flex items-center gap-1"><MdLocalOffer /> VIP Discount (50%)</span>
                                <span>- ${(parseFloat(originalPrice) - parseFloat(totalPrice)).toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-end mb-6">
                        <span className="text-gray-300">Total to Pay</span>
                        <div className="text-right">
                            {user?.isVip && <span className="block text-sm text-gray-500 line-through decoration-red-500 mb-1">${originalPrice}</span>}
                            <span className="text-4xl font-black text-white">${totalPrice}</span>
                        </div>
                    </div>

                    {/* BOTÕES: CANCELAR e PAGAR */}
                    <div className="flex gap-3">
                        <Link 
                            to="/dashboard"
                            className="flex-1 py-4 rounded-lg border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white font-bold text-center transition-all flex items-center justify-center"
                        >
                            Cancel
                        </Link>

                        <button 
                            onClick={handleCreateAd}
                            disabled={loading}
                            className="flex-[2] py-4 rounded-lg bg-primary hover:bg-primary/80 text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : 'Pay & Publish'}
                        </button>
                    </div>
                    
                    <div className="flex justify-center gap-4 mt-6 opacity-50 text-gray-400">
                        <FaCreditCard size={24} /> <FaPaypal size={24} /> <FaStripe size={24} />
                    </div>
                    <p className="text-center text-xs text-gray-600 mt-2">Secured by Stripe (Testing Mode)</p>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}