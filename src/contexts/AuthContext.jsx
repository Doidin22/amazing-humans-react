import { createContext, useState, useEffect } from 'react';
import { auth, provider } from '../services/firebaseConnection';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

// Cria o contexto
export const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true); // Para não mostrar tela vazia enquanto carrega

  useEffect(() => {
    // Monitora se o usuário conectou ou desconectou
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser({
          uid: user.uid,
          name: user.displayName,
          avatar: user.photoURL,
          email: user.email
        });
      } else {
        setUser(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe(); // Limpeza ao desmontar
  }, []);

  // Função de Login
  async function signInGoogle() {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Erro ao logar", error);
    }
  }

  // Função de Logout
  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ signed: !!user, user, signInGoogle, logout, loadingAuth }}>
      {children}
    </AuthContext.Provider>
  );
}