import { db } from './firebase.js';
import {
  collection, doc, getDocs, runTransaction,
  query, orderBy, serverTimestamp, onSnapshot
} from 'firebase/firestore';

const MASUK_COL  = 'barang_masuk';
const BARANG_COL = 'barang';

export async function getAllMasuk() {
  const q = query(collection(db, MASUK_COL), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addMasuk(data) {
  await runTransaction(db, async (transaction) => {
    const barangRef  = doc(db, BARANG_COL, data.barang_id);
    const barangSnap = await transaction.get(barangRef);
    if (!barangSnap.exists()) throw new Error('Barang tidak ditemukan');

    const currentStok = barangSnap.data().stok || 0;
    const addedQty    = parseInt(data.qty);
    const masukRef    = doc(collection(db, MASUK_COL));

    transaction.set(masukRef, {
      barang_id:   data.barang_id,
      kode_barang: data.kode_barang || '',
      nama_barang: data.nama_barang,
      satuan:      data.satuan || 'pcs',
      qty:         addedQty,
      keterangan:  data.keterangan || '',
      created_at:  serverTimestamp(),
    });
    transaction.update(barangRef, { stok: currentStok + addedQty });
  });
}

export async function updateMasuk(id, oldQty, newQty, barang_id, keterangan) {
  await runTransaction(db, async (transaction) => {
    const masukRef  = doc(db, MASUK_COL, id);
    const masukSnap = await transaction.get(masukRef);
    if (!masukSnap.exists()) throw new Error('Data tidak ditemukan');

    const barangRef  = doc(db, BARANG_COL, barang_id);
    const barangSnap = await transaction.get(barangRef);
    if (!barangSnap.exists()) throw new Error('Barang tidak ditemukan');

    const currentStok  = barangSnap.data().stok || 0;
    const parsedOldQty = parseInt(oldQty);
    const parsedNewQty = parseInt(newQty);
    const newStok      = Math.max(0, currentStok - parsedOldQty + parsedNewQty);

    transaction.update(masukRef, {
      qty:        parsedNewQty,
      keterangan: keterangan || '',
      updated_at: serverTimestamp(),
    });
    transaction.update(barangRef, { stok: newStok });
  });
}

export async function deleteMasuk(id) {
  await runTransaction(db, async (transaction) => {
    const masukRef  = doc(db, MASUK_COL, id);
    const masukSnap = await transaction.get(masukRef);
    if (!masukSnap.exists()) throw new Error('Data tidak ditemukan');

    const { qty, barang_id } = masukSnap.data();
    const barangRef  = doc(db, BARANG_COL, barang_id);
    const barangSnap = await transaction.get(barangRef);

    if (barangSnap.exists()) {
      const currentStok = barangSnap.data().stok || 0;
      transaction.update(barangRef, { stok: Math.max(0, currentStok - parseInt(qty)) });
    }
    transaction.delete(masukRef);
  });
}

export function subscribeMasuk(onData, onError) {
  const q = query(collection(db, MASUK_COL), orderBy('created_at', 'desc'));
  return onSnapshot(q, snap => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))), onError);
}
