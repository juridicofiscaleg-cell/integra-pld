-- Integra PLD — Acceso portal cliente (cuenta + código de invitación)
-- Ejecutar en Supabase SQL Editor después de ejecutar-en-supabase.sql

-- Rol cliente vinculado a un client_id
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin', 'abogado', 'asistente', 'cliente'));

alter table profiles add column if not exists client_id uuid references clients(id) on delete set null;

create index if not exists idx_profiles_client_id on profiles(client_id) where client_id is not null;

-- Invitaciones de acceso (código que comparte el despacho al oficial de cumplimiento)
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
create index if not exists idx_portal_invites_client on client_portal_invites(client_id);

alter table client_portal_invites enable row level security;

drop policy if exists "Equipo gestiona invitaciones portal" on client_portal_invites;
create policy "Equipo gestiona invitaciones portal" on client_portal_invites
  for all to authenticated
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

-- Validar código antes del registro (sin autenticación)
create or replace function public.validate_client_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row client_portal_invites%rowtype;
  v_client clients%rowtype;
  v_code text;
begin
  v_code := upper(trim(coalesce(p_code, '')));
  if v_code = '' then
    return jsonb_build_object('valid', false, 'error', 'Código vacío');
  end if;

  select * into v_row from client_portal_invites
  where invite_code = v_code
  limit 1;

  if not found then
    return jsonb_build_object('valid', false, 'error', 'Código no válido');
  end if;

  if v_row.revoked_at is not null then
    return jsonb_build_object('valid', false, 'error', 'Este código fue revocado');
  end if;

  if v_row.used_at is not null then
    return jsonb_build_object('valid', false, 'error', 'Este código ya fue utilizado');
  end if;

  if v_row.expires_at < now() then
    return jsonb_build_object('valid', false, 'error', 'Código expirado');
  end if;

  select * into v_client from clients where id = v_row.client_id;

  return jsonb_build_object(
    'valid', true,
    'client_id', v_row.client_id,
    'client_name', coalesce(v_client.name, 'Cliente'),
    'intended_email', v_row.intended_email,
    'label', v_row.label
  );
end;
$$;

grant execute on function public.validate_client_invite(text) to anon, authenticated;

-- Al registrarse con invite_code en metadata → cuenta cliente activa
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_invite client_portal_invites%rowtype;
begin
  v_code := upper(trim(coalesce(new.raw_user_meta_data->>'invite_code', '')));

  if v_code <> '' then
    select * into v_invite from client_portal_invites
    where invite_code = v_code
      and revoked_at is null
      and used_at is null
      and expires_at > now()
    limit 1;

    if found then
      insert into public.profiles (id, full_name, email, role, account_status, client_id)
      values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'usuario'), '@', 1)),
        coalesce(new.email, ''),
        'cliente',
        'activo',
        v_invite.client_id
      )
      on conflict (id) do update set
        full_name = excluded.full_name,
        email = excluded.email,
        role = 'cliente',
        account_status = 'activo',
        client_id = excluded.client_id;

      update client_portal_invites
      set used_at = now(), used_by = new.id
      where id = v_invite.id;

      return new;
    end if;
  end if;

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
end;
$$;
