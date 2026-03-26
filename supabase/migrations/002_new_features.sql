-- ============================================
-- NUVIA — Fase 1.1: Problemas, Notas, Archivos, Plantillas
-- Ejecutar en: Supabase > SQL Editor
-- ============================================

-- Lista de problemas / diagnósticos CIE-10
create table patient_problems (
  id                uuid primary key default uuid_generate_v4(),
  patient_id        uuid references patients(id) on delete cascade,
  cie10_codigo      text,
  cie10_descripcion text not null,
  estado            text default 'activo' check (estado in ('activo','inactivo','resuelto')),
  fecha_inicio      date,
  notas             text,
  created_at        timestamptz default now()
);

-- Notas clínicas con texto enriquecido
create table clinical_notes (
  id         uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id  uuid references doctors(id),
  contenido  text not null,
  created_at timestamptz default now()
);

-- Archivos adjuntos del expediente
create table patient_files (
  id           uuid primary key default uuid_generate_v4(),
  patient_id   uuid references patients(id) on delete cascade,
  doctor_id    uuid references doctors(id),
  nombre       text not null,
  tipo         text,
  tamano       integer,
  storage_path text not null,
  url          text not null,
  created_at   timestamptz default now()
);

-- Plantillas de notas por doctor
create table note_templates (
  id        uuid primary key default uuid_generate_v4(),
  doctor_id uuid references doctors(id) on delete cascade,
  nombre    text not null,
  contenido text not null,
  created_at timestamptz default now()
);

-- RLS
alter table patient_problems enable row level security;
alter table clinical_notes    enable row level security;
alter table patient_files     enable row level security;
alter table note_templates    enable row level security;

create policy "problems_own" on patient_problems for all using (
  patient_id in (select id from patients where doctor_id in (select id from doctors where user_id = auth.uid()))
);
create policy "clinical_notes_own" on clinical_notes for all using (
  doctor_id in (select id from doctors where user_id = auth.uid())
);
create policy "patient_files_own" on patient_files for all using (
  doctor_id in (select id from doctors where user_id = auth.uid())
);
create policy "note_templates_own" on note_templates for all using (
  doctor_id in (select id from doctors where user_id = auth.uid())
);
