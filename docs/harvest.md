# 📚 Tutorial Harvest OAI-PMH — UMS Library OneSearch

Panduan lengkap cara mengharvest data bibliografi dari berbagai sumber perpustakaan menggunakan protokol OAI-PMH.

---

## Daftar Isi

1. [Apa itu OAI-PMH?](#1-apa-itu-oai-pmh)
2. [Sistem yang Didukung](#2-sistem-yang-didukung)
3. [Persiapan](#3-persiapan)
4. [Cek Info Endpoint](#4-cek-info-endpoint)
5. [Harvest Data](#5-harvest-data)
6. [Rebuild Data untuk Web App](#6-rebuild-data-untuk-web-app)
7. [Multi-Sumber (Gabung Data)](#7-multi-sumber-gabung-data)
8. [Update Incremental](#8-update-incremental)
9. [Resume Harvest yang Terputus](#9-resume-harvest-yang-terputus)
10. [Troubleshooting](#10-troubleshooting)
11. [Referensi Endpoint](#11-referensi-endpoint)

---

## 1. Apa itu OAI-PMH?

**OAI-PMH** (Open Archives Initiative Protocol for Metadata Harvesting) adalah protokol standar untuk mengambil metadata dari repositori digital. Hampir semua sistem perpustakaan modern mendukung OAI-PMH:

- **Koha** → `/cgi-bin/koha/oai.pl`
- **SLiMS (Senayan)** → `/oai2.php`
- **EPrints** → `/cgi/oai2`
- **DSpace** → `/oai/request`
- **Inlislite** → `/oai`

Format metadata yang umum:
| Format | Keterangan |
|--------|------------|
| `marcxml` | MARC 21 XML — paling lengkap (judul, pengarang, DDC, ISBN, dll) |
| `oai_dc` | Dublin Core — standar minimal (judul, pengarang, subjek, tanggal) |

> **Harvester UMS Library OneSearch otomatis memilih format terbaik** (`marcxml` jika tersedia, fallback ke `oai_dc`).

---

## 2. Sistem yang Didukung

| Sistem | Format | DDC | Tipe ID | Status |
|--------|--------|-----|---------|--------|
| **Koha** | marcxml, oai_dc | ✅ Langsung dari MARC 082 | Angka (contoh: `12345`) | ✅ Teruji |
| **SLiMS** | oai_dc | ✅ Dari `dc:subject` / `dc:identifier` | `sl-1`, `sl-2`, ... | ✅ Teruji |
| **EPrints** | oai_dc | ⚠️ Dikonversi dari LC Subject | `ep-3061`, `ep-5048`, ... | ✅ Teruji |
| **DSpace** | oai_dc, marcxml | ✅/⚠️ Tergantung konfigurasi | `ds-xxx` | Belum diuji |
| **Inlislite** | oai_dc | ⚠️ Tergantung input data | `oa-xxx` | Belum diuji |

---

## 3. Persiapan

### Kebutuhan
- Python 3.6 atau lebih baru
- Koneksi internet ke server perpustakaan target

### Struktur File
```
harvest-koha/
├── harvest_oai.py      ← Harvester universal
├── preprocess.py       ← Konversi data mentah → format web app
├── rebuild.py          ← Gabung & rebuild otomatis
├── output/             ← Hasil harvest (JSON, CSV)
├── data/               ← Data siap pakai untuk web app
│   ├── books.json
│   ├── ddc_tree.json
│   ├── subjects.json
│   └── stats.json
└── harvest.md          ← File ini
```

---

## 4. Cek Info Endpoint

Sebelum harvest, **selalu cek dulu** apakah endpoint aktif dan format apa yang tersedia:

```bash
python harvest_oai.py --url http://ALAMAT_SERVER/PATH_OAI --info
```

### Contoh:

```bash
# Cek Koha UMS
python harvest_oai.py --url http://172.16.10.43/cgi-bin/koha/oai.pl --info

# Cek EPrints UMS
python harvest_oai.py --url http://eprints.ums.ac.id/cgi/oai2 --info

# Cek SLiMS SMA Batik 1 Surakarta
python harvest_oai.py --url https://lib-smabasasolo.edutrend.id/oai2.php --info
```

### Output yang diharapkan:
```
=== Repository Info ===
  repositoryName: Perpustakaan SMA Batik 1 Surakarta
  baseURL: https://lib-smabasasolo.edutrend.id/oai2.php
  protocolVersion: 2.0

=== Metadata Formats ===
  - oai_dc

=== Sets ===
  (none)

(Info mode — no harvesting)
```

> Jika muncul error koneksi, pastikan URL benar dan server bisa diakses dari komputer Anda.

---

## 5. Harvest Data

### 5.1 Harvest Otomatis (Disarankan)

Harvester akan otomatis memilih format metadata terbaik:

```bash
python harvest_oai.py --url http://ALAMAT_SERVER/PATH_OAI
```

### 5.2 Contoh per Sumber

#### Koha (UMS Library)
```bash
python harvest_oai.py --url http://172.16.10.43/cgi-bin/koha/oai.pl
```
- Format: `marcxml` (otomatis)
- Estimasi: ~53.000 record, ~1-2 jam
- DDC: Langsung dari field MARC 082

#### EPrints (UMS Repository)  
```bash
python harvest_oai.py --url http://eprints.ums.ac.id/cgi/oai2
```
- Format: `oai_dc` (otomatis)
- Konten: Skripsi & thesis mahasiswa UMS
- DDC: Dikonversi otomatis dari klasifikasi Library of Congress (LC)
- ⚠️ **Peringatan**: Repository ini sangat besar (puluhan ribu record), harvest bisa memakan waktu lama

#### SLiMS (SMA Batik 1 Surakarta)
```bash
python harvest_oai.py --url https://lib-smabasasolo.edutrend.id/oai2.php
```
- Format: `oai_dc`
- DDC: Dari `dc:subject` dan `dc:identifier`

### 5.3 Paksa Format Tertentu

```bash
# Paksa pakai Dublin Core
python harvest_oai.py --url http://SERVER/oai --format oai_dc

# Paksa pakai MARCXML
python harvest_oai.py --url http://SERVER/oai --format marcxml
```

### 5.4 Harvest dengan Filter Tanggal

```bash
# Hanya buku yang ditambahkan sejak 1 Januari 2025
python harvest_oai.py --url http://SERVER/oai --from 2025-01-01

# Hanya buku dalam rentang tertentu
python harvest_oai.py --url http://SERVER/oai --from 2025-01-01 --until 2025-12-31
```

### 5.5 Harvest Set Tertentu

Beberapa repository memiliki "set" (koleksi/grup):

```bash
# Lihat set yang tersedia
python harvest_oai.py --url http://SERVER/oai --info

# Harvest set tertentu
python harvest_oai.py --url http://SERVER/oai --set "SET_SPEC"
```

### 5.6 Output Harvest

Setelah harvest selesai, file akan tersimpan di folder `output/`:

```
output/
├── biblio_20260407_125138.json   ← Data utama (untuk preprocessing)
├── biblio_20260407_125138.csv    ← Versi spreadsheet
└── biblio_20260408_095046.json   ← Harvest berikutnya
```

---

## 6. Rebuild Data untuk Web App

Setelah harvest, Anda perlu memproses data mentah menjadi format yang dipakai web app:

### 6.1 Rebuild file terbaru (cepat)

```bash
python rebuild.py
```
> Otomatis mengambil file harvest terbaru di `output/`

### 6.2 Rebuild file tertentu

```bash
python rebuild.py output/biblio_20260407_125138.json
```

### 6.3 Setelah rebuild

1. Buka browser ke `http://localhost:8088`
2. **Refresh halaman** (Ctrl+F5)
3. Cek halaman **Statistik** untuk melihat jumlah buku dan sumber

---

## 7. Multi-Sumber (Gabung Data)

Ini adalah fitur utama UMS Library OneSearch — menggabungkan koleksi dari beberapa perpustakaan menjadi satu pencarian terintegrasi (seperti VuFind).

### 7.1 Langkah Lengkap

```bash
# Langkah 1: Harvest dari setiap sumber
python harvest_oai.py --url http://172.16.10.43/cgi-bin/koha/oai.pl
python harvest_oai.py --url https://lib-smabasasolo.edutrend.id/oai2.php
python harvest_oai.py --url http://eprints.ums.ac.id/cgi/oai2

# Langkah 2: Gabung & rebuild semua
python rebuild.py output/biblio_FILE1.json output/biblio_FILE2.json output/biblio_FILE3.json --sources "UMS Library" "SMA Batik 1" "EPrints UMS"
```

### 7.2 Rebuild semua file sekaligus

```bash
python rebuild.py --all
```
> Ini akan memproses **semua** file JSON di folder `output/`

### 7.3 Hasil di Web App

Setelah rebuild multi-sumber:
- Halaman **Statistik** menampilkan breakdown per sumber
- Kartu buku menampilkan **badge sumber** (contoh: "SMA Batik 1")
- Klik buku → tombol "Lihat di..." mengarah ke OPAC/website sumber asli
- Pencarian mencari di **semua sumber** sekaligus

---

## 8. Update Incremental

Tidak perlu harvest ulang semua data setiap kali ada buku baru. Gunakan parameter `--from`:

```bash
# Harvest hanya buku baru sejak tanggal terakhir
python harvest_oai.py --url http://SERVER/oai --from 2026-04-07

# Kemudian rebuild (gabung dengan data lama)
python rebuild.py --all
```

> **Tips**: Cek file `data/last_harvest.txt` untuk melihat tanggal harvest terakhir.

---

## 9. Resume Harvest yang Terputus

Jika harvest terputus (koneksi internet putus, server error, dll):

```bash
# Lihat resumption token terakhir di output terminal
# Contoh: "marcxml/58500////0/0/59842"

python harvest_oai.py --url http://SERVER/oai --resume "TOKEN_TERAKHIR"
```

Harvester juga akan otomatis mencoba **skip ke batch berikutnya** jika satu batch gagal (untuk harvest Koha).

---

## 10. Troubleshooting

### ❌ "HTTP Error 500: Internal Server Error"
- Server perpustakaan terlalu sibuk atau ada masalah internal
- **Solusi**: Tunggu beberapa menit, lalu coba lagi. Gunakan `--resume` jika harvest sudah berjalan sebagian

### ❌ "Connection refused" atau "Connection timed out"
- Server tidak bisa diakses dari komputer Anda
- **Solusi**: Pastikan Anda berada di jaringan yang sama (untuk server internal seperti Koha UMS)

### ❌ "noRecordsMatch"
- Tidak ada record yang cocok dengan kriteria filter
- **Solusi**: Coba tanpa filter `--from` / `--until`

### ❌ Buku tanpa DDC
- Ini normal untuk repositori yang tidak menggunakan DDC (contoh: EPrints pakai Library of Congress)
- **Solusi**: Preprocessor sudah otomatis mengkonversi LC → DDC, tapi tidak semua subjek bisa dipetakan

### ❌ "Format 'marcxml' may not be available"
- Endpoint tidak mendukung format marcxml
- **Solusi**: Biarkan harvester auto-detect (jangan pakai `--format`), atau gunakan `--format oai_dc`

### ❌ File harvest sangat besar
- Normal untuk perpustakaan besar (Koha UMS menghasilkan ~37 MB JSON)
- **Solusi**: Proses akan berjalan otomatis, pastikan ada ruang disk yang cukup

---

## 11. Referensi Endpoint

Daftar endpoint OAI-PMH yang sudah diuji:

| Perpustakaan | URL Endpoint | Platform |
|---|---|---|
| UMS Library | `http://172.16.10.43/cgi-bin/koha/oai.pl` | Koha |
| EPrints UMS | `http://eprints.ums.ac.id/cgi/oai2` | EPrints |
| SMA Batik 1 Solo | `https://lib-smabasasolo.edutrend.id/oai2.php` | SLiMS |

### Cara Menemukan Endpoint OAI-PMH

1. **Koha**: Biasanya di `http://SERVER/cgi-bin/koha/oai.pl`
2. **SLiMS**: Biasanya di `http://SERVER/oai2.php`
3. **EPrints**: Biasanya di `http://SERVER/cgi/oai2`
4. **DSpace**: Biasanya di `http://SERVER/oai/request`
5. **Inlislite**: Biasanya di `http://SERVER/oai`

### Menambah Endpoint Baru

Untuk menambah perpustakaan mitra baru:

```bash
# 1. Cek dulu apakah endpoint aktif
python harvest_oai.py --url http://ENDPOINT_BARU --info

# 2. Jika aktif, harvest
python harvest_oai.py --url http://ENDPOINT_BARU

# 3. Rebuild dengan label sumber
python rebuild.py --all --sources "UMS Library" "SMA Batik 1" "Perpustakaan Baru"
```

---

## Cheat Sheet

```bash
# === Cek Endpoint ===
python harvest_oai.py --url URL --info

# === Harvest ===
python harvest_oai.py --url URL                    # harvest semua
python harvest_oai.py --url URL --from 2025-01-01  # buku baru saja
python harvest_oai.py --url URL --format oai_dc    # paksa format DC
python harvest_oai.py --url URL --resume "TOKEN"   # lanjutkan yg terputus

# === Rebuild ===
python rebuild.py                                   # file terbaru
python rebuild.py file1.json file2.json             # file tertentu
python rebuild.py --all                             # semua file
python rebuild.py f1.json f2.json --sources "A" "B" # dengan label

# === Jalankan Web App ===
python -m http.server 8088
# Buka http://localhost:8088
```

---

*Terakhir diperbarui: 8 April 2026*
