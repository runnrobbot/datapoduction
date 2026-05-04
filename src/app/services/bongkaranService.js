import { db } from './firebase.js';
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, where, serverTimestamp, runTransaction, onSnapshot
} from 'firebase/firestore';

const BONGKAR_COL = 'bongkaran';
const MASUK_COL   = 'barang_masuk';
const BARANG_COL  = 'barang';

export async function getAllBongkaran() {
  const q = query(collection(db, BONGKAR_COL), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addBongkaran(data) {
  return await addDoc(collection(db, BONGKAR_COL), {
    po_id:      data.po_id      ?? '',
    tanggal_po: data.tanggal_po,
    items:      data.items      ?? [],
    status:     'Menunggu Revisi',
    created_at: serverTimestamp(),
  });
}

export async function updateBongkaran(id, data) {
  return await updateDoc(doc(db, BONGKAR_COL, id), {
    items:      data.items ?? [],
    updated_at: serverTimestamp(),
  });
}

/**
 * Selesaikan bongkaran:
 * 1. Untuk tiap item, cari barang_id dari master barang via kode_barang
 * 2. Tulis ke barang_masuk
 * 3. Kalau barang_id ditemukan → update stok master barang
 * 4. Update status bongkaran → 'Sudah Dibongkar'
 */
export async function selesaikanBongkaran(bongkaranId, bongkaranData) {
  const items = bongkaranData.items ?? [];

  // Kumpulkan semua kode_barang yang unik untuk di-lookup sekaligus
  const kodeSet = [...new Set(
    items.map(i => (i.kode_barang || '').trim()).filter(Boolean)
  )];

  // Fetch master barang berdasarkan kode — bisa lebih dari 1 kode
  // Firestore 'in' max 30 items; kalau lebih dari itu loop chunk
  const kodeToId = {}; // kode_barang → { id, stok, satuan }
  const CHUNK = 30;
  for (let i = 0; i < kodeSet.length; i += CHUNK) {
    const chunk = kodeSet.slice(i, i + CHUNK);
    const snap = await getDocs(
      query(collection(db, BARANG_COL), where('kode', 'in', chunk))
    );
    snap.docs.forEach(d => {
      kodeToId[d.data().kode] = { id: d.id, ...d.data() };
    });
  }

  await runTransaction(db, async (transaction) => {
    const bongkaranRef = doc(db, BONGKAR_COL, bongkaranId);

    // Pre-fetch semua barang yang ditemukan agar bisa di-update dalam transaction
    const barangRefs = {};
    const barangSnaps = {};
    for (const kode of Object.keys(kodeToId)) {
      const ref = doc(db, BARANG_COL, kodeToId[kode].id);
      barangRefs[kode] = ref;
      barangSnaps[kode] = await transaction.get(ref);
    }

    for (const item of items) {
      const qtyMasuk = parseInt(item.qty_datang ?? item.qty ?? 0);
      if (qtyMasuk <= 0) continue;

      const kode     = (item.kode_barang || '').trim();
      const master   = kodeToId[kode];
      const barang_id = master?.id || '';
      const satuan    = master?.satuan || item.satuan || 'pcs';

      // Tulis ke barang_masuk
      const masukRef = doc(collection(db, MASUK_COL));
      transaction.set(masukRef, {
        barang_id,
        kode_barang: item.kode_barang || '',
        nama_barang: item.deskripsi   || '',
        satuan,
        qty:         qtyMasuk,
        keterangan:  item.catatan || ('Dari Bongkaran PO ' + bongkaranData.tanggal_po),
        created_at:  serverTimestamp(),
      });

      // Update stok master kalau barang ditemukan
      if (master && barangSnaps[kode]?.exists()) {
        const currentStok = barangSnaps[kode].data().stok || 0;
        transaction.update(barangRefs[kode], { stok: currentStok + qtyMasuk });
      }
    }

    transaction.update(bongkaranRef, {
      status:     'Sudah Dibongkar',
      updated_at: serverTimestamp(),
    });
  });
}

export async function deleteBongkaran(id) {
  return await deleteDoc(doc(db, BONGKAR_COL, id));
}

export function subscribeBongkaran(onData, onError) {
  const q = query(collection(db, BONGKAR_COL), orderBy('created_at', 'desc'));
  return onSnapshot(q, snap => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))), onError);
}
