-- Integra PLD — Migración v5: manual, capacitación, comentarios, oficial cumplimiento
-- Ejecutar en Supabase Dashboard → SQL Editor

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

create table if not exists expediente_comments (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references expedientes(id) on delete cascade,
  user_id uuid references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists firm_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

insert into firm_settings (key, value) values
  ('compliance_officer', '{"name":"","email":"","appointed_at":"","rfc":""}')
on conflict (key) do nothing;

create index if not exists idx_exp_comments_exp on expediente_comments(expediente_id);
create index if not exists idx_training_date on training_sessions(session_date);

alter table expedientes add column if not exists diagnosis_checklist jsonb default '[]';

alter table compliance_manuals enable row level security;
alter table training_sessions enable row level security;
alter table expediente_comments enable row level security;
alter table firm_settings enable row level security;

drop policy if exists "Equipo CRUD manuales" on compliance_manuals;
drop policy if exists "Equipo CRUD capacitacion" on training_sessions;
drop policy if exists "Equipo CRUD comentarios" on expediente_comments;
drop policy if exists "Equipo lee/escribe comentarios" on expediente_comments;
drop policy if exists "Equipo inserta comentarios" on expediente_comments;
drop policy if exists "Equipo elimina comentarios" on expediente_comments;
drop policy if exists "Equipo CRUD settings" on firm_settings;

create policy "Equipo CRUD manuales" on compliance_manuals for all to authenticated using (true) with check (true);
create policy "Equipo CRUD capacitacion" on training_sessions for all to authenticated using (true) with check (true);
create policy "Equipo lee/escribe comentarios" on expediente_comments for select to authenticated using (true);
create policy "Equipo inserta comentarios" on expediente_comments for insert to authenticated with check (true);
create policy "Equipo elimina comentarios" on expediente_comments for delete to authenticated using (current_user_role() != 'asistente');
create policy "Equipo CRUD settings" on firm_settings for all to authenticated using (true) with check (true);

-- Bucket para manual PLD y evidencias capacitación
insert into storage.buckets (id, name, public)
values ('cumplimiento', 'cumplimiento', false)
on conflict (id) do nothing;

drop policy if exists "Equipo sube cumplimiento" on storage.objects;
drop policy if exists "Equipo lee cumplimiento" on storage.objects;
drop policy if exists "Equipo elimina cumplimiento" on storage.objects;
create policy "Equipo sube cumplimiento" on storage.objects for insert to authenticated with check (bucket_id = 'cumplimiento');
create policy "Equipo lee cumplimiento" on storage.objects for select to authenticated using (bucket_id = 'cumplimiento');
create policy "Equipo elimina cumplimiento" on storage.objects for delete to authenticated using (bucket_id = 'cumplimiento' and current_user_role() != 'asistente');
