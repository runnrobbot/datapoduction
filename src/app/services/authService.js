import { USE_FIREBASE, apiFetch } from './db.js';
import { db } from './firebase.js';
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, getDoc, where
} from 'firebase/firestore';

const SESSION_KEY = 'dp_session';
const COL = 'users';

export async function login(username, password) {
  if (!USE_FIREBASE) {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    localStorage.setItem(SESSION_KEY, JSON.stringify(res));
    return res;
  }
  
  const q = query(collection(db, COL), where("username", "==", username), where("password", "==", password));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('Username atau password salah');
  
  const userDoc = snap.docs[0];
  const session = { id: userDoc.id, ...userDoc.data() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser() {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function isSuperAdmin() {
  const u = getCurrentUser();
  return u?.role === 'super_admin';
}

export async function getAllUsers() {
  if (!USE_FIREBASE) {
    return await apiFetch('/users');
  }
  const q = query(collection(db, COL), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addUser(data) {
  if (!USE_FIREBASE) {
    return await apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  const checkQ = query(collection(db, COL), where("username", "==", data.username));
  const checkSnap = await getDocs(checkQ);
  if (!checkSnap.empty) throw new Error('Username sudah dipakai');
  
  return await addDoc(collection(db, COL), {
    username: data.username.trim(),
    password: data.password,
    nama: data.nama.trim(),
    role: data.role || 'admin',
    created_at: serverTimestamp(),
  });
}

export async function updateUser(id, data) {
  const session = getCurrentUser();
  if (session?.id === id && data.role && data.role !== session.role) {
    throw new Error('Tidak bisa mengubah role sendiri');
  }

  let updatedUser = null;

  if (!USE_FIREBASE) {
    updatedUser = await apiFetch(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  } else {
    if (data.username) {
      const checkQ = query(collection(db, COL), where("username", "==", data.username));
      const checkSnap = await getDocs(checkQ);
      if (!checkSnap.empty && checkSnap.docs[0].id !== id) throw new Error('Username sudah dipakai');
    }

    const updateData = { ...data, updated_at: serverTimestamp() };
    await updateDoc(doc(db, COL, id), updateData);
    
    const userDoc = await getDoc(doc(db, COL, id));
    updatedUser = { id: userDoc.id, ...userDoc.data() };
  }

  if (session?.id === id) {
    const { password, ...safe } = updatedUser;
    localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
  }
  
  return updatedUser;
}

export async function deleteUser(id) {
  const session = getCurrentUser();
  if (session?.id === id) throw new Error('Tidak bisa menghapus akun sendiri');
  
  if (!USE_FIREBASE) {
    return await apiFetch(`/users/${id}`, { method: 'DELETE' });
  }
  
  return await deleteDoc(doc(db, COL, id));
}
