-- Cola de autorización para acciones sensibles (auxiliar → abogado/admin)
-- Ejecutar en Supabase SQL Editor

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

-- Permitir a admin/abogado cambiar rol de otros miembros del equipo
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

-- RPC para cambio de roles (ver migration-fix-team-roles.sql si falla)
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
