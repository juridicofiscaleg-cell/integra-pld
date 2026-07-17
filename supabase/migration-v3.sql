-- Integra PLD — Migración v3 (biblioteca legal y plantillas)
-- Ejecutar en Supabase → SQL Editor

create table if not exists legal_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'formato' check (category in ('lfpiorpi', 'formato', 'guia', 'plantilla', 'otro')),
  description text,
  article_ref text,
  storage_path text,
  file_name text,
  file_size int,
  is_template boolean default false,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_legal_category on legal_resources(category);

alter table legal_resources enable row level security;

drop policy if exists "Equipo CRUD biblioteca legal" on legal_resources;
create policy "Equipo CRUD biblioteca legal" on legal_resources
  for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('plantillas', 'plantillas', false)
on conflict (id) do nothing;

drop policy if exists "Equipo sube plantillas" on storage.objects;
drop policy if exists "Equipo lee plantillas" on storage.objects;
drop policy if exists "Equipo elimina plantillas" on storage.objects;
create policy "Equipo sube plantillas" on storage.objects
  for insert to authenticated with check (bucket_id = 'plantillas');
create policy "Equipo lee plantillas" on storage.objects
  for select to authenticated using (bucket_id = 'plantillas');
create policy "Equipo elimina plantillas" on storage.objects
  for delete to authenticated using (bucket_id = 'plantillas');
