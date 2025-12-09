import React, { createContext, useState } from 'react';
import { db } from '../services/firebaseConnection';
import { collection, query, orderBy, limit, getDocs, startAfter } from 'firebase/firestore';

export const CacheContext = createContext({});

export default function CacheProvider({ children }) {
  // Estado para armazenar os livros da Home
  const [homeObras, setHomeObras] = useState([]);
  const [lastDoc, setLastDoc] = useState(null); // Para paginação
  const [loadingHome, setLoadingHome] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Função inteligente que só busca se não tiver dados ou se for forçado (paginação)
  async function loadHomeObras(isNextPage = false) {
    // SE já temos dados e NÃO é uma página nova, não faz nada (Usa o Cache)
    if (!isNextPage && homeObras.length > 0) {
      return; 
    }

    if (loadingHome) return;
    setLoadingHome(true);

    try {
      const obrasRef = collection(db, "obras");
      let q;

      if (isNextPage && lastDoc) {
        // Carregar mais (Próxima página)
        q = query(obrasRef, orderBy("dataCriacao", "desc"), startAfter(lastDoc), limit(12));
      } else {
        // Primeira carga (Início)
        q = query(obrasRef, orderBy("dataCriacao", "desc"), limit(12));
      }

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const lista = [];
        snapshot.forEach((doc) => {
          lista.push({
            id: doc.id,
            ...doc.data()
          });
        });

        // Se for paginação, adiciona ao final. Se for primeira, substitui (ou mantém se a lógica for diferente)
        // Aqui vamos acumular para criar scroll infinito ou botão "ver mais"
        if (isNextPage) {
          setHomeObras((prev) => [...prev, ...lista]);
        } else {
          setHomeObras(lista);
        }

        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      } else {
        setHasMore(false);
      }

    } catch (error) {
      console.log("Erro ao buscar obras:", error);
    } finally {
      setLoadingHome(false);
    }
  }

  // Função para limpar o cache (útil se você quiser criar um botão "Atualizar")
  function clearCache() {
    setHomeObras([]);
    setLastDoc(null);
    setHasMore(true);
  }

  return (
    <CacheContext.Provider value={{ 
      homeObras, 
      loadingHome, 
      hasMore, 
      loadHomeObras,
      clearCache 
    }}>
      {children}
    </CacheContext.Provider>
  );
}