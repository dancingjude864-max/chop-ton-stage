-- CHOP' TON STAGE - schema minimal persistant
create extension if not exists pgcrypto;

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  entry jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.structure_edits (
  structure_id text primary key,
  edit jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists contributions_created_at_idx on public.contributions (created_at desc);

alter table public.contributions enable row level security;
alter table public.structure_edits enable row level security;

-- Lecture publique
create policy if not exists "contributions_select_public"
on public.contributions
for select
using (true);

create policy if not exists "structure_edits_select_public"
on public.structure_edits
for select
using (true);

-- Écriture publique (plateforme collaborative sans login obligatoire)
create policy if not exists "contributions_insert_public"
on public.contributions
for insert
to anon
with check (jsonb_typeof(entry) = 'object');

create policy if not exists "structure_edits_insert_public"
on public.structure_edits
for insert
to anon
with check (jsonb_typeof(edit) = 'object');

create policy if not exists "structure_edits_update_public"
on public.structure_edits
for update
to anon
using (true)
with check (jsonb_typeof(edit) = 'object');
