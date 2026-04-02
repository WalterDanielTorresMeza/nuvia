-- ============================================
-- NUVIA — Cédulas como arreglo dinámico
-- cedulas = [{ descripcion: "Medicina General", numero: "12345678" }, ...]
-- ============================================

ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS cedulas jsonb DEFAULT '[]';

-- Migrar datos existentes al nuevo formato
UPDATE doctors
  SET cedulas = (
    SELECT jsonb_agg(c)
    FROM (
      SELECT jsonb_build_object('descripcion', 'Medicina General', 'numero', cedula_profesional) AS c
        WHERE cedula_profesional IS NOT NULL
      UNION ALL
      SELECT jsonb_build_object('descripcion', 'Especialidad', 'numero', cedula_especialidad) AS c
        WHERE cedula_especialidad IS NOT NULL
    ) sub
  )
  WHERE (cedula_profesional IS NOT NULL OR cedula_especialidad IS NOT NULL)
    AND (cedulas IS NULL OR cedulas = '[]');
