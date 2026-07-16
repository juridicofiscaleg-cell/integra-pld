-- Integra PLD — Migración v2 (campos PLD adicionales)
-- Ejecutar en Supabase → SQL Editor después de schema.sql

alter table clients add column if not exists curp text;
alter table clients add column if not exists nationality text default 'México';
alter table clients add column if not exists vulnerable_activity boolean default false;
alter table clients add column if not exists legal_representative text;
alter table clients add column if not exists activity_code text;

alter table kyc_records add column if not exists sanctions_results jsonb default '{}';
