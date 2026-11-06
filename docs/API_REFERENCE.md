# 🔌 Katalog Referensi API (API Reference Catalog)
> **UMS Library OneSearch (harvest-koha)**  
> Dokumentasi lengkap endpoint REST API backend Flask (`proxy/app.py`), parameter kueri, format permintaan, dan skema respons JSON.

---

## 📑 Daftar Isi
1. [Standar Komunikasi & Format Respons](#1-standar-komunikasi--format-respons)
2. [Autentikasi & Keamanan Endpoint](#2-autentikasi--keamanan-endpoint)
3. [API Penelusuran Ilmiah & Jurnal Internasional](#3-api-penelusuran-ilmiah--jurnal-internasional)
   - [`GET /api/federated`](#get-apifederated)
   - [`GET /api/scopus`](#get-apiscopus)
   - [`GET /api/topics`](#get-apitopics)
   - [`GET /api/international/journals`](#get-apiinternationaljournals)
   - [`GET /api/international/ebooks`](#get-apiinternationalebooks)
   - [`GET /api/international/ebooks/search`](#get-apiinternationalebookssearch)
4. [API Streaming Dokumen & PDF Proxy](#4-api-streaming-dokumen--pdf-proxy)
   - [`GET /api/pdf_proxy`](#get-apipdf_proxy)
   - [`GET /api/ebooks/<ebk_id>/pdf`](#get-apiebooksebk_idpdf)
   - [`GET /api/ebooks/<ebk_id>/pdf/download`](#get-apiebooksebk_idpdfdownload)
5. [API Manajemen Cache Backend](#5-api-manajemen-cache-backend)
   - [`GET /api/cache/stats`](#get-apicachestats)
   - [`POST /api/cache/clear`](#post-apicacheclear)
6. [API Konsol Manajemen Admin](#6-api-konsol-manajemen-admin)
   - [Autentikasi & Sesi Admin](#autentikasi--sesi-admin)
   - [Monitoring & Kontrol Harvester](#monitoring--kontrol-harvester)
   - [Manajemen Backup & Restore](#manajemen-backup--restore)
   - [Manajemen Institusi Mitra](#manajemen-institusi-mitra)
   - [Manajemen Aturan DDC & Prodi](#manajemen-aturan-ddc--prodi)
   - [Telemetri & Analitik Pencarian](#telemetri--analitik-pencarian)

---

## 1. Standar Komunikasi & Format Respons

- **Base URL**: `http://localhost:8080/api` (atau `http://localhost:5000/api` pada direct Python)
- **Format Data**: JSON (`application/json; charset=utf-8`)
- **HTTP Status Codes**:
  - `200 OK`: Permintaan berhasil diproses.
  - `400 Bad Request`: Parameter wajib tidak lengkap atau format salah.
  - `401 Unauthorized`: Token otentikasi admin tidak valid atau tidak disertakan.
  - `404 Not Found`: Dokumen, record, atau endpoint tidak ditemukan.
  - `429 Too Many Requests`: Melebihi kuota laju permintaan (*rate limit*).
  - `500 Internal Server Error`: Terjadi kesalahan pada komputasi server.

---

## 2. Autentikasi & Keamanan Endpoint

- Endpoint publik (pencarian federasi, katalog e-book, streaming PDF) dapat diakses secara bebas tanpa autentikasi (*CORS-enabled*).
- Seluruh endpoint di bawah rute `/api/admin/*` diproteksi menggunakan verifikasi header atau cookie sesi:
  ```http
  X-Admin-Token: <token_rahasia_admin>
  ```
  Atau melalui authorization bearer token standar. Token ini dikonfigurasi melalui variabel lingkungan `ADMIN_PASSWORD` atau file konfigurasi server.

---

## 3. API Penelusuran Ilmiah & Jurnal Internasional

### `GET /api/federated`
Melakukan penelusuran paralel (*broadcasting*) ke berbagai pangkalan data ilmiah dunia (OpenAlex, Crossref, Semantic Scholar, The Lens, DOAB, Scopus, Springer) secara simultan.

#### Parameter Kueri:
| Parameter | Tipe | Wajib | Keterangan |
| :--- | :--- | :--- | :--- |
| `q` | `string` | **Ya** | Kata kunci pencarian (contoh: `"machine learning in healthcare"`). |
| `source` | `string` | Tidak | Sumber spesifik (`openalex`, `crossref`, `scopus`, `springer`). Default: `all`. |
| `limit` | `integer`| Tidak | Jumlah rekaman yang diminta (default: `20`, maksimum: `50`). |
| `filter` | `string` | Tidak | Filter tambahan (misal: `open_access`). |

#### Contoh Respons (`200 OK`):
```json
{
  "status": "success",
  "query": "machine learning in healthcare",
  "total_found": 1420,
  "sources_queried": ["openalex", "crossref", "scopus"],
  "results": [
    {
      "doi": "10.1016/j.artmed.2023.102580",
      "title": "Explainable Artificial Intelligence for Clinical Decision Support",
      "authors": ["John Doe", "Jane Smith"],
      "year": 2024,
      "venue": "Artificial Intelligence in Medicine",
      "source": "Scopus",
      "is_subscribed": true,
      "is_oa": true,
      "oa_url": "https://doi.org/10.1016/j.artmed.2023.102580",
      "citations": 14
    }
  ]
}
```

---

### `GET /api/scopus`
Melakukan penelusuran langsung khusus ke basis data Elsevier Scopus menggunakan kredensial langganan institusi UMS.

#### Parameter Kueri:
- `q` (string): Query pencarian Scopus (mendukung sintaks boolean `TITLE-ABS-KEY(...)`).
- `count` (integer): Jumlah hasil (default: 25).

---

### `GET /api/topics`
Mengambil daftar topik dan tren riset terkini berdasarkan analisis kata kunci populer dan bidang keilmuan unggulan UMS.

---

### `GET /api/international/journals`
Mengambil daftar jurnal internasional bereputasi yang secara resmi dilanggan oleh Universitas Muhammadiyah Surakarta beserta tautan akses kampus dan cakupan subjeknya.

---

### `GET /api/international/ebooks`
Mengambil daftar katalog buku elektronik (e-book) internasional berlisensi atau bebas akses (Open Access). Mendukung pagination via parameter `page` dan `per_page`.

---

### `GET /api/international/ebooks/search`
Pencarian teks lengkap pada metadata koleksi buku digital internasional.
- `q` (string): Kata kunci judul, pengarang, atau ISBN e-book.

---

## 4. API Streaming Dokumen & PDF Proxy

### `GET /api/pdf_proxy`
Menyajikan dokumen PDF dari repositori luar ke dalam modal peramban (*built-in PDF viewer*) dengan menghapus batasan header keamanan `X-Frame-Options` dan `Content-Security-Policy` yang seringkali memblokir rendering di dalam elemen `<iframe>`.

#### Parameter Kueri:
- `url` (string, URL-encoded): URL lengkap dokumen PDF target (misal: `http%3A%2F%2Feprints.ums.ac.id%2F1234%2F1%2Fnaskah.pdf`).

#### Karakteristik Respons:
- Header `Content-Type: application/pdf`.
- Mendukung *HTTP Range Requests* (`Accept-Ranges: bytes`) untuk pemuatan bertahap (*streaming*) dokumen PDF tebal.

---

### `GET /api/ebooks/<ebk_id>/pdf`
Mengalirkan file PDF lokal dari koleksi e-book digital internal untuk ditampilkan pada modal PDF viewer.

### `GET /api/ebooks/<ebk_id>/pdf/download`
Mengunduh file PDF secara langsung dengan menyertakan header `Content-Disposition: attachment; filename="..."`.

---

## 5. API Manajemen Cache Backend

### `GET /api/cache/stats`
Menampilkan metrik performa modul `TTLCache` in-memory backend.
```json
{
  "status": "success",
  "cache_type": "TTLCache",
  "max_size": 1000,
  "current_items": 142,
  "ttl_seconds": 1800,
  "hits": 3520,
  "misses": 420,
  "hit_ratio": "89.34%"
}
```

### `POST /api/cache/clear`
Mengosongkan seluruh entri cache pencarian di memori server (memerlukan token admin).

---

## 6. API Konsol Manajemen Admin

### Autentikasi & Sesi Admin
* **`POST /api/admin/auth/verify`**:
  Memvalidasi kata sandi administrator. Jika valid, mengembalikan token sesi yang disimpan di browser klien.

### Monitoring & Kontrol Harvester
* **`GET /api/admin/harvest/status`**:
  Memeriksa apakah proses harvesting sedang berjalan, durasi berjalan, serta status file `.harvest.lock`.
* **`GET /api/admin/harvest/logs`**:
  Aliran data log real-time menggunakan teknologi **Server-Sent Events (SSE)**. Antarmuka konsol admin dapat mendengarkan event ini untuk menampilkan baris terminal secara langsung.
* **`POST /api/admin/harvest/run`**:
  Memicu eksekusi proses harvesting batch di latar belakang secara asinkron (*non-blocking subprocess*).
* **`POST /api/admin/harvest/unlock`**:
  Menghapus file lock `.harvest.lock` yang menggantung secara paksa jika proses panen sebelumnya terhenti abnormal.

### Manajemen Backup & Restore
* **`GET /api/admin/backups`**: Menampilkan daftar snapshot cadangan data katalog di server.
* **`POST /api/admin/backups/create`**: Membuat arsip snapshot baru dari folder `data/`.
* **`POST /api/admin/backups/restore`**: Memulihkan data katalog dari salah satu file arsip cadangan.
* **`GET /api/admin/backups/download?file=<name>`**: Mengunduh file arsip cadangan (format `.tar.gz`).

### Manajemen Institusi Mitra
* **`GET /api/admin/institutions`**: Mengambil daftar institusi OAI-PMH yang terdaftar di `data/institutions.json`.
* **`POST /api/admin/institutions`**: Menambah atau memperbarui endpoint OAI-PMH institusi baru.
* **`DELETE /api/admin/institutions/<inst_id>`**: Menghapus institusi dari daftar panen.
* **`POST /api/admin/institutions/toggle`**: Mengaktifkan atau menonaktifkan status harvesting institusi tertentu.
* **`POST /api/admin/institutions/test`**: Menguji konektivitas OAI-PMH (*verb Identify*) ke URL target secara instan.

### Manajemen Aturan DDC & Prodi
* **`GET /api/admin/ddc`**: Mengambil kamus taksonomi kelas dan divisi Dewey Decimal Classification.
* **`POST /api/admin/ddc/apply`**: Menerapkan aturan baru dan melakukan klasifikasi ulang terhadap dataset katalog.
* **`GET /api/admin/prodi`**: Mengambil pemetaan Program Studi UMS beserta rentang kode DDC terkait.
* **`POST /api/admin/prodi/rules`**: Memperbarui aturan pencocokan DDC Program Studi.

### Telemetri & Analitik Pencarian
* **`POST /api/analytics/log`**: Merekam kueri pencarian pengguna secara anonim untuk mendeteksi kata kunci populer dan kueri dengan hasil nol (*zero-result searches*).
* **`GET /api/admin/analytics/summary`**: Mengambil ringkasan statistik kata kunci teratas, distribusi waktu pencarian, dan tren kueri mahasiswa.
* **`GET /api/admin/analytics/export`**: Mengekspor riwayat pencarian dalam format CSV untuk keperluan pelaporan pimpinan perpustakaan.
* **`POST /api/admin/analytics/reset`**: Mereset data log analitik.

