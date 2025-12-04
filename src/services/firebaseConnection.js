import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCExW9WyhaKidmp3SM2jzt68UFyFQYspv8",
  authDomain: "amazinghumans-ae0f3.firebaseapp.com",
  projectId: "amazinghumans-ae0f3",
  storageBucket: "amazinghumans-ae0f3.firebasestorage.app",
  messagingSenderId: "3669410166",
  appId: "1:3669410166:web:a108dab140fc69aa05ba57"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- ATUALIZAÇÃO: Nova forma de ativar persistência (remove o aviso amarelo) ---
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const functions = getFunctions(app);
const provider = new GoogleAuthProvider();

export { auth, db, provider, functions };