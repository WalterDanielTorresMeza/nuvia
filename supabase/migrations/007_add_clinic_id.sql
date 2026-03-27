-- ============================================
-- NUVIA — Agrega clinic_id a pacientes y citas
-- Ejecutar DESPUÉS de 006_clinics.sql
-- ============================================

alter table patients
  add column if not exists clinic_id uuid references clinics(id) on delete set null;

alter table appointments
  add column if not exists clinic_id uuid references clinics(id) on delete set null;

-- Índices para filtros frecuentes
create index if not exists patients_clinic_idx     on patients(clinic_id);
create index if not exists appointments_clinic_idx on appointments(clinic_id);
