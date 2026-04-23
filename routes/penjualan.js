const express = require('express');
const router = express.Router();
const db = require('../database/db');

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ success: false, message: 'Belum login' });
  next();
}

// Get all penjualan with pagination
router.get('/', requireAuth, (req, res) => {
  const { page = 1, limit = 100, tipe, barang_id } = req.query;
  const offset = (page - 1) * limit;

  let where = [];
  const params = [];

  if (tipe) { where.push('p.tipe = ?'); params.push(tipe); }
  if (barang_id) { where.push('p.barang_id = ?'); params.push(barang_id); }

  const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const query = `
    SELECT p.*, b.nama as nama_barang, b.kode as kode_barang, b.satuan
    FROM penjualan p
    JOIN barang b ON p.barang_id = b.id
    ${whereStr}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const countQuery = `SELECT COUNT(*) as total FROM penjualan p ${whereStr}`;

  const data = db.prepare(query).all(...params, parseInt(limit), parseInt(offset));
  const { total } = db.prepare(countQuery).get(...params);

  res.json({ success: true, data, total, page: parseInt(page), limit: parseInt(limit) });
});

// Add penjualan
router.post('/', requireAuth, (req, res) => {
  const { barang_id, qty, tipe, harga, keterangan } = req.body;
  if (!barang_id || !qty || !tipe) {
    return res.status(400).json({ success: false, message: 'Barang, qty, dan tipe wajib diisi' });
  }
  if (!['offline', 'online'].includes(tipe)) {
    return res.status(400).json({ success: false, message: 'Tipe harus offline atau online' });
  }

  const barang = db.prepare('SELECT * FROM barang WHERE id = ?').get(barang_id);
  if (!barang) return res.status(404).json({ success: false, message: 'Barang tidak ditemukan' });
  if (barang.stok < qty) {
    return res.status(400).json({ success: false, message: `Stok tidak cukup. Stok saat ini: ${barang.stok} ${barang.satuan}` });
  }

  const addJual = db.transaction(() => {
    db.prepare('INSERT INTO penjualan (barang_id, qty, tipe, harga, keterangan) VALUES (?,?,?,?,?)').run(
      barang_id, qty, tipe, harga || barang.harga_jual, keterangan || ''
    );
    db.prepare('UPDATE barang SET stok = stok - ? WHERE id = ?').run(qty, barang_id);
  });
  addJual();

  const updated = db.prepare('SELECT * FROM barang WHERE id = ?').get(barang_id);
  res.json({
    success: true,
    message: `Penjualan ${tipe} ${barang.nama} berhasil dicatat.`,
    data: updated
  });
});

// Delete penjualan (rollback stok)
router.delete('/:id', requireAuth, (req, res) => {
  const jual = db.prepare('SELECT * FROM penjualan WHERE id = ?').get(req.params.id);
  if (!jual) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });

  const deleteJual = db.transaction(() => {
    db.prepare('UPDATE barang SET stok = stok + ? WHERE id = ?').run(jual.qty, jual.barang_id);
    db.prepare('DELETE FROM penjualan WHERE id = ?').run(req.params.id);
  });
  deleteJual();

  res.json({ success: true, message: 'Data penjualan berhasil dihapus' });
});

module.exports = router;
