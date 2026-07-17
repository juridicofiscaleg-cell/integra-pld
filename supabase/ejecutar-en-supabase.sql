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
