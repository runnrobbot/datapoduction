import { USE_FIREBASE, apiFetch } from './db.js';
import { db } from './firebase.js';
import {
  collection, doc, getDocs, runTransaction, writeBatch,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';

const JUAL_COL   = 'penjualan';
const BARANG_COL = 'barang';

export async function getAllPenjualan() {
  if (!USE_FIREBASE) {
    return await apiFetch('/penjualan');
  }
  const q = query(collection(db, JUAL_COL), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addPenjualan(data) {
  if (!USE_FIREBASE) {
    return await apiFetch('/penjualan', {
      method: 'POST',
      body: JSON.stringify({
        barang_id:   data.barang_id,
        kode_barang: data.kode_barang || '',
        nama_barang: data.nama_barang,
        satuan:      data.satuan || 'pcs',
        qty:         parseInt(data.qty),
        tipe:        data.tipe,
        harga:       parseFloat(data.harga),
        keterangan:  data.keterangan || '',
      }),
    });
  }
  await runTransaction(db, async (transaction) => {
    const barangRef  = doc(db, BARANG_COL, data.barang_id);
    const barangSnap = await transaction.get(barangRef);
    if (!barangSnap.exists()) throw new Error('Barang tidak ditemukan');

    const currentStok = barangSnap.data().stok || 0;
    const qty         = parseInt(data.qty);
    if (currentStok < qty) {
      throw new Error(`Stok tidak cukup. Stok saat ini: ${currentStok} ${barangSnap.data().satuan}`);
    }

    const jualRef = doc(collection(db, JUAL_COL));
    transaction.set(jualRef, {
      barang_id:   data.barang_id,
      kode_barang: data.kode_barang || '',
      nama_barang: data.nama_barang,
      satuan:      data.satuan || 'pcs',
      qty,
      tipe:        data.tipe,
      harga:       parseFloat(data.harga),
      keterangan:  data.keterangan || '',
      created_at:  serverTimestamp(),
    });
    transaction.update(barangRef, { stok: currentStok - qty });
  });
}

export async function deletePenjualan(id) {
  if (!USE_FIREBASE) {
    return await apiFetch(`/penjualan/${id}`, { method: 'DELETE' });
  }
  await runTransaction(db, async (transaction) => {
    const jualRef  = doc(db, JUAL_COL, id);
    const jualSnap = await transaction.get(jualRef);
    if (!jualSnap.exists()) throw new Error('Data tidak ditemukan');

    const { qty, barang_id } = jualSnap.data();
    const barangRef  = doc(db, BARANG_COL, barang_id);
    const barangSnap = await transaction.get(barangRef);

    if (barangSnap.exists()) {
      const currentStok = barangSnap.data().stok || 0;
      transaction.update(barangRef, { stok: currentStok + parseInt(qty) });
    }
    transaction.delete(jualRef);
  });
}

export async function batchImportPenjualan(items) {
  if (!USE_FIREBASE) {
    return await apiFetch('/penjualan/import', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }
  const CHUNK = 400;
  for (let i = 0; i < items.length; i += CHUNK) {
    const batch = writeBatch(db);
    items.slice(i, i + CHUNK).forEach(item => {
      const ref = doc(collection(db, JUAL_COL));
      batch.set(ref, {
        barang_id:   item.barang_id || '',
        kode_barang: item.kode_barang || '',
        nama_barang: item.nama_barang || '',
        satuan:      item.satuan || 'pcs',
        qty:         parseInt(item.qty) || 0,
        tipe:        item.tipe || 'offline',
        harga:       parseFloat(item.harga) || 0,
        keterangan:  item.keterangan || '',
        created_at:  serverTimestamp(),
      });
    });
    await batch.commit();
  }
}
