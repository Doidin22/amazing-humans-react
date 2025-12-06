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

                const avatarFinal = dados.foto || firebaseUser.photoURL || generateAvatar(uid);

                setUser({
                    uid: uid,
                    name: dados.nome || firebaseUser.displayName,
                    avatar: avatarFinal,
                    email: firebaseUser.email,
                    type: 'google',
                    role: dados.role || 'user',
                    // Dados da Economia
                    coins: dados.coins || 0,
                    level: dados.level || 0,
                    isAdFree: dados.isAdFree || false,
                    isVip: dados.isVip || false,
                    badges: dados.badges || [] // <--- NOVO
                });
            } else {
                // Novo usuário
                setUser({
                    uid: uid,
                    name: firebaseUser.displayName || "Loading...",
                    avatar: firebaseUser.photoURL || generateAvatar(uid),
                    email: firebaseUser.email,
                    type: 'google',
                    role: 'user',
                    coins: 0,
                    level: 0,
                    isAdFree: false,
                    badges: []
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

  function isAdmin() {
    return user?.role === 'admin';
  }

  function hasAds() {
      if (!user) return true;
      if (user.isAdFree || user.level >= 100 || user.isVip) return false;
      return true;
  }

  return (
    <AuthContext.Provider value={{ signed: !!user, user, signInGoogle, logout, loadingAuth, isAdmin, hasAds }}>
      {children}
    </AuthContext.Provider>
  );
}