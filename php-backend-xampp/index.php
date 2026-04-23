<?php
/**
 * ============================================================
 * MAIN ROUTER — inventory-api
 * ============================================================
 * File ini adalah entry point semua request ke API.
 * 
 * Cara setup di XAMPP:
 *   1. Copy folder php-backend-xampp/ ke C:\xampp\htdocs\inventory-api\
 *   2. Buat database di phpMyAdmin dengan nama: inventory_db
 *   3. Import schema: buka phpMyAdmin → inventory_db → Import → pilih schema.sql
 *   4. Jalankan XAMPP (Apache + MySQL)
 *   5. Set VITE_API_BASE_URL=http://localhost/inventory-api di .env.development
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

// Preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/config.php';

// Parse URL
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$base   = '/inventory-api';
$path   = substr($uri, strlen($base));
$path   = rtrim($path, '/') ?: '/';
$method = $_SERVER['REQUEST_METHOD'];

// Routing
if (preg_match('#^/barang(/(\d+))?$#', $path, $m)) {
    $id = $m[2] ?? null;
    require __DIR__ . '/barang/handler.php';

} elseif (preg_match('#^/barang-masuk(/(\d+))?$#', $path, $m)) {
    $id = $m[2] ?? null;
    require __DIR__ . '/barang-masuk/handler.php';

} elseif (preg_match('#^/penjualan(/import|/(\d+))?$#', $path, $m)) {
    $id     = $m[2] ?? null;
    $import = isset($m[1]) && $m[1] === '/import';
    require __DIR__ . '/penjualan/handler.php';

} elseif (preg_match('#^/pre-order(/(\d+))?$#', $path, $m)) {
    $id = $m[2] ?? null;
    require __DIR__ . '/pre-order/handler.php';

} else {
    error_response('Endpoint tidak ditemukan', 404);
}
