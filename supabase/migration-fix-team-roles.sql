-- Parche: permitir a abogado/admin cambiar roles del equipo
-- Ejecutar en Supabase → SQL Editor si asignar "Asistente" no guarda.
--
-- También puedes fijar a Karime manualmente (ajusta el correo):
-- update profiles set role = 'asistente' where email ilike '%karime%';

-- Política RLS (por si migration-approvals.sql no se ejecutó)
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

-- Función RPC: evita fallos silenciosos por RLS
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
