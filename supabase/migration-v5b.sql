-- Integra PLD — Migración v5b: ficha capacitaciones + constancias
-- Ejecutar después de migration-v5.sql

alter table training_sessions add column if not exists instructor text;
alter table training_sessions add column if not exists location text;
alter table training_sessions add column if not exists modality text default 'presencial';
alter table training_sessions add column if not exists certificate_text text;
alter table training_sessions add column if not exists certificate_generated_at timestamptz;

insert into firm_settings (key, value) values
  ('firm_profile', '{"name":"","rfc":"","address":""}')
on conflict (key) do nothing;
