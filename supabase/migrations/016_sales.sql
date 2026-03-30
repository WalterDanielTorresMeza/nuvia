-- ============================================================
-- NUVIA — Punto de venta: tablas sales y sale_items
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

create table if not exists sales (
  id            uuid primary key default gen_random_uuid(),
  doctor_id     uuid references doctors(id) on delete cascade not null,
  clinic_id     uuid references clinics(id) on delete set null,
  patient_id    uuid references patients(id) on delete set null,
  total         numeric(10,2) not null default 0,
  descuento     numeric(10,2) not null default 0,
  metodo_pago   text not null default 'efectivo',
  notas         text,
  created_at    timestamptz default now()
);

create table if not exists sale_items (
  id            uuid primary key default gen_random_uuid(),
  sale_id       uuid references sales(id) on delete cascade not null,
  item_id       uuid references inventory_items(id) on delete set null,
  nombre        text not null,
  cantidad      int  not null,
  precio_unit   numeric(10,2) not null,
  subtotal      numeric(10,2) not null
);

-- RLS
alter table sales      enable row level security;
alter table sale_items enable row level security;

create policy "sales_own" on sales
  for all
  using      (doctor_id in (select id from doctors where user_id = auth.uid()))
  with check (doctor_id in (select id from doctors where user_id = auth.uid()));

create policy "sale_items_own" on sale_items
  for all
  using      (sale_id in (select id from sales where doctor_id in (select id from doctors where user_id = auth.uid())))
  with check (sale_id in (select id from sales where doctor_id in (select id from doctors where user_id = auth.uid())));
