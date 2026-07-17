-- Integra PLD — Migración v5c: registro de oficiales de cumplimiento por cliente
-- Ejecutar después de migration-v5 / v5b

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

alter table training_sessions add column if not exists client_id uuid references clients(id) on delete set null;
alter table training_sessions add column if not exists officer_id uuid references client_compliance_officers(id) on delete set null;

create index if not exists idx_training_client on training_sessions(client_id);

alter table client_compliance_officers enable row level security;

drop policy if exists "Equipo CRUD oficiales cliente" on client_compliance_officers;
create policy "Equipo CRUD oficiales cliente" on client_compliance_officers
  for all to authenticated using (true) with check (true);
