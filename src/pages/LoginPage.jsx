import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowLeft } from 'lucide-react'

/* ── ECG SVG path (heartbeat) ── */
function EcgLine() {
  return (
    <svg viewBox="0 0 400 60" className="w-full opacity-30" preserveAspectRatio="none">
      <path
        d="M0,30 L60,30 L75,30 L82,10 L89,50 L96,5 L103,55 L110,30 L125,30 L200,30 L260,30 L267,30 L274,10 L281,50 L288,5 L295,55 L302,30 L317,30 L400,30"
        fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="ecg-animate"
      />
    </svg>
  )
}

const FEATURES = [
  { icon: '🩺', text: 'Expedientes clínicos completos' },
  { icon: '📅', text: 'Agenda y calendario integrados' },
  { icon: '📹', text: 'Videoconsultas sin apps externas' },
  { icon: '📊', text: 'Reportes y estadísticas al instante' },
]

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const { login, error }        = useAuthStore()
  const navigate                = useNavigate()

  const [forgotMode, setForgotMode]     = useState(false)
  const [resetEmail, setResetEmail]     = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMsg, setResetMsg]         = useState('')   // 'ok:...' | 'error:...'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const ok = await login(email, password)
    setLoading(false)
    if (ok) navigate('/dashboard')
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    if (!resetEmail.trim()) return
    setResetLoading(true); setResetMsg('')
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setResetLoading(false)
    if (error) { setResetMsg(`error:${error.message}`); return }
    setResetMsg('ok:¡Listo! Revisa tu correo y haz clic en el enlace para restablecer tu contraseña.')
  }

  const resetIsError = resetMsg.startsWith('error:')
  const resetText    = resetMsg.replace(/^(ok|error):/, '')

  return (
    <>
      <style>{`
        @keyframes ecgDraw {
          0%   { stroke-dashoffset: 800; opacity: 0.2; }
          40%  { opacity: 0.4; }
          100% { stroke-dashoffset: 0; opacity: 0.2; }
        }
        .ecg-animate {
          stroke-dasharray: 800;
          stroke-dashoffset: 800;
          animation: ecgDraw 3s ease-in-out infinite;
        }
        @keyframes floatA {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-18px) rotate(5deg); }
        }
        @keyframes floatB {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(12px); }
        }
        .float-a { animation: floatA 8s ease-in-out infinite; }
        .float-b { animation: floatB 6s ease-in-out infinite; }
      `}</style>

      <div className="min-h-screen flex bg-slate-50">

        {/* ── Left panel ── */}
        <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden flex-col"
             style={{ background: 'linear-gradient(150deg, #0a1628 0%, #0c2d4a 50%, #0e3d5c 100%)' }}>

          {/* Floating blobs */}
          <div className="float-a absolute top-[-100px] right-[-60px] w-[500px] h-[500px] rounded-full pointer-events-none"
               style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 65%)' }} />
          <div className="float-b absolute bottom-[-80px] left-[-80px] w-[400px] h-[400px] rounded-full pointer-events-none"
               style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 65%)' }} />
          <div className="absolute top-1/3 right-1/4 w-40 h-40 rounded-full pointer-events-none"
               style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />

          {/* Dot grid */}
          <div className="absolute inset-0 pointer-events-none"
               style={{
                 backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
                 backgroundSize: '28px 28px',
               }} />

          {/* Content */}
          <div className="relative z-10 flex flex-col h-full p-14">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', boxShadow: '0 0 20px rgba(14,165,233,0.3)' }}>
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-lg tracking-tight leading-none">Nuvia</p>
                <p className="text-sky-400/70 text-[11px] mt-0.5">Gestión Médica</p>
              </div>
            </div>

            {/* Hero */}
            <div className="mt-auto mb-auto py-16 space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
                     style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.25)', color: '#7dd3fc' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  Sistema activo · v1.0
                </div>
                <h1 className="text-[2.8rem] font-bold text-white leading-[1.1] tracking-tight">
                  Tu práctica<br />médica,{' '}
                  <span style={{
                    backgroundImage: 'linear-gradient(90deg, #38bdf8, #818cf8)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                    sin límites
                  </span>
                </h1>
                <p className="text-slate-300/70 mt-5 text-base leading-relaxed max-w-sm">
                  Gestiona pacientes, agenda citas, realiza videoconsultas y administra múltiples consultorios desde un solo lugar.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-sm">
                {FEATURES.map(f => (
                  <div key={f.text} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                       style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span className="text-xl leading-none">{f.icon}</span>
                    <p className="text-slate-300 text-xs leading-tight">{f.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ECG line at bottom */}
            <div className="mt-auto">
              <EcgLine />
              <p className="text-slate-600 text-xs mt-3">© {new Date().getFullYear()} Nuvia · Todos los derechos reservados</p>
            </div>
          </div>
        </div>

        {/* ── Right panel: form ── */}
        <div className="w-full lg:w-[42%] flex items-center justify-center p-6 relative">

          {/* Subtle bg pattern */}
          <div className="absolute inset-0 pointer-events-none"
               style={{
                 backgroundImage: 'radial-gradient(rgba(14,165,233,0.04) 1px, transparent 1px)',
                 backgroundSize: '20px 20px',
               }} />

          <div className="relative w-full max-w-sm">

            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-slate-800 font-bold text-xl">Nuvia</span>
            </div>

            {/* Card */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/80 border border-slate-100 p-8">

              {!forgotMode ? (
                <>
                  <div className="mb-7">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Bienvenido de vuelta</h2>
                    <p className="text-slate-400 text-sm mt-1.5">Ingresa tus credenciales para continuar</p>
                  </div>

                  {error && (
                    <div className="mb-5 flex items-center gap-3 px-4 py-3.5 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
                      <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 font-bold text-xs">!</div>
                      {error === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="label">Correo electrónico</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                          className="input pl-10" placeholder="doctor@clinica.com" required />
                      </div>
                    </div>

                    <div>
                      <div className="mb-1">
                        <label className="label mb-0">Contraseña</label>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                          className="input pl-10 pr-11" placeholder="••••••••" required />
                        <button type="button" onClick={() => setShowPass(!showPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button type="submit" disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 active:scale-[0.99] text-white font-semibold text-sm rounded-2xl transition-all"
                      style={{ boxShadow: '0 4px 16px rgba(2,132,199,0.3)' }}>
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {loading ? 'Iniciando sesión...' : 'Iniciar sesión →'}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => { setForgotMode(false); setResetMsg('') }}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors mb-6">
                    <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio de sesión
                  </button>

                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Restablecer contraseña</h2>
                    <p className="text-slate-400 text-sm mt-1.5">Te enviaremos un enlace a tu correo para crear una nueva contraseña.</p>
                  </div>

                  {resetMsg && (
                    <div className={`mb-5 px-4 py-3.5 rounded-2xl text-sm border ${resetIsError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                      {resetText}
                    </div>
                  )}

                  {!resetMsg.startsWith('ok:') && (
                    <form onSubmit={handleForgot} className="space-y-4">
                      <div>
                        <label className="label">Correo electrónico</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                            className="input pl-10" placeholder="doctor@clinica.com" required autoFocus />
                        </div>
                      </div>
                      <button type="submit" disabled={resetLoading || !resetEmail.trim()}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold text-sm rounded-2xl transition-all"
                        style={{ boxShadow: '0 4px 16px rgba(2,132,199,0.3)' }}>
                        {resetLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {resetLoading ? 'Enviando...' : 'Enviar enlace de restablecimiento'}
                      </button>
                    </form>
                  )}
                </>
              )}

              <div className="mt-7 pt-6 border-t border-slate-100 flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-100" />
                <p className="text-xs text-slate-400 text-center">
                  ¿Problemas para ingresar? Contacta al administrador
                </p>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-6 flex justify-center gap-6 flex-wrap">
              {['🔒 Datos encriptados', '☁ Respaldo automático', '🩺 Solo para médicos'].map(t => (
                <span key={t} className="text-[10px] text-slate-400 font-medium">{t}</span>
              ))}
            </div>

            {/* NOM compliance */}
            <div className="mt-3 text-center">
              <p className="text-[9px] text-slate-300 leading-relaxed">
                Sistema de información en salud que cumple con{' '}
                <span className="font-semibold">NOM-004-SSA3-2012</span> (Expediente clínico) y{' '}
                <span className="font-semibold">NOM-024-SSA3-2010</span> (Sistemas de información de registro electrónico para la salud)
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
