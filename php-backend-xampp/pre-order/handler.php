<?php
/**
 * Handler: /pre-order
 * 
 * GET    /pre-order      → getAllPreOrder
 * POST   /pre-order      → addPreOrder
 * PUT    /pre-order/:id  → updatePreOrder
 * DELETE /pre-order/:id  → deletePreOrder
 */

$db = getDB();

try {
    switch ($method) {

        // ── GET ALL ───────────────────────────────────────────────────────
        case 'GET':
            $stmt = $db->query(
                'SELECT * FROM pre_order ORDER BY tanggal_po ASC'
            );
            json_response($stmt->fetchAll());
            break;

        // ── ADD ────────────────────────────────────────────────────────────
        case 'POST':
            $body = get_body();
            if (empty($body['tanggal_po'])) error_response('Field tanggal_po wajib diisi');
            if (empty($body['deskripsi']) && empty($body['kode_barang'])) {
                error_response('Isi minimal kode_barang atau deskripsi');
            }

            $stmt = $db->prepare(
                'INSERT INTO pre_order (tanggal_po, kode_barang, deskripsi, qty, catatan)
                 VALUES (:tanggal_po, :kode_barang, :deskripsi, :qty, :catatan)'
            );
            $stmt->execute([
                ':tanggal_po'  => $body['tanggal_po'],
                ':kode_barang' => $body['kode_barang'] ?? '',
                ':deskripsi'   => $body['deskripsi']   ?? '',
                ':qty'         => (int)($body['qty']   ?? 0),
                ':catatan'     => $body['catatan']      ?? '',
            ]);
            $newId = $db->lastInsertId();

            $row = $db->prepare('SELECT * FROM pre_order WHERE id = ?');
            $row->execute([$newId]);
            json_response($row->fetch(), 201);
            break;

        // ── UPDATE ────────────────────────────────────────────────────────
        case 'PUT':
            if (!$id) error_response('ID wajib untuk update');
            $body = get_body();
            if (empty($body['tanggal_po'])) error_response('Field tanggal_po wajib diisi');

            // Cek exist
            $chk = $db->prepare('SELECT id FROM pre_order WHERE id = ?');
            $chk->execute([$id]);
            if (!$chk->fetch()) error_response('Pre-order tidak ditemukan', 404);

            $stmt = $db->prepare(
                'UPDATE pre_order
                 SET tanggal_po=:tanggal_po, kode_barang=:kode_barang,
                     deskripsi=:deskripsi, qty=:qty, catatan=:catatan
                 WHERE id=:id'
            );
            $stmt->execute([
                ':tanggal_po'  => $body['tanggal_po'],
                ':kode_barang' => $body['kode_barang'] ?? '',
                ':deskripsi'   => $body['deskripsi']   ?? '',
                ':qty'         => (int)($body['qty']   ?? 0),
                ':catatan'     => $body['catatan']      ?? '',
                ':id'          => $id,
            ]);

            $row = $db->prepare('SELECT * FROM pre_order WHERE id = ?');
            $row->execute([$id]);
            json_response($row->fetch());
            break;

        // ── DELETE ────────────────────────────────────────────────────────
        case 'DELETE':
            if (!$id) error_response('ID wajib untuk delete');

            $stmt = $db->prepare('DELETE FROM pre_order WHERE id = ?');
            $stmt->execute([$id]);
            if ($stmt->rowCount() === 0) error_response('Pre-order tidak ditemukan', 404);

            json_response(['success' => true, 'message' => 'Pre-order berhasil dihapus']);
            break;

        default:
            error_response('Method tidak diizinkan', 405);
    }
} catch (PDOException $e) {
    error_response('Database error: ' . $e->getMessage(), 500);
}
