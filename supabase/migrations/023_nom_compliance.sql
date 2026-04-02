-- ============================================
-- NUVIA — Cumplimiento NOM-004-SSA3-2012 y NOM-024-SSA3-2010
-- ============================================

-- CURP del médico (NOM-004 y NOM-024: identificación del prescriptor)
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS curp text;

-- Fecha y hora explícita de la consulta (NOM-004: toda nota debe tener fecha y hora)
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS fecha_hora timestamptz DEFAULT now();

-- Rellenar fecha_hora desde fecha existente donde sea null
UPDATE consultations
  SET fecha_hora = fecha
  WHERE fecha_hora IS NULL AND fecha IS NOT NULL;

-- Tabla de auditoría (NOM-024: trazabilidad de acceso y modificación de expedientes)
CREATE TABLE IF NOT EXISTS audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id     uuid REFERENCES doctors(id) ON DELETE SET NULL,
  patient_id    uuid REFERENCES patients(id) ON DELETE SET NULL,
  record_type   text NOT NULL,   -- 'consultation' | 'patient' | 'prescription'
  record_id     uuid,
  action        text NOT NULL,   -- 'create' | 'update' | 'view' | 'print'
  details       jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS: cada médico solo ve sus propios registros de auditoría
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "audit_log_doctor_own"
  ON audit_log
  FOR ALL
  USING (
    doctor_id = (
      SELECT id FROM doctors WHERE user_id = auth.uid() LIMIT 1
    )
  );

-- Índices para consultas rápidas de auditoría
CREATE INDEX IF NOT EXISTS audit_log_doctor_idx   ON audit_log (doctor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_patient_idx  ON audit_log (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_record_idx   ON audit_log (record_type, record_id);
