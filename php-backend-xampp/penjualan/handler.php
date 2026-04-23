<?php
/**
 * Handler: /penjualan
 * 
 * GET    /penjualan         → getAllPenjualan
 * POST   /penjualan         → addPenjualan  (cek stok + kurangi, atomic)
 * DELETE /penjualan/:id     → deletePenjualan (kembalikan stok)
 * POST   /penjualan/import  → batchImportPenjualan (historis, tanpa update stok)
 */

$db = getDB();

try {
    switch ($method) {

        // ── GET ALL ───────────────────────────────────────────────────────
        case 'GET':
            $stmt = $db->query(
                'SELECT * FROM penjualan ORDER BY created_at DESC'
            );
            json_response($stmt->fetchAll());
            break;

        // ── ADD atau IMPORT ───────────────────────────────────────────────
        case 'POST':
            // Route: POST /penjualan/import
            if (!empty($import)) {
                $body  = get_body();
                $items = $body['items'] ?? [];
                if (empty($items)) error_response('Items kosong');

                $db->beginTransaction();
                $ins = $db->prepare(
                    'INSERT INTO penjualan
                       (barang_id, kode_barang, nama_barang, satuan, qty, tipe, harga, keterangan)
                     VALUES
                       (:barang_id, :kode_barang, :nama_barang, :satuan, :qty, :tipe, :harga, :keterangan)'
                );
                foreach ($items as $item) {
                    $ins->execute([
                        ':barang_id'   => $item['barang_id']   ?? 0,
                        ':kode_barang' => $item['kode_barang'] ?? '',
                        ':nama_barang' => $item['nama_barang'] ?? '',
                        ':satuan'      => $item['satuan']      ?? 'pcs',
                        ':qty'         => (int)($item['qty']   ?? 0),
                        ':tipe'        => in_array($item['tipe'] ?? '', ['online','offline'])
                                            ? $item['tipe'] : 'offline',
                        ':harga'       => (float)($item['harga'] ?? 0),
                        ':keterangan'  => $item['keterangan']  ?? '',
                    ]);
                }
                $db->commit();
                json_response(['success' => true, 'imported' => count($items)], 201);
                break;
            }

            // Route: POST /penjualan (tambah penjualan baru + update stok)
            $body = get_body();
            if (empty($body['barang_id'])) error_response('Field barang_id wajib diisi');
            if (empty($body['nama_barang'])) error_response('Field nama_barang wajib diisi');
            if (!isset($body['qty']) || (int)$body['qty'] <= 0) error_response('Qty harus lebih dari 0');
            if (!isset($body['harga'])) error_response('Field harga wajib diisi');

            $db->beginTransaction();

            // Cek & lock stok barang
            $chk = $db->prepare('SELECT id, stok, satuan FROM barang WHERE id = ? FOR UPDATE');
            $chk->execute([$body['barang_id']]);
            $barang = $chk->fetch();
            if (!$barang) {
                $db->rollBack();
                error_response('Barang tidak ditemukan', 404);
            }

            $qty = (int)$body['qty'];
            if ($barang['stok'] < $qty) {
                $db->rollBack();
                error_response(
                    "Stok tidak cukup. Stok saat ini: {$barang['stok']} {$barang['satuan']}",
                    422
                );
            }

            // Insert penjualan
            $ins = $db->prepare(
                'INSERT INTO penjualan
                   (barang_id, kode_barang, nama_barang, satuan, qty, tipe, harga, keterangan)
                 VALUES
                   (:barang_id, :kode_barang, :nama_barang, :satuan, :qty, :tipe, :harga, :keterangan)'
            );
            $tipe = in_array($body['tipe'] ?? '', ['online','offline']) ? $body['tipe'] : 'offline';
            $ins->execute([
                ':barang_id'   => $body['barang_id'],
                ':kode_barang' => $body['kode_barang'] ?? '',
                ':nama_barang' => $body['nama_barang'],
                ':satuan'      => $body['satuan'] ?? 'pcs',
                ':qty'         => $qty,
                ':tipe'        => $tipe,
                ':harga'       => (float)$body['harga'],
                ':keterangan'  => $body['keterangan'] ?? '',
            ]);
            $newId = $db->lastInsertId();

            // Kurangi stok barang
            $db->prepare('UPDATE barang SET stok = stok - ? WHERE id = ?')
               ->execute([$qty, $body['barang_id']]);

            $db->commit();

            $row = $db->prepare('SELECT * FROM penjualan WHERE id = ?');
            $row->execute([$newId]);
            json_response($row->fetch(), 201);
            break;

        // ── DELETE (kembalikan stok) ───────────────────────────────────────
        case 'DELETE':
            if (!$id) error_response('ID wajib untuk delete');

            $db->beginTransaction();

            $old = $db->prepare('SELECT * FROM penjualan WHERE id = ? FOR UPDATE');
            $old->execute([$id]);
            $jual = $old->fetch();
            if (!$jual) {
                $db->rollBack();
                error_response('Data tidak ditemukan', 404);
            }

            // Kembalikan stok jika barang masih ada
            if (!empty($jual['barang_id'])) {
                $db->prepare('UPDATE barang SET stok = stok + ? WHERE id = ?')
                   ->execute([(int)$jual['qty'], $jual['barang_id']]);
            }

            $db->prepare('DELETE FROM penjualan WHERE id = ?')->execute([$id]);
            $db->commit();

            json_response(['success' => true, 'message' => 'Data penjualan berhasil dihapus']);
            break;

        default:
            error_response('Method tidak diizinkan', 405);
    }
} catch (PDOException $e) {
    if ($db->inTransaction()) $db->rollBack();
    error_response('Database error: ' . $e->getMessage(), 500);
}
