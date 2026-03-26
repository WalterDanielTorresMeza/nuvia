import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAppointmentsStore = create((set, get) => ({
  appointments: [],
  loading: false,

  fetchAppointments: async (filter = 'todas') => {
    // Only show spinner on first load — stale-while-revalidate for subsequent calls
    if (get().appointments.length === 0) set({ loading: true })

    try {
      let query = supabase
        .from('appointments')
        .select('*, patients(id, nombre, apellidos, telefono, tipo_sangre)')
        .order('fecha_hora')

      const now  = new Date()
      const hoy  = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      if (filter === 'hoy') {
        const fin = new Date(hoy.getTime() + 86399999)
        query = query.gte('fecha_hora', hoy.toISOString()).lte('fecha_hora', fin.toISOString())

      } else if (filter === 'semana') {
        const lunes = new Date(hoy)
        lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))
        const domingo = new Date(lunes)
        domingo.setDate(lunes.getDate() + 6)
        domingo.setHours(23, 59, 59, 999)
        query = query.gte('fecha_hora', lunes.toISOString()).lte('fecha_hora', domingo.toISOString())

      } else if (filter === 'mes') {
        const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        const fin    = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999)
        query = query.gte('fecha_hora', inicio.toISOString()).lte('fecha_hora', fin.toISOString())

      } else if (filter === 'proximas') {
        query = query
          .gte('fecha_hora', now.toISOString())
          .in('estado', ['programada', 'confirmada'])

      } else if (filter === 'pendientes') {
        query = query.in('estado', ['programada', 'confirmada'])
      }
      // 'todas' — no extra filter, RLS handles doctor scoping

      const { data } = await query
      set({ appointments: data || [] })
    } finally {
      set({ loading: false })
    }
  },

  // Optimistic update — no refetch needed
  updateEstado: async (id, estado) => {
    set(state => ({
      appointments: state.appointments.map(a => a.id === id ? { ...a, estado } : a),
    }))
    await supabase.from('appointments').update({ estado }).eq('id', id)
  },
}))
