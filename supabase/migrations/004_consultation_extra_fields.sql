-- ============================================
-- NUVIA — Fase 1.3: Campos faltantes en consultas
-- Ejecutar en: Supabase > SQL Editor
-- ============================================

ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS exploracion_fisica text,
  ADD COLUMN IF NOT EXISTS plan_tratamiento   text;
