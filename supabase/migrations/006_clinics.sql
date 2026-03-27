-- ============================================
-- NUVIA — Consultorios por médico
-- Ejecutar en: Supabase > SQL Editor
-- ============================================

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

alter table clinics enable row level security;

create policy "clinics_own" on clinics for all using (
  doctor_id in (select id from doctors where user_id = auth.uid())
);
