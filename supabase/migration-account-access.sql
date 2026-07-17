-- Control de acceso: nuevas cuentas requieren aprobación del abogado
-- Ejecutar en Supabase → SQL Editor

alter table profiles
  add column if not exists account_status text not null default 'activo'
  check (account_status in ('pendiente', 'activo', 'rechazado'));

-- Usuarios existentes (Adrian, Karime, etc.) siguen activos
update profiles set account_status = 'activo' where account_status is null or account_status = '';

-- Nuevos registros: asistente en espera de aprobación
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

-- Abogado/admin puede activar o rechazar cuentas
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
