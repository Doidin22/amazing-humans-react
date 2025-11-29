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

  // 1. Monitor Geral de Auth (Firebase + Perfil em Tempo Real)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const uid = firebaseUser.uid;
        
        const unsubscribeFirestore = onSnapshot(doc(db, "usuarios", uid), (docSnap) => {
            if (docSnap.exists()) {
                const dados = docSnap.data();
                const avatarFinal = dados.foto || firebaseUser.photoURL || generateAvatar(uid);

                setUser({
                    uid: uid,
                    name: dados.nome || firebaseUser.displayName,
                    avatar: avatarFinal,
                    email: firebaseUser.email,
                    type: 'google',
                    assinatura: dados.assinatura || null
                });
            } else {
                setUser({
                    uid: uid,
                    name: firebaseUser.displayName || "Loading...",
                    avatar: firebaseUser.photoURL || generateAvatar(uid),
                    email: firebaseUser.email,
                    type: 'google',
                    assinatura: null
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
          
          await setDoc(userRef, {
              uid: uid,
              nome: result.user.displayName,
              foto: result.user.photoURL, 
              email: result.user.email
          }, { merge: true });
      }
    } catch (error) {
      console.error("Google Login Error", error);
      toast.error("Error logging in with Google");
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

  function isVip() {
    if (!user || !user.assinatura || !user.assinatura.expiraEm) return false;
    const now = new Date();
    const expirationDate = user.assinatura.expiraEm.toDate 
        ? user.assinatura.expiraEm.toDate() 
        : new Date(user.assinatura.expiraEm);
    return now < expirationDate;
  }

  return (
    <AuthContext.Provider value={{ signed: !!user, user, signInGoogle, logout, loadingAuth, isVip }}>
      {children}
    </AuthContext.Provider>
  );
}