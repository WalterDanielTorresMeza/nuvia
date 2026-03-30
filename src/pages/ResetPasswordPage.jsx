import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, Loader2, Lock, Check } from 'lucide-react'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [ready, setReady]       = useState(false)   // token processed by Supabase
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when it processes the token in the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    if (password.length < 6)    { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (password !== confirm)   { setError('Las contraseñas no coinciden.'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (err) { setError(err.message); return }
    setDone(true)
    setTimeout(() => navigate('/login'), 3000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-slate-800 font-bold text-xl">Nuvia</span>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/80 border border-slate-100 p-8">

          {done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">¡Contraseña actualizada!</h2>
              <p className="text-sm text-slate-400">Redirigiendo al inicio de sesión...</p>
            </div>
          ) : !ready ? (
            <div className="text-center py-8 space-y-3">
              <Loader2 className="w-7 h-7 animate-spin text-primary-400 mx-auto" />
              <p className="text-sm text-slate-400">Verificando enlace de restablecimiento...</p>
              <p className="text-xs text-slate-400">Si esto tarda mucho, el enlace puede haber expirado.<br />
                <button onClick={() => navigate('/login')} className="text-primary-600 hover:underline mt-1">
                  Volver al inicio de sesión
                </button>
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="w-11 h-11 bg-primary-50 rounded-2xl flex items-center justify-center mb-4">
                  <Lock className="w-5 h-5 text-primary-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Nueva contraseña</h2>
                <p className="text-slate-400 text-sm mt-1">Elige una contraseña segura para tu cuenta.</p>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="label">Nueva contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password} onChange={e => { setPassword(e.target.value); setError('') }}
                      className="input pl-10 pr-11" placeholder="Mínimo 6 caracteres" required autoFocus
                    />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">Confirmar contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={confirm} onChange={e => { setConfirm(e.target.value); setError('') }}
                      className="input pl-10" placeholder="Repite la contraseña" required
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs px-3 py-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={saving || !password || !confirm}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold text-sm rounded-2xl transition-all"
                  style={{ boxShadow: '0 4px 16px rgba(2,132,199,0.3)' }}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Guardando...' : 'Guardar nueva contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
