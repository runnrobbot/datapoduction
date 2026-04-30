/**
 * realtimeService.js
 * Firebase onSnapshot subscribers untuk tiap koleksi.
 */

import { db } from './firebase.js';
import {
  collection, query, orderBy, onSnapshot
} from 'firebase/firestore';

function makeSubscriber(col, order, dir = 'asc') {
  return function subscribe(callback, onError) {
    if (!db) return () => {};
    const q = query(collection(db, col), orderBy(order, dir));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, onError);
  };
}

export const subscribeBarang      = makeSubscriber('barang',       'nama',       'asc');
export const subscribeBarangMasuk = makeSubscriber('barang_masuk', 'created_at', 'desc');
export const subscribePenjualan   = makeSubscriber('penjualan',    'created_at', 'desc');
export const subscribePreOrder    = makeSubscriber('pre_order',    'tanggal_po', 'asc');
export const subscribeBongkaran   = makeSubscriber('bongkaran',    'created_at', 'desc');
