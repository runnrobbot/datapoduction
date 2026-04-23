const express = require('express');
const router = express.Router();
const db = require('../database/db');

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ success: false, message: 'Belum login' });
  next();
}

// Get all barang masuk
router.get('/', requireAuth, (req, res) => {
  const { page = 1, limit = 100, barang_id } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT 
      bm.id, 
      bm.barang_id, 
      bm.qty, 
      bm.keterangan, 
      bm.created_at,
      b.nama as nama_barang, 
      b.kode as kode_barang, 
      b.satuan
    FROM barang_masuk bm
    LEFT JOIN barang b ON bm.barang_id = b.id
  `;
  let countQuery = `SELECT COUNT(*) as total FROM barang_masuk bm`;
  const params = [];

  if (barang_id) {
    query += ' WHERE bm.barang_id = ?';
    countQuery += ' WHERE bm.barang_id = ?';
    params.push(barang_id);
  }

  query += ` ORDER BY bm.created_at DESC LIMIT ? OFFSET ?`;
  const data = db.prepare(query).all(...params, parseInt(limit), parseInt(offset));
  const { total } = db.prepare(countQuery).get(...params);

  res.json({ success: true, data, total, page: parseInt(page), limit: parseInt(limit) });
});

// Get single entry
router.get('/:id', requireAuth, (req, res) => {
  const data = db.prepare(`
    SELECT bm.*, b.nama as nama_barang, b.kode as kode_barang
    FROM barang_masuk bm
    JOIN barang b ON bm.barang_id = b.id
    WHERE bm.id = ?
  `).get(req.params.id);
  if (!data) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
  res.json({ success: true, data });
});

// Add barang masuk
router.post('/', requireAuth, (req, res) => {
  const { barang_id, qty, keterangan } = req.body;
  if (!barang_id || !qty) {
    return res.status(400).json({ success: false, message: 'Barang dan qty wajib diisi' });
  }
  const barang = db.prepare('SELECT * FROM barang WHERE id = ?').get(barang_id);
  if (!barang) return res.status(404).json({ success: false, message: 'Barang tidak ditemukan' });

  const addMasuk = db.transaction(() => {
    db.prepare('INSERT INTO barang_masuk (barang_id, qty, keterangan) VALUES (?,?,?)').run(barang_id, qty, keterangan || '');
    db.prepare('UPDATE barang SET stok = stok + ? WHERE id = ?').run(qty, barang_id);
  });
  addMasuk();

  const updated = db.prepare('SELECT * FROM barang WHERE id = ?').get(barang_id);
  res.json({ success: true, message: `Stok ${barang.nama} berhasil ditambah ${qty} unit.`, data: updated });
});

// Update barang masuk (recalculate stok)
router.put('/:id', requireAuth, (req, res) => {
  const { barang_id, qty, keterangan } = req.body;
  const oldEntry = db.prepare('SELECT * FROM barang_masuk WHERE id = ?').get(req.params.id);
  if (!oldEntry) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });

  const updateMasuk = db.transaction(() => {
    // 1. Rollback old qty
    db.prepare('UPDATE barang SET stok = MAX(0, stok - ?) WHERE id = ?').run(oldEntry.qty, oldEntry.barang_id);
    // 2. Update entry
    db.prepare('UPDATE barang_masuk SET barang_id = ?, qty = ?, keterangan = ? WHERE id = ?')
      .run(barang_id, qty, keterangan, req.params.id);
    // 3. Apply new qty
    db.prepare('UPDATE barang SET stok = stok + ? WHERE id = ?').run(qty, barang_id);
  });
  updateMasuk();

  res.json({ success: true, message: 'Data barang masuk berhasil diperbarui' });
});

// Delete barang masuk (rollback stok)
router.delete('/:id', requireAuth, (req, res) => {
  const masuk = db.prepare('SELECT * FROM barang_masuk WHERE id = ?').get(req.params.id);
  if (!masuk) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });

  const deleteMasuk = db.transaction(() => {
    db.prepare('UPDATE barang SET stok = MAX(0, stok - ?) WHERE id = ?').run(masuk.qty, masuk.barang_id);
    db.prepare('DELETE FROM barang_masuk WHERE id = ?').run(req.params.id);
  });
  deleteMasuk();

  res.json({ success: true, message: 'Data barang masuk berhasil dihapus' });
});

module.exports = router;
