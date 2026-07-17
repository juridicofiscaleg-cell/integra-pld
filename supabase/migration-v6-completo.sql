-- Integra PLD v6 — Notificaciones, portal cliente, bitácora append-only
-- Ejecutar en Supabase SQL Editor (después de ejecutar-en-supabase.sql)

-- Notificaciones in-app
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  link text,
  kind text not null default 'info' check (kind in ('info', 'success', 'warning', 'approval')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_unread on notifications(user_id, created_at desc)
  where read_at is null;

alter table notifications enable row level security;

drop policy if exists "Usuario lee sus notificaciones" on notifications;
drop policy if exists "Usuario marca notificaciones" on notifications;
drop policy if exists "Sistema crea notificaciones" on notifications;

create policy "Usuario lee sus notificaciones" on notifications
  for select to authenticated using (user_id = auth.uid());

create policy "Usuario marca notificaciones" on notifications
  for update to authenticated using (user_id = auth.uid());

create policy "Sistema crea notificaciones" on notifications
  for insert to authenticated with check (true);

-- Portal cliente (link seguro para subir documentos)
create table if not exists client_portal_tokens (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  label text,
  expires_at timestamptz not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_portal_tokens_token on client_portal_tokens(token);

alter table client_portal_tokens enable row level security;

drop policy if exists "Equipo gestiona portal tokens" on client_portal_tokens;
create policy "Equipo gestiona portal tokens" on client_portal_tokens
  for all to authenticated using (true) with check (true);

-- Bitácora: solo insertar (append-only); abogado/admin puede leer
drop policy if exists "Equipo CRUD actividad" on activity_log;
drop policy if exists "Equipo inserta actividad" on activity_log;
drop policy if exists "Equipo lee actividad" on activity_log;

create policy "Equipo lee actividad" on activity_log
  for select to authenticated using (true);

create policy "Equipo inserta actividad" on activity_log
  for insert to authenticated with check (true);

-- Onboarding + umbrales SAT en firm_settings (upsert desde app)
insert into firm_settings (key, value) values
  ('onboarding', '{"completed": false, "steps": {}}'::jsonb),
  ('sat_thresholds', '{}'::jsonb)
on conflict (key) do nothing;
