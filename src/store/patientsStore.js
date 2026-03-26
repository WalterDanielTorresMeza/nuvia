import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const usePatientsStore = create((set, get) => ({
  patients: [],
  currentPatient: null,
  loading: false,
  error: null,

  fetchPatients: async () => {
    set({ loading: true, error: null })
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
    set({ loading: true })
    const { data, error } = await supabase
      .from('patients')
      .select(`
        *,
        clinical_background(*),
        vital_signs(* order by fecha desc limit 10),
        medications(* order by created_at desc),
        vaccines(* order by fecha_aplicacion desc),
        diets(* order by created_at desc),
        appointments(* order by fecha_hora desc limit 20),
        consultations(* order by fecha desc limit 20)
      `)
      .eq('id', id)
      .single()
    if (error) set({ error: error.message })
    else set({ currentPatient: data })
    set({ loading: false })
    return data
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
      .upsert({ patient_id: patientId, ...bgData, updated_at: new Date().toISOString() })
      .select()
      .single()
    if (error) return { error: error.message }
    return { data }
  },

  addVitalSigns: async (vitals) => {
    const { data, error } = await supabase
      .from('vital_signs')
      .insert([vitals])
      .select()
      .single()
    if (error) return { error: error.message }
    return { data }
  },

  addMedication: async (med) => {
    const { data, error } = await supabase
      .from('medications')
      .insert([med])
      .select()
      .single()
    if (error) return { error: error.message }
    return { data }
  },

  updateMedication: async (id, updates) => {
    const { data, error } = await supabase
      .from('medications')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) return { error: error.message }
    return { data }
  },

  addVaccine: async (vaccine) => {
    const { data, error } = await supabase
      .from('vaccines')
      .insert([vaccine])
      .select()
      .single()
    if (error) return { error: error.message }
    return { data }
  },
}))
