-- ============================================================
-- NUVIA — Fix RLS políticas + clinic_id en consultas
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- 1. Fix inventario: agregar WITH CHECK para INSERT
drop policy if exists "Doctor manages own inventory items"     on inventory_items;
drop policy if exists "Doctor manages own inventory movements" on inventory_movements;

create policy "Doctor manages own inventory items" on inventory_items
  for all
  using     (doctor_id = auth.uid())
  with check(doctor_id = auth.uid());

create policy "Doctor manages own inventory movements" on inventory_movements
  for all
  using     (doctor_id = auth.uid())
  with check(doctor_id = auth.uid());

-- 2. Fix consultorios: agregar WITH CHECK para INSERT
drop policy if exists "clinics_own" on clinics;

create policy "clinics_own" on clinics
  for all
  using (
    doctor_id in (select id from doctors where user_id = auth.uid())
  )
  with check (
    doctor_id in (select id from doctors where user_id = auth.uid())
  );

-- 3. Agregar clinic_id a consultas (si no existe ya)
alter table consultations
  add column if not exists clinic_id uuid references clinics(id) on delete set null;

create index if not exists consultations_clinic_idx on consultations(clinic_id);
