alter table inventory_items
  add column if not exists sku                  text,
  add column if not exists marca                text,
  add column if not exists marca_propia         boolean default false,
  add column if not exists caracteristicas      text,
  add column if not exists requiere_receta      boolean default false,
  add column if not exists medicamento_controlado boolean default false,
  add column if not exists ingredientes         text;
