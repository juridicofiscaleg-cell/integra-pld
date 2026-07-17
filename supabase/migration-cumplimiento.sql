-- Integra PLD — Migración cumplimiento (ejecutar UNA vez en SQL Editor)
-- Incluye: oficiales por cliente, capacitaciones vinculadas, manuales por cliente
-- Seguro re-ejecutar: usa IF NOT EXISTS / DROP POLICY IF EXISTS

-- ─── Tablas base v5 (si faltan) ───
create table if not exists compliance_manuals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  version text not null default '1.0',
  description text,
  storage_path text,
  file_name text,
  effective_date date not null default current_date,
  is_active boolean not null default true,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists training_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  session_date date not null,
  topic text not null,
  participants text,
  duration_hours numeric(4, 1),
  evidence_path text,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists firm_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- ─── Oficiales por cliente ───
create table if not exists client_compliance_officers (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  rfc text,
  appointed_at date,
  ended_at date,
  is_active boolean not null default true,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cco_client on client_compliance_officers(client_id);
create index if not exists idx_cco_active on client_compliance_officers(client_id, is_active);

-- ─── Columnas extra capacitaciones (v5b + v5c) ───
alter table training_sessions add column if not exists instructor text;
alter table training_sessions add column if not exists location text;
alter table training_sessions add column if not exists modality text default 'presencial';
alter table training_sessions add column if not exists certificate_text text;
alter table training_sessions add column if not exists certificate_generated_at timestamptz;
alter table training_sessions add column if not exists client_id uuid references clients(id) on delete set null;
alter table training_sessions add column if not exists officer_id uuid references client_compliance_officers(id) on delete set null;

create index if not exists idx_training_client on training_sessions(client_id);
create index if not exists idx_training_date on training_sessions(session_date);

-- ─── Manuales PLD por cliente ───
alter table compliance_manuals add column if not exists client_id uuid references clients(id) on delete cascade;
create index if not exists idx_manuals_client on compliance_manuals(client_id);

-- ─── RLS ───
alter table compliance_manuals enable row level security;
alter table training_sessions enable row level security;
alter table client_compliance_officers enable row level security;

drop policy if exists "Equipo CRUD manuales" on compliance_manuals;
drop policy if exists "Equipo CRUD capacitacion" on training_sessions;
drop policy if exists "Equipo CRUD oficiales cliente" on client_compliance_officers;

create policy "Equipo CRUD manuales" on compliance_manuals for all to authenticated using (true) with check (true);
create policy "Equipo CRUD capacitacion" on training_sessions for all to authenticated using (true) with check (true);
create policy "Equipo CRUD oficiales cliente" on client_compliance_officers for all to authenticated using (true) with check (true);

-- ─── Storage bucket cumplimiento ───
insert into storage.buckets (id, name, public)
values ('cumplimiento', 'cumplimiento', false)
on conflict (id) do nothing;

drop policy if exists "Equipo sube cumplimiento" on storage.objects;
drop policy if exists "Equipo lee cumplimiento" on storage.objects;
drop policy if exists "Equipo elimina cumplimiento" on storage.objects;

create policy "Equipo sube cumplimiento" on storage.objects for insert to authenticated with check (bucket_id = 'cumplimiento');
create policy "Equipo lee cumplimiento" on storage.objects for select to authenticated using (bucket_id = 'cumplimiento');
create policy "Equipo elimina cumplimiento" on storage.objects for delete to authenticated using (bucket_id = 'cumplimiento' and current_user_role() != 'asistente');
