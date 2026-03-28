-- ============================================================
-- NUVIA — Agrega columnas estudios_imagen y estudios_otro
-- a la tabla consultations para solicitudes de imagen.
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

alter table consultations
  add column if not exists estudios_imagen jsonb    default '[]'::jsonb,
  add column if not exists estudios_otro   text     default '';
