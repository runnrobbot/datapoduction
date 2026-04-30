import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            "AIzaSyCZ_4ZZVzCirQr5Xyo7-aTkXxwNjQi_QSk",
  authDomain:        "dataproduction-79fe2.firebaseapp.com",
  projectId:         "dataproduction-79fe2",
  storageBucket:     "dataproduction-79fe2.firebasestorage.app",
  messagingSenderId: "69432332571",
  appId:             "1:69432332571:web:a1c5c6d1b17b1dd07783be",
  measurementId:     "G-N5MJ4J2T9F",
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
export default app;
