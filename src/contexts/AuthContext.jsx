import { createContext, useState, useEffect } from 'react';
import { auth, provider, db } from '../services/firebaseConnection';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore'; 
import toast from 'react-hot-toast';

export const AuthContext = createContext({});

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
        
        const unsubscribeFirestore = onSnapshot(doc(db, "usuarios", uid), async (docSnap) => {
            if (docSnap.exists()) {
                const dados = docSnap.data();

                if (dados.banned === true) {
                    toast.error("This account has been suspended.");
                    await signOut(auth);
                    setUser(null);
                    setLoadingAuth(false);
                    return; 
                }

                // --- PROTEÇÃO CONTRA ERRO DE DATA (VIP) ---
                let vipDate = null;
                try {
                    if (dados.vipUntil) {
                        // Se for Timestamp do Firebase
                        if (typeof dados.vipUntil.toDate === 'function') {
                            vipDate = dados.vipUntil.toDate();
                        } 
                        // Se for String ou Date normal (edição manual)
                        else {
                            vipDate = new Date(dados.vipUntil);
                        }
                    }
                } catch (err) {
                    console.error("Erro ao processar data VIP:", err);
                    vipDate = null; // Falha segura, não trava o app
                }

                const avatarFinal = dados.foto || firebaseUser.photoURL || generateAvatar(uid);

                setUser({
                    uid: uid,
                    name: dados.nome || firebaseUser.displayName,
                    avatar: avatarFinal,
                    email: firebaseUser.email,
                    type: 'google',
                    role: dados.role || 'user',
                    badges: dados.badges || [],
                    followersCount: dados.followersCount || 0,
                    followingCount: dados.followingCount || 0,
                    leituras: dados.contador_leituras || 0,
                    
                    // --- CAMPOS NOVOS (Com proteção de string vazia) ---
                    website: dados.website || '',
                    twitter: dados.twitter || '',
                    instagram: dados.instagram || '',
                    patreon: dados.patreon || '',
                    paypal: dados.paypal || '',
                    vipUntil: vipDate
                });
            } else {
                // Usuário novo
                setUser({
                    uid: uid,
                    name: firebaseUser.displayName || "Loading...",
                    avatar: firebaseUser.photoURL || generateAvatar(uid),
                    email: firebaseUser.email,
                    type: 'google',
                    role: 'user',
                    badges: [],
                    followersCount: 0,
                    followingCount: 0,
                    leituras: 0,
                    website: '', twitter: '', instagram: '', patreon: '', paypal: '', vipUntil: null
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
      if(result.user) {
          const uid = result.user.uid;
          const userRef = doc(db, "usuarios", uid);
          // Usa merge para não apagar dados existentes
          await setDoc(userRef, {
              uid: uid,
              nome: result.user.displayName,
              email: result.user.email
          }, { merge: true });
      }
    } catch (error) {
      console.error("Google Login Error", error);
      toast.error("Error logging in");
    }
  }

  async function logout() {
    try {
        await signOut(auth); 
        setUser(null);
    } catch(e) {
        console.error("Logout Error", e);
    }
  }

  function isAdmin() {
    return user?.role === 'admin';
  }

  // --- LÓGICA DE ANÚNCIOS ---
  function hasAds() {
      if (!user) return true; 

      // 1. Verifica Nível 100
      const currentLevel = Math.floor((user.leituras || 0) / 20) + 1;
      if (currentLevel >= 100) {
          return false;
      }

      // 2. Verifica Assinatura VIP
      if (user.vipUntil) {
          const hoje = new Date();
          // Verifica se a data é válida antes de comparar
          if (user.vipUntil instanceof Date && !isNaN(user.vipUntil)) {
              if (user.vipUntil > hoje) {
                  return false;
              }
          }
      }

      return true;
  }

  async function grantVip(days) {
      if(!user?.uid) return;
      const date = new Date();
      date.setDate(date.getDate() + days);
      
      const userRef = doc(db, "usuarios", user.uid);
      await setDoc(userRef, { vipUntil: date }, { merge: true });
      toast.success(`VIP active for ${days} days!`);
  }

  return (
    <AuthContext.Provider value={{ signed: !!user, user, signInGoogle, logout, loadingAuth, isAdmin, hasAds, grantVip }}>
      {children}
    </AuthContext.Provider>
  );
}