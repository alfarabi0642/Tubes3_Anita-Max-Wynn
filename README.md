# Tubes3_Anita-Max-Wynn

Judol Detector adalah Chromium browser extension berbasis TypeScript untuk mendeteksi konten judi online pada halaman web. Extension membaca keyword dari `keywords/keywords.txt`, menjalankan exact matching, regex matching, dan fuzzy matching, lalu memberi highlight pada teks yang terdeteksi serta menampilkan statistik realtime di popup.

## Anggota

- Daniel Anindito Nugroho (13524002)
- Al Farabi (13524086)
- Reva Natania Sitohang (13524098)



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

## Penjelasan Singkat Algoritma KMP dan Boyer-Moore

Extension ini menggunakan KMP dan Boyer-Moore sebagai algoritma exact matching untuk mencari setiap keyword judi online di teks halaman. Sebelum pencarian, teks dan keyword dinormalisasi dengan `normalizeCase` agar pencocokan tidak bergantung pada kapitalisasi, sementara teks asli tetap dipakai untuk hasil highlight.

### Knuth-Morris-Pratt (KMP)

Implementasi KMP berada di `src/algorithms/kmp.ts`. Algoritma ini terlebih dahulu membangun failure table untuk keyword, yaitu tabel yang menyimpan panjang prefix yang juga suffix pada setiap posisi pola. Saat terjadi mismatch, pencarian tidak mundur ke awal keyword, tetapi langsung memindahkan posisi pattern berdasarkan failure table tersebut. Dengan cara ini, karakter teks yang sudah terbukti cocok tidak perlu dibandingkan ulang. Pada extension ini, KMP mengembalikan posisi awal dan akhir match, teks yang cocok, nama algoritma, serta jumlah perbandingan karakter.

Kompleksitas preprocessing KMP adalah O(m), dengan m sebagai panjang keyword, dan proses pencarian adalah O(n), dengan n sebagai panjang teks.

### Boyer-Moore (BM)

Implementasi Boyer-Moore berada di `src/algorithms/boyerMoore.ts`. Varian yang digunakan adalah pendekatan bad-character heuristic. Algoritma membangun last occurrence table yang menyimpan posisi terakhir kemunculan setiap karakter pada keyword. Pencocokan dilakukan dari kanan ke kiri. Jika terjadi mismatch, keyword digeser berdasarkan posisi terakhir karakter yang gagal dicocokkan tersebut. Jika karakter mismatch tidak ada di keyword, pergeseran bisa melewati lebih banyak karakter teks.

Preprocessing BM membutuhkan O(m). Pada banyak kasus, BM dapat lebih cepat dari pencarian kiri-ke-kanan karena mampu melompati beberapa karakter sekaligus. Implementasi bad-character sederhana ini tetap menghitung jumlah perbandingan karakter dan mencatat match dengan format hasil yang sama seperti KMP.

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
| `test-pages/regex.html` | Regex `<kata><minimal 2 angka>` |
| `test-pages/fuzzy.html` | Weighted Levenshtein untuk karakter mirip visual |
| `test-pages/rescan.html` | Cleanup highlight dan rescan DOM |
| `test-pages/negative.html` | Halaman aman tanpa highlight |

## Packaging

```bash
npm run package
```

Command tersebut membuat arsip `release/judol-detector-extension.zip` dari isi `dist/`.

