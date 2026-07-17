-- ============================================================
-- INTEGRA PLD — Ejecutar TODO este archivo en Supabase SQL Editor
-- (No pegues nombres de archivo ni listas numeradas; solo este SQL)
-- ============================================================

-- --- PARTE 1: Autorizaciones (approval_requests) ---

create table if not exists approval_requests (
  id uuid primary key default gen_random_uuid(),
  action_type text not null,
  title text not null,
  description text,
  payload jsonb not null default '{}',
  client_id uuid references clients(id) on delete set null,
  status text not null default 'pendiente' check (status in ('pendiente', 'aprobada', 'rechazada')),
  requested_by uuid references profiles(id),
  reviewed_by uuid references profiles(id),
  review_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists idx_approval_requests_status on approval_requests(status);
create index if not exists idx_approval_requests_requested_by on approval_requests(requested_by);

alter table approval_requests enable row level security;

drop policy if exists "Equipo lee autorizaciones" on approval_requests;
drop policy if exists "Equipo crea autorizaciones" on approval_requests;
drop policy if exists "Abogado admin revisa autorizaciones" on approval_requests;

create policy "Equipo lee autorizaciones" on approval_requests
  for select to authenticated using (true);

create policy "Equipo crea autorizaciones" on approval_requests
  for insert to authenticated with check (true);

create policy "Abogado admin revisa autorizaciones" on approval_requests
  for update to authenticated using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'abogado')
    )
  );

drop policy if exists "Admin abogado edita roles equipo" on profiles;
create policy "Admin abogado edita roles equipo" on profiles
  for update to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'abogado')
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'abogado')
    )
  );

create or replace function public.update_team_member_role(target_id uuid, new_role text)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result profiles;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  if not exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'abogado')
  ) then
    raise exception 'Solo abogado o admin puede cambiar roles';
  end if;

  if new_role not in ('admin', 'abogado', 'asistente') then
    raise exception 'Rol inválido: %', new_role;
  end if;

  if target_id = auth.uid() then
    raise exception 'No puedes cambiar tu propio rol desde aquí';
  end if;

  update profiles set role = new_role where id = target_id
  returning * into result;

  if result.id is null then
    raise exception 'Usuario no encontrado';
  end if;

  return result;
end;
$$;

revoke all on function public.update_team_member_role(uuid, text) from public;
grant execute on function public.update_team_member_role(uuid, text) to authenticated;

-- --- PARTE 2: Cuentas nuevas requieren aprobación ---

alter table profiles
  add column if not exists account_status text not null default 'activo'
  check (account_status in ('pendiente', 'activo', 'rechazado'));

update profiles set account_status = 'activo';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, account_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'usuario'), '@', 1)),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'role', 'asistente'),
    'pendiente'
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email;

  return new;
exception
  when others then
    raise log 'handle_new_user error for %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop policy if exists "Admin abogado gestiona cuentas" on profiles;
create policy "Admin abogado gestiona cuentas" on profiles
  for update to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'abogado')
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'abogado')
    )
  );

-- Listo. Deberías ver "Success" en Supabase.

-- ========== v6: Notificaciones, portal, bitácora append-only ==========

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

drop policy if exists "Equipo CRUD actividad" on activity_log;
drop policy if exists "Equipo inserta actividad" on activity_log;
drop policy if exists "Equipo lee actividad" on activity_log;

create policy "Equipo lee actividad" on activity_log
  for select to authenticated using (true);

create policy "Equipo inserta actividad" on activity_log
  for insert to authenticated with check (true);

insert into firm_settings (key, value) values
  ('onboarding', '{"completed": false, "steps": {}}'::jsonb),
  ('sat_thresholds', '{}'::jsonb)
on conflict (key) do nothing;

-- ========== v7: Portal cliente con código de acceso ==========
-- (contenido completo también en migration-client-portal-access.sql)

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin', 'abogado', 'asistente', 'cliente'));

alter table profiles add column if not exists client_id uuid references clients(id) on delete set null;

create index if not exists idx_profiles_client_id on profiles(client_id) where client_id is not null;

create table if not exists client_portal_invites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  invite_code text not null unique,
  intended_email text,
  label text default 'Oficial de cumplimiento',
  expires_at timestamptz not null,
  created_by uuid references profiles(id),
  used_at timestamptz,
  used_by uuid references profiles(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_portal_invites_code on client_portal_invites(invite_code);

alter table client_portal_invites enable row level security;

drop policy if exists "Equipo gestiona invitaciones portal" on client_portal_invites;
create policy "Equipo gestiona invitaciones portal" on client_portal_invites
  for all to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'abogado')))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'abogado')));

create or replace function public.validate_client_invite(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row client_portal_invites%rowtype; v_client clients%rowtype; v_code text;
begin
  v_code := upper(trim(coalesce(p_code, '')));
  if v_code = '' then return jsonb_build_object('valid', false, 'error', 'Código vacío'); end if;
  select * into v_row from client_portal_invites where invite_code = v_code limit 1;
  if not found then return jsonb_build_object('valid', false, 'error', 'Código no válido'); end if;
  if v_row.revoked_at is not null then return jsonb_build_object('valid', false, 'error', 'Este código fue revocado'); end if;
  if v_row.used_at is not null then return jsonb_build_object('valid', false, 'error', 'Este código ya fue utilizado'); end if;
  if v_row.expires_at < now() then return jsonb_build_object('valid', false, 'error', 'Código expirado'); end if;
  select * into v_client from clients where id = v_row.client_id;
  return jsonb_build_object('valid', true, 'client_id', v_row.client_id, 'client_name', coalesce(v_client.name, 'Cliente'), 'intended_email', v_row.intended_email, 'label', v_row.label);
end; $$;

grant execute on function public.validate_client_invite(text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_code text; v_invite client_portal_invites%rowtype;
begin
  v_code := upper(trim(coalesce(new.raw_user_meta_data->>'invite_code', '')));
  if v_code <> '' then
    select * into v_invite from client_portal_invites where invite_code = v_code and revoked_at is null and used_at is null and expires_at > now() limit 1;
    if found then
      insert into public.profiles (id, full_name, email, role, account_status, client_id)
      values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'usuario'), '@', 1)), coalesce(new.email, ''), 'cliente', 'activo', v_invite.client_id)
      on conflict (id) do update set full_name = excluded.full_name, email = excluded.email, role = 'cliente', account_status = 'activo', client_id = excluded.client_id;
      update client_portal_invites set used_at = now(), used_by = new.id where id = v_invite.id;
      return new;
    end if;
  end if;
  insert into public.profiles (id, full_name, email, role, account_status)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'usuario'), '@', 1)), coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'role', 'asistente'), 'pendiente')
  on conflict (id) do update set full_name = excluded.full_name, email = excluded.email;
  return new;
end; $$;
