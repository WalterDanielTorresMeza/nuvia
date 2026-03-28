import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  doctor: null,
  loading: true,
  error: null,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await get().fetchDoctor(session.user.id)
      set({ user: session.user, loading: false })
    } else {
      set({ loading: false })
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await get().fetchDoctor(session.user.id)
        set({ user: session.user })
      } else {
        set({ user: null, doctor: null })
      }
    })
  },

  fetchDoctor: async (userId) => {
    const { data } = await supabase
      .from('doctors')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (data) set({ doctor: data })
  },

  login: async (email, password) => {
    set({ error: null })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { set({ error: error.message }); return false }
    set({ user: data.user })
    return true
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, doctor: null })
  },
}))
