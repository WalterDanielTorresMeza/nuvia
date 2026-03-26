import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import {
  Users, Calendar, ClipboardList, Video,
  ArrowRight, Plus, Clock, TrendingUp,
} from 'lucide-react'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function StatCard({ label, value, icon: Icon, color, sub, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between gap-4 transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:border-primary-200' : ''}`}
    >
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  )
}

const TIPO_LABEL  = { presencial: 'Presencial', videoconsulta: 'Videoconsulta', urgencia: 'Urgencia' }
const ESTADO_STYLE = {
  programada: 'bg-blue-100 text-blue-700',
  confirmada: 'bg-green-100 text-green-700',
  cancelada:  'bg-red-100 text-red-600',
}

export default function DashboardPage() {
  const navigate   = useNavigate()
  const { doctor } = useAuthStore()
  const [stats, setStats]         = useState({ pacientes: 0, citasHoy: 0, consultasMes: 0, videoHoy: 0 })
  const [citasHoy, setCitasHoy]   = useState([])
  const [recentPats, setRecentPats] = useState([])
  const [proximasCitas, setProximasCitas] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const now      = new Date()
      const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      const startMon = new Date(now.getFullYear(), now.getMonth(), 1)
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8) // next 7 days

      const [
        { count: pacientes },
        { count: consMes },
        { data: apptHoy },
        { data: latestPats },
        { data: proximas },
      ] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('consultations').select('*', { count: 'exact', head: true }).gte('fecha', startMon.toISOString()),
        supabase.from('appointments')
          .select('*, patients(id, nombre, apellidos)')
          .gte('fecha_hora', startDay.toISOString())
          .lte('fecha_hora', endDay.toISOString())
          .in('estado', ['programada', 'confirmada'])
          .order('fecha_hora'),
        supabase.from('patients')
          .select('id, nombre, apellidos, sexo, created_at')
          .eq('activo', true)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('appointments')
          .select('*, patients(nombre, apellidos)')
          .gt('fecha_hora', endDay.toISOString())
          .lte('fecha_hora', tomorrow.toISOString())
          .in('estado', ['programada', 'confirmada'])
          .order('fecha_hora')
          .limit(5),
      ])

      const citasHoyList = apptHoy || []
      const videoHoy     = citasHoyList.filter(a => a.tipo === 'videoconsulta').length

      setStats({ pacientes: pacientes || 0, citasHoy: citasHoyList.length, consultasMes: consMes || 0, videoHoy })
      setCitasHoy(citasHoyList)
      setRecentPats(latestPats || [])
      setProximasCitas(proximas || [])
    } finally {
      setLoading(false)
    }
  }

  const PAT_COLORS = [
    'from-blue-400 to-blue-600','from-emerald-400 to-emerald-600',
    'from-violet-400 to-violet-600','from-amber-400 to-amber-600','from-pink-400 to-pink-600',
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {greeting()}, Dr. {doctor?.nombre} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1 capitalize">
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => navigate('/pacientes')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-primary-300 hover:bg-primary-50 text-slate-600 hover:text-primary-700 rounded-xl text-sm font-medium transition-all">
            <Plus className="w-4 h-4" /> Nuevo paciente
          </button>
          <button onClick={() => navigate('/agenda')}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm">
            <Calendar className="w-4 h-4" /> Nueva cita
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total pacientes"     value={loading ? '—' : stats.pacientes}    icon={Users}         color="bg-blue-50 text-blue-600"     onClick={() => navigate('/pacientes')} />
        <StatCard label="Citas hoy"           value={loading ? '—' : stats.citasHoy}     icon={Calendar}      color="bg-emerald-50 text-emerald-600" onClick={() => navigate('/agenda')} />
        <StatCard label="Consultas este mes"  value={loading ? '—' : stats.consultasMes} icon={ClipboardList} color="bg-violet-50 text-violet-600" />
        <StatCard label="Videoconsultas hoy"  value={loading ? '—' : stats.videoHoy}     icon={Video}         color="bg-indigo-50 text-indigo-600"   onClick={() => navigate('/consultas')} />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Citas de hoy */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h2 className="font-semibold text-slate-700">Citas de hoy</h2>
            </div>
            <button onClick={() => navigate('/agenda')}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              Ver todas <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : citasHoy.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400">
              <Calendar className="w-8 h-8 mb-2 text-slate-200" />
              <p className="text-sm">No hay citas para hoy</p>
              <button onClick={() => navigate('/agenda')} className="mt-3 text-xs text-primary-600 hover:underline">
                + Agendar una cita
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {citasHoy.map(cita => (
                <div key={cita.id}
                  onClick={() => navigate(`/pacientes/${cita.patient_id}`)}
                  className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-primary-50 rounded-xl cursor-pointer transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {cita.patients?.nombre?.[0]}{cita.patients?.apellidos?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate group-hover:text-primary-700">
                      {cita.patients?.nombre} {cita.patients?.apellidos}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(cita.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}{TIPO_LABEL[cita.tipo] || cita.tipo}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_STYLE[cita.estado] || 'bg-slate-100 text-slate-500'}`}>
                    {cita.estado}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximas citas (next 7 days) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              <h2 className="font-semibold text-slate-700">Próximos 7 días</h2>
            </div>
            <button onClick={() => navigate('/agenda')}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              Ver agenda <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : proximasCitas.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400">
              <Calendar className="w-8 h-8 mb-2 text-slate-200" />
              <p className="text-sm">Sin citas próximas</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {proximasCitas.map(cita => (
                <div key={cita.id}
                  onClick={() => navigate(`/pacientes/${cita.patient_id}`)}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group">
                  <div className="w-12 text-center flex-shrink-0">
                    <p className="text-lg font-bold text-slate-800 leading-none">
                      {new Date(cita.fecha_hora).getDate()}
                    </p>
                    <p className="text-xs text-slate-400 capitalize">
                      {new Date(cita.fecha_hora).toLocaleDateString('es-MX', { month: 'short' })}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate group-hover:text-primary-700">
                      {cita.patients?.nombre} {cita.patients?.apellidos}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(cita.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}{TIPO_LABEL[cita.tipo] || cita.tipo}
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pacientes recientes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-700">Pacientes recientes</h2>
          </div>
          <button onClick={() => navigate('/pacientes')}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
            Ver todos <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {loading ? (
          <div className="h-20 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentPats.length === 0 ? (
          <div className="h-20 flex flex-col items-center justify-center text-slate-400">
            <p className="text-sm">No hay pacientes registrados</p>
            <button onClick={() => navigate('/pacientes')} className="mt-2 text-xs text-primary-600 hover:underline">
              + Agregar paciente
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {recentPats.map((p, i) => (
              <div key={p.id}
                onClick={() => navigate(`/pacientes/${p.id}`)}
                className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group border border-slate-100">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${PAT_COLORS[i % PAT_COLORS.length]} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                  {p.nombre?.[0]}{p.apellidos?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate group-hover:text-primary-700">
                    {p.nombre} {p.apellidos}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(p.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
