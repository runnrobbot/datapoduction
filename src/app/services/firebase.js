import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Nilai diambil dari .env (lokal) atau Environment Variables di Vercel
const env = import.meta.env;

const firebaseConfig = {
  apiKey:            env.VITE_FIREBASE_API_KEY,
  authDomain:        env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             env.VITE_FIREBASE_APP_ID,
  measurementId:     env.VITE_FIREBASE_MEASUREMENT_ID,
};

const missing = ['apiKey', 'authDomain', 'projectId', 'appId'].filter(k => !firebaseConfig[k]);
if (missing.length) {
  throw new Error(
    `Konfigurasi Firebase belum lengkap (${missing.join(', ')}). ` +
    'Isi file .env, atau Environment Variables di Vercel, lalu build ulang.'
  );
}

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
export default app;
