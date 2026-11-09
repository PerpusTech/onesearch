# 📚 Dokumentasi Teknis UMS Library OneSearch (BookFinder)
> **Pusat Navigasi & Master Index Dokumentasi Pengembang dan Pemeliharaan Sistem**  
> Perpustakaan Universitas Muhammadiyah Surakarta (UMS Library)  
> Terakhir diperbarui: November 2026 | Versi Sistem: v136 (shadcn Zinc Design System)

Selamat datang di repositori dokumentasi teknis **UMS Library OneSearch** (*harvest-koha*). Direktori ini dirancang khusus sebagai panduan menyeluruh bagi pengembang perangkat lunak (*software engineers*), administrator sistem (*sysadmins*), pustakawan IT, dan peneliti yang ingin memahami, memelihara, maupun memperluas kapabilitas sistem temu balik informasi perpustakaan terpadu ini.

---

## 🗺️ Peta Navigasi Dokumentasi (Sitemap)

Untuk mempermudah penelusuran, dokumentasi sistem dibagi menjadi beberapa modul independen dan terfokus:

| Modul Dokumen | Target Pembaca | Fokus Utama |
| :--- | :--- | :--- |
| 🚀 [**Developer Onboarding Guide**](file:///d:/Code/harvest-koha/docs/DEVELOPER_GUIDE.md) | Pengembang Baru | Panduan penyiapan lingkungan dev lokal (dengan & tanpa Docker), instalasi dependency, struktur direktori, konvensi kode, panduan debugging, dan alur kerja Git. |
| 🏛️ [**System Architecture & Philosophy**](file:///d:/Code/harvest-koha/docs/ARCHITECTURE.md) | Arsitek & Software Engineer | Filosofi arsitektur *Zero-Framework* (Vanilla JS/CSS/PWA), mesin temu balik FlexSearch client-side, arsitektur *Federated Search Broadcasting*, *hybrid metadata caching* (SQLite WAL & IndexedDB), dan spesifikasi *shadcn Zinc Design System*. |
| 🌾 [**Harvesting & Data Pipeline**](file:///d:/Code/harvest-koha/docs/HARVESTING_PIPELINE.md) | IT Perpustakaan & Data Engineer | Protokol OAI-PMH, normalisasi metadata (MARC21 & Dublin Core), *engine* klasifikasi DDC & Prodi, kompresi chunk data, manajemen penjadwal (*scheduler*), dan mekanisme *file locking*. |
| 🔌 [**API Reference Catalog**](file:///d:/Code/harvest-koha/docs/API_REFERENCE.md) | Fullstack Engineer | Spesifikasi lengkap seluruh *endpoint* REST API Flask/Gunicorn backend (`/api/...`), *institutional cache* & telemetri baca artikel (SQLite WAL), manajemen sesi admin, proxy PDF streaming anti-*frame-blocking*, parameter, dan skema respons JSON. |
| 🛠️ [**Maintenance & Operations SOP**](file:///d:/Code/harvest-koha/docs/MAINTENANCE.md) | DevOps & Sysadmin | Standar Operasional Prosedur (SOP) pemeliharaan berkala, backup & restore snapshot katalog, rebuild indeks FlexSearch, audit performa, serta penanganan insiden (*troubleshooting*). |
| 📖 [**Tutorial Harvest OAI-PMH**](file:///d:/Code/harvest-koha/docs/harvest.md) | Pustakawan Sistem | Panduan praktis integrasi endpoint OAI-PMH dari berbagai ILS/IR (Koha, EPrints, SLiMS, DSpace). |
| 🚢 [**Deployment Guide**](file:///d:/Code/harvest-koha/docs/DEPLOYMENT_GUIDE.md) | DevOps & Webmaster | Panduan deploy aplikasi statis dan proxy container ke lingkungan server produksi. |

---

## ⚡ Panduan Cepat (Quick Start untuk Pengembang Baru)

Jika Anda baru pertama kali bergabung dan ingin segera menjalankan aplikasi di mesin lokal:

### 1. Kloning Repositori & Persiapan Direktori
```bash
git clone https://github.com/it-library-ums/harvest-koha.git
cd harvest-koha
```

### 2. Jalankan Menggunakan Docker Compose (Direkomendasikan)
Cara tercepat untuk menjalankan seluruh ekosistem (Frontend Nginx, Backend Flask/Gunicorn Proxy, dan Volume Cache):
```bash
docker-compose up -d --build
```
Akses sistem melalui browser:
* **Antarmuka Pencarian Pengguna**: [http://localhost:8080](http://localhost:8080)
* **Konsol Manajemen Admin**: [http://localhost:8080/admin.html](http://localhost:8080/admin.html)

### 3. Alternatif Menjalankan Tanpa Docker (Lingkungan Python Lokal)
Jika Anda ingin mengembangkan atau menguji skrip harvesting secara langsung:
```bash
# Siapkan virtual environment Python 3.10+
python -m venv .venv
source .venv/bin/activate  # Di Windows PowerShell: .\.venv\Scripts\Activate.ps1

# Pasang dependency backend & scraper
pip install -r proxy/requirements.txt

# Jalankan backend API Proxy
python proxy/app.py

# Pada terminal lain, sajikan frontend statis (misal dengan live-server atau Python http.server)
python -m http.server 8080
```

---

## 💡 Konsep Utama Sistem

1. **Client-Side In-Memory Search Engine**:
   Berbeda dengan arsitektur pencarian web konvensional yang mengirim setiap penekanan tombol (*keystroke*) ke Elasticsearch atau database SQL server, UMS OneSearch mengunduh indeks bibliografi terkompresi (`data/books.json`) ke memori peramban klien. Pencarian dilakukan secara lokal menggunakan pustaka berkecepatan tinggi **FlexSearch** dengan latensi eksekusi di bawah 5 milidetik (*sub-5ms*).
2. **Federated Scientific Discovery**:
   Ketika pengguna mengetik kata kunci pencarian, sistem secara bersamaan (*parallel broadcast*) menanyakan API ilmiah internasional terkemuka (**OpenAlex**, **Crossref**, **Semantic Scholar**, **The Lens**, **DOAB**, **Open Library**, dan koleksi langganan resmi UMS seperti **Scopus** dan **Springer**).
3. **Resiliensi & PWA Offline-First**:
   Dilengkapi dengan **Service Worker** (`sw.js`) tingkat lanjut. Seluruh antarmuka statis, shell aplikasi, dan data katalog perpustakaan dicache secara cerdas di Cache Storage peramban, memungkinkan aplikasi tetap dapat dibuka dan mencari buku meskipun koneksi internet terputus.
4. **Desain Modern shadcn Zinc**:
   UI dibangun tanpa framework berat (No React, No Tailwind CLI transpile), namun mengadopsi standar desain industri terkini menggunakan CSS Custom Properties (Design Tokens) netral Zinc, tipografi tajam, dan kontras tinggi sesuai standar aksesibilitas WCAG AA.

---

## 📞 Kontak & Dukungan
* **Penyusun & Pemelihara**: Tim TI Perpustakaan Universitas Muhammadiyah Surakarta
* **Repositori Kode**: Internal GitLab / GitHub UMS Library
* **Isu & Pelaporan Bug**: Buat tiket melalui menu pelaporan bug internal atau kontak staf pengembang sistem.

