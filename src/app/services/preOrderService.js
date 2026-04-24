import { USE_FIREBASE, apiFetch } from './db.js';
import { db } from './firebase.js';
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';

const COL = 'pre_order';

export async function getAllPreOrder() {
  if (!USE_FIREBASE) {
    return await apiFetch('/pre-order');
  }
  const q = query(collection(db, COL), orderBy('tanggal_po', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addPreOrder(data) {
  if (!USE_FIREBASE) {
    return await apiFetch('/pre-order', {
      method: 'POST',
      body: JSON.stringify({
        tanggal_po:         data.tanggal_po,
        items:              data.items || [],
        keterangan_status:  data.keterangan_status || '',
      }),
    });
  }
  return await addDoc(collection(db, COL), {
    tanggal_po:         data.tanggal_po,
    items:              data.items || [],
    keterangan_status:  data.keterangan_status || '',
    created_at:         serverTimestamp(),
  });
}

export async function updatePreOrder(id, data) {
  if (!USE_FIREBASE) {
    return await apiFetch(`/pre-order/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        tanggal_po:         data.tanggal_po,
        items:              data.items || [],
        keterangan_status:  data.keterangan_status || '',
      }),
    });
  }
  return await updateDoc(doc(db, COL, id), {
    tanggal_po:         data.tanggal_po,
    items:              data.items || [],
    keterangan_status:  data.keterangan_status || '',
    updated_at:         serverTimestamp(),
  });
}

export async function deletePreOrder(id) {
  if (!USE_FIREBASE) {
    return await apiFetch(`/pre-order/${id}`, { method: 'DELETE' });
  }
  return await deleteDoc(doc(db, COL, id));
}
