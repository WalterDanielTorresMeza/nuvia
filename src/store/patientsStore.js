import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const usePatientsStore = create((set, get) => ({
  patients: [],
  currentPatient: null,
  loading: false,
  error: null,

  fetchPatients: async () => {
    // Show loader only on first load; subsequent calls refresh silently
    if (get().patients.length === 0) set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('activo', true)
      .order('nombre')
    if (error) set({ error: error.message })
    else set({ patients: data || [] })
    set({ loading: false })
  },

  fetchPatient: async (id) => {
    // Show loader only if we don't already have this patient loaded
    const current = get().currentPatient
    if (!current || current.id !== id) set({ loading: true })
    const { data, error } = await supabase
      .from('patients')
      .select(`
        *,
        clinical_background(*),
        vital_signs(*),
        medications(*),
        vaccines(*),
        diets(*),
        appointments(*),
        consultations(*)
      `)
      .eq('id', id)
      .single()
    if (error) set({ error: error.message })
    else set({ currentPatient: data })
    set({ loading: false })
    return data
  },

  deletePatient: async (id) => {
    const { error } = await supabase.from('patients').update({ activo: false }).eq('id', id)
    if (error) return { error: error.message }
    set(state => ({ patients: state.patients.filter(p => p.id !== id) }))
    return { ok: true }
  },

  createPatient: async (patientData) => {
    const { data, error } = await supabase
      .from('patients')
      .insert([patientData])
      .select()
      .single()
    if (error) return { error: error.message }
    set(state => ({ patients: [data, ...state.patients] }))
    return { data }
  },

  updatePatient: async (id, updates) => {
    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) return { error: error.message }
    set(state => ({
      patients: state.patients.map(p => p.id === id ? data : p),
      currentPatient: state.currentPatient?.id === id ? { ...state.currentPatient, ...data } : state.currentPatient
    }))
    return { data }
  },

  upsertBackground: async (patientId, bgData) => {
    const { data, error } = await supabase
      .from('clinical_background')
      .upsert({ patient_id: patientId, ...bgData, updated_at: new Date().toISOString() }, { onConflict: 'patient_id' })
      .select()
      .single()
    if (error) return { error: error.message }
    return { data }
  },

  addVitalSigns: async (vitals) => {
    const { error } = await supabase.from('vital_signs').insert([vitals])
    if (error) return { error: error.message }
    return { ok: true }
  },

  addMedication: async (med) => {
    const { error } = await supabase.from('medications').insert([med])
    if (error) return { error: error.message }
    return { ok: true }
  },

  updateMedication: async (id, updates) => {
    const { error } = await supabase.from('medications').update(updates).eq('id', id)
    if (error) return { error: error.message }
    return { ok: true }
  },

  addVaccine: async (vaccine) => {
    const { error } = await supabase.from('vaccines').insert([vaccine])
    if (error) return { error: error.message }
    return { ok: true }
  },
}))
