-- ============================================================
-- Migration: Transaksi berulang (tagihan rutin)
-- Paste dan run di Supabase SQL Editor
-- ============================================================

create table if not exists public.recurring_transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  toko             text not null,
  uraian           text,
  kategori         text not null default 'Lainnya',
  nilai            numeric not null check (nilai > 0),
  metode           text not null default 'Cash',
  bank             text not null default 'Cash',
  hari_tiap_bulan  int  not null check (hari_tiap_bulan between 1 and 31),
  aktif            boolean not null default true,
  terakhir_dicatat date,
  created_at       timestamptz not null default now()
);

create index if not exists recurring_transactions_user_idx on public.recurring_transactions(user_id);

-- RLS: setiap user hanya bisa melihat & mengubah transaksi berulang miliknya sendiri
alter table public.recurring_transactions enable row level security;

create policy "Users read own recurring"
  on public.recurring_transactions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own recurring"
  on public.recurring_transactions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own recurring"
  on public.recurring_transactions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own recurring"
  on public.recurring_transactions for delete
  to authenticated
  using (auth.uid() = user_id);
