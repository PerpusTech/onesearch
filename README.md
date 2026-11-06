# 📚 UMS Library OneSearch (BookFinder)

> **Portal Penemuan Pustaka Terpadu & Federated Scientific Discovery**  
> Perpustakaan Universitas Muhammadiyah Surakarta (UMS Library)

[![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](docker-compose.yml)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline%20Ready-5A0FC8?logo=pwa&logoColor=white)](sw.js)
[![UI System](https://img.shields.io/badge/UI-shadcn%20Zinc%20Tokens-09090b?logo=shadcnui&logoColor=white)](css/style.css)
[![Zero Framework](https://img.shields.io/badge/Zero--Framework-Vanilla%20JS%2FCSS-F7DF1E?logo=javascript&logoColor=black)](docs/ARCHITECTURE.md)
[![License](https://img.shields.io/badge/License-Proprietary%20UMS-blue.svg)]()

---

## 🌟 Ikhtisar Sistem

**UMS Library OneSearch** (*harvest-koha*) adalah sistem penemuan literatur ilmiah satu pintu (*single-window discovery system*) yang mengintegrasikan ratusan ribu koleksi fisik perpustakaan kampus (Koha ILS) bersama jutaan literatur ilmiah digital internasional (OpenAlex, Crossref, Semantic Scholar, DOAB, Scopus, Springer Nature) dalam satu antarmuka yang cepat, modern, dan tangguh.

Sistem dibangun dengan prinsip **Zero-Framework Architecture** (Vanilla HTML5, ES6+, dan CSS3 terstandarisasi *shadcn Zinc*), memberikan performa pemuatan instan tanpa *hydration overhead*, kapabilitas *PWA offline-first* sejati, serta ketahanan jangka panjang bebas masalah kadaluarsa dependensi (*zero dependency rot*).

---

## ✨ Fitur-Fitur Unggulan

- ⚡ **Mesin Temu Balik Klien Sub-5ms**: Memanfaatkan pustaka *FlexSearch* in-memory di peramban pengguna. Pencarian puluhan ribu koleksi buku lokal dieksekusi secara instan di sisi klien tanpa jeda latensi jaringan server.
- 🌐 **Federated Scientific Discovery Simultan**: Secara otomatis menyiarkan kueri pencarian ke pangkalan data terindeks dunia:
  - **OpenAlex** (Basis data ilmiah terbuka global)
  - **Crossref** (Pencocokan metadata DOI resmi)
  - **Elsevier Scopus** (Publikasi terindeks bereputasi langganan UMS)
  - **Springer Nature** (Jurnal & buku digital langganan resmi UMS)
  - **Semantic Scholar & The Lens** (Graf sitasi ilmiah bertenaga AI)
  - **DOAB & Open Library** (Koleksi e-book ilmiah bebas akses penuh)
- 📑 **Desain Modern shadcn Zinc**: Mengadopsi prinsip desain netral Zinc dengan tipografi tajam, kontras tinggi WCAG AA, dan dukungan *Dark/Light mode* otomatis.
- 📄 **In-Modal Streaming PDF Viewer**: Membaca dokumen naskah dan e-book langsung di dalam modal peramban tanpa terblokir proteksi header `X-Frame-Options` via proxy backend.
- 🎓 **Penelusuran Berbasis Kurikulum Program Studi**: Mahasiswa dapat menjelajahi literatur terkurasi berdasarkan Program Studi di UMS melalui pemetaan taksonomi DDC terpadu.
- 📋 **Generator Sitasi Akademik Lengkap**: Pembuatan sitasi instan standar APA, MLA, Chicago, serta ekspor metadata riset ke format `.RIS` (Mendeley, Zotero) dan `.BIB` (BibTeX / LaTeX).
- 📱 **Progressive Web App (PWA)**: Dapat diinstal langsung di layar utama smartphone dan komputer desktop dengan *Service Worker* caching.

---

## 🚀 Panduan Memulai Cepat (Quick Start)

### Menjalankan Menggunakan Docker Compose (Direkomendasikan)
```bash
# 1. Kloning repositori
git clone https://github.com/it-library-ums/harvest-koha.git
cd harvest-koha

# 2. Bangun dan jalankan container
docker-compose up -d --build
```

Akses aplikasi pada peramban Anda:
* **Antarmuka Utama Pengguna**: [http://localhost:8080](http://localhost:8080)
* **Konsol Manajemen Admin**: [http://localhost:8080/admin.html](http://localhost:8080/admin.html)

---

## 📚 Pusat Dokumentasi Teknis (Documentation Hub)

Dokumentasi sistem telah disusun secara modular dan terperinci di direktori [`docs/`](docs/README.md):

| Dokumen | Fokus Isi |
| :--- | :--- |
| 🗺️ [**Master Navigation Hub (docs/README.md)**](docs/README.md) | Indeks sentral seluruh modul dan peta penelusuran dokumentasi sistem. |
| 🚀 [**Developer Onboarding Guide**](docs/DEVELOPER_GUIDE.md) | Panduan setup lingkungan dev lokal (dengan & tanpa Docker), konvensi kode, alur Git, dan panduan debugging. |
| 🏛️ [**System Architecture & Philosophy**](docs/ARCHITECTURE.md) | Penjelasan filosofi Zero-Framework, diagram alur, mesin in-memory FlexSearch, dan spesifikasi shadcn Zinc. |
| 🌾 [**Harvesting & Data Pipeline**](docs/HARVESTING_PIPELINE.md) | Alur panen OAI-PMH Koha/SLiMS, normalisasi MARC21/Dublin Core, engine klasifikasi DDC/Prodi, dan cron lock. |
| 🔌 [**API Reference Catalog**](docs/API_REFERENCE.md) | Spesifikasi lengkap endpoint REST API Flask backend (`/api/...`), parameter, response schemas, dan autentikasi. |
| 🛠️ [**Maintenance & Operations SOP**](docs/MAINTENANCE.md) | Prosedur operasional standar pemeliharaan rutin, backup/restore, regenerasi data (`rebuild.py`), dan solusi insiden. |
| 📖 [**Tutorial Harvest OAI-PMH**](docs/harvest.md) | Panduan konfigurasi endpoint OAI-PMH dari Koha, EPrints, SLiMS, dan DSpace. |
| 🚢 [**Deployment Guide**](docs/DEPLOYMENT_GUIDE.md) | Panduan deployment server produksi Linux, Nginx reverse proxy, dan SSL HTTPS. |

---

## 🛠️ Ringkasan Perintah Pemeliharaan Rutin

```bash
# Melakukan panen data inkremental harian dari Koha
python scripts/harvest_all.py --from 2026-11-01

# Membangun ulang seluruh indeks katalog tanpa koneksi ulang ke OAI
python scripts/rebuild.py

# Memeriksa statistik hit cache federasi backend
curl http://localhost:8080/api/cache/stats

# Memantau log eksekusi container secara real-time
docker-compose logs -f proxy
```

---
© 2026 **Perpustakaan Universitas Muhammadiyah Surakarta**. All rights reserved.
