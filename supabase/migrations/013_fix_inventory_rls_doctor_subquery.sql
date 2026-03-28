-- ============================================================
-- NUVIA — Fix RLS inventario: doctor_id es UUID de doctors,
-- no de auth.users, por lo que no se puede comparar con auth.uid()
-- directamente. Usar subquery igual que en clinics.
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

drop policy if exists "Doctor manages own inventory items"     on inventory_items;
drop policy if exists "Doctor manages own inventory movements" on inventory_movements;

create policy "Doctor manages own inventory items" on inventory_items
  for all
  using (
    doctor_id in (select id from doctors where user_id = auth.uid())
  )
  with check (
    doctor_id in (select id from doctors where user_id = auth.uid())
  );

create policy "Doctor manages own inventory movements" on inventory_movements
  for all
  using (
    doctor_id in (select id from doctors where user_id = auth.uid())
  )
  with check (
    doctor_id in (select id from doctors where user_id = auth.uid())
  );
