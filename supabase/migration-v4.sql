-- Integra PLD — Migración v4: matriz de riesgo, operaciones, avisos, mejoras PLD
-- Ejecutar en Supabase Dashboard → SQL Editor

-- Matriz de riesgo en cliente
alter table clients add column if not exists risk_matrix jsonb default '{}';
alter table clients add column if not exists matrix_risk_level text
  check (matrix_risk_level is null or matrix_risk_level in ('bajo', 'medio', 'alto', 'critico'));

-- KYC ampliado
alter table kyc_records add column if not exists beneficial_owners jsonb default '[]';
alter table kyc_records add column if not exists pep_questionnaire jsonb default '{}';
alter table kyc_records add column if not exists renewal_of uuid references kyc_records(id) on delete set null;
alter table kyc_records add column if not exists checklist_completion int default 0;

-- Documentos vinculados a plantillas de biblioteca
alter table documents add column if not exists legal_resource_id uuid references legal_resources(id) on delete set null;

-- Registro de operaciones PLD
create table if not exists pld_operations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  expediente_id uuid references expedientes(id) on delete set null,
  operation_date date not null default current_date,
  operation_type text not null,
  amount numeric(18, 2),
  currency text not null default 'MXN',
  description text,
  unusual boolean not null default false,
  reported boolean not null default false,
  report_date date,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Avisos de operaciones inusuales / relevantes (registro interno Art. 21)
create table if not exists unusual_notices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  operation_id uuid references pld_operations(id) on delete set null,
  notice_type text not null check (notice_type in ('inusual', 'relevante', '24h')),
  status text not null default 'borrador' check (status in ('borrador', 'presentado', 'archivado')),
  title text not null,
  narrative text,
  amount numeric(18, 2),
  detected_at date not null default current_date,
  submitted_at date,
  created_by uuid references profiles(id),
  assigned_to uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pld_ops_client on pld_operations(client_id);
create index if not exists idx_pld_ops_date on pld_operations(operation_date);
create index if not exists idx_unusual_notices_client on unusual_notices(client_id);
create index if not exists idx_unusual_notices_status on unusual_notices(status);

alter table pld_operations enable row level security;
alter table unusual_notices enable row level security;

drop policy if exists "Equipo CRUD operaciones" on pld_operations;
drop policy if exists "Equipo CRUD avisos" on unusual_notices;
create policy "Equipo CRUD operaciones" on pld_operations for all to authenticated using (true) with check (true);
create policy "Equipo CRUD avisos" on unusual_notices for all to authenticated using (true) with check (true);

-- Rol del usuario (para RLS de eliminación)
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from profiles where id = auth.uid()), 'asistente');
$$;

-- Asistentes no pueden eliminar registros críticos
drop policy if exists "Equipo CRUD clientes" on clients;
create policy "Equipo lee/escribe clientes" on clients for select to authenticated using (true);
create policy "Equipo inserta clientes" on clients for insert to authenticated with check (true);
create policy "Equipo actualiza clientes" on clients for update to authenticated using (true) with check (true);
create policy "Equipo elimina clientes" on clients for delete to authenticated using (current_user_role() != 'asistente');

drop policy if exists "Equipo CRUD expedientes" on expedientes;
create policy "Equipo lee/escribe expedientes" on expedientes for select to authenticated using (true);
create policy "Equipo inserta expedientes" on expedientes for insert to authenticated with check (true);
create policy "Equipo actualiza expedientes" on expedientes for update to authenticated using (true) with check (true);
create policy "Equipo elimina expedientes" on expedientes for delete to authenticated using (current_user_role() != 'asistente');

drop policy if exists "Equipo CRUD kyc" on kyc_records;
create policy "Equipo lee/escribe kyc" on kyc_records for select to authenticated using (true);
create policy "Equipo inserta kyc" on kyc_records for insert to authenticated with check (true);
create policy "Equipo actualiza kyc" on kyc_records for update to authenticated using (true) with check (true);
create policy "Equipo elimina kyc" on kyc_records for delete to authenticated using (current_user_role() != 'asistente');

drop policy if exists "Equipo CRUD documentos" on documents;
create policy "Equipo lee/escribe documentos" on documents for select to authenticated using (true);
create policy "Equipo inserta documentos" on documents for insert to authenticated with check (true);
create policy "Equipo actualiza documentos" on documents for update to authenticated using (true) with check (true);
create policy "Equipo elimina documentos" on documents for delete to authenticated using (current_user_role() != 'asistente');
