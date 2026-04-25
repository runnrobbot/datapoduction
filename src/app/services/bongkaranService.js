import { USE_FIREBASE, apiFetch } from './db.js';
import { db } from './firebase.js';
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, runTransaction
} from 'firebase/firestore';

const BONGKAR_COL = 'bongkaran';
const MASUK_COL   = 'barang_masuk';
const BARANG_COL  = 'barang';

// GET ALL
export async function getAllBongkaran() {
  if (!USE_FIREBASE) {
    return await apiFetch('/bongkaran');
  }
  const q = query(collection(db, BONGKAR_COL), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ADD
export async function addBongkaran(data) {
  if (!USE_FIREBASE) {
    return await apiFetch('/bongkaran', {
      method: 'POST',
      body: JSON.stringify({
        po_id:      data.po_id      ?? '',
        tanggal_po: data.tanggal_po,
        items:      data.items      ?? [],
      }),
    });
  }
  return await addDoc(collection(db, BONGKAR_COL), {
    po_id:      data.po_id      ?? '',
    tanggal_po: data.tanggal_po,
    items:      data.items      ?? [],
    status:     'Menunggu Revisi',
    created_at: serverTimestamp(),
  });
}

// UPDATE (revisi items)
export async function updateBongkaran(id, data) {
  if (!USE_FIREBASE) {
    return await apiFetch('/bongkaran/' + id, {
      method: 'PUT',
      body: JSON.stringify({ items: data.items ?? [] }),
    });
  }
  return await updateDoc(doc(db, BONGKAR_COL, id), {
    items:      data.items ?? [],
    updated_at: serverTimestamp(),
  });
}

export async function selesaikanBongkaran(bongkaranId, bongkaranData) {
  if (!USE_FIREBASE) {
    return await apiFetch('/bongkaran/' + bongkaranId + '/selesai', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }
  await runTransaction(db, async (transaction) => {
    const bongkaranRef = doc(db, BONGKAR_COL, bongkaranId);
    for (const item of (bongkaranData.items ?? [])) {
      // Gunakan qty_datang (hasil revisi) sebagai qty yang masuk ke stok
      // Fallback ke qty jika qty_datang belum diisi
      const qtyMasuk = parseInt(item.qty_datang ?? item.qty ?? 0);
      if (!item.barang_id || qtyMasuk <= 0) continue;

      const barangRef  = doc(db, BARANG_COL, item.barang_id);
      const barangSnap = await transaction.get(barangRef);
      const currentStok = barangSnap.exists() ? (barangSnap.data().stok || 0) : 0;

      const masukRef = doc(collection(db, MASUK_COL));
      transaction.set(masukRef, {
        barang_id:   item.barang_id,
        kode_barang: item.kode_barang || '',
        nama_barang: item.deskripsi   || '',
        satuan:      item.satuan      || 'pcs',
        qty:         qtyMasuk,
        keterangan:  item.catatan     || ('Dari Bongkaran PO ' + bongkaranData.tanggal_po),
        created_at:  serverTimestamp(),
      });
      if (barangSnap.exists()) {
        transaction.update(barangRef, { stok: currentStok + qtyMasuk });
      }
    }
    transaction.update(bongkaranRef, {
      status:     'Sudah Dibongkar',
      updated_at: serverTimestamp(),
    });
  });
}

// DELETE
export async function deleteBongkaran(id) {
  if (!USE_FIREBASE) {
    return await apiFetch('/bongkaran/' + id, { method: 'DELETE' });
  }
  return await deleteDoc(doc(db, BONGKAR_COL, id));
}

import { onSnapshot } from 'firebase/firestore';
export function subscribeBongkaran(onData, onError) {
  const q = query(collection(db, 'bongkaran'), orderBy('created_at', 'desc'));
  return onSnapshot(q, snap => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))), onError);
}
