# PHP Backend — XAMPP Setup Guide

Folder ini berisi REST API PHP untuk mode **development** (XAMPP/phpMyAdmin).
Digunakan saat `VITE_USE_FIREBASE=false` di `.env.development`.

---

## Struktur File

```
php-backend-xampp/
├── .htaccess          ← URL rewrite Apache (wajib)
├── config.php         ← Koneksi database MySQL
├── index.php          ← Router utama
├── schema.sql         ← Struktur tabel MySQL
├── barang/
│   └── handler.php    ← CRUD master barang
├── barang-masuk/
│   └── handler.php    ← CRUD stok masuk + update stok
├── penjualan/
│   └── handler.php    ← CRUD penjualan + update stok
└── pre-order/
    └── handler.php    ← CRUD pre-order
```

---

## Cara Setup (5 Langkah)

### 1. Copy folder ke XAMPP
```
Copy seluruh folder php-backend-xampp/ ke:
  C:\xampp\htdocs\inventory-api\

Sehingga struktur jadi:
  C:\xampp\htdocs\inventory-api\index.php
  C:\xampp\htdocs\inventory-api\config.php
  C:\xampp\htdocs\inventory-api\.htaccess
  ... dst
```

### 2. Aktifkan mod_rewrite di Apache
- Buka `C:\xampp\apache\conf\httpd.conf`
- Cari `#LoadModule rewrite_module` → hapus tanda `#`
- Cari `AllowOverride None` (pada section `<Directory "C:/xampp/htdocs">`) → ganti ke `AllowOverride All`
- Restart Apache

### 3. Buat database di phpMyAdmin
- Buka http://localhost/phpmyadmin
- Klik **"New"** di sidebar kiri
- Nama database: `inventory_db`
- Collation: `utf8mb4_unicode_ci`
- Klik **Create**

### 4. Import schema
- Pilih database `inventory_db` di sidebar
- Tab **Import** → Choose File → pilih `schema.sql`
- Klik **Go**

### 5. Setup .env.development
```env
VITE_USE_FIREBASE=false
VITE_API_BASE_URL=http://localhost/inventory-api
```

Jalankan project React:
```bash
npm run dev
# atau
pnpm dev
```

---

## Endpoint API

| Method | Endpoint                | Deskripsi                              |
|--------|-------------------------|----------------------------------------|
| GET    | /barang                 | Semua barang                           |
| GET    | /barang/:id             | Detail barang                          |
| POST   | /barang                 | Tambah barang baru                     |
| PUT    | /barang/:id             | Update barang                          |
| DELETE | /barang/:id             | Hapus barang                           |
| GET    | /barang-masuk           | Semua data masuk                       |
| POST   | /barang-masuk           | Tambah masuk + update stok (atomic)    |
| PUT    | /barang-masuk/:id       | Update masuk + adjust stok             |
| DELETE | /barang-masuk/:id       | Hapus masuk + kurangi stok             |
| GET    | /penjualan              | Semua penjualan                        |
| POST   | /penjualan              | Tambah penjualan + kurangi stok        |
| DELETE | /penjualan/:id          | Hapus penjualan + kembalikan stok      |
| POST   | /penjualan/import       | Batch import historis (tanpa stok)     |
| GET    | /pre-order              | Semua pre-order                        |
| POST   | /pre-order              | Tambah pre-order                       |
| PUT    | /pre-order/:id          | Update pre-order                       |
| DELETE | /pre-order/:id          | Hapus pre-order                        |

---

## Ganti ke Production (Firebase)

Edit `.env.production`:
```env
VITE_USE_FIREBASE=true
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
# dst
```

Build:
```bash
npm run build
```

Setelah build, hasil ada di folder `dist/` — upload ke hosting.
