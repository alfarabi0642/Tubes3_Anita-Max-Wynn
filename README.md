# Tubes3_Anita-Max-Wynn

Judol Detector adalah Chromium browser extension berbasis TypeScript untuk mendeteksi konten judi online pada halaman web. Extension membaca keyword dari `keywords/keywords.txt`, menjalankan exact matching, regex matching, dan fuzzy matching, lalu memberi highlight pada teks yang terdeteksi serta menampilkan statistik realtime di popup.

## Author

| Nama | Tanggung jawab |
|---|---|
| Anita | Core algorithm matching |
| Max | Browser extension end-to-end |
| Wynn | Laporan |

## Algoritma

KMP digunakan sebagai exact matcher dengan failure table untuk menggeser pola saat terjadi mismatch tanpa mengulang perbandingan dari awal. Implementasi menghitung jumlah comparison dan mengembalikan posisi match pada teks.

Boyer-Moore digunakan sebagai exact matcher kedua dengan last occurrence table dan bad-character shift. Pencarian bergerak dari kanan pola ke kiri sehingga mismatch dapat menghasilkan lompatan lebih jauh.

RegEx menangkap pola `<kata><2 atau 3 angka>` seperti `SLOT99` dan `MAXWIN234`. Regex memakai engine JavaScript karena diperbolehkan oleh spesifikasi.

Weighted Levenshtein dipakai untuk fuzzy matching jika keyword tidak ditemukan secara exact. Substitusi karakter yang mirip visual seperti `O` dengan `0`, `A` dengan `4`, dan `I` dengan `1` diberi penalti lebih kecil agar variasi tersamarkan tetap dapat terdeteksi.

## Requirement

- Node.js 20 atau lebih baru
- npm
- Chromium browser atau Google Chrome

## Instalasi

```bash
npm install
```

## Build

```bash
npm run build
```

Hasil build extension berada di folder `dist/`.

## Menjalankan di Chrome

1. Buka `chrome://extensions/`.
2. Aktifkan Developer Mode.
3. Klik Load unpacked.
4. Pilih folder `dist/`.
5. Buka halaman web biasa atau halaman di `test-pages/`.
6. Untuk membuka `test-pages/*.html` langsung dari file lokal, aktifkan Allow access to file URLs pada detail extension.

## Pengujian

```bash
npm run typecheck
npm test
npm run build
```

Manual test pages:

| File | Tujuan |
|---|---|
| `test-pages/exact.html` | Exact matching KMP dan Boyer-Moore |
| `test-pages/regex.html` | Regex `<kata><2 atau 3 angka>` |
| `test-pages/fuzzy.html` | Weighted Levenshtein untuk karakter mirip visual |
| `test-pages/rescan.html` | Cleanup highlight dan rescan DOM |
| `test-pages/negative.html` | Halaman aman tanpa highlight |

## Packaging

```bash
npm run package
```

Command tersebut membuat arsip `release/judol-detector-extension.zip` dari isi `dist/`.

## Checklist Spesifikasi

| No | Poin | Ya | Tidak |
| :---: | --- | :---: | :---: |
| 1 | Extension berhasil di-build dan di-load tanpa kesalahan pada chromium browser dan dikembangkan dengan TypeScript | ✓ |  |
| 2 | KMP dan Boyer-Moore diimplementasikan from scratch | ✓ |  |
| 3 | Regex menghandle format `<kata><angka>` dan berbagai edge case | ✓ |  |
| 4 | Pencarian KMP & BM membaca keyword.txt secara iteratif dan tidak menggunakan built-in search function atau library eksternal | ✓ |  |
| 5 | Exact matching dan fuzzy matching berjalan benar | ✓ |  |
| 6 | Elemen DOM terdeteksi diberi highlight dan terhapus saat rescanning | ✓ |  |
| 7 | Tooltip muncul saat hover dengan informasi keyword, algoritma, kemunculan, dan waktu eksekusi | ✓ |  |
| 8 | Popup menampilkan statistik realtime (total keyword, perbandingan, waktu eksekusi, jumlah match) | ✓ |  |
| 9 | [Bonus] Membuat Video |  | ✓ |
| 10 | [Bonus] Implementasi Algoritma Aho-Corasick dan Rabin Karp |  | ✓ |
| 11 | [Bonus] Implementasi Censorship / Blur Teks |  | ✓ |
| 12 | [Bonus] Implementasi Optical Character Recognition pada Gambar |  | ✓ |
