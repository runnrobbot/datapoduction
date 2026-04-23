<?php
/**
 * Handler: /barang-masuk
 * 
 * GET    /barang-masuk      → getAllMasuk
 * POST   /barang-masuk      → addMasuk  (+ update stok barang, atomic)
 * PUT    /barang-masuk/:id  → updateMasuk (+ adjust stok)
 * DELETE /barang-masuk/:id  → deleteMasuk (+ kurangi stok)
 */

$db = getDB();

try {
    switch ($method) {

        // ── GET ALL ───────────────────────────────────────────────────────
        case 'GET':
            $stmt = $db->query(
                'SELECT * FROM barang_masuk ORDER BY created_at DESC'
            );
            json_response($stmt->fetchAll());
            break;

        // ── ADD (atomic: insert masuk + update stok) ──────────────────────
        case 'POST':
            $body = get_body();
            if (empty($body['barang_id'])) error_response('Field barang_id wajib diisi');
            if (empty($body['nama_barang'])) error_response('Field nama_barang wajib diisi');
            if (!isset($body['qty']) || (int)$body['qty'] <= 0) error_response('Qty harus lebih dari 0');

            $db->beginTransaction();

            // Cek barang ada
            $chk = $db->prepare('SELECT id, stok FROM barang WHERE id = ? FOR UPDATE');
            $chk->execute([$body['barang_id']]);
            $barang = $chk->fetch();
            if (!$barang) {
                $db->rollBack();
                error_response('Barang tidak ditemukan', 404);
            }

            $qty      = (int)$body['qty'];
            $newStok  = $barang['stok'] + $qty;

            // Insert barang_masuk
            $ins = $db->prepare(
                'INSERT INTO barang_masuk (barang_id, kode_barang, nama_barang, satuan, qty, keterangan)
                 VALUES (:barang_id, :kode_barang, :nama_barang, :satuan, :qty, :keterangan)'
            );
            $ins->execute([
                ':barang_id'   => $body['barang_id'],
                ':kode_barang' => $body['kode_barang'] ?? '',
                ':nama_barang' => $body['nama_barang'],
                ':satuan'      => $body['satuan'] ?? 'pcs',
                ':qty'         => $qty,
                ':keterangan'  => $body['keterangan'] ?? '',
            ]);
            $newId = $db->lastInsertId();

            // Update stok barang
            $upd = $db->prepare('UPDATE barang SET stok = ? WHERE id = ?');
            $upd->execute([$newStok, $body['barang_id']]);

            $db->commit();

            $row = $db->prepare('SELECT * FROM barang_masuk WHERE id = ?');
            $row->execute([$newId]);
            json_response($row->fetch(), 201);
            break;

        // ── UPDATE (adjust stok: stok - oldQty + newQty) ─────────────────
        case 'PUT':
            if (!$id) error_response('ID wajib untuk update');
            $body = get_body();

            $db->beginTransaction();

            // Ambil data masuk lama
            $old = $db->prepare('SELECT * FROM barang_masuk WHERE id = ? FOR UPDATE');
            $old->execute([$id]);
            $masuk = $old->fetch();
            if (!$masuk) {
                $db->rollBack();
                error_response('Data barang masuk tidak ditemukan', 404);
            }

            $barang_id = $body['barang_id'] ?? $masuk['barang_id'];
            $oldQty    = (int)($body['old_qty'] ?? $masuk['qty']);
            $newQty    = (int)($body['qty']     ?? $masuk['qty']);

            // Ambil stok barang
            $chk = $db->prepare('SELECT stok FROM barang WHERE id = ? FOR UPDATE');
            $chk->execute([$barang_id]);
            $barang = $chk->fetch();
            if (!$barang) {
                $db->rollBack();
                error_response('Barang tidak ditemukan', 404);
            }

            $newStok = max(0, $barang['stok'] - $oldQty + $newQty);

            // Update masuk
            $upd = $db->prepare(
                'UPDATE barang_masuk SET qty=:qty, keterangan=:keterangan WHERE id=:id'
            );
            $upd->execute([
                ':qty'        => $newQty,
                ':keterangan' => $body['keterangan'] ?? $masuk['keterangan'],
                ':id'         => $id,
            ]);

            // Update stok barang
            $db->prepare('UPDATE barang SET stok = ? WHERE id = ?')
               ->execute([$newStok, $barang_id]);

            $db->commit();

            $row = $db->prepare('SELECT * FROM barang_masuk WHERE id = ?');
            $row->execute([$id]);
            json_response($row->fetch());
            break;

        // ── DELETE (kembalikan stok) ───────────────────────────────────────
        case 'DELETE':
            if (!$id) error_response('ID wajib untuk delete');

            $db->beginTransaction();

            $old = $db->prepare('SELECT * FROM barang_masuk WHERE id = ? FOR UPDATE');
            $old->execute([$id]);
            $masuk = $old->fetch();
            if (!$masuk) {
                $db->rollBack();
                error_response('Data tidak ditemukan', 404);
            }

            // Kurangi stok
            $chk = $db->prepare('SELECT stok FROM barang WHERE id = ? FOR UPDATE');
            $chk->execute([$masuk['barang_id']]);
            $barang = $chk->fetch();
            if ($barang) {
                $newStok = max(0, $barang['stok'] - (int)$masuk['qty']);
                $db->prepare('UPDATE barang SET stok = ? WHERE id = ?')
                   ->execute([$newStok, $masuk['barang_id']]);
            }

            $db->prepare('DELETE FROM barang_masuk WHERE id = ?')->execute([$id]);
            $db->commit();

            json_response(['success' => true, 'message' => 'Data barang masuk berhasil dihapus']);
            break;

        default:
            error_response('Method tidak diizinkan', 405);
    }
} catch (PDOException $e) {
    if ($db->inTransaction()) $db->rollBack();
    error_response('Database error: ' . $e->getMessage(), 500);
}
