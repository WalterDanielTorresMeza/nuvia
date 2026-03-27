-- ============================================================
-- NUVIA — Datos fiscales para facturación
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- Datos fiscales del médico
alter table doctors
  add column if not exists rfc                text,
  add column if not exists razon_social_fiscal text,
  add column if not exists regimen_fiscal      text,
  add column if not exists direccion_fiscal    text,
  add column if not exists cp_fiscal           text;

-- RFC y razón social del paciente (para pre-factura)
alter table patients
  add column if not exists rfc                  text,
  add column if not exists razon_social_factura text;

-- Campos adicionales en cobros
alter table invoices
  add column if not exists requiere_factura boolean default false,
  add column if not exists metodo_pago      text    default 'Efectivo';
