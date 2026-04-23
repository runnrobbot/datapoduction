import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase hanya diinisialisasi jika:
 * - VITE_USE_FIREBASE=true (production), DAN
 * - Semua kredensial sudah diisi di .env.production
 *
 * Saat dev (XAMPP), firebase.js diimport tapi tidak aktif —
 * semua service akan masuk ke branch USE_FIREBASE=false.
 */

const USE_FIREBASE = import.meta.env.VITE_USE_FIREBASE === 'true';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasCredentials = USE_FIREBASE && firebaseConfig.apiKey && firebaseConfig.projectId;

let app = null;
let db  = null;

if (hasCredentials) {
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  db  = getFirestore(app);
} else if (USE_FIREBASE) {
  console.warn(
    '[Firebase] VITE_USE_FIREBASE=true tapi kredensial belum diisi di .env.production.\n' +
    'Buka Firebase Console → Project Settings → Your apps → Web app → salin config ke .env.production'
  );
}

export { db };
export default app;
