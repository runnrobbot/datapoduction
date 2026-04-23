<?php
/**
 * ============================================================
 * KONFIGURASI DATABASE — XAMPP / phpMyAdmin
 * ============================================================
 * Letakkan folder php-backend-xampp/ ini di:
 *   C:\xampp\htdocs\inventory-api\
 * 
 * Akses endpoint: http://localhost/inventory-api/...
 * 
 * Sesuaikan DB_NAME dengan nama database kamu di phpMyAdmin
 */

define('DB_HOST', 'localhost');
define('DB_USER', 'root');      // default XAMPP
define('DB_PASS', '');          // default XAMPP (kosong)
define('DB_NAME', 'inventory_db');
define('DB_PORT', 3306);

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

function json_response(mixed $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function error_response(string $message, int $status = 400): void {
    json_response(['success' => false, 'message' => $message], $status);
}

function get_body(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}
