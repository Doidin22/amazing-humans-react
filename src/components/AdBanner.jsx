import React, { useEffect } from 'react';

export default function AdBanner({ className }) {
  useEffect(() => {
    // Tenta carregar o anúncio (apenas se o script do AdSense estiver no index.html)
    try {
      if (window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error("AdSense error", e);
    }
  }, []);

  return (
    <div className={`w-full max-w-[728px] mx-auto my-8 overflow-hidden rounded-lg bg-[#1a1a1a] border border-[#333] flex flex-col items-center justify-center p-4 text-center ${className}`}>
      <span className="text-[10px] text-gray-600 uppercase tracking-widest mb-2 font-bold">Advertisement</span>
      
      {/* --- CÓDIGO DO GOOGLE ADSENSE AQUI --- */}
      {/* Substitua 'ca-pub-XKXKXK' e 'slot-ID' pelos seus dados reais */}
      <ins className="adsbygoogle"
           style={{ display: 'block', width: '100%', minHeight: '90px' }}
           data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
           data-ad-slot="1234567890"
           data-ad-format="auto"
           data-full-width-responsive="true">
      </ins>
      
      {/* Placeholder visual para você ver onde o anúncio ficará enquanto não configura o AdSense */}
      <div className="w-full h-24 bg-[#222] border border-dashed border-[#444] rounded flex items-center justify-center text-gray-500 text-xs">
        Google AdSense Space
      </div>
    </div>
  );
}