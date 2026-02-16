import React, { createContext, useState, useEffect } from 'react';
import { auth, provider, db } from '../services/firebaseConnection';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
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
    <AuthContext.Provider value={{ signed: !!user, user, signInGoogle, logout, loadingAuth, isAdmin, hasAds }}>
      {children}
    </AuthContext.Provider>
  );
}