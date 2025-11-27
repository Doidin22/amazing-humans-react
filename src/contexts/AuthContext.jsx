import { createContext, useState, useEffect } from 'react';
import { auth, provider, db } from '../services/firebaseConnection';
import { signInWithPopup, signOut, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit'; // Sui Hooks

export const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Hooks da Sui
  const currentAccount = useCurrentAccount();
  const { mutate: disconnectWallet } = useDisconnectWallet();

  // 1. Monitor Geral de Auth (Firebase)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Se o usuário está logado no Firebase, montamos o objeto
        const uid = firebaseUser.uid;
        let dataUser = {
          uid: uid,
          name: firebaseUser.displayName || "Anon",
          avatar: firebaseUser.photoURL || "https://via.placeholder.com/150",
          email: firebaseUser.email,
          type: firebaseUser.isAnonymous ? 'crypto' : 'google'
        };

        // Se for login via Cripto, tentamos pegar dados reais do Firestore
        if (firebaseUser.isAnonymous) {
             try {
                const docRef = doc(db, "usuarios", uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const savedData = docSnap.data();
                    dataUser.name = savedData.nome || `User ${savedData.wallet?.slice(0,4)}...`;
                    dataUser.avatar = savedData.foto || "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Sui_Network_Logo.svg/1200px-Sui_Network_Logo.svg.png";
                    dataUser.wallet = savedData.wallet;
                }
             } catch(e) { console.log("Erro ao carregar perfil cripto", e); }
        }

        setUser(dataUser);
      } else {
        setUser(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Monitor de Carteira Sui (A Ponte)
  useEffect(() => {
    async function handleWalletBridge() {
        // Se conectou carteira MAS não está logado no Firebase
        if (currentAccount && !auth.currentUser) {
            try {
                // Faz login anônimo no Firebase para ganhar um UID válido
                const userCred = await signInAnonymously(auth);
                const uid = userCred.user.uid;
                const walletAddress = currentAccount.address;

                // Salva/Atualiza o perfil no Firestore com o endereço da carteira
                const userRef = doc(db, "usuarios", uid);
                // Usamos set com merge para não apagar dados se já existirem
                await setDoc(userRef, {
                    uid: uid,
                    wallet: walletAddress,
                    tipo: 'crypto',
                    // Só define nome/foto se ainda não tiver
                }, { merge: true });
                
            } catch (error) {
                console.error("Erro na ponte Wallet-Firebase:", error);
                disconnectWallet(); // Desconecta se der erro no Firebase
            }
        }
    }
    handleWalletBridge();
  }, [currentAccount]);

  // Login Google
  async function signInGoogle() {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Erro ao logar Google", error);
    }
  }

  // Logout Híbrido
  async function logout() {
    try {
        if (currentAccount) {
            disconnectWallet(); // Desconecta Sui
        }
        await signOut(auth); // Desconecta Firebase
        setUser(null);
    } catch(e) {
        console.error("Erro logout", e);
    }
  }

  return (
    <AuthContext.Provider value={{ signed: !!user, user, signInGoogle, logout, loadingAuth }}>
      {children}
    </AuthContext.Provider>
  );
}