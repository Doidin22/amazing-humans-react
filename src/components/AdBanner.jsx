import React, { useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export default function AdBanner({ className }) {
  const { hasAds } = useContext(AuthContext);

  useEffect(() => {
    // Só tenta carregar se o usuário tiver que ver anúncios
    if (hasAds() && window.adsbygoogle) {
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error("AdSense error", e);
        }
    }
  }, [hasAds]);

  if (!hasAds()) {
      return null; // Não renderiza nada para usuários VIP/Level 100
  }

  return (
    <div className={`w-full max-w-[728px] mx-auto my-8 overflow-hidden rounded-lg bg-[#1a1a1a] border border-[#333] flex flex-col items-center justify-center p-4 text-center ${className}`}>
      <span className="text-[10px] text-gray-600 uppercase tracking-widest mb-2 font-bold">Advertisement</span>
      
      {/* --- CÓDIGO DO GOOGLE ADSENSE --- */}
      <ins className="adsbygoogle"
           style={{ display: 'block', width: '100%', minHeight: '90px' }}
           data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
           data-ad-slot="1234567890"
           data-ad-format="auto"
           data-full-width-responsive="true">
      </ins>
      
      <div className="w-full h-24 bg-[#222] border border-dashed border-[#444] rounded flex items-center justify-center text-gray-500 text-xs">
        Ads help support Amazing Humans. Reach Lvl 100 to remove them.
      </div>
    </div>
  );
}