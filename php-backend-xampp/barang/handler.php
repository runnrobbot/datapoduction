<?php
/**
 * Handler: /barang
 * 
 * GET    /barang      → getAllBarang
 * GET    /barang/:id  → getBarangById
 * POST   /barang      → addBarang
 * PUT    /barang/:id  → updateBarang
 * DELETE /barang/:id  → deleteBarang
 */

$db = getDB();

try {
    switch ($method) {

        // ── GET ALL / GET BY ID ────────────────────────────────────────────
        case 'GET':
            if ($id) {
                $stmt = $db->prepare('SELECT * FROM barang WHERE id = ?');
                $stmt->execute([$id]);
                $row = $stmt->fetch();
                if (!$row) error_response('Barang tidak ditemukan', 404);
                json_response($row);
            } else {
                $stmt = $db->query('SELECT * FROM barang ORDER BY nama ASC');
                json_response($stmt->fetchAll());
            }
            break;

        // ── ADD ────────────────────────────────────────────────────────────
        case 'POST':
            $body = get_body();
            if (empty($body['nama'])) error_response('Field nama wajib diisi');

            $stmt = $db->prepare(
                'INSERT INTO barang (kode, nama, satuan, harga_jual, stok)
                 VALUES (:kode, :nama, :satuan, :harga_jual, 0)'
            );
            $stmt->execute([
                ':kode'       => $body['kode']       ?? '',
                ':nama'       => $body['nama'],
                ':satuan'     => $body['satuan']      ?? 'pcs',
                ':harga_jual' => (float)($body['harga_jual'] ?? 0),
            ]);

            $newId = $db->lastInsertId();
            $stmt2 = $db->prepare('SELECT * FROM barang WHERE id = ?');
            $stmt2->execute([$newId]);
            json_response($stmt2->fetch(), 201);
            break;

        // ── UPDATE ────────────────────────────────────────────────────────
        case 'PUT':
            if (!$id) error_response('ID wajib untuk update');
            $body = get_body();
            if (empty($body['nama'])) error_response('Field nama wajib diisi');

            $stmt = $db->prepare(
                'UPDATE barang SET kode=:kode, nama=:nama, satuan=:satuan, harga_jual=:harga_jual
                 WHERE id=:id'
            );
            $stmt->execute([
                ':kode'       => $body['kode']       ?? '',
                ':nama'       => $body['nama'],
                ':satuan'     => $body['satuan']      ?? 'pcs',
                ':harga_jual' => (float)($body['harga_jual'] ?? 0),
                ':id'         => $id,
            ]);

            if ($stmt->rowCount() === 0) error_response('Barang tidak ditemukan', 404);
            $stmt2 = $db->prepare('SELECT * FROM barang WHERE id = ?');
            $stmt2->execute([$id]);
            json_response($stmt2->fetch());
            break;

        // ── DELETE ────────────────────────────────────────────────────────
        case 'DELETE':
            if (!$id) error_response('ID wajib untuk delete');

            // Cek apakah ada barang_masuk atau penjualan yang terkait
            $chk = $db->prepare('SELECT COUNT(*) FROM barang_masuk WHERE barang_id = ?');
            $chk->execute([$id]);
            if ($chk->fetchColumn() > 0) {
                error_response('Barang tidak bisa dihapus: masih ada data barang masuk yang terkait', 409);
            }

            $stmt = $db->prepare('DELETE FROM barang WHERE id = ?');
            $stmt->execute([$id]);
            if ($stmt->rowCount() === 0) error_response('Barang tidak ditemukan', 404);
            json_response(['success' => true, 'message' => 'Barang berhasil dihapus']);
            break;

        default:
            error_response('Method tidak diizinkan', 405);
    }
} catch (PDOException $e) {
    error_response('Database error: ' . $e->getMessage(), 500);
}
