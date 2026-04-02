-- ============================================
-- NUVIA — Columnas extra para consultas
-- Signos vitales, IMC, descanso médico
-- ============================================

ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS peso              numeric(5,2),
  ADD COLUMN IF NOT EXISTS talla             numeric(5,2),
  ADD COLUMN IF NOT EXISTS temperatura       numeric(4,1),
  ADD COLUMN IF NOT EXISTS presion_arterial  text,
  ADD COLUMN IF NOT EXISTS frec_cardiaca     integer,
  ADD COLUMN IF NOT EXISTS saturacion_o2     integer,
  ADD COLUMN IF NOT EXISTS descanso_activo   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS descanso_tipo     text,
  ADD COLUMN IF NOT EXISTS descanso_dias     integer,
  ADD COLUMN IF NOT EXISTS descanso_fecha_inicio date,
  ADD COLUMN IF NOT EXISTS descanso_motivo   text;
