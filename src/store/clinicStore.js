import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useClinicStore = create((set, get) => ({
  clinics:        [],
  activeClinic:   null,   // null = todos los consultorios
  loading:        false,

  fetchClinics: async (doctorId) => {
    if (!doctorId) return
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('activo', true)
        .order('principal', { ascending: false })
        .order('created_at')
      // Si la tabla no existe aún, simplemente no hay consultorios
      if (error) { set({ clinics: [], loading: false }); return }
      const clinics = data || []
      set({ clinics, loading: false })
      if (!get().activeClinic && clinics.length > 0) {
        const principal = clinics.find(c => c.principal) || null
        set({ activeClinic: principal })
      }
    } catch { set({ clinics: [], loading: false }) }
  },

  setActiveClinic: (clinic) => set({ activeClinic: clinic }),
}))
