import React, { createContext, useState, useEffect } from 'react';
import { auth, provider, db } from '../services/firebaseConnection';
import { signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';

export const AuthContext = createContext({});

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

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
              toast.error("Esta conta foi suspensa.");
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
              cover: dados.capa || null,
              email: firebaseUser.email,
              role: dados.role || 'user',

              // --- NOVOS CAMPOS DE ECONOMIA ---
              coins: dados.coins || 0,
              subscriptionType: dados.subscriptionType || 'free', // 'free', 'reader', 'author'
              subscriptionStatus: dados.subscriptionStatus || 'inactive', // 'active', 'past_due'
              referralCode: dados.referralCode || '',
              // Campos referrals
              referralCount: dados.referralCount || 0,
              referredBy: dados.referredBy || null,

              // Mantendo compatibilidade com código antigo
              badges: dados.badges || [],
              followersCount: dados.followersCount || 0,
              leituras: dados.contador_leituras || 0,
              website: dados.website || '', twitter: dados.twitter || '', instagram: dados.instagram || '',
              patreon: dados.patreon || '', paypal: dados.paypal || ''
            });
          } else {
            // Usuário novo
            setUser({
              uid: uid,
              name: firebaseUser.displayName || "Carregando...",
              avatar: firebaseUser.photoURL || generateAvatar(uid),
              email: firebaseUser.email,
              role: 'user',
              coins: 0,
              subscriptionType: 'free',
              subscriptionStatus: 'inactive'
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

  async function signInGoogle(inviteCode) {
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        const uid = result.user.uid;
        const userRef = doc(db, "usuarios", uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          // Criar novo usuário se não existir
          // REMOVED: coins, subscriptionType, subscriptionStatus (initialized server-side)
          await setDoc(userRef, {
            uid: uid,
            nome: result.user.displayName,
            email: result.user.email,
            createdAt: new Date(),
            avatar: result.user.photoURL || null
          });
        }
        // Se já existir, NÃO atualizamos o nome para não sobrescrever customizações do usuário

        // Tentar aplicar código de convite se houver
        if (inviteCode) {
          const functions = getFunctions();
          const redeemReferralCode = httpsCallable(functions, 'redeemReferralCode');
          redeemReferralCode({ code: inviteCode })
            .then((res) => toast.success(`Referred by ${res.data.referrerName}!`))
            .catch((err) => {
              console.error("Referral Error:", err);
              // Não exibe erro se for "already exists" silenciosamente ou warning
              if (!err.message.includes("already")) toast.error("Invalid invite code, but you are logged in.");
            });
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao fazer login");
    }
  }

  async function registerEmail(name, email, password, inviteCode) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      if (result.user) {
        const uid = result.user.uid;
        const userRef = doc(db, "usuarios", uid);
        
        await setDoc(userRef, {
          uid: uid,
          nome: name,
          email: email,
          createdAt: new Date(),
          avatar: generateAvatar(uid),
          // Defaults are handled inside the listener but we can set them here to be safe
          coins: 0,
          role: 'user',
          subscriptionType: 'free',
          subscriptionStatus: 'inactive'
        });

        if (inviteCode) {
          try {
            const functions = getFunctions();
            const redeemReferralCode = httpsCallable(functions, 'redeemReferralCode');
            const res = await redeemReferralCode({ code: inviteCode });
            toast.success(`Referred by ${res.data.referrerName}!`);
          } catch (err) {
            console.error("Referral Error:", err);
            if (!err.message.includes("already")) toast.error("Invalid invite code, but you are registered.");
          }
        }
      }
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error("Este e-mail já existe. Se você já usou o Google para entrar antes, precisa usar o botão do Google novamente.", { duration: 5000 });
      } else if (error.code === 'auth/weak-password') {
        toast.error("A senha deve ter pelo menos 6 caracteres.");
      } else {
        toast.error("Erro ao criar conta.");
      }
    }
  }

  async function loginEmail(email, password) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        toast.error("E-mail ou senha incorretos.");
      } else {
        toast.error("Erro ao fazer login.");
      }
    }
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
  }

  const isAdmin = React.useCallback(() => user?.role === 'admin', [user]);

  // --- LÓGICA ATUALIZADA DE ANÚNCIOS ---
  const hasAds = React.useCallback(() => {
    if (!user) return true;
    // Se a assinatura estiver ativa (seja leitor ou autor), remove anúncios
    if (user.subscriptionStatus === 'active') return false;

    // Regra antiga de nível (opcional, pode manter ou tirar)
    const currentLevel = Math.floor((user.leituras || 0) / 20) + 1;
    if (currentLevel >= 100) return false;

    return true;
  }, [user]);

  return (
    <AuthContext.Provider value={{ signed: !!user, user, signInGoogle, registerEmail, loginEmail, logout, loadingAuth, isAdmin, hasAds }}>
      {children}
    </AuthContext.Provider>
  );
}