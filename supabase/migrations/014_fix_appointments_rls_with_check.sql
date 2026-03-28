-- ============================================================
-- NUVIA — Fix RLS appointments: agrega WITH CHECK explícito
-- igual al patrón usado en inventory (migración 013).
-- FOR ALL USING sin WITH CHECK puede fallar silenciosamente
-- en INSERT en algunos entornos Supabase.
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

drop policy if exists "appointments_own"       on appointments;
drop policy if exists "consultations_own"      on consultations;

create policy "appointments_own" on appointments
  for all
  using      (doctor_id in (select id from doctors where user_id = auth.uid()))
  with check (doctor_id in (select id from doctors where user_id = auth.uid()));

create policy "consultations_own" on consultations
  for all
  using      (doctor_id in (select id from doctors where user_id = auth.uid()))
  with check (doctor_id in (select id from doctors where user_id = auth.uid()));
