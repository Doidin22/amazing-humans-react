import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

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
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// --- ATIVA O CACHE LOCAL (ECONOMIA DE LEITURAS) ---
enableIndexedDbPersistence(db)
  .catch((err) => {
      if (err.code == 'failed-precondition') {
          console.log("Persistência falhou: Múltiplas abas abertas.");
      } else if (err.code == 'unimplemented') {
          console.log("Navegador não suporta persistência.");
      }
  });

export { auth, db, provider };