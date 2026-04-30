import { db } from './firebase.js';
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, onSnapshot
} from 'firebase/firestore';

const COL = 'pre_order';

export async function getAllPreOrder() {
  const q = query(collection(db, COL), orderBy('tanggal_po', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function subscribePreOrder(onData, onError) {
  const q = query(collection(db, COL), orderBy('tanggal_po', 'asc'));
  return onSnapshot(q,
    snap => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export async function addPreOrder(data) {
  return await addDoc(collection(db, COL), {
    tanggal_po:        data.tanggal_po,
    items:             data.items || [],
    keterangan_status: data.keterangan_status || '',
    created_at:        serverTimestamp(),
  });
}

export async function updatePreOrder(id, data) {
  return await updateDoc(doc(db, COL, id), {
    tanggal_po:        data.tanggal_po,
    items:             data.items || [],
    keterangan_status: data.keterangan_status || '',
    updated_at:        serverTimestamp(),
  });
}

export async function deletePreOrder(id) {
  return await deleteDoc(doc(db, COL, id));
}
