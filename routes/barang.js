const express = require('express');
const router = express.Router();
const db = require('../database/db');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ success: false, message: 'Belum login' });
  next();
}

// Get all barang
router.get('/', requireAuth, (req, res) => {
  const barang = db.prepare('SELECT * FROM barang ORDER BY nama ASC').all();
  res.json({ success: true, data: barang });
});

// Get single barang
router.get('/:id', requireAuth, (req, res) => {
  const barang = db.prepare('SELECT * FROM barang WHERE id = ?').get(req.params.id);
  if (!barang) return res.status(404).json({ success: false, message: 'Barang tidak ditemukan' });
  res.json({ success: true, data: barang });
});

// Add barang
router.post('/', requireAuth, (req, res) => {
  const { nama, kode, satuan, harga_jual } = req.body;
  if (!nama) return res.status(400).json({ success: false, message: 'Nama barang wajib diisi' });
  try {
    const result = db.prepare(
      'INSERT INTO barang (nama, kode, satuan, harga_jual) VALUES (?,?,?,?)'
    ).run(nama, kode || null, satuan || 'pcs', harga_jual || 0);
    const newBarang = db.prepare('SELECT * FROM barang WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, message: 'Barang berhasil ditambahkan', data: newBarang });
  } catch (e) {
    res.status(400).json({ success: false, message: 'Kode barang sudah digunakan' });
  }
});

// Update barang
router.put('/:id', requireAuth, (req, res) => {
  const { nama, kode, satuan, harga_jual } = req.body;
  const barang = db.prepare('SELECT id FROM barang WHERE id = ?').get(req.params.id);
  if (!barang) return res.status(404).json({ success: false, message: 'Barang tidak ditemukan' });
  try {
    db.prepare(
      'UPDATE barang SET nama=?, kode=?, satuan=?, harga_jual=? WHERE id=?'
    ).run(nama, kode || null, satuan || 'pcs', harga_jual || 0, req.params.id);
    const updated = db.prepare('SELECT * FROM barang WHERE id = ?').get(req.params.id);
    res.json({ success: true, message: 'Barang berhasil diupdate', data: updated });
  } catch (e) {
    res.status(400).json({ success: false, message: 'Kode barang sudah digunakan' });
  }
});

// Delete barang
router.delete('/:id', requireAuth, (req, res) => {
  const barang = db.prepare('SELECT id FROM barang WHERE id = ?').get(req.params.id);
  if (!barang) return res.status(404).json({ success: false, message: 'Barang tidak ditemukan' });
  db.prepare('DELETE FROM barang WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Barang berhasil dihapus' });
});

// STEP 1: Upload & Get Preview (Columns)
router.post('/import-preview', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'File tidak ditemukan' });

  const filePath = req.file.path;
  const scriptPath = path.join(__dirname, '../import_barang.py');

  const runPreview = (cmd) => {
    exec(`${cmd} "${scriptPath}" preview "${filePath}"`, (error, stdout, stderr) => {
      if (error) {
        if (cmd === 'python') return runPreview('python3');
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return res.status(500).json({ success: false, message: 'Gagal membaca file.', debug: stderr });
      }

      try {
          const result = JSON.parse(stdout);
          if (result.error) {
              if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
              return res.status(400).json({ success: false, message: result.error });
          }
          res.json({ success: true, columns: result.columns, tempFile: req.file.filename });
      } catch (e) {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          res.status(500).json({ success: false, message: 'Gagal parse output Python.' });
      }
    });
  };

  runPreview('python');
});

// STEP 2: Execute Import with Mapping
router.post('/import-execute', requireAuth, (req, res) => {
  const { tempFile, mapping } = req.body;
  if (!tempFile || !mapping) return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });

  const filePath = path.join(uploadDir, tempFile);
  const dbPath = path.join(__dirname, '../database/dashboard.db');
  const scriptPath = path.join(__dirname, '../import_barang.py');
  const mappingJson = JSON.stringify(mapping).replace(/"/g, '\\"');

  if (!fs.existsSync(filePath)) return res.status(400).json({ success: false, message: 'File temp sudah tidak ada.' });

  const runImport = (cmd) => {
    exec(`${cmd} "${scriptPath}" import "${filePath}" "${dbPath}" "${mappingJson}"`, (error, stdout, stderr) => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      if (error) {
        if (cmd === 'python') return runImport('python3');
        return res.status(500).json({ success: false, message: 'Gagal import.', debug: stderr });
      }

      if (stdout.includes('Error:')) {
          return res.status(400).json({ success: false, message: stdout.trim() });
      }

      res.json({ success: true, message: stdout.trim() });
    });
  };

  runImport('python');
});

module.exports = router;
