import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Stethoscope, Eye, EyeOff, Loader2, Mail, Lock, CheckCircle2 } from 'lucide-react'

const FEATURES = [
  'Expedientes médicos completos por paciente',
  'Agenda inteligente con recordatorios',
  'Videoconsultas integradas sin apps externas',
  'Reportes y estadísticas en tiempo real',
]

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const { login, error }        = useAuthStore()
  const navigate                = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const ok = await login(email, password)
    setLoading(false)
    if (ok) navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left: branding panel ── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col justify-between p-14"
           style={{ background: 'linear-gradient(135deg, #0c1a2e 0%, #0a2540 40%, #0c4a6e 100%)' }}>

        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-[400px] h-[400px] rounded-full"
             style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.18) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-60px] left-[-60px] w-[300px] h-[300px] rounded-full"
             style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)' }} />
        <div className="absolute top-[45%] right-[10%] w-48 h-48 rounded-full"
             style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.10) 0%, transparent 70%)' }} />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
             style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center border border-white/20"
               style={{ background: 'rgba(14,165,233,0.25)', backdropFilter: 'blur(8px)' }}>
            <Stethoscope className="w-6 h-6 text-sky-300" />
          </div>
          <div>
            <p className="text-white font-bold text-xl tracking-tight leading-none">Nuvia</p>
            <p className="text-sky-400 text-xs mt-0.5">Gestión Médica</p>
          </div>
        </div>

        {/* Hero */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-[1.15] tracking-tight">
              Tu práctica médica,<br />
              <span className="text-transparent bg-clip-text"
                    style={{ backgroundImage: 'linear-gradient(90deg, #38bdf8, #7dd3fc)' }}>
                en un solo lugar
              </span>
            </h1>
            <p className="text-slate-300/80 mt-5 text-base leading-relaxed max-w-sm">
              Plataforma diseñada para que los médicos gestionen su consulta de forma eficiente y profesional.
            </p>
          </div>

          <ul className="space-y-3.5">
            {FEATURES.map(f => (
              <li key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <span className="text-slate-300 text-sm">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex -space-x-2">
              {['bg-sky-500','bg-violet-500','bg-emerald-500','bg-amber-500'].map((c,i) => (
                <div key={i} className={`w-7 h-7 ${c} rounded-full border-2 border-slate-900 flex items-center justify-center text-white text-[10px] font-bold`}>
                  {['Dr','ML','JR','AP'][i]}
                </div>
              ))}
            </div>
            <p className="text-slate-400 text-xs">Usado por médicos en toda la región</p>
          </div>
          <p className="text-slate-600 text-xs">© {new Date().getFullYear()} Nuvia · Versión 1.0</p>
        </div>
      </div>

      {/* ── Right: form panel ── */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 bg-primary-600 rounded-2xl flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-slate-800 font-bold text-xl">Nuvia</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Bienvenido de vuelta</h2>
            <p className="text-slate-500 mt-1.5 text-sm">Ingresa tus credenciales para continuar</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2.5">
              <span className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">!</span>
              {error === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-2 tracking-wider uppercase">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white text-sm border border-slate-200 rounded-xl placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-sm"
                  placeholder="doctor@clinica.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-2 tracking-wider uppercase">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 bg-white text-sm border border-slate-200 rounded-xl placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-sm"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-primary-600 hover:bg-primary-700 active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed mt-2"
              style={{ boxShadow: '0 4px 14px rgba(2,132,199,0.35)' }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión →'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-center text-xs text-slate-400">
              ¿Problemas para ingresar?{' '}
              <span className="text-slate-600 font-medium">Contacta al administrador</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
