-- ============================================
-- MEDISYSTEM — Schema completo Fase 1
-- Ejecutar en: Supabase > SQL Editor
-- ============================================

create extension if not exists "uuid-ossp";

-- doctors
create table doctors (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade,
  nombre        text not null,
  apellidos     text not null,
  especialidad  text,
  cedula        text,
  telefono      text,
  email         text unique,
  foto_url      text,
  activo        boolean default true,
  created_at    timestamptz default now()
);

-- patients
create table patients (
  id               uuid primary key default uuid_generate_v4(),
  doctor_id        uuid references doctors(id),
  nombre           text not null,
  apellidos        text not null,
  fecha_nacimiento date,
  curp             text,
  sexo             text check (sexo in ('M','F','Otro')),
  tipo_sangre      text,
  telefono         text,
  email            text,
  direccion        text,
  foto_url         text,
  activo           boolean default true,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- clinical_background
create table clinical_background (
  id                        uuid primary key default uuid_generate_v4(),
  patient_id                uuid references patients(id) on delete cascade unique,
  antec_familiares          text,
  antec_patologicos         text,
  antec_no_patologicos      text,
  antec_gineco_obstetricos  text,
  antec_perinatales         text,
  antec_postnatales         text,
  antec_psiquiatricos       text,
  alergias                  text,
  updated_at                timestamptz default now()
);

-- vital_signs
create table vital_signs (
  id                 uuid primary key default uuid_generate_v4(),
  patient_id         uuid references patients(id) on delete cascade,
  consultation_id    uuid,
  peso_kg            numeric(5,2),
  talla_cm           numeric(5,2),
  imc                numeric(4,2) generated always as (
                       round((peso_kg / ((talla_cm/100) * (talla_cm/100)))::numeric, 2)
                     ) stored,
  temperatura        numeric(4,1),
  frec_cardiaca      integer,
  frec_respiratoria  integer,
  porc_grasa         numeric(4,1),
  masa_muscular      numeric(5,2),
  presion_sistolica  integer,
  presion_diastolica integer,
  saturacion_o2      integer,
  fecha              timestamptz default now()
);

-- medications
create table medications (
  id          uuid primary key default uuid_generate_v4(),
  patient_id  uuid references patients(id) on delete cascade,
  nombre      text not null,
  dosis       text,
  frecuencia  text,
  via         text,
  inicio      date,
  fin         date,
  activo      boolean default true,
  notas       text,
  created_at  timestamptz default now()
);

-- vaccines
create table vaccines (
  id                uuid primary key default uuid_generate_v4(),
  patient_id        uuid references patients(id) on delete cascade,
  nombre            text not null,
  fecha_aplicacion  date,
  lote              text,
  laboratorio       text,
  dosis_numero      integer,
  proxima_dosis     date,
  created_at        timestamptz default now()
);

-- diets
create table diets (
  id            uuid primary key default uuid_generate_v4(),
  patient_id    uuid references patients(id) on delete cascade,
  nutriologo    text,
  descripcion   text,
  calorias      integer,
  restricciones text,
  inicio        date,
  fin           date,
  activa        boolean default true,
  created_at    timestamptz default now()
);

-- appointments
create table appointments (
  id                   uuid primary key default uuid_generate_v4(),
  patient_id           uuid references patients(id) on delete cascade,
  doctor_id            uuid references doctors(id),
  fecha_hora           timestamptz not null,
  duracion_min         integer default 30,
  tipo                 text default 'presencial' check (tipo in ('presencial','videoconsulta','urgencia')),
  estado               text default 'programada' check (estado in ('programada','confirmada','cancelada','completada','no_asistio')),
  motivo               text,
  notas                text,
  recordatorio_enviado boolean default false,
  created_at           timestamptz default now()
);

-- consultations
create table consultations (
  id                  uuid primary key default uuid_generate_v4(),
  patient_id          uuid references patients(id) on delete cascade,
  doctor_id           uuid references doctors(id),
  appointment_id      uuid references appointments(id),
  fecha               timestamptz default now(),
  motivo              text,
  exploracion_fisica  text,
  diagnostico         text,
  diagnostico_cie10   text,
  plan_tratamiento    text,
  receta              text,
  proxima_cita        date,
  video_room_url      text,
  video_room_name     text,
  created_at          timestamptz default now()
);

alter table vital_signs
  add constraint fk_consultation
  foreign key (consultation_id) references consultations(id);

-- invoices
create table invoices (
  id               uuid primary key default uuid_generate_v4(),
  patient_id       uuid references patients(id),
  consultation_id  uuid references consultations(id),
  doctor_id        uuid references doctors(id),
  uuid_cfdi        text,
  folio            text,
  serie            text default 'A',
  subtotal         numeric(10,2),
  iva              numeric(10,2),
  total            numeric(10,2),
  concepto         text,
  estado           text default 'pendiente' check (estado in ('pendiente','timbrada','cancelada')),
  xml_url          text,
  pdf_url          text,
  facturama_id     text,
  fecha            timestamptz default now(),
  rfc_receptor     text,
  razon_social     text
);

-- RLS
alter table doctors             enable row level security;
alter table patients            enable row level security;
alter table clinical_background enable row level security;
alter table vital_signs         enable row level security;
alter table medications         enable row level security;
alter table vaccines            enable row level security;
alter table diets               enable row level security;
alter table appointments        enable row level security;
alter table consultations       enable row level security;
alter table invoices            enable row level security;

create policy "doctors_own" on doctors for all using (user_id = auth.uid());
create policy "patients_own" on patients for all using (doctor_id in (select id from doctors where user_id = auth.uid()));
create policy "background_own" on clinical_background for all using (patient_id in (select id from patients where doctor_id in (select id from doctors where user_id = auth.uid())));
create policy "vitals_own" on vital_signs for all using (patient_id in (select id from patients where doctor_id in (select id from doctors where user_id = auth.uid())));
create policy "meds_own" on medications for all using (patient_id in (select id from patients where doctor_id in (select id from doctors where user_id = auth.uid())));
create policy "vaccines_own" on vaccines for all using (patient_id in (select id from patients where doctor_id in (select id from doctors where user_id = auth.uid())));
create policy "diets_own" on diets for all using (patient_id in (select id from patients where doctor_id in (select id from doctors where user_id = auth.uid())));
create policy "appointments_own" on appointments for all using (doctor_id in (select id from doctors where user_id = auth.uid()));
create policy "consultations_own" on consultations for all using (doctor_id in (select id from doctors where user_id = auth.uid()));
create policy "invoices_own" on invoices for all using (doctor_id in (select id from doctors where user_id = auth.uid()));

-- Trigger updated_at
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger patients_updated_at
  before update on patients
  for each row execute function update_updated_at();
