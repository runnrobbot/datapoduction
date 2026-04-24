import { USE_FIREBASE, apiFetch } from './db.js';
import { db } from './firebase.js';
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';

const COL = 'barang';

export async function getAllBarang() {
  if (!USE_FIREBASE) {
    return await apiFetch('/barang');
  }
  const q = query(collection(db, COL), orderBy('nama', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getBarangById(id) {
  if (!USE_FIREBASE) {
    return await apiFetch(`/barang/${id}`);
  }
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) throw new Error('Barang tidak ditemukan');
  return { id: snap.id, ...snap.data() };
}

export async function addBarang(data) {
  if (!USE_FIREBASE) {
    return await apiFetch('/barang', {
      method: 'POST',
      body: JSON.stringify({
        kode: data.kode || '',
        nama: data.nama,
        satuan: data.satuan || 'pcs',
        harga_jual: parseFloat(data.harga_jual) || 0,
        stok: 0,
      }),
    });
  }
  return await addDoc(collection(db, COL), {
    kode: data.kode || '',
    nama: data.nama,
    satuan: data.satuan || 'pcs',
    harga_jual: parseFloat(data.harga_jual) || 0,
    stok: 0,
    created_at: serverTimestamp(),
  });
}

export async function updateBarang(id, data) {
  if (!USE_FIREBASE) {
    return await apiFetch(`/barang/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        kode: data.kode || '',
        nama: data.nama,
        satuan: data.satuan || 'pcs',
        harga_jual: parseFloat(data.harga_jual) || 0,
      }),
    });
  }
  return await updateDoc(doc(db, COL, id), {
    kode: data.kode || '',
    nama: data.nama,
    satuan: data.satuan || 'pcs',
    harga_jual: parseFloat(data.harga_jual) || 0,
    updated_at: serverTimestamp(),
  });
}

export async function deleteBarang(id) {
  if (!USE_FIREBASE) {
    return await apiFetch(`/barang/${id}`, { method: 'DELETE' });
  }
  return await deleteDoc(doc(db, COL, id));
}

import { onSnapshot } from 'firebase/firestore';
export function subscribeBarang(onData, onError) {
  const q = query(collection(db, 'barang'), orderBy('nama', 'asc'));
  return onSnapshot(q, snap => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))), onError);
}
