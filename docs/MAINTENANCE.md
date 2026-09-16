# 🛠️ Panduan Pemeliharaan & Arsitektur Sistem (Maintenance Guide)
**UMS Library OneSearch — Sistem Temu Balik Informasi Perpustakaan & Repositori Terpadu**

Dokumen ini ditujukan bagi pengembang dan administrator teknis untuk memahami struktur kode, alur kerja data (*data pipeline*), serta prosedur operasional standar (*SOP*) dalam merawat aplikasi UMS OneSearch.

---

## 1. Peta Arsitektur Sistem (*High-Level Architecture*)

```
[Sumber Data Luar / Kampus]
  ├── Koha Library (OAI-PMH)       ──┐
  ├── EPrints Repositori (OAI-PMH) ──┼──> [scripts/harvest_oai.py & harvest_all.py]
  └── OJS Jurnal Ilmiah (OAI-PMH)  ──┘                   │
                                                         ▼
                                                output/biblio_*.json
                                                         │
                                                         ▼
                                            [scripts/preprocess.py]
                                           (Normalisasi DDC, Prodi,
                                            Pembersihan Field Kosong,
                                            & Kompresi Gzip Statis)
                                                         │
                                                         ▼
                                           ┌── data/books.json & .gz
                                           ├── data/ddc_tree.json & .gz
                                           ├── data/prodi_index.json & .gz
                                           └── data/stats.json
                                                         │
           ┌─────────────────────────────────────────────┴─────────────────────────────┐
           ▼                                                                           ▼
[Docker: api_proxy (Flask/Gunicorn)]                                       [Docker: web (Nginx:1.27)]
  ├── /api/federated (Scopus, OpenAlex, Crossref)                            ├── gzip_static on (Sajikan .gz instan)
  ├── /api/admin/* (Kelola Jurnal, E-Book, PDF)                              ├── PWA Service Worker (sw.js)
  └── /api/admin/harvest/* (Trigger & Logs)                                  └── UI SPA (index.html, js/app.js)
```

---

## 2. Direktori & Daftar Peran File

### A. Antarmuka Pengguna & PWA (Frontend)
| File / Path | Peran & Fungsi Utama |
| :--- | :--- |
| **`index.html`** | Halaman utama pencarian katalog (*Single Page Application*). Berisi markup search bar, filter sidebar, kartu hasil, dan modal detail. Mengontrol *asset cache-busting* (`?v=100`). |
| **`admin.html`** | Dashboard admin untuk memantau status panen (harvest), membaca log berkala, mengelola daftar institusi mitra OAI-PMH, serta mengimpor/mengekspor data Jurnal & E-Book langganan. |
| **`js/app.js`** | Inti logika aplikasi client-side: state management, event listeners, pemanggilan API pencarian federasi internasional, render modal buku/artikel, serta format sitasi terpadu (`getCitations`, `renderCiteGroups`). |
| **`js/search.js`** | Mesin pencari teks penuh (*Full-Text Search Engine*) berbasis client-side memori. Membangun *inverted index* untuk judul, pengarang, subjek, dan prefix pohon DDC untuk pencarian secepat kilat tanpa request server. |
| **`js/recommender.js`** | Mesin rekomendasi koleksi terkait berdasarkan kesamaan kelas DDC, nama pengarang yang sama, dan irisan subjek. |
| **`sw.js`** | *Service Worker* PWA: Mengatur caching offline aset UI (`onesearch-shell-v100`) dan caching dataset koleksi (`onesearch-data-v100`) dengan strategi *Stale-While-Revalidate*. |
| **`css/style.css`** | Desain antarmuka visual terpadu: sistem token CSS, tema gelap/terang, badge institusi, grid responsif, dan animasi transisi. |

---

### B. Pipeline Pemanenan & Pengolahan Data (`scripts/`)
| File / Path | Peran & Fungsi Utama |
| :--- | :--- |
| **`scripts/harvest_oai.py`** | Engine panen OAI-PMH. Mengunduh data record dari server OAI (Koha, EPrints, OJS) menggunakan verb `ListRecords` dengan dukungan *resumptionToken* dan pemulihan koneksi otomatis (*retry*). |
| **`scripts/harvest_all.py`** | Skrip orkestrator panen multi-sumber. Mengambil konfigurasi dari `data/institutions.json` dan menjalankan panen serentak untuk semua perpustakaan mitra. |
| **`scripts/preprocess.py`** | Jantung pemrosesan data: membersihkan string judul/pengarang, normalisasi nomor panggil DDC, pemetaan Program Studi UMS, membuang field kosong, menghasilkan `books.json`, serta otomatis mengompresi arsip `.gz` untuk Nginx. |
| **`scripts/scheduler.py`** | Worker latar belakang yang menjalankan pembaruan panen inkremental terjadwal (misal tiap jam 02:00 pagi) dan mencatat log status ke `data/scheduler_state.json`. |
| **`scripts/prodi_rules.py`** | Aturan klasifikasi DDC ke Program Studi dan Fakultas di Universitas Muhammadiyah Surakarta. |
| **`scripts/ddc_sections.py`** | Kamus pembagian 10 kelas utama, 100 divisi, dan ribuan seksi Dewey Decimal Classification (DDC) bahasa Indonesia & Inggris. |
| **`scripts/rebuild.py`** | Skrip pemintas untuk memproses ulang data hasil panen mentah di `output/` menjadi dataset siap saji di `data/`. |

---

### C. Backend API & Integrasi Luar (`proxy/`)
| File / Path | Peran & Fungsi Utama |
| :--- | :--- |
| **`proxy/app.py`** | Server API Flask: <br>• **Federated Search Engine:** Mengagregasi pencarian artikel ilmiah dari Scopus (Elsevier), OpenAlex, Crossref, ScienceDirect, Semantic Scholar, dan The Lens secara paralel.<br>• **Resilience & Caching:** Menggunakan `TTLCache` in-memory dan `CircuitBreaker` agar jika salah satu API luar down, pencarian tidak macet.<br>• **Admin Endpoints:** Manajemen autentikasi admin (`ADMIN_SECRET_KEY`), impor/ekspor CSV Jurnal & E-Book, streaming & upload file fisik PDF e-book, dan endpoint monitoring harvest. |
| **`proxy/requirements.txt`** | Dependensi Python produksi: `Flask`, `requests`, `python-dotenv`, `gunicorn`. |
| **`proxy/Dockerfile`** | Image container runtime Python untuk menjalankan gunicorn worker dan background scheduler. |

---

### D. Infrastruktur & Kontainerisasi (`docker/`)
| File / Path | Peran & Fungsi Utama |
| :--- | :--- |
| **`docker/nginx.conf`** | Konfigurasi server Nginx: Mengaktifkan `gzip_static on` (melayani file `.gz` instan tanpa beban CPU), routing SPA fallback, header keamanan (`nosniff`, `SAMEORIGIN`), dan proxy reverse ke backend Flask (`/api/`). |
| **`docker-compose.yml`** | Definisi 3 service Docker:<br>1. `web` (Nginx di port 8088)<br>2. `api_proxy` (Gunicorn 16 threads di port 5000)<br>3. `scheduler` (Background Python harvester) |
| **`Dockerfile`** | Image Nginx Alpine untuk container `web`. |

---

### E. Penyimpanan Data (`data/`)
*Catatan: Direktori `data/` diabaikan oleh Git via `.gitignore` agar repositori tetap ringan.*

* **`data/books.json` & `.gz`**: Dataset bibliografi lengkap (~136k judul).
* **`data/ddc_tree.json` & `.gz`**: Struktur pohon taksonomi DDC beserta jumlah bukunya.
* **`data/prodi_index.json` & `.gz`**: Indeks pemetaan ID buku ke kode prodi.
* **`data/stats.json`**: Ringkasan statistik agregat (total buku, penerbit, tahun tertua/terbaru, sebaran sumber).
* **`data/subscribed_journals.json`**: Database jurnal internasional resmi yang dilanggan UMS.
* **`data/subscribed_ebooks.json`**: Database e-book internasional yang dilanggan UMS.
* **`data/ebooks_pdf/`**: Folder fisik file PDF e-book yang diupload admin perpustakaan.
* **`data/institutions.json`**: Konfigurasi daftar server OAI-PMH perpustakaan mitra.

---

## 3. SOP Operasional & Perintah Pemeliharaan Rutin

### 1. Memulai / Merestart Seluruh Sistem (Docker)
```bash
# Menjalankan kontainer di latar belakang
docker compose up -d

# Memeriksa status kontainer
docker compose ps

# Membaca log real-time API Proxy
docker compose logs -f api_proxy
```

### 2. Menjalankan Panen Data Manual (On-Demand Harvest)
Jika ingin mengambil data terbaru dari Koha/EPrints sekarang:
```bash
# Masuk ke environment proyek
python scripts/harvest_all.py --mode incremental --days 7

# Atau rebuild dataset langsung dari file mentah terbaru:
python scripts/rebuild.py
```
*Catatan: Proses rebuild otomatis membuang string kosong dan membuat file `.gz` yang baru.*

### 3. Merilis Perubahan Frontend ke Browser Pengguna (Cache Invalidation)
Jika Anda mengubah file `js/app.js` atau `css/style.css`:
1. Buka [index.html](file:///d:/Code/harvest-koha/index.html), naikkan versi parameter pada tag script:
   ```html
   <script src="js/app.js?v=101"></script>
   ```
2. Buka [sw.js](file:///d:/Code/harvest-koha/sw.js), naikkan nama cache shell:
   ```javascript
   const CACHE_NAME_SHELL = 'onesearch-shell-v101';
   ```
3. Commit & push ke Git. Browser pengguna akan otomatis memperbarui cache dalam satu kali reload.

---

## 4. Panduan Troubleshooting Masalah Umum

### Q1: Dataset buku tidak muncul di web (loading terus)?
* **Penyebab:** File `data/books.json` belum di-generate atau permission file terhalang.
* **Solusi:** Jalankan `python scripts/rebuild.py`. Pastikan file `data/books.json` berukuran > 1 MB. Jika menggunakan docker, jalankan `docker compose restart web`.

### Q2: Pencarian Scopus / Jurnal Internasional menampilkan pesan error?
* **Penyebab:** Kunci API Scopus kedaluwarsa atau kuota habis, memicu `CircuitBreaker`.
* **Solusi:** Periksa `.env` dan pastikan `SCOPUS_API_KEY` valid. Cek statistik kesehatan cache & circuit breaker di browser: `http://localhost:8088/api/cache/stats`.

### Q3: Status Harvest di Admin stuck / macet bertuliskan "RUNNING"?
* **Penyebab:** Proses harvest terhenti tiba-tiba (misal server mati saat panen) sehingga file `data/scheduler_state.json` masih memegang status lock.
* **Solusi:** Buka menu Admin di web -> Klik tombol **"Reset Lock Scheduler"** atau hapus key `"status": "RUNNING"` di file `data/scheduler_state.json`.

### Q4: Perubahan konfigurasi Nginx (`docker/nginx.conf`) belum terasa?
* **Solusi:** Cukup reload Nginx tanpa mematikan container:
  ```bash
  docker exec ums-onesearch nginx -s reload
  ```

---
*Dokumen ini diperbarui secara berkala sesuai standar arsitektur minimalis & efisien (Ponytail standard).*
