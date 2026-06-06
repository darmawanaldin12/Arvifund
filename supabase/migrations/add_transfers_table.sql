-- ============================================================
-- Migration: Tambah tabel transfers untuk fitur transfer antar user/rekening
-- Paste dan run di Supabase SQL Editor
-- ============================================================

create table if not exists public.transfers (
  id          uuid primary key default gen_random_uuid(),
  tanggal     date not null,
  from_user   uuid references public.profiles(id) on delete set null,
  to_user     uuid references public.profiles(id) on delete set null,
  from_bank   text not null,
  to_bank     text not null,
  jumlah      numeric not null check (jumlah > 0),
  catatan     text,
  created_at  timestamptz not null default now(),
  edited_by   uuid references public.profiles(id) on delete set null,
  edited_at   timestamptz
);

-- Index untuk query cepat per user
create index if not exists transfers_from_user_idx on public.transfers(from_user);
create index if not exists transfers_to_user_idx   on public.transfers(to_user);
create index if not exists transfers_tanggal_idx   on public.transfers(tanggal desc);

-- RLS: semua user yang login bisa baca & tulis (sama seperti tabel lain)
alter table public.transfers enable row level security;

create policy "Authenticated users can read transfers"
  on public.transfers for select
  to authenticated
  using (true);

create policy "Authenticated users can insert transfers"
  on public.transfers for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update transfers"
  on public.transfers for update
  to authenticated
  using (true);

create policy "Authenticated users can delete transfers"
  on public.transfers for delete
  to authenticated
  using (true);
