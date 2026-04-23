-- ============================================================
-- SCHEMA DATABASE — inventory_db
-- ============================================================
-- Import file ini di phpMyAdmin:
--   1. Buka phpMyAdmin → http://localhost/phpmyadmin
--   2. Klik "New" → buat database: inventory_db (utf8mb4_unicode_ci)
--   3. Pilih database inventory_db → tab Import → pilih file ini → Go
-- ============================================================

CREATE DATABASE IF NOT EXISTS `inventory_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `inventory_db`;

-- ─── BARANG (master produk) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `barang` (
  `id`         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `kode`       VARCHAR(50)     NOT NULL DEFAULT '',
  `nama`       VARCHAR(255)    NOT NULL,
  `satuan`     VARCHAR(50)     NOT NULL DEFAULT 'pcs',
  `harga_jual` DECIMAL(15, 2)  NOT NULL DEFAULT 0,
  `stok`       INT             NOT NULL DEFAULT 0,
  `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_barang_nama` (`nama`),
  INDEX `idx_barang_kode` (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── BARANG MASUK (stok masuk) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `barang_masuk` (
  `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `barang_id`   INT UNSIGNED    NOT NULL,
  `kode_barang` VARCHAR(50)     NOT NULL DEFAULT '',
  `nama_barang` VARCHAR(255)    NOT NULL,
  `satuan`      VARCHAR(50)     NOT NULL DEFAULT 'pcs',
  `qty`         INT             NOT NULL DEFAULT 0,
  `keterangan`  TEXT,
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_masuk_barang_id` (`barang_id`),
  INDEX `idx_masuk_created` (`created_at`),
  CONSTRAINT `fk_masuk_barang`
    FOREIGN KEY (`barang_id`) REFERENCES `barang` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PENJUALAN (transaksi penjualan) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `penjualan` (
  `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `barang_id`   INT UNSIGNED    NOT NULL DEFAULT 0,
  `kode_barang` VARCHAR(50)     NOT NULL DEFAULT '',
  `nama_barang` VARCHAR(255)    NOT NULL,
  `satuan`      VARCHAR(50)     NOT NULL DEFAULT 'pcs',
  `qty`         INT             NOT NULL DEFAULT 0,
  `tipe`        ENUM('offline','online') NOT NULL DEFAULT 'offline',
  `harga`       DECIMAL(15, 2)  NOT NULL DEFAULT 0,
  `keterangan`  TEXT,
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_jual_barang_id` (`barang_id`),
  INDEX `idx_jual_created`   (`created_at`),
  INDEX `idx_jual_tipe`      (`tipe`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PRE ORDER ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `pre_order` (
  `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `tanggal_po`  DATE            NOT NULL,
  `kode_barang` VARCHAR(50)     NOT NULL DEFAULT '',
  `deskripsi`   TEXT,
  `qty`         INT             NOT NULL DEFAULT 0,
  `catatan`     TEXT,
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_po_tanggal` (`tanggal_po`),
  INDEX `idx_po_kode`    (`kode_barang`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
