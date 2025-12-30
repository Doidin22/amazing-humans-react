import React, { createContext, useState, useEffect } from 'react';
import { auth, provider, db } from '../services/firebaseConnection';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';

export const AuthContext = createContext({});

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


// Função auxiliar para avatar
function generateAvatar(seed) {
  const safeSeed = encodeURIComponent(seed || 'default');
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${safeSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const uid = firebaseUser.uid;

        // O segredo está aqui: ler os campos novos do banco em tempo real
        const unsubscribeFirestore = onSnapshot(doc(db, "usuarios", uid), async (docSnap) => {
          if (docSnap.exists()) {
            const dados = docSnap.data();

            if (dados.banned === true) {
              toast.error("Esta conta foi suspensa.");
              await signOut(auth);
              setUser(null);
              setLoadingAuth(false);
              return;
            }

            // --- Lógica VIP ---
            let vipDate = null;
            let isVip = false;
            try {
              if (dados.vipUntil) {
                if (typeof dados.vipUntil.toDate === 'function') {
                  vipDate = dados.vipUntil.toDate();
                } else {
                  vipDate = new Date(dados.vipUntil);
                }
                if (vipDate > new Date()) {
                  isVip = true;
                }
              }
            } catch (err) {
              console.error("Erro data VIP:", err);
            }

            const avatarFinal = dados.foto || firebaseUser.photoURL || generateAvatar(uid);

            // ATUALIZANDO O ESTADO DO USUÁRIO COM OS NOVOS CAMPOS
            setUser({
              uid: uid,
              name: dados.nome || firebaseUser.displayName,
              avatar: avatarFinal,
              email: firebaseUser.email,
              role: dados.role || 'user',
              badges: dados.badges || [],
              followersCount: dados.followersCount || 0,
              followingCount: dados.followingCount || 0,
              leituras: dados.contador_leituras || 0,

              // --- AQUI ESTÁ A CORREÇÃO: Lendo os campos do banco ---
              website: dados.website || '',
              twitter: dados.twitter || '',
              instagram: dados.instagram || '',
              patreon: dados.patreon || '', // Essencial para o Patreon aparecer
              paypal: dados.paypal || '',   // Essencial para o PayPal aparecer
              vipUntil: vipDate,
              isVip: isVip
            });
          } else {
            // Usuário novo
            setUser({
              uid: uid,
              name: firebaseUser.displayName || "Carregando...",
              avatar: firebaseUser.photoURL || generateAvatar(uid),
              email: firebaseUser.email,
              role: 'user',
              badges: [],
              followersCount: 0,
              leituras: 0,
              website: '', twitter: '', instagram: '', patreon: '', paypal: '',
              isVip: false
            });
          }
          setLoadingAuth(false);
        });

        return () => unsubscribeFirestore();

      } else {
        setUser(null);
        setLoadingAuth(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  async function signInGoogle() {
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        const uid = result.user.uid;
        await setDoc(doc(db, "usuarios", uid), {
          uid: uid,
          nome: result.user.displayName,
          email: result.user.email
        }, { merge: true });
      }
    } catch (error) {
      console.error("Erro Login Google", error);
      toast.error("Erro ao fazer login");
    }
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
  }

  const isAdmin = React.useCallback(() => {
    return user?.role === 'admin';
  }, [user]);

  const hasAds = React.useCallback(() => {
    if (!user) return true;
    const currentLevel = Math.floor((user.leituras || 0) / 20) + 1;
    if (currentLevel >= 100) return false;
    if (user.isVip) return false;
    return true;
  }, [user]);

  return (
    <AuthContext.Provider value={{ signed: !!user, user, signInGoogle, logout, loadingAuth, isAdmin, hasAds }}>
      {children}
    </AuthContext.Provider>
  );
}