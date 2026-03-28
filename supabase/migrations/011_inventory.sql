-- ============================================================
-- NUVIA — Módulo de Inventario
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

create table if not exists inventory_items (
  id               uuid        default gen_random_uuid() primary key,
  doctor_id        uuid        references doctors(id) on delete cascade not null,
  nombre           text        not null,
  categoria        text        not null default 'medicamento',
  descripcion      text,
  unidad           text        not null default 'piezas',
  stock_actual     integer     not null default 0,
  stock_minimo     integer     not null default 5,
  precio_unitario  numeric(10,2),
  activo           boolean     not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists inventory_movements (
  id          uuid        default gen_random_uuid() primary key,
  item_id     uuid        references inventory_items(id) on delete cascade not null,
  doctor_id   uuid        references doctors(id) on delete cascade not null,
  tipo        text        not null check (tipo in ('entrada', 'salida', 'ajuste')),
  cantidad    integer     not null,
  nota        text,
  created_at  timestamptz not null default now()
);

-- RLS
alter table inventory_items     enable row level security;
alter table inventory_movements enable row level security;

create policy "Doctor manages own inventory items" on inventory_items
  for all using (doctor_id = auth.uid());

create policy "Doctor manages own inventory movements" on inventory_movements
  for all using (doctor_id = auth.uid());

-- updated_at trigger (reutiliza la función existente)
create trigger update_inventory_items_updated_at
  before update on inventory_items
  for each row execute function update_updated_at();
