-- CHOP' TON STAGE - schema minimal persistant
create extension if not exists pgcrypto;

create table if not exists public.structures (
  id uuid primary key default gen_random_uuid(),
  structure_id text not null unique,
  secteur text not null default '',
  type_structure text not null default '',
  association text not null default '',
  departement text not null default '',
  nom_structure text not null default '',
  email_contact text not null default '',
  telephone_contact text not null default '',
  poste_contact text not null default '',
  genre_contact text not null default '',
  gratification text not null default '',
  ville text not null default '',
  type_public text not null default '',
  duree_stage text not null default '',
  diplome_associe text not null default '',
  missions text not null default '',
  ambiance text not null default '',
  conseils text not null default '',
  source text not null default 'Google Sheet',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.user_accounts (
  pseudo text primary key,
  pin text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_tracking (
  pseudo text not null,
  structure_id text not null,
  status text not null check (status in ('interesse', 'candidate')),
  updated_at timestamptz not null default now(),
  primary key (pseudo, structure_id)
);

create index if not exists contributions_created_at_idx on public.contributions (created_at desc);
create index if not exists structures_structure_id_idx on public.structures (structure_id);

alter table public.structures enable row level security;
alter table public.contributions enable row level security;
alter table public.structure_edits enable row level security;
alter table public.user_accounts enable row level security;
alter table public.user_tracking enable row level security;

-- Lecture publique
create policy if not exists "structures_select_public"
on public.structures
for select
using (true);

create policy if not exists "contributions_select_public"
on public.contributions
for select
using (true);

create policy if not exists "structure_edits_select_public"
on public.structure_edits
for select
using (true);

create policy if not exists "user_accounts_select_public"
on public.user_accounts
for select
using (true);

create policy if not exists "user_tracking_select_public"
on public.user_tracking
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

-- Tableur structures éditable publiquement (sans login)
create policy if not exists "structures_insert_public"
on public.structures
for insert
to anon
with check (char_length(structure_id) > 0 and char_length(nom_structure) > 0);

create policy if not exists "structures_update_public"
on public.structures
for update
to anon
using (true)
with check (char_length(structure_id) > 0 and char_length(nom_structure) > 0);

create policy if not exists "user_accounts_insert_public"
on public.user_accounts
for insert
to anon
with check (char_length(pseudo) > 0 and char_length(pin) > 0);

create policy if not exists "user_accounts_delete_public"
on public.user_accounts
for delete
to anon
using (true);

create policy if not exists "user_tracking_insert_public"
on public.user_tracking
for insert
to anon
with check (char_length(pseudo) > 0 and char_length(structure_id) > 0);

create policy if not exists "user_tracking_update_public"
on public.user_tracking
for update
to anon
using (true)
with check (char_length(pseudo) > 0 and char_length(structure_id) > 0);

create policy if not exists "user_tracking_delete_public"
on public.user_tracking
for delete
to anon
using (true);
