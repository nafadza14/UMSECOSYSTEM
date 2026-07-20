-- UMS Ecosystem — skema tabel weighings untuk Supabase (Postgres)
-- Jalankan di Supabase SQL Editor.

create table if not exists public.weighings (
  id            text primary key,
  type          text not null check (type in ('customer','supplier')),
  ticket_no     text not null,
  partner_code  text,
  partner_name  text,
  product_code  text,
  product_name  text,
  truck_no      text,
  gross_kg      integer not null default 0,
  tare_kg       integer not null default 0,
  netto_kg      integer not null default 0,
  date_in       date not null,
  time_in       time not null,
  date_out      date,
  time_out      time,
  operator      text,
  status        text not null default 'completed' check (status in ('in_progress','completed')),
  created_at    timestamptz not null default now()
);

create index if not exists idx_weighings_date on public.weighings (date_in desc, time_in desc);
create index if not exists idx_weighings_type on public.weighings (type);

-- Sync agent memakai kombinasi ini sebagai kunci idempoten (opsional):
create unique index if not exists uq_weighings_ticket
  on public.weighings (type, ticket_no, date_in);

-- Row Level Security: izinkan baca publik (read-only) untuk demo dashboard.
alter table public.weighings enable row level security;

drop policy if exists "public read" on public.weighings;
create policy "public read" on public.weighings
  for select using (true);
