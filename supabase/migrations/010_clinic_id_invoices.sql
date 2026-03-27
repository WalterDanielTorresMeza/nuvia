-- ============================================================
-- NUVIA — Agregar clinic_id a invoices
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================
alter table invoices
  add column if not exists clinic_id uuid references clinics(id);
