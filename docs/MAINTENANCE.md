# 🛠️ Panduan Pemeliharaan & Operasional Sistem (Maintenance SOP)
> **UMS Library OneSearch (harvest-koha)**  
> Standar Operasional Prosedur (SOP) bagi tim DevOps, Sysadmin, dan Pustakawan IT untuk pemeliharaan rutin, pencadangan data, pemulihan bencana (*disaster recovery*), dan penanganan insiden (*troubleshooting*).

---

## 📑 Daftar Isi
1. [Jadwal & Prosedur Pemeliharaan Rutin](#1-jadwal--prosedur-pemeliharaan-rutin)
2. [SOP Pencadangan & Pemulihan Data (Backup & Restore)](#2-sop-pencadangan--pemulihan-data-backup--restore)
   - [Pencadangan Otomatis Berjadwal (Cron)](#pencadangan-otomatis-berjadwal-cron)
   - [Pencadangan Manual via Dashboard Admin](#pencadangan-manual-via-dashboard-admin)
   - [Prosedur Pemulihan Data (*Disaster Recovery*)](#prosedur-pemulihan-data-disaster-recovery)
3. [Pembuatan Ulang Indeks & Regenerasi Data (`scripts/rebuild.py`)](#3-pembuatan-ulang-indeks--regenerasi-data-scriptsrebuildpy)
4. [SOP Penanganan Insiden (*Troubleshooting Guide*)](#4-sop-penanganan-insiden-troubleshooting-guide)
   - [Kasus A: Harvesting Macet atau Terblokir (`.harvest.lock`)](#kasus-a-harvesting-macet-atau-terblokir-harvestlock)
   - [Kasus B: Endpoint OAI-PMH Koha Mengembalikan Error 500 / Timeout](#kasus-b-endpoint-oai-pmh-koha-mengembalikan-error-500--timeout)
   - [Kasus C: Perubahan CSS/JS Tidak Muncul di Peramban Pengguna](#kasus-c-perubahan-cssjs-tidak-muncul-di-peramban-pengguna)
   - [Kasus D: Hasil Pencarian Internasional Kosong atau Lambat](#kasus-d-hasil-pencarian-internasional-kosong-atau-lambat)
5. [Monitoring Performa & Kesehatan Container Docker](#5-monitoring-performa--kesehatan-container-docker)

---

## 1. Jadwal & Prosedur Pemeliharaan Rutin

Untuk menjaga keandalan sistem penemuan pustaka, tim IT dianjurkan mengikuti matriks pemeliharaan berikut:

| Frekuensi | Tugas Pemeliharaan | Skrip / Tool | Target & Verifikasi |
| :--- | :--- | :--- | :--- |
| **Harian (01:00)** | Panen data inkremental dari Koha UMS | `scripts/harvest_all.py --from <yesterday>` | Memastikan buku baru kemarin masuk ke katalog. |
| **Mingguan (Ahad)**| Full rebuild & validasi konsistensi DDC | `python scripts/rebuild.py` | Memastikan indeks bebas dari rekaman korup. |
| **Bulanan** | Arsip snapshot backup master data | `tar -czvf backup_*.tar.gz data/` | Snapshot disimpan ke cold storage eksternal. |
| **Triwulanan** | Uji masa berlaku SSL & token API federasi | Browser & cURL testing | Sertifikat HTTPS & kuota API Scopus/OpenAlex. |

---

## 2. SOP Pencadangan & Pemulihan Data (Backup & Restore)

Data bibliografi yang telah dipanen dan dinormalisasi disimpan dalam direktori `data/`. Kehilangan folder ini dapat menyebabkan sistem harus melakukan harvesting ulang selama berjam-jam.

### Pencadangan Otomatis Berjadwal (Cron)
Buat skrip bash sederhana di server `/opt/scripts/backup_onesearch.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/onesearch"
PROJECT_DIR="/var/www/harvest-koha"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/onesearch_data_$DATE.tar.gz" -C "$PROJECT_DIR" data/

# Pertahankan hanya cadangan 14 hari terakhir untuk menghemat disk
find "$BACKUP_DIR" -name "onesearch_data_*.tar.gz" -mtime +14 -delete
```

### Pencadangan Manual via Dashboard Admin
1. Buka antarmuka admin di `http://<domain>/admin.html`.
2. Masuk ke tab **Backup & Snapshot**.
3. Klik tombol **"Buat Backup Baru Sekarang"**.
4. Sistem akan membuat arsip `.tar.gz` di folder `backups/` dan menampilkan tombol unduh ke komputer lokal.

### Prosedur Pemulihan Data (*Disaster Recovery*)
Jika terjadi kegagalan hardware atau korupsi file katalog:
```bash
# 1. Hentikan container sementara agar tidak ada penulisan data
docker-compose down

# 2. Masuk ke direktori proyek
cd /var/www/harvest-koha

# 3. Pulihkan folder data dari arsip cadangan
tar -xzf /var/backups/onesearch/onesearch_data_TERBARU.tar.gz

# 4. Bangun ulang file index dan periksa keutuhan
python scripts/rebuild.py

# 5. Nyalakan kembali container
docker-compose up -d
```

---

## 3. Pembuatan Ulang Indeks & Regenerasi Data (`scripts/rebuild.py`)

Gunakan skrip `scripts/rebuild.py` apabila Anda memodifikasi aturan pemetaan DDC (`scripts/ddc_sections.py`), aturan Program Studi (`scripts/prodi_rules.py`), atau jika file `data/books.json` perlu disusun ulang dari raw XML tanpa melakukan koneksi jaringan ulang ke server Koha:

```bash
# Jalankan pembangunan ulang data
python scripts/rebuild.py
```

Skrip ini akan:
1. Membaca seluruh file XML/JSON mentah di direktori `data/raw/`.
2. Menjalankan sanitasi teks dan validasi nomor panggil DDC.
3. Memetakan ulang seluruh judul ke Program Studi.
4. Menghasilkan file `data/books.json`, file chunking `data/books_chunk_*.json`, serta statistik agregat di `data/stats.json`.
5. Mengompresi file ke format `.gz` untuk optimasi `gzip_static` Nginx.

---

## 4. SOP Penanganan Insiden (*Troubleshooting Guide*)

### Kasus A: Harvesting Macet atau Terblokir (`.harvest.lock`)
* **Gejala**: Menjalankan harvest baru menghasilkan pesan *"Proses panen lain sedang aktif"* padahal tidak ada proses yang berjalan di server.
* **Penyebab**: Server mengalami restart mendadak atau proses Python sebelumnya dimatikan paksa (*SIGKILL*) sehingga file lock tidak sempat dibersihkan.
* **Solusi**:
  1. Periksa apakah benar tidak ada proses harvester yang aktif:
     ```bash
     ps aux | grep harvest
     ```
  2. Jika tidak ada, hapus file lock secara manual:
     ```bash
     rm .harvest.lock
     ```
     Atau klik tombol **"Buka Paksa Kunci (.harvest.lock)"** pada panel Admin Web.

---

### Kasus B: Endpoint OAI-PMH Koha Mengembalikan Error 500 / Timeout
* **Gejala**: Skrip `harvest_oai.py` berhenti dengan pesan `HTTP Error 500: Internal Server Error` saat meminta batch dengan `resumptionToken`.
* **Penyebab**: Server Koha kehabisan memori (*out of memory*) atau tabel sesi OAI di MySQL Koha korup saat menyusun batch XML yang terlalu besar.
* **Solusi**:
  1. Turunkan ukuran batch rekaman pada konfigurasi harvester atau tambahkan jeda waktu:
     ```bash
     python scripts/harvest_oai.py --delay 2.0 --retry 5
     ```
  2. Buka database Koha dan periksa tabel `oai_resumption_tokens`. Lakukan `OPTIMIZE TABLE oai_resumption_tokens;` jika diperlukan.
  3. Lakukan panen inkremental (`--from`) untuk mengurangi jumlah baris data yang ditarik.

---

### Kasus C: Perubahan CSS/JS Tidak Muncul di Peramban Pengguna
* **Gejala**: Pengembang sudah mengedit `css/style.css` atau `js/app.js`, namun saat web diakses publik, tampilan lama masih terlihat.
* **Penyebab**: **Service Worker PWA** mencache shell lama secara agresif (*Cache-First strategy*).
* **Solusi Wajib**:
  1. Buka file `sw.js` dan naikkan versi string cache:
     ```javascript
     const CACHE_NAME_SHELL = 'onesearch-shell-v127'; // Versi dinaikkan
     ```
  2. Buka `index.html` dan perbarui query parameter versi pada tag stylesheet dan script:
     ```html
     <link rel="stylesheet" href="css/style.css?v=127">
     <script src="js/app.js?v=127"></script>
     ```
  3. Ketika pengguna membuka kembali aplikasi, Service Worker versi baru akan terdeteksi di latar belakang, mengunduh aset baru, dan menggantikan cache lama saat halaman dimuat ulang.

---

### Kasus D: Hasil Pencarian Internasional Kosong atau Lambat
* **Gejala**: Tab literatur internasional atau rekomendasi jurnal tidak memunculkan hasil dan berputar lama (*loading spinner* tak kunjung selesai).
* **Penyebab**: Kuota API eksternal (misal Elsevier Scopus atau OpenAlex) melampaui ambang batas harian, atau koneksi keluar (*egress*) server terblokir firewall.
* **Solusi**:
  1. Periksa log container backend:
     ```bash
     docker-compose logs --tail=100 proxy
     ```
  2. Periksa status hit cache:
     ```bash
     curl http://localhost:8080/api/cache/stats
     ```
  3. Bersihkan memori cache jika data kotor tersimpan:
     ```bash
     curl -X POST http://localhost:8080/api/cache/clear
     ```
  4. Uji konektivitas keluar server ke API OpenAlex:
     ```bash
     curl -I "https://api.openalex.org/works?search=test"
     ```

---

## 5. Monitoring Performa & Kesehatan Container Docker

Untuk memeriksa konsumsi CPU dan RAM container UMS OneSearch di server produksi:

```bash
# Memeriksa status kesehatan container
docker-compose ps

# Memantau penggunaan memori secara real-time
docker stats harvest-koha-web-1 harvest-koha-proxy-1

# Memeriksa log error Nginx
docker-compose logs -f web
```

Rata-rata konsumsi memori normal:
* Container **Web (Nginx)**: ~15 MB - 30 MB RAM.
* Container **Proxy (Gunicorn/Flask)**: ~120 MB - 250 MB RAM (termasuk in-memory TTLCache).
