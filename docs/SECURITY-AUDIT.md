# Audit keamanan Arvifund

Hasil pemeriksaan kode (bukan database — lihat bagian "Perlu dicek manual").

## Sudah diperbaiki di kode

| # | Temuan | Risiko | Perbaikan |
|---|--------|--------|-----------|
| 1 | `/api/gemini` tidak meminta login | Siapa pun di internet bisa memakai kuota API Gemini milik kita | Server kini memverifikasi token sesi Supabase (`Authorization: Bearer`). Client (`useAIExtract`, `pdfNarrative`) mengirim token lewat `getAuthHeaders()`. Ditambah batas ukuran body 6 MB dan API key dikirim lewat header, bukan URL |
| 2 | `/api/cron/reminder-belum-catat` membandingkan `Bearer ${CRON_SECRET}` | Kalau `CRON_SECRET` belum diset, header `Bearer undefined` lolos dan endpoint (memakai service role key) bisa dipicu siapa saja | Request ditolak jika `CRON_SECRET` kosong |
| 3 | Tidak ada header keamanan HTTP | Clickjacking, MIME sniffing | `next.config.js` menambah X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS |
| 4 | PDF memakai semua baris `budget_plans` | Bukan keamanan, tapi angka budget di PDF tidak cocok | Memakai `buildBudgetVsReal` (sama dengan Budget Plan) |

## Belum diubah — perlu keputusan

**Login biometrik menyimpan password di localStorage** (`lib/biometric.js`).
Password dienkripsi AES-GCM, tetapi kuncinya diturunkan dari `credentialId` yang disimpan di tempat yang sama dengan salt tetap. Artinya siapa pun yang bisa membaca localStorage perangkat (mis. lewat celah XSS atau akses fisik) bisa memulihkan password tanpa sidik jari. Sidik jari hanya mengunci tombol di UI, tidak mengunci data.
Saran: jangan simpan password. Biarkan sesi Supabase (refresh token) yang menjaga login, dan pakai biometrik sebagai kunci lokal saat aplikasi dibuka. Perubahan ini menyentuh alur login, jadi sebaiknya dikerjakan terpisah dan diuji di perangkat.

## Perlu dicek manual di Supabase

1. **Matikan pendaftaran publik.** Authentication → Sign In / Providers → nonaktifkan *Allow new users to sign up*. Aplikasi tidak punya halaman daftar, tetapi anon key bersifat publik sehingga endpoint pendaftaran Supabase tetap bisa dipanggil langsung. Karena RLS memakai peran `authenticated`, akun baru yang berhasil dibuat bisa lolos policy yang longgar.
2. **Jalankan `supabase/security_audit.sql`** dan periksa: semua tabel `rls_aktif = true`, tidak ada policy longgar untuk INSERT/UPDATE/DELETE, hanya 2 akun di `auth.users`, view memakai `security_invoker=true`, role `anon` tanpa akses. Tabel lama (households, household_members, debts, categories) yang tidak dipakai sebaiknya RLS-nya aktif atau dihapus.
3. **Pastikan `SUPABASE_SERVICE_ROLE_KEY` dan `CRON_SECRET` hanya ada di Environment Variables Vercel** (tanpa awalan `NEXT_PUBLIC_`) dan `CRON_SECRET` sudah terisi.
4. Jika `GEMINI_API_KEY` pernah tersebar (log, screenshot, repo), buat key baru.
