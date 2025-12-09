import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebaseConnection';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

export default function AdBanner({ tags = [] }) {
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- BUSCA ANÚNCIO NATIVO ---
  useEffect(() => {
    let isMounted = true;
    async function fetchAd() {
      try {
        const adsRef = collection(db, "anuncios");
        let q;

        // Tenta achar ads compatíveis com as tags do livro
        if (tags.length > 0) {
            const searchTags = tags.slice(0, 10);
            q = query(
                adsRef, 
                where("status", "==", "active"),
                where("tags", "array-contains-any", searchTags),
                limit(5)
            );
        } else {
            // Home page: pega os últimos ativos
            q = query(
                adsRef, 
                where("status", "==", "active"),
                orderBy("createdAt", "desc"),
                limit(5)
            );
        }

        const snapshot = await getDocs(q);
        
        if (!snapshot.empty && isMounted) {
            const adsList = snapshot.docs.map(doc => doc.data());
            // Escolhe um aleatório
            const randomAd = adsList[Math.floor(Math.random() * adsList.length)];
            
            // Verifica validade
            if(randomAd.endDate && new Date(randomAd.endDate.seconds * 1000) > new Date()) {
                setAd(randomAd);
            }
        }
      } catch (error) {
        console.log("Erro ao buscar ads nativos:", error);
      } finally {
        if(isMounted) setLoading(false);
      }
    }

    fetchAd();
    return () => { isMounted = false; };
  }, [tags]);

  // --- SE TIVER ANÚNCIO NATIVO, MOSTRA ELE ---
  if (ad) {
    return (
      <div className="w-full max-w-4xl mx-auto my-8">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 ml-1 flex justify-between">
            <span>Sponsored</span>
            <span className="text-primary cursor-pointer hover:underline" onClick={() => window.location.href='/criar-anuncio'}>Create your Ad</span>
          </div>
          <a href={ad.targetLink} target="_blank" rel="noopener noreferrer" className="block w-full rounded-xl overflow-hidden border border-white/10 hover:border-primary transition-colors relative group">
              <img 
                  src={ad.imageUrl} 
                  alt="Ad" 
                  className="w-full h-[150px] md:h-[250px] object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="bg-primary text-white px-4 py-2 rounded-full font-bold shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                      Visit Now
                  </span>
              </div>
          </a>
      </div>
    );
  }

  // --- SE NÃO TIVER NATIVO, MOSTRA GOOGLE ADSENSE (FALLBACK) ---
  if (!loading && !ad) {
      return <GoogleAdSense />;
  }

  // Skeleton enquanto carrega a decisão
  return <div className="w-full max-w-4xl mx-auto h-[250px] bg-[#1a1a1a] rounded-xl animate-pulse my-8"></div>;
}

// --- COMPONENTE INTERNO DO ADSENSE ---
function GoogleAdSense() {
    const bannerRef = useRef(null);

    useEffect(() => {
        // Tenta empurrar o anúncio para o script do Google
        try {
            if (window.adsbygoogle) {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (e) {
            console.error("AdSense Error:", e);
        }
    }, []);

    return (
        <div className="w-full max-w-4xl mx-auto my-8 flex justify-center bg-[#1a1a1a] rounded-xl overflow-hidden min-h-[100px]">
            {/* Substitua o data-ad-client e data-ad-slot pelos seus do Google */}
            <ins className="adsbygoogle"
                 style={{ display: 'block', width: '100%' }}
                 data-ad-client="ca-pub-SEU_ID_AQUI"
                 data-ad-slot="SEU_SLOT_AQUI"
                 data-ad-format="auto"
                 data-full-width-responsive="true"></ins>
        </div>
    );
}