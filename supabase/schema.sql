-- Integra PLD — Esquema Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor

-- Perfiles de usuario (equipo)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'abogado' check (role in ('admin', 'abogado', 'asistente')),
  created_at timestamptz not null default now()
);

-- Clientes
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_type text not null default 'persona_fisica' check (client_type in ('persona_fisica', 'persona_moral')),
  rfc text,
  curp text,
  email text,
  phone text,
  address text,
  industry text,
  activity_code text,
  nationality text default 'México',
  legal_representative text,
  vulnerable_activity boolean default false,
  notes text,
  risk_level text default 'bajo' check (risk_level in ('bajo', 'medio', 'alto', 'critico')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tipos de asunto / plantillas de etapas
create table if not exists workflow_templates (
  id uuid primary key default gen_random_uuid(),
  matter_type text not null unique,
  label text not null,
  stages jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- Expedientes (asuntos)
create table if not exists expedientes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  matter_type text not null,
  description text,
  status text not null default 'activo' check (status in ('activo', 'pausado', 'cerrado', 'archivado')),
  current_stage_index int not null default 0,
  priority text default 'media' check (priority in ('baja', 'media', 'alta', 'urgente')),
  assigned_to uuid references profiles(id),
  created_by uuid references profiles(id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Etapas del expediente (timeline)
create table if not exists expediente_stages (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references expedientes(id) on delete cascade,
  stage_index int not null,
  name text not null,
  status text not null default 'pendiente' check (status in ('pendiente', 'en_progreso', 'completada', 'bloqueada')),
  notes text,
  started_at timestamptz,
  completed_at timestamptz,
  completed_by uuid references profiles(id),
  unique (expediente_id, stage_index)
);

-- KYC / Debida diligencia
create table if not exists kyc_records (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  expediente_id uuid references expedientes(id) on delete set null,
  status text not null default 'pendiente' check (status in ('pendiente', 'en_revision', 'aprobado', 'rechazado', 'vencido')),
  risk_score int default 0 check (risk_score between 0 and 100),
  checklist jsonb not null default '{}',
  pep boolean default false,
  sanctions_check boolean default false,
  beneficial_owner text,
  review_notes text,
  sanctions_results jsonb default '{}',
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  expires_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Documentos
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  expediente_id uuid references expedientes(id) on delete cascade,
  kyc_id uuid references kyc_records(id) on delete cascade,
  name text not null,
  doc_type text not null,
  storage_path text not null,
  file_size int,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now()
);

-- Alertas y vencimientos
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid references expedientes(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  title text not null,
  message text,
  alert_type text not null default 'vencimiento' check (alert_type in ('vencimiento', 'kyc', 'etapa', 'documento', 'general')),
  due_date date,
  resolved boolean default false,
  assigned_to uuid references profiles(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Bitácora de actividad (timeline de eventos)
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid references expedientes(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  user_id uuid references profiles(id),
  action text not null,
  description text not null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Índices
create index if not exists idx_expedientes_client on expedientes(client_id);
create index if not exists idx_expedientes_status on expedientes(status);
create index if not exists idx_kyc_client on kyc_records(client_id);
create index if not exists idx_alerts_due on alerts(due_date) where not resolved;
create index if not exists idx_activity_expediente on activity_log(expediente_id);

-- Plantillas iniciales de etapas
insert into workflow_templates (matter_type, label, stages) values
  ('pld', 'PLD/FT — Cumplimiento', '[
    {"name": "Diagnóstico inicial", "description": "Levantamiento de información"},
    {"name": "Análisis de riesgo", "description": "Identificación y evaluación de riesgos PLD"},
    {"name": "Matriz de riesgo", "description": "Elaboración de matriz"},
    {"name": "Plan de acción", "description": "Medidas correctivas y preventivas"},
    {"name": "Capacitación", "description": "Programa de capacitación PLD"},
    {"name": "Implementación", "description": "Puesta en marcha de controles"},
    {"name": "Seguimiento", "description": "Monitoreo y actualización"}
  ]'),
  ('kyc', 'KYC / Debida Diligencia', '[
    {"name": "Solicitud de documentos", "description": "Recopilación de documentación"},
    {"name": "Revisión inicial", "description": "Validación de documentos"},
    {"name": "Debida diligencia", "description": "Verificación de antecedentes"},
    {"name": "Análisis de riesgo", "description": "Scoring y clasificación"},
    {"name": "Aprobación", "description": "Dictamen final"},
    {"name": "Monitoreo", "description": "Seguimiento continuo"}
  ]'),
  ('consultoria', 'Consultoría Legal', '[
    {"name": "Consulta inicial", "description": "Primera reunión con el cliente"},
    {"name": "Investigación", "description": "Análisis del marco legal"},
    {"name": "Análisis", "description": "Evaluación de opciones"},
    {"name": "Dictamen / Borrador", "description": "Elaboración del entregable"},
    {"name": "Entrega", "description": "Presentación al cliente"},
    {"name": "Seguimiento", "description": "Post-entrega"}
  ]'),
  ('diagnostico_pld', 'Diagnóstico PLD', '[
    {"name": "Levantamiento", "description": "Recopilación de información operativa"},
    {"name": "Gap analysis", "description": "Brechas vs normativa vigente"},
    {"name": "Reporte de hallazgos", "description": "Documento de diagnóstico"},
    {"name": "Presentación", "description": "Entrega de resultados"},
    {"name": "Cierre", "description": "Plan de mejora acordado"}
  ]'),
  ('analisis_riesgo', 'Análisis de Riesgo PLD', '[
    {"name": "Identificación", "description": "Factores de riesgo"},
    {"name": "Medición", "description": "Cuantificación del riesgo"},
    {"name": "Evaluación", "description": "Clasificación y priorización"},
    {"name": "Tratamiento", "description": "Medidas de mitigación"},
    {"name": "Monitoreo", "description": "Revisión periódica"}
  ]')
on conflict (matter_type) do nothing;

-- RLS
alter table profiles enable row level security;
alter table clients enable row level security;
alter table expedientes enable row level security;
alter table expediente_stages enable row level security;
alter table kyc_records enable row level security;
alter table documents enable row level security;
alter table alerts enable row level security;
alter table activity_log enable row level security;
alter table workflow_templates enable row level security;

-- Políticas: equipo autenticado puede leer/escribir todo
-- (DROP IF EXISTS permite volver a ejecutar este script sin error)
drop policy if exists "Equipo puede ver perfiles" on profiles;
drop policy if exists "Usuario puede editar su perfil" on profiles;
drop policy if exists "Usuario puede insertar su perfil" on profiles;
create policy "Equipo puede ver perfiles" on profiles for select to authenticated using (true);
create policy "Usuario puede editar su perfil" on profiles for update to authenticated using (auth.uid() = id);
create policy "Usuario puede insertar su perfil" on profiles for insert to authenticated with check (auth.uid() = id);

drop policy if exists "Equipo CRUD clientes" on clients;
drop policy if exists "Equipo CRUD expedientes" on expedientes;
drop policy if exists "Equipo CRUD etapas" on expediente_stages;
drop policy if exists "Equipo CRUD kyc" on kyc_records;
drop policy if exists "Equipo CRUD documentos" on documents;
drop policy if exists "Equipo CRUD alertas" on alerts;
drop policy if exists "Equipo CRUD actividad" on activity_log;
drop policy if exists "Equipo lee plantillas" on workflow_templates;
create policy "Equipo CRUD clientes" on clients for all to authenticated using (true) with check (true);
create policy "Equipo CRUD expedientes" on expedientes for all to authenticated using (true) with check (true);
create policy "Equipo CRUD etapas" on expediente_stages for all to authenticated using (true) with check (true);
create policy "Equipo CRUD kyc" on kyc_records for all to authenticated using (true) with check (true);
create policy "Equipo CRUD documentos" on documents for all to authenticated using (true) with check (true);
create policy "Equipo CRUD alertas" on alerts for all to authenticated using (true) with check (true);
create policy "Equipo CRUD actividad" on activity_log for all to authenticated using (true) with check (true);
create policy "Equipo lee plantillas" on workflow_templates for select to authenticated using (true);

-- Trigger: crear perfil al registrarse
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'abogado')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Storage bucket para documentos
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

drop policy if exists "Equipo sube documentos" on storage.objects;
drop policy if exists "Equipo lee documentos" on storage.objects;
drop policy if exists "Equipo elimina documentos" on storage.objects;
create policy "Equipo sube documentos" on storage.objects
  for insert to authenticated with check (bucket_id = 'documentos');
create policy "Equipo lee documentos" on storage.objects
  for select to authenticated using (bucket_id = 'documentos');
create policy "Equipo elimina documentos" on storage.objects
  for delete to authenticated using (bucket_id = 'documentos');
