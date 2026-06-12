# 📦 Stock Opname — PDT Scan System

Aplikasi Stock Opname berbasis web dengan Google Sheets sebagai backend. Dirancang untuk scan PDT 2 tahap: scan produk → input jumlah karton → scan storage bin.

---

## 🗂️ Struktur Proyek

```
stockopname/
├── pages/
│   ├── index.tsx          # Redirect ke /scan
│   ├── scan.tsx           # Halaman scan (Tahap 1 & 2)
│   ├── dashboard.tsx      # Dashboard analytics
│   └── api/
│       └── stock.ts       # API route (GET/POST/PUT)
├── lib/
│   ├── sheets.ts          # Google Sheets helper
│   └── barcode.ts         # Parser barcode + timestamp
├── styles/
│   └── globals.css
├── .env.example
├── vercel.json
└── package.json
```

---

## 🚀 Setup: Google Sheets

### 1. Buat Google Sheet
1. Buka [Google Sheets](https://sheets.google.com) → buat spreadsheet baru
2. Namai sheet pertama: **StockOpname**
3. Catat **Sheet ID** dari URL:
   ```
   https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
   ```

### 2. Buat Service Account
1. Buka [Google Cloud Console](https://console.cloud.google.com)
2. Buat project baru (atau pilih yang ada)
3. Aktifkan **Google Sheets API**: APIs & Services → Enable APIs → cari "Google Sheets API" → Enable
4. Buat Service Account: IAM & Admin → Service Accounts → Create
   - Nama: `stock-opname-sa`
   - Role: **Editor**
5. Buat JSON Key: klik service account → Keys → Add Key → JSON → Download

### 3. Share Sheet ke Service Account
1. Buka Google Sheet yang dibuat tadi
2. Klik **Share** (pojok kanan atas)
3. Tambahkan email service account (dari file JSON, field `client_email`)
4. Beri akses **Editor**

---

## 🌐 Deploy ke Vercel

### 1. Push ke GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/username/stock-opname.git
git push -u origin main
```

### 2. Import di Vercel
1. Buka [vercel.com](https://vercel.com) → New Project
2. Import repository GitHub
3. Framework: **Next.js** (auto-detected)

### 3. Set Environment Variables di Vercel
Di Vercel Project → Settings → Environment Variables, tambahkan:

| Key | Value |
|-----|-------|
| `GOOGLE_SHEET_ID` | ID spreadsheet Anda |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Isi file JSON key (satu baris, minify JSON) |

**Cara minify JSON key:**
```bash
cat your-key.json | tr -d '\n' | tr -s ' '
```
Atau paste ke https://jsonminifier.net, lalu copy hasilnya.

### 4. Deploy
Klik **Deploy** → tunggu build selesai → akses URL yang diberikan Vercel.

---

## 📱 Cara Penggunaan

### Halaman Scan (`/scan`)

**Tahap 1 — Scan Barcode Produk:**
- Arahkan PDT ke barcode produk
- Format barcode: `KodeItem;KodeProduk;SatBesar;IsiKarton;SatKecil;Barcode;NamaProduk;Gudang`
- Contoh: `1201020711;D26158;CTN;12.00000;PCS;852600153;Hanasui Glow Expert Package 4pack x 12;WH`
- Sistem akan parse dan tampilkan info produk

**Tahap 2 — Input Qty & Scan Lokasi:**
- Isi jumlah karton (input angka)
- Sistem kalkulasi otomatis: karton × isi = total unit
- Scan label storage bin → tekan Enter → data tersimpan ke Google Sheets

**History & Edit:**
- Tombol **History** menampilkan semua scan sesi ini
- Tombol **Edit** (ikon pensil) di setiap item untuk koreksi data
- Perubahan disinkronkan ke Google Sheets

### Halaman Dashboard (`/dashboard`)
- Filter tanggal: pilih range tanggal
- Filter pencarian: cari berdasarkan nama produk / storage bin
- Chart: aktivitas harian, top produk, distribusi storage bin, scan per operator
- Tabel detail: semua record dengan timestamp
- Export CSV: unduh data yang difilter

---

## 📊 Struktur Google Sheet

Header di baris 1 (otomatis dibuat saat pertama kali save):

| Kolom | Keterangan |
|-------|-----------|
| ID | Auto-generated (SO-timestamp) |
| Timestamp | Waktu scan lengkap (WIB) |
| Tanggal | Tanggal scan (YYYY-MM-DD) |
| Kode Item | Dari barcode field 1 |
| Kode Produk | Dari barcode field 2 |
| Satuan Besar | CTN, dll |
| Isi Karton | Angka bulat (tanpa desimal) |
| Satuan Kecil | PCS, dll |
| Kode Barcode | Kode numerik produk |
| Nama Produk | Deskripsi produk |
| Gudang | Kode gudang |
| Storage Bin | Hasil scan lokasi |
| Jumlah Karton | Input operator |
| Total Unit | Otomatis: Karton × Isi |
| Operator | Nama operator yang scan |
| Status | Selesai / Pending |

---

## 🔧 Development Lokal

```bash
npm install

# Buat file .env.local
cp .env.example .env.local
# Edit .env.local, isi GOOGLE_SHEET_ID dan GOOGLE_SERVICE_ACCOUNT_KEY

npm run dev
# Buka http://localhost:3000
```
