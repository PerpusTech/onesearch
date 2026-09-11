# 📚 UMS OneSearch (BookFinder)

> **Portal Penemuan Pustaka Terpadu & Federated Scientific Discovery**  
> Perpustakaan Universitas Muhammadiyah Surakarta (UMS Library)

[![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](docker-compose.yml)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline%20Ready-5A0FC8?logo=pwa&logoColor=white)](sw.js)
[![License](https://img.shields.io/badge/License-Proprietary%20UMS-blue.svg)]()

---

## 🌟 Fitur Utama

- 🔍 **Pencarian Buku Lokal Instan (Offline-First)**: Didukung mesin pencarian klien berbasis *FlexSearch* berkecepatan tinggi (< 10ms) untuk katalog buku fisik Koha UMS dan mitra SLiMS.
- 🌐 **Federated Discovery Jurnal Internasional**: Agregasi pencarian *real-time* ke pangkalan data terindeks global:
  - **Elsevier Scopus**
  - **Springer Nature**
  - **Semantic Scholar**
  - **The Lens**
  - **OpenAlex Global OA**
  - **Crossref**
  - **Emerald Insight**
- 📄 **In-Modal PDF Streaming & Previewer**: Pratinjau dokumen PDF Open Access secara langsung di dalam modal tanpa terblokir `X-Frame-Options` melalui `/api/pdf_proxy`.
- 📋 **Format Sitasi Akademik Lengkap**: Pembuatan sitasi otomatis standar APA, MLA, Chicago, serta ekspor format `.RIS` (Mendeley/Zotero) dan `.BIB` (BibTeX/LaTeX).
- 🏷️ **Logo & Visual Badging Resmi**: Tampilan badge sumber berbasis logo SVG asli untuk setiap publisher dan indikator visual Open Access / Subscription.
- 🌓 **Dark & Light Mode**: Desain glassmorphism modern dengan tombol pengalih tema melayang (*Floating Action Button*) yang responsif.
- 📱 **Progressive Web App (PWA)**: Dapat diinstal di desktop/smartphone dengan dukungan *caching shell & data*.

---

## 🚀 Panduan Memulai Cepat (Quick Start)

### 1. Salin Konfigurasi Environment
```bash
cp .env.example .env
```
Sesuaikan kunci API pada file `.env` (seperti `SCOPUS_API_KEY`, `LENS_API_KEY`, `SPRINGER_API_KEY`, dll.).

### 2. Jalankan dengan Docker Compose
```bash
docker compose up -d
```

Akses layanan:
- **Aplikasi Web (Frontend)**: [http://localhost:8088](http://localhost:8088)
- **Status Container**: `docker compose ps`
- **Logs Backend Proxy**: `docker compose logs -f api_proxy`

---

## 📖 Dokumentasi Lengkap

Dokumentasi arsitektur, panduan teknis, dan pemeliharaan mendalam tersedia di:
- 📑 [**Dokumentasi Sistem Lengkap (docs/SYSTEM_DOCUMENTATION.md)**](docs/SYSTEM_DOCUMENTATION.md)  
  *Membahas diagram alur, struktur direktori, detail komponen frontend/backend, dan checklist pemeliharaan.*
- 🚀 [**Panduan Deployment Produksi (docs/DEPLOYMENT_GUIDE.md)**](docs/DEPLOYMENT_GUIDE.md)  
  *Panduan konfigurasi reverse proxy Nginx host, SSL/HTTPS, dan auto-restart server.*
- 🌾 [**Alur Harvesting Data (docs/harvest.md)**](docs/harvest.md)  
  *Proses pemanenan OAI-PMH dari Koha hingga pembuatan indeks.*

---

## 🛠️ Perintah Pemeliharaan Rutin

| Kebutuhan | Perintah |
| :--- | :--- |
| **Restart Backend Proxy** | `docker compose restart api_proxy` |
| **Update Frontend (CSS/JS)** | Naikkan nomor versi di `index.html` dan `sw.js` (contoh: `?v=83`), lalu jalankan restart proxy. |
| **Cek Statistik Cache Proxy** | Buka `http://localhost:8088/api/cache/stats` di browser. |
| **Panen Ulang Data Koha** | Jalankan `python scripts/harvest_all.py` diikuti `python scripts/preprocess.py`. |

---
© 2026 **Perpustakaan Universitas Muhammadiyah Surakarta**. All rights reserved.
