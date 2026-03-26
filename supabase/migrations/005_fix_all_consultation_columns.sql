-- ============================================
-- NUVIA — Fix: Agregar TODAS las columnas faltantes
-- Ejecutar en: Supabase > SQL Editor
-- ============================================

ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS notas_padecimiento      text,
  ADD COLUMN IF NOT EXISTS instrucciones_medicas   text,
  ADD COLUMN IF NOT EXISTS solicitudes_lab         text,
  ADD COLUMN IF NOT EXISTS procedimientos          text,
  ADD COLUMN IF NOT EXISTS exploracion_topografica jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS medicamentos_receta     jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS exploracion_fisica      text,
  ADD COLUMN IF NOT EXISTS plan_tratamiento        text;

-- Agregar estado si no existe (requiere pasos separados por el CHECK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultations' AND column_name = 'estado'
  ) THEN
    ALTER TABLE consultations
      ADD COLUMN estado text DEFAULT 'activa'
        CHECK (estado IN ('activa', 'terminada', 'cancelada'));
  END IF;
END $$;
