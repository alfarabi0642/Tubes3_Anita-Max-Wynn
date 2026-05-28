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


