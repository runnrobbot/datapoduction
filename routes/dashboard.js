const express = require('express');
const router = express.Router();
const db = require('../database/db');

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ success: false, message: 'Belum login' });
  next();
}

// Main dashboard summary
router.get('/summary', requireAuth, (req, res) => {
  const { from, to } = req.query;
  let dateFilter = '';
  const params = [];

  if (from && to) {
    dateFilter = 'WHERE DATE(p.created_at) BETWEEN ? AND ?';
    params.push(from, to);
  } else if (from) {
    dateFilter = 'WHERE DATE(p.created_at) >= ?';
    params.push(from);
  } else if (to) {
    dateFilter = 'WHERE DATE(p.created_at) <= ?';
    params.push(to);
  }

  // Total penjualan keseluruhan
  const totalJual = db.prepare(`SELECT COALESCE(SUM(qty),0) as total FROM penjualan p ${dateFilter}`).get(...params);

  // Total offline vs online
  const byTipe = db.prepare(`
    SELECT tipe, COALESCE(SUM(qty),0) as total, COALESCE(SUM(qty * harga),0) as revenue
    FROM penjualan p
    ${dateFilter}
    GROUP BY tipe
  `).all(...params);

  const offlineData = byTipe.find(r => r.tipe === 'offline') || { total: 0, revenue: 0 };
  const onlineData = byTipe.find(r => r.tipe === 'online') || { total: 0, revenue: 0 };

  // Total barang & stok
  const totalBarang = db.prepare('SELECT COUNT(*) as total FROM barang').get();
  const totalStok = db.prepare('SELECT COALESCE(SUM(stok),0) as total FROM barang').get();

  // Total barang masuk
  const totalMasuk = db.prepare(`SELECT COALESCE(SUM(qty),0) as total FROM barang_masuk`).get();

  // Total revenue
  const totalRevenue = db.prepare(`SELECT COALESCE(SUM(qty * harga),0) as total FROM penjualan p ${dateFilter}`).get(...params);

  res.json({
    success: true,
    data: {
      totalTerjual: totalJual.total,
      totalOffline: offlineData.total,
      totalOnline: onlineData.total,
      revenueOffline: offlineData.revenue,
      revenueOnline: onlineData.revenue,
      totalRevenue: totalRevenue.total,
      totalBarang: totalBarang.total,
      totalStok: totalStok.total,
      totalMasuk: totalMasuk.total,
    }
  });
});

// Top selling products (bar chart data)
router.get('/terlaris', requireAuth, (req, res) => {
  const { from, to, limit = 10 } = req.query;
  let dateFilter = '';
  const params = [];

  if (from && to) {
    dateFilter = 'WHERE DATE(p.created_at) BETWEEN ? AND ?';
    params.push(from, to);
  } else if (from) {
    dateFilter = 'WHERE DATE(p.created_at) >= ?';
    params.push(from);
  } else if (to) {
    dateFilter = 'WHERE DATE(p.created_at) <= ?';
    params.push(to);
  }

  const terlaris = db.prepare(`
    SELECT
      b.id, b.nama, b.kode, b.satuan, b.stok,
      COALESCE(SUM(p.qty), 0) as total_terjual,
      COALESCE(SUM(CASE WHEN p.tipe='offline' THEN p.qty ELSE 0 END), 0) as total_offline,
      COALESCE(SUM(CASE WHEN p.tipe='online' THEN p.qty ELSE 0 END), 0) as total_online,
      COALESCE(SUM(p.qty * p.harga), 0) as total_revenue
    FROM barang b
    LEFT JOIN penjualan p ON b.id = p.barang_id ${dateFilter ? 'AND ' + dateFilter.replace('WHERE ','') : ''}
    GROUP BY b.id, b.nama, b.kode, b.satuan, b.stok
    ORDER BY total_terjual DESC
    LIMIT ?
  `).all(...params, parseInt(limit));

  res.json({ success: true, data: terlaris });
});

// Recent transactions
router.get('/recent', requireAuth, (req, res) => {
  const recent = db.prepare(`
    SELECT * FROM (
      SELECT 'masuk' as jenis, bm.id, b.nama as nama_barang, b.kode as kode_barang, bm.qty, b.satuan, null as tipe, bm.keterangan, bm.created_at
      FROM barang_masuk bm JOIN barang b ON bm.barang_id = b.id
      UNION ALL
      SELECT 'jual' as jenis, p.id, b.nama as nama_barang, b.kode as kode_barang, p.qty, b.satuan, p.tipe, p.keterangan, p.created_at
      FROM penjualan p JOIN barang b ON p.barang_id = b.id
    )
    ORDER BY created_at DESC
    LIMIT 15
  `).all();

  res.json({ success: true, data: recent });
});

// Specific Product Analytics
router.get('/analytics/:barangId', requireAuth, (req, res) => {
    const { barangId } = req.params;
    
    // Product details & stats
    const info = db.prepare(`
        SELECT 
            b.*,
            (SELECT COALESCE(SUM(qty), 0) FROM barang_masuk WHERE barang_id = b.id) as total_masuk,
            (SELECT COALESCE(SUM(qty), 0) FROM penjualan WHERE barang_id = b.id) as total_terjual,
            (SELECT COALESCE(SUM(qty * harga), 0) FROM penjualan WHERE barang_id = b.id) as total_revenue
        FROM barang b
        WHERE b.id = ?
    `).get(barangId);

    if (!info) return res.status(404).json({ success: false, message: 'Barang tidak ditemukan' });

    // Daily trend (Sales & Inbound) for last 30 days
    const trend = db.prepare(`
        SELECT tanggal, COALESCE(SUM(jual_qty), 0) as sold, COALESCE(SUM(masuk_qty), 0) as inbound
        FROM (
            SELECT DATE(created_at) as tanggal, qty as jual_qty, 0 as masuk_qty FROM penjualan WHERE barang_id = ?
            UNION ALL
            SELECT DATE(created_at) as tanggal, 0 as jual_qty, qty as masuk_qty FROM barang_masuk WHERE barang_id = ?
        )
        WHERE tanggal >= DATE('now', '-30 days')
        GROUP BY tanggal
        ORDER BY tanggal ASC
    `).all(barangId, barangId);

    res.json({ success: true, data: { info, trend } });
});

module.exports = router;
