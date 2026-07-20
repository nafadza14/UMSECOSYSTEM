-- UMS Ecosystem — tabel untuk monitoring Sync Agent
-- Jalankan di Supabase SQL Editor (setelah schema.sql).

-- Status agent per site (heartbeat)
create table if not exists public.agent_status (
  site               text primary key,
  status             text default 'online',
  version            text,
  last_heartbeat_at  timestamptz default now(),
  last_sync_at       timestamptz,
  buffer_pending     integer default 0,
  synced_today       integer default 0
);

-- Log tiap batch sinkronisasi
create table if not exists public.sync_logs (
  id              bigint generated always as identity primary key,
  site            text,
  batch_id        text,
  received_count  integer default 0,
  inserted_count  integer default 0,
  updated_count   integer default 0,
  duplicate_count integer default 0,
  error_text      text,
  created_at      timestamptz default now()
);
create index if not exists idx_sync_logs_created on public.sync_logs (created_at desc);

-- RLS: dashboard boleh BACA (anon), agent MENULIS pakai service_role (bypass RLS).
alter table public.agent_status enable row level security;
alter table public.sync_logs enable row level security;

drop policy if exists "read agent_status" on public.agent_status;
create policy "read agent_status" on public.agent_status for select using (true);

drop policy if exists "read sync_logs" on public.sync_logs;
create policy "read sync_logs" on public.sync_logs for select using (true);
