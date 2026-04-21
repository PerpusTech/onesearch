---
description: Cara harvest data bibliografi dari endpoint OAI-PMH dan rebuild data BookFinder
---
// turbo-all

## Harvest & Rebuild Data BookFinder

### Prasyarat
- Python 3 terinstall
- Akses internet ke endpoint OAI-PMH

### Langkah 1: Harvest dari satu sumber

```bash
# Koha (Perpustakaan UMS) - otomatis deteksi marcxml
python scripts/harvest_oai.py --url http://172.16.10.43/cgi-bin/koha/oai.pl

# EPrints (Repository UMS)
python scripts/harvest_oai.py --url http://eprints.ums.ac.id/cgi/oai2

# SLiMS dengan nama sumber kustom (disarankan untuk platform bersama seperti edutrend.id)
python scripts/harvest_oai.py --url https://lib-smabasasolo.edutrend.id/oai2.php --source "SMA Basa Solo"
python scripts/harvest_oai.py --url https://lib-smamuhpksolo.edutrend.id/oai2.php --source "SMA Muhpk Solo"
python scripts/harvest_oai.py --url https://perpus.ummad.ac.id/oai2.php --source "UMMAD"

# Endpoint OAI-PMH lainnya (sumber otomatis dideteksi dari hostname URL)
python scripts/harvest_oai.py --url <URL>

# Override nama sumber yang terdeteksi otomatis
python scripts/harvest_oai.py --url <URL> --source "Nama Institusi"
```

### Langkah 1b: Harvest SEMUA institusi sekaligus (batch)

```bash
# Lihat daftar institusi yang terdaftar
python scripts/harvest_all.py --list

# Harvest semua institusi aktif
python scripts/harvest_all.py

# Harvest institusi tertentu saja
python scripts/harvest_all.py --only UMS UMY

# Harvest semua + langsung rebuild data
python scripts/harvest_all.py --rebuild

# Harvest inkremental (hanya record baru)
python scripts/harvest_all.py --from 2026-04-01

# Tambah institusi baru → edit INSTITUTIONS di harvest_all.py
```

### Langkah 2: Cek info endpoint saja (tanpa harvest)

```bash
python scripts/harvest_oai.py --url <URL> --info
```

### Langkah 3: Harvest hanya record baru (inkremental)

```bash
python scripts/harvest_oai.py --url <URL> --from 2026-04-07
```

### Langkah 4: Rebuild data dari file harvest

```bash
# Satu sumber (file terbaru)
python scripts/rebuild.py

# Semua file di output/ (sumber otomatis dideteksi dari _meta atau oai_identifier tiap file)
python scripts/rebuild.py --all

# Override sumber secara manual (urutan sesuai urutan file)
python scripts/rebuild.py output/file1.json output/file2.json --sources "UMS" "SMA Basa Solo"
```

### Langkah 5: Verifikasi

- Buka http://localhost:8088 di browser
- Cek halaman Statistik untuk breakdown sumber
- Cari buku dari sumber yang berbeda

### Prioritas Deteksi Sumber
1. **Flag `--source`** (saat harvest) → tersimpan di `_meta.source` dalam file
2. **Auto-deteksi dari URL** (saat harvest) → tersimpan di `_meta.source` dalam file
3. **Flag `--sources`** (saat rebuild) → override metadata file
4. **`_meta` file** (saat rebuild) → dibaca dari JSON hasil harvest
5. **OAI identifier** (saat rebuild, fallback untuk file lama) → diparsing dari data record

### Catatan
- Output harvest disimpan di folder `output/` sebagai JSON bertimestamp dengan header `_meta`
- Format baru: `{"_meta": {"source": "...", ...}, "records": [...]}`
- Format lama (array biasa) tetap didukung di rebuild
- Rebuild memproses data ke folder `data/` (books.json, ddc_tree.json, dll.)
- Harvester otomatis memilih format metadata terbaik (marcxml > oai_dc)
- DDC otomatis diinfer dari subjek LC (EPrints) atau kata kunci jika tidak tersedia
- Record non-Koha mendapat prefix ID: `ep-` (EPrints), `sl-` (SLiMS)
- Untuk platform bersama (misal edutrend.id), selalu gunakan `--source` agar nama readable
