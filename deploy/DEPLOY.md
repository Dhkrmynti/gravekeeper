# Deploy Gravekeeper ($GRAVE)

Satu VPS menjalankan semuanya:

```
pengunjung ──https──▶ nginx ──┬─ /        → dist/ (website hasil build)
                              └─ /api/*   → bot di 127.0.0.1:5016 (PM2, 24/7)
bot ──RPC──▶ Robinhood Chain (claim → buy → burn / offering)
```

Website membaca CA token dari bot (`/api/status`), jadi setelah launch cukup isi CA di `/memex`, **tanpa build ulang**.

---

## 0. Sebelum mulai

- **VPS Ubuntu 22.04/24.04**, 1 vCPU / 1 GB RAM sudah cukup. Pilih lokasi **di luar Indonesia** (misalnya Singapura): beberapa ISP Indonesia memblokir DNS RPC Robinhood Chain.
- **Domain** dengan record `A` mengarah ke IP VPS (misalnya `gravekeeper.fun`).
- **Wallet operator = wallet creator token di Pons.** Fee creator di escrow hanya bisa di-claim oleh wallet creator, jadi **launch $GRAVE dari wallet yang private key-nya dipakai bot.** Isi wallet ini dengan sedikit ETH untuk gas dan pantau saldonya setelah beberapa siklus pertama. Jangan simpan dana besar di wallet ini: key-nya ada di server.

## 1. Siapkan server

```bash
# user khusus (jangan jalankan bot sebagai root)
sudo adduser gravekeeper && sudo usermod -aG sudo gravekeeper && su - gravekeeper

# Node 22, git, nginx, certbot, PM2
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx certbot python3-certbot-nginx ufw
sudo npm install -g pm2
node -v   # harus v22.x

# firewall (setelah nginx terpasang): hanya SSH dan web. Port 5016 (bot) TIDAK dibuka ke internet.
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status   # harus "active", tanpa 5016
```

## 2. Ambil kode

```bash
cd ~ && git clone https://github.com/Dhkrmynti/gravekeeper.git && cd gravekeeper
npm ci
```

## 3. Isi `.env`

```bash
cp .env.example .env
openssl rand -hex 24          # salin hasilnya untuk ADMIN_SECRET
nano .env
chmod 600 .env
```

Yang wajib diisi:

| Variabel | Isi |
|---|---|
| `CREATOR_PRIVATE_KEY` | private key wallet creator (lihat langkah 0) |
| `ADMIN_SECRET` | hasil `openssl rand -hex 24` (minimal 16 karakter) |
| `VITE_CREATOR_ADDRESS` | wallet treasury: tujuan fee di siklus offering (boleh wallet lain) |
| `VITE_TOKEN_ADDRESS` | kosongkan dulu; diisi setelah launch lewat `/memex` |

Isi private key langsung di `.env` di server. Jangan kirim lewat chat, dan jangan di-commit.

## 4. Cek mainnet dari VPS

Pastikan alamat kontrak Pons di engine benar-benar ada di mainnet:

```bash
RPC=https://rpc.mainnet.chain.robinhood.com
rpc() { curl -s -X POST $RPC -H 'content-type: application/json' -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$1\",\"params\":$2}"; echo; }
rpc eth_chainId '[]'                                                                 # harus "0x1237" (4663)
for a in 0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e 0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e 0x8876789976dEcBfCbBbe364623C63652db8C0904; do
  echo -n "$a  "; rpc eth_getCode "[\"$a\",\"latest\"]" | head -c 60; echo
done
```

Tiap alamat harus mengembalikan kode panjang (`"result":"0x6080…`), **bukan** `"result":"0x"`. Kalau ada yang `0x`, jangan lanjut: alamat itu salah untuk mainnet.

## 5. Build website

```bash
npm run build      # hasilnya di dist/
```

## 6. Jalankan bot dengan PM2

```bash
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup        # jalankan perintah sudo yang dicetak, supaya bot hidup lagi setelah reboot

pm2 logs gravekeeper-bot --lines 30
curl -s localhost:5016/api/status | head -c 300; echo
```

Di log harus ada `Admin changes : protected by ADMIN_SECRET` dan `Operator Wallet : 0x…` (alamat wallet creator). Sebelum CA diisi, status bot `STANDBY`: itu normal.

## 7. Pasang nginx + HTTPS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/gravekeeper
sudo nano /etc/nginx/sites-available/gravekeeper   # ganti gravekeeper.fun dan path root (dist/)
sudo ln -s /etc/nginx/sites-available/gravekeeper /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d gravekeeper.fun
```

Kalau `root` ada di home user, nginx butuh izin baca: `chmod o+x /home/gravekeeper /home/gravekeeper/gravekeeper`.

## 8. Cek semuanya

- `https://domainmu` terbuka, hero menampilkan batu nisan "The Supply"
- `https://domainmu/api/status` mengembalikan JSON `"online":true`
- `https://domainmu/memex`: masukkan Admin Secret, harus muncul **Unlocked**
- `curl -s http://IP_VPS:5016/api/status` dari luar server harus **gagal** (port bot tertutup firewall)

## 9. Launch

1. Launch $GRAVE di Pons **dari wallet creator** (langkah 0).
2. Buka `/memex`, masukkan Admin Secret, isi **Token Address** dengan CA $GRAVE, lalu Save. Isi juga Treasury kalau belum.
3. Dalam beberapa detik situs menampilkan CA, angka live, dan register. Bot berubah dari `STANDBY` ke aktif (`pm2 logs gravekeeper-bot`).
4. Setelah ada trade, cek siklus pertama: claim → buy → burn ke `0x…dEaD`, dengan tx di explorer.
5. Tanam CA di build sebagai cadangan: isi `VITE_TOKEN_ADDRESS` di `.env`, lalu `npm run build`. Tanpa ini, situs kehilangan CA kalau bot mati. Saat bot mati, papan Hex juga tidak akurat (siklus dan total fee datang dari bot), jadi pastikan bot selalu hidup: `pm2 status`.

## 10. Setelah domain dan akun X ada

- `index.html`: ganti `content="/og-image.jpg"` (di `og:image` dan `twitter:image`) jadi `https://domainmu/og-image.jpg`, supaya preview link di X muncul.
- `src/App.tsx`: isi `X_URL` dengan link akun X.
- Lalu `npm run build` (bot tidak perlu restart).

---

## Update kode

```bash
cd ~/gravekeeper && git pull && npm ci && npm run build && pm2 restart gravekeeper-bot
```

## Backup

`bot-config.json` menyimpan **nomor siklus** (menentukan giliran burial/offering) dan config dari `/memex`, termasuk private key kalau diisi lewat panel. Backup secara berkala, simpan di tempat aman, dan jaga izinnya: `chmod 600 bot-config.json`.

## Kalau ada masalah

| Gejala | Penyebab biasa |
|---|---|
| Situs "gates closed" / angka kosong | CA belum diisi di `/memex`, atau bot mati (`pm2 status`) |
| `/api/status` 502 | bot mati: `pm2 logs gravekeeper-bot`, lalu `pm2 restart gravekeeper-bot` |
| `/memex` "admin API is off" | `ADMIN_SECRET` kosong atau kurang dari 16 karakter di `.env`; isi lalu `pm2 restart gravekeeper-bot` |
| `/memex` "wrong admin secret" | secret yang diketik tidak sama dengan `.env` |
| Bot tidak pernah claim | wallet operator bukan wallet creator token, atau fee belum mencapai 0.01 ETH |
| Bot gagal kirim transaksi | ETH untuk gas di wallet operator habis |

## Alternatif: website di Vercel

Bot tetap di VPS. Buka API bot lewat subdomain HTTPS (misalnya `api.domainmu`, nginx `location /api/` seperti di atas), lalu di Vercel tambahkan rewrite `/api/:path*` → `https://api.domainmu/api/:path*`. Satu VPS untuk semuanya tetap lebih sederhana.
