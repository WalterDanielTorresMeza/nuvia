-- ============================================
-- NUVIA — Columna integraciones para doctors
-- Almacena credenciales de APIs externas (email, WhatsApp, Stripe, etc.)
-- ============================================

ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS integraciones jsonb DEFAULT '{}';
