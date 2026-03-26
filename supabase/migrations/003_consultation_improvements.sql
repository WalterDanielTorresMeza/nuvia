-- ============================================
-- NUVIA — Fase 1.2: Mejora módulo de consultas
-- Ejecutar en: Supabase > SQL Editor
-- ============================================

ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS notas_padecimiento    text,
  ADD COLUMN IF NOT EXISTS instrucciones_medicas text,
  ADD COLUMN IF NOT EXISTS solicitudes_lab       text,
  ADD COLUMN IF NOT EXISTS procedimientos        text,
  ADD COLUMN IF NOT EXISTS exploracion_topografica jsonb default '{}',
  ADD COLUMN IF NOT EXISTS medicamentos_receta   jsonb default '[]',
  ADD COLUMN IF NOT EXISTS estado text default 'activa'
    check (estado in ('activa','terminada','cancelada'));
