import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useClinicStore = create((set, get) => ({
  clinics:        [],
  activeClinic:   null,   // null = todos los consultorios
  loading:        false,

  fetchClinics: async (doctorId) => {
    if (!doctorId) return
    set({ loading: true })
    const { data } = await supabase
      .from('clinics')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('activo', true)
      .order('principal', { ascending: false })
      .order('created_at')
    const clinics = data || []
    set({ clinics, loading: false })
    // Auto-select principal if nothing selected yet
    if (!get().activeClinic && clinics.length > 0) {
      const principal = clinics.find(c => c.principal) || null
      set({ activeClinic: principal })
    }
  },

  setActiveClinic: (clinic) => set({ activeClinic: clinic }),
}))
