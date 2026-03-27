-- ============================================================
-- NUVIA — Migración consultorios (ejecutar en Supabase SQL Editor)
-- Incluye: tabla clinics + columnas clinic_id en patients/appointments
-- ============================================================

-- 1. Tabla de consultorios
create table if not exists clinics (
  id          uuid primary key default uuid_generate_v4(),
  doctor_id   uuid references doctors(id) on delete cascade not null,
  nombre      text not null,
  direccion   text,
  ciudad      text,
  telefono    text,
  color       text default '#0ea5e9',
  principal   boolean default false,
  activo      boolean default true,
  created_at  timestamptz default now()
);

-- Solo un consultorio principal por médico
create unique index if not exists clinics_principal_unique
  on clinics (doctor_id)
  where principal = true;

-- RLS
alter table clinics enable row level security;

drop policy if exists "clinics_own" on clinics;
create policy "clinics_own" on clinics for all using (
  doctor_id in (select id from doctors where user_id = auth.uid())
);

-- 2. Columna clinic_id en pacientes y citas
alter table patients
  add column if not exists clinic_id uuid references clinics(id) on delete set null;

alter table appointments
  add column if not exists clinic_id uuid references clinics(id) on delete set null;

-- Índices
create index if not exists patients_clinic_idx     on patients(clinic_id);
create index if not exists appointments_clinic_idx on appointments(clinic_id);
