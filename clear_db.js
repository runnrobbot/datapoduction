const db = require('./database/db');

try {
    db.prepare('DELETE FROM penjualan').run();
    db.prepare('DELETE FROM barang_masuk').run();
    db.prepare('DELETE FROM barang').run();
    // Reset autoincrement
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('penjualan', 'barang_masuk', 'barang')").run();
    console.log('Database cleared successfully.');
} catch (e) {
    console.error('Error clearing database:', e);
} finally {
    process.exit();
}
