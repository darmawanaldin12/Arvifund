-- ============================================================
-- Audit keamanan Supabase — Arvifund
-- HANYA MEMBACA (select). Aman dijalankan di Supabase SQL Editor.
-- Jalankan satu per satu, lalu bagikan hasilnya untuk dianalisis.
-- ============================================================

-- 1) Tabel di schema public — apakah RLS aktif?
--    Semua baris seharusnya rls_aktif = true.
select c.relname as tabel, c.relrowsecurity as rls_aktif
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relrowsecurity, c.relname;

-- 2) Semua policy yang ada (siapa boleh apa)
select tablename, policyname, cmd, roles, qual as using_expr, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;

-- 3) Policy yang terlalu longgar (using/with check = true)
--    Wajar untuk SELECT jika memang data dibagi dalam rumah tangga, tapi periksa INSERT/UPDATE/DELETE.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and (qual = 'true' or with_check = 'true')
order by tablename, cmd;

-- 4) Akun yang terdaftar — seharusnya hanya 2 (Aldin & Solikhatun)
select id, email, created_at, last_sign_in_at
from auth.users
order by created_at;

-- 5) View di schema public. View tanpa security_invoker=true melewati RLS tabel dasarnya.
select c.relname as view, c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'v'
order by c.relname;

-- 6) Tabel/view yang bisa diakses role anon (belum login). Idealnya KOSONG.
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public'
order by table_name, privilege_type;

-- 7) Fungsi SECURITY DEFINER (berjalan dengan hak pemilik, bukan pemanggil)
select p.proname as fungsi, p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
order by p.proname;
