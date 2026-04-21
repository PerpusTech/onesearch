# Panduan Pemeliharaan & Deployment (Static Architecture)

Sistem perpustakaan pencarian masa kini **UMS Library OneSearch** kita menggunakan arsitektur termutakhir: **Static Application**. Ini artinya beban kerja terberat dipikul di komputer/laptop Admin secara tertutup (lokal), dan server publik (VPS/Production) hanya bertugas membagikan data matang secara luar biasa cepat.

Di panduan ini dijelaskan rutinitas bulanan Anda *tanpa* perlu mengganggu atau membebani sistem Production.

## Kenapa Mengambil Data di Laptop/Lokal?
1. **Lebih Kuat dari Pemblokiran**: Harvester (pengumpul data) menggunakan *Playwright* (sebuah _browser engine_ tanpa wajah yang memakan daya lumayan). Server peladen tidak akan dibebani tugas berat untuk berpura-pura menjadi manusia ketika mengakali WAF / Cloudflare dari institusi lain.
2. **Kestabilan Nginx**: Kontainer Docker Anda di server Production tetap berjalan bersih dan murni < 50MB, melayani jutaan pencarian per detik tanpa *drop server* karena RAM digerogoti *backend task*.
3. **Penyelamatan Darurat**: Jika terjadi _error 500_ pada saat memanen, data mentah tidak akan mem-blokir atau merusak pengalaman pencarian mahasiswa yang sedang online di portal. Anda bisa *debug* santai di lokal, perbaiki, baru di lempar ke server.

---

## 1. Alur Update Rutin (Bulanan)

Proses pembaruan koleksi bisa dilaksanakan cukup 1x seminggu atau 1x sebulan dari Laptop Admin.

1. Buka repositori kode `harvest-koha` di lokal Anda menggunakan Terminal / VS Code.
2. Jalankan perintah Penarikan Institusi Global:
   ```bash
   python scripts/harvest_all.py
   ```
   > Biarkan skrip mengantri dan bekerja menyedot ribuan data. Jika WAF menghadang, Playwright akan melewatinya. Jika Koha melempar 500, *Throttle Anti-500* akan menidurkan sistem sementara.
   
3. Jalankan perintah Perakit (*Compiler*) Database Statis:
   ```bash
   python scripts/preprocess.py
   ```
   > Semua file metada kotor (CSV maupun JSON balok) sekarang dipadatkan, disortir, dibersihkan dan dijadikan 1 folder matang siap-pakai bernama `/data/`.

---

## 2. Unggah ke Production (Deployment)

Proses unggah ini bisa digunakan menggunakan FileZilla, rsync, atau Git, sesuai kenyamanan Anda memindahkan file ke Server Production/VPS. 

Satu-satunya folder yang wajib Anda _Replace_ / _Overwrite_ di Server Production hanyalah:
**📂 `data/`**

### Skenario Menggunakan Git (Paling Mudah)
Jika *source code* terhubung Github / Gitlab:
1. Lokal: Buka terminal, lakukan `git add data/` lalu `git commit -m "Update harvest bulan ini"` dan dorong dengan `git push`.
2. Server: Masuk ke dalam VPS (*Remote SSH*), masuk ke dalam _directory_ web, arahkan perintah `git pull origin main`. Data baru seketika aktif.

### Skenario FTP/Filezilla (Manual)
1. Buka FileZilla, koneksikan ke Server Production Anda.
2. Timpa (*drag n drop*) folder `data/` milik Anda dari komputer lokal langsung ke atas tumpukan folder Docker Anda yang ada di Linux.

---

## 3. Kondisi Docker

Server yang memanen Nginx Anda akan **otomatis mendeteksi pembaruan data real-time** lewat sistem pemasangan (mount). Anda **TIDAK PERLU** merestart kontainer docker (`docker-compose down & up`) sama sekali.

Volume pada `docker-compose.yml`:
```yaml
volumes:
  - ./data:/usr/share/nginx/html/data:ro
```
Pola `ro` merefleksikan perubahan seketika tanpa mengubah status `up-time` dari Nginx Anda!

**Mission Accomplished.** Sistem pencarian tetap di atas *99.9% availability*!
