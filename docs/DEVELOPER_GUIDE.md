# 🚀 Panduan Pengembang (Developer Onboarding Guide)
> **UMS Library OneSearch (harvest-koha)**  
> Panduan komprehensif bagi pengembang untuk instalasi lokal, arsitektur kode, konvensi, dan alur penambahan fitur.

---

## 📑 Daftar Isi
1. [Prasyarat Sistem & Alat Pengembangan](#1-prasyarat-sistem--alat-pengembangan)
2. [Instalasi & Pengaturan Lingkungan Lokal](#2-instalasi--pengaturan-lingkungan-lokal)
   - [Metode A: Menggunakan Docker Compose (Direkomendasikan)](#metode-a-menggunakan-docker-compose-direkomendasikan)
   - [Metode B: Menjalankan Langsung Tanpa Docker (Native)](#metode-b-menjalankan-langsung-tanpa-docker-native)
3. [Struktur Direktori Proyek](#3-struktur-direktori-proyek)
4. [Konvensi Kode & Standar Kualitas](#4-konvensi-kode--standar-kualitas)
5. [Alur Kerja Pengembangan Fitur](#5-alur-kerja-pengembangan-fitur)
   - [Mengedit Tampilan UI & Desain (CSS/HTML)](#mengedit-tampilan-ui--desain-csshtml)
   - [Memperbarui Logika Pencarian Klien (`js/search.js` & `js/app.js`)](#memperbarui-logika-pencarian-klien-jssearchjs--jsappjs)
   - [Menambahkan Endpoint API Baru di Backend (`proxy/app.py`)](#menambahkan-endpoint-api-baru-di-backend-proxyapppy)
   - [Menjalankan Harvesting Data Uji](#menjalankan-harvesting-data-uji)
6. [Debugging & Penanganan Masalah Cache](#6-debugging--penanganan-masalah-cache)

---

## 1. Prasyarat Sistem & Alat Pengembangan

Sebelum memulai pengembangan, pastikan workstation Anda telah terpasang:
* **Python**: Versi `3.10` atau lebih tinggi (wajib untuk skrip data pipeline dan backend Flask proxy).
* **Git**: Untuk manajemen versi source code.
* **Peramban Modern**: Google Chrome, Mozilla Firefox, atau Microsoft Edge (dengan fasilitas DevTools yang memadai).
* **Node.js** (Opsional, v18+): Bermanfaat untuk eksekusi skrip audit/validasi CSS sintaks dan testing ringan lokal.
* **Docker & Docker Compose** (Opsional namun sangat disarankan): Untuk menjalankan container Nginx & Flask dengan konfigurasi identik dengan server produksi.

---

## 2. Instalasi & Pengaturan Lingkungan Lokal

### Metode A: Menggunakan Docker Compose (Direkomendasikan)

Ekosistem Docker Compose telah dikonfigurasi untuk menjalankan dua layanan utama:
1. **`web` (Nginx)**: Menyajikan file statis (HTML, CSS, JS, data JSON katalog) dan bertindak sebagai Reverse Proxy yang meneruskan rute `/api/*` ke backend.
2. **`proxy` (Python Flask / Gunicorn)**: Menyediakan API federasi ilmiah internasional, proxy PDF, dan panel manajemen admin.

Langkah eksekusi:
```bash
# 1. Masuk ke direktori repositori
cd harvest-koha

# 2. Salin contoh environment jika diperlukan
# (Secara default proxy/app.py telah memiliki konfigurasi default yang aman)

# 3. Bangun dan jalankan container
docker-compose up -d --build

# 4. Pantau log container jika diperlukan
docker-compose logs -f proxy
```
Aplikasi kini aktif di:
* Antarmuka Utama: `http://localhost:8080/`
* Konsol Admin: `http://localhost:8080/admin.html` (Password default dapat diatur via environment atau konfigurasi admin).

---

### Metode B: Menjalankan Langsung Tanpa Docker (Native)

Jika Anda ingin melakukan debugging breakpoint langsung pada kode Python backend:

#### 1. Siapkan Python Virtual Environment
```bash
# Di Linux / macOS:
python3 -m venv .venv
source .venv/bin/activate

# Di Windows (PowerShell):
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

#### 2. Instalasi Dependensi Backend
```bash
pip install -r proxy/requirements.txt
```

#### 3. Jalankan Server Flask Backend
```bash
# Jalankan backend API proxy pada port 5000
python proxy/app.py
```
Backend akan aktif di `http://127.0.0.1:5000`.

#### 4. Jalankan Server Statis Frontend
Pada jendela terminal terpisah (agar file statis tidak terkena batasan CORS peramban ketika mengakses `file://`):
```bash
# Menggunakan modul bawaan Python (Port 8080):
python -m http.server 8080

# ATAU menggunakan pustaka Node.js live-server (jika terpasang):
npx live-server --port=8080 --proxy=/api:http://127.0.0.1:5000/api
```

> [!NOTE]
> Jika menggunakan `python -m http.server`, panggilan fetch ke `/api/...` pada browser perlu diteruskan ke port 5000. Penggunaan `docker-compose` menyelesaikan masalah ini secara otomatis melalui Nginx reverse proxy internal.

---

## 3. Struktur Direktori Proyek

```text
harvest-koha/
├── css/
│   ├── style.css           # Styling utama aplikasi (shadcn Zinc tokens, utility, responsivitas)
│   └── admin.css           # Styling terpisah khusus dashboard konsol admin
├── js/
│   ├── app.js              # Controller utama aplikasi (DOM, filter, modal, bookmark, routing)
│   ├── search.js           # FlexSearch in-memory engine (indexing, tokenization, scoring)
│   ├── recommender.js      # Algoritma rekomendasi DDC dan keterkaitan buku
│   ├── admin.js            # Controller interaktif antarmuka dashboard admin
│   └── lib/
│       ├── flexsearch.bundle.js  # Pustaka pencarian teks lengkap FlexSearch
│       └── pdf.js / pdf.worker.js # PDF.js untuk rendering preview dokumen
├── data/
│   ├── books.json          # Master data katalog bibliografi hasil harvesting
│   ├── books_chunk_*.json  # Potongan data terfragmentasi untuk pemuatan cepat
│   ├── institutions.json   # Konfigurasi endpoint OAI-PMH kampus/institusi mitra
│   └── ddc_rules.json      # Kamus mapping taksonomi Dewey Decimal Classification
├── proxy/
│   ├── app.py              # Server Flask REST API (Federasi ilmiah, PDF proxy, Admin API)
│   ├── Dockerfile          # Spesifikasi container backend
│   └── requirements.txt    # Daftar dependensi Python (Flask, requests, cachetools, gunicorn)
├── scripts/
│   ├── harvest_all.py      # Orkestrator batch harvesting multi-institusi
│   ├── harvest_oai.py      # Harvester universal protokol OAI-PMH (Koha/EPrints/SLiMS)
│   ├── preprocess.py       # Normalisasi XML/MARC21/Dublin Core menjadi format JSON
│   ├── analyze_ddc.py      # Mesin analisis & klasifikasi nomor panggil DDC
│   ├── prodi_rules.py      # Pemetaan DDC ke program studi di UMS
│   ├── rebuild.py          # Utilitas pembuatan ulang indeks data
│   └── scheduler.py        # Cron job runner otomatisasi pembaruan berkala
├── docs/                   # Direktori dokumentasi teknis komprehensif
├── index.html              # Shell antarmuka penelusuran utama pengguna
├── admin.html              # Antarmuka konsol manajemen data & harvester
├── sw.js                   # Service Worker (PWA offline caching & lifecycle)
├── docker-compose.yml      # Orkestrasi container Docker
└── nginx.conf              # Konfigurasi Nginx produksi & reverse proxy
```

---

## 4. Konvensi Kode & Standar Kualitas

### A. JavaScript (Frontend)
1. **Zero-Framework Standard**: Jangan memasukkan runtime React, Vue, Angular, atau build bundler (Webpack/Vite) ke frontend utama. Antarmuka harus dapat berjalan langsung saat dibuka di browser.
2. **ES6+ Modern**: Gunakan `const`/`let`, *arrow functions*, *async/await*, *destructuring*, dan *template literals*.
3. **Penyimpanan State**: State antarmuka dikelola secara terpusat di objek `app` (`js/app.js`), sedangkan state pencarian di objek `SearchEngine` (`js/search.js`).
4. **Keamanan Sanitasi DOM**: Selalu gunakan fungsi pembantu `this.esc(str)` sebelum menyisipkan string dinamis dari input pengguna ke dalam `innerHTML` untuk mencegah celah Cross-Site Scripting (XSS).

### B. Desain & CSS (`css/style.css`)
1. **Design Tokens shadcn Zinc**: Selalu gunakan variabel CSS root yang sudah distandarisasi:
   - Warna Netral: `var(--background)`, `var(--foreground)`, `var(--card)`, `var(--border)`, `var(--muted)`.
   - Warna Aksen/Primer: `hsl(var(--primary))`, `hsl(var(--primary-foreground))`.
   - Radius Komponen: `var(--radius-sm)`, `var(--radius-md)`, `var(--radius-lg)`.
2. **Komponen Standar**: Manfaatkan kelas komponen terpadu:
   - Tombol: `.btn`, `.btn-brand` (primer hitam), `.btn-outline`, `.btn-ghost`.
   - Kartu: `.card` atau `.bk-card`.
   - Form: `.input`, `.select`.
   - Badge: `.badge`, `.badge-secondary`.
3. **Validasi Sintaks CSS**: Setelah mengedit `css/style.css`, selalu pastikan jumlah kurung kurawal buka `{` dan tutup `}` seimbang agar aturan `@media` responsive tidak terputus.

### C. Python (Backend & Skrip Pipeline)
1. **Gaya Penulisan**: Ikuti standar **PEP 8**. Gunakan type hints pada deklarasi fungsi publik.
2. **Encoding Safety**: Skrip pipeline wajib menyertakan rekonfigurasi stdout UTF-8:
   ```python
   if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
       sys.stdout.reconfigure(encoding='utf-8', errors='replace')
   ```
3. **Penanganan Error**: Jangan pernah biarkan skrip batch harvesting berhenti secara fatal karena 1 record rusak. Bungkus parsing XML individual dalam blok `try...except` dan log kegagalan.

---

## 5. Alur Kerja Pengembangan Fitur

### Mengedit Tampilan UI & Desain (CSS/HTML)
1. Buka `index.html` atau `css/style.css`.
2. Lakukan perubahan markup atau styling.
3. **PENTING - Siklus Pembaruan Service Worker**:
   Ketika Anda mengubah `css/style.css` atau file JS di `js/`, browser pengguna tidak akan memuat file baru jika Service Worker masih mencache versi lama.
   * Tingkatkan versi string cache di baris 1 `sw.js`:
     ```javascript
     const CACHE_NAME_SHELL = 'onesearch-shell-v127'; // Naikkan versi
     ```
   * Perbarui query string pada `index.html`:
     ```html
     <link rel="stylesheet" href="css/style.css?v=127">
     <script src="js/app.js?v=127"></script>
     ```

### Memperbarui Logika Pencarian Klien (`js/search.js`)
Jika Anda memodifikasi bobot skor field atau penambahan indeks token:
1. Periksa metode `init()` dan `buildIndex()` di `js/search.js`.
2. Uji pencarian dengan kata kunci tunggal, multi-kata, frasa berhuruf besar/kecil, dan ejaan alternatif.
3. Pastikan latensi eksekusi pencarian lokal tetap berada di bawah 20ms untuk dataset 50.000+ judul.

### Menambahkan Endpoint API Baru di Backend (`proxy/app.py`)
1. Daftarkan rute baru menggunakan dekorator `@app.route('/api/...', methods=['...'])`.
2. Jika endpoint melakukan panggilan ke internet (misal API jurnal eksternal), gunakan modul caching internal `TTLCache` agar respons tersimpan sementara dan tidak membebani kuota API.
3. Selalu kembalikan respons dengan format JSON standar:
   ```python
   return jsonify({
       "status": "success",
       "data": result_data
   }), 200
   ```

### Menjalankan Harvesting Data Uji
Untuk menguji skrip harvesting tanpa memakan waktu lama:
```bash
# Uji panen 50 rekaman pertama saja dari endpoint Koha lokal
python scripts/harvest_oai.py --url "https://koha.ums.ac.id/cgi-bin/koha/oai.pl" --limit 50 --output test_harvest.json

# Jalankan pra-pemrosesan data uji
python scripts/preprocess.py --input test_harvest.json --output test_data/
```

---

## 6. Debugging & Penanganan Masalah Cache

Saat mengembangkan antarmuka web dengan Service Worker aktif, browser cenderung mempertahankan aset statis dalam jangka panjang. Berikut cara efektif melakukan debugging:

1. **Buka DevTools Chrome / Edge (`F12`)**:
   - Pindah ke tab **Application** > menu samping **Service Workers**.
   - Centang kotak **"Update on reload"** dan **"Bypass for network"**.
   - Klik tombol **"Unregister"** jika ingin membersihkan Service Worker secara total saat pengujian berat.
2. **Hard Refresh**:
   Gunakan kombinasi tombol `Ctrl + F5` (Windows/Linux) atau `Cmd + Shift + R` (macOS) untuk memaksa peramban mengunduh ulang seluruh file HTML, CSS, dan JS.
3. **Memeriksa Isi In-Memory FlexSearch**:
   Buka tab **Console** di DevTools dan ketik objek global:
   ```javascript
   // Melihat jumlah buku yang tersimpan di memori browser
   console.log(window.booksData.length);

   // Menguji pencarian langsung via console
   console.log(window.SearchEngine.search("kecerdasan buatan"));
   ```

