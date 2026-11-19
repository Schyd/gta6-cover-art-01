[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Schyd/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Schyd/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Cover Studio

Vice Cover Studio adalah editor web yang mengubah foto dan caption kamu menjadi cover art bergaya poster GTA 6: beberapa panel foto dengan ukuran dan sudut berbeda dalam satu poster, caption tebal yang menonjol, dan grade warna khas Vice City. Pilih satu dari tiga layout multi-panel, atur crop dan posisi tiap foto di dalam panelnya, tulis caption, pilih grade Sunset atau Neon beserta kekuatannya, lalu export sebagai PNG siap posting dalam ukuran 1080x1080, 1080x1350, atau 1920x1080. Semua diproses di perangkatmu sendiri — foto tidak pernah diunggah ke mana pun.

## Fitur

- **Tiga layout multi-panel** — satu hero dengan dua panel kecil, strip tiga panel, dan grid empat panel dengan satu panel miring
- **Crop dan posisi per panel** — geser untuk pan, atur zoom, dan pilih fit/fill untuk setiap foto; satu foto bisa mengisi beberapa panel dengan crop berbeda, atau tiap panel memakai foto yang berbeda
- **Caption poster** — huruf tebal uppercase dengan outline dan bayangan yang tetap terbaca di atas foto apa pun; bisa diatur teks, ukuran, warna, dan posisi (banner atas, banner bawah, atau diagonal)
- **Grade Vice City** — grade Sunset (oranye, pink, ungu hangat) atau Neon (cyan dan magenta bercahaya) dengan pengatur kekuatan, plus halftone, vignette, dan bingkai tipis
- **Export PNG sekali klik** — cover digambar di canvas pada ukuran export penuh, bukan ukuran preview, dalam 1080x1080, 1080x1350, atau 1920x1080

## Cara menjalankan

App ini berupa file statis tanpa build step. Jalankan static server dari folder `app/`, lalu buka `index.html` di desktop Chrome:

```bash
cd app
python3 -m http.server 8000
```

Lalu buka `http://localhost:8000` di browser. Atau pakai static server lain yang kamu suka — yang penting `index.html` disajikan lewat HTTP, bukan dibuka langsung sebagai file.

Langkah memakai: muat foto (pilih file atau drag-and-drop, atau coba foto sampel yang sudah disertakan), pilih layout panel, atur crop/zoom tiap panel, tulis caption dan atur posisi serta ukurannya, pilih grade, lalu export PNG di ukuran yang kamu mau.

## Struktur repo

- `app/` — aplikasi web (file statis): `index.html`, `app.js`, `styles.css`, plus folder `fonts/` dan `samples/`
- `screenshots/` — tangkapan layar editor dan cover hasil export
- `main.ts` — entrypoint yang menyalin `app/` dan `screenshots/` ke output dan menulis `dossier.json`
- `vendor/makefun-app.ts` — pustaka dari kit make.fun (tidak diubah)
- `LICENSE` — lisensi MIT

Semua artwork, huruf, dan efek di aplikasi ini original — tidak memakai logo, artwork, atau font dari Rockstar Games.

## Tautan

- Halaman bounty: https://make.fun/bounty/gta6-cover-art-01
- Coba make.fun lewat referral ini: https://make.fun/r/3fv3pwmg

## Lisensi

MIT — lihat `LICENSE`.
