# Google Drive File Uploader

Google Drive File Uploader adalah aplikasi web yang memungkinkan pengguna untuk meng-upload, mengunduh, dan mengelola file di Google Drive. Aplikasi ini memanfaatkan Google Drive API untuk interaksi langsung dengan penyimpanan cloud.

## Fitur Utama

- **Upload File**: Unggah file dari komputer Anda ke Google Drive.
- **Daftar File**: Lihat daftar file yang telah di-upload ke Google Drive.
- **Hapus File**: Hapus file yang ada di Google Drive.
- **Hapus Semua File**: Hapus semua file yang ada di Google Drive.
- **Autentikasi Google**: Login menggunakan akun Google untuk mengakses Google Drive.

## Prasyarat

Sebelum menjalankan aplikasi, pastikan Anda memiliki:

- Node.js dan npm terpasang pada sistem Anda.
- Akun Google dengan akses ke Google Drive API.
- Client ID dan Client Secret dari Google Cloud Console.

## Instalasi dan Pengaturan

1. **Clone Repository**

   ```bash
   git clone https://github.com/username/driveuploader.git
   cd driveuploader
   npm install

- Buat file .env di root proyek Anda.

- Masukkan kredensial API Google Anda ke dalam file `.env`
```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=url-redirect
```
