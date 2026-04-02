-- ============================================
-- NUVIA — Cédulas profesionales del médico
-- cedula_profesional = cédula principal (medicina general)
-- cedula_especialidad = cédula de especialidad
-- ============================================

ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS cedula_profesional text,
  ADD COLUMN IF NOT EXISTS cedula_especialidad text;

-- Copiar valor existente de "cedula" a "cedula_profesional" si existe
UPDATE doctors
  SET cedula_profesional = cedula
  WHERE cedula IS NOT NULL AND cedula_profesional IS NULL;
