import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Configuração do Firebase Web App fornecida pelo usuário
const firebaseConfig = {
  apiKey: "AIzaSyDyHaeThuIImtuzV44RRw9F1PxxOYRvZLI",
  authDomain: "karaoke-pwa-d7b4c.firebaseapp.com",
  projectId: "karaoke-pwa-d7b4c",
  storageBucket: "karaoke-pwa-d7b4c.firebasestorage.app",
  messagingSenderId: "482187604515",
  appId: "1:482187604515:web:2f0edbce7e3a11286fb796"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Cloud Firestore e exporta para o projeto
export const db = getFirestore(app);
export default app;
