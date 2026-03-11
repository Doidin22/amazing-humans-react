import React, { useEffect } from 'react';

export default function AdBanner() {
  useEffect(() => {
    // Tenta inicializar o anúncio do Google
    try {
      // Verifica se o script do AdSense já está carregado na página (index.html)
      if (window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error("AdSense Error:", e);
    }
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto my-8 relative flex items-center justify-center bg-[#1a1a1a] border border-white/5 rounded-xl overflow-hidden min-h-[100px] text-zinc-600 text-xs font-bold tracking-widest uppercase">
        <span className="absolute z-0 select-none">Advertisement</span>
        {/* Substitua os valores abaixo pelos seus dados do AdSense */}
        <ins className="adsbygoogle relative z-10"
             style={{ display: 'block', width: '100%' }}
             data-ad-client="ca-pub-SEU_ID_AQUI" 
             data-ad-slot="SEU_SLOT_AQUI"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
    </div>
  );
}