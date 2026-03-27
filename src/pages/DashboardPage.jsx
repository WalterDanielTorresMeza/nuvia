import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useClinicStore } from '../store/clinicStore'
import { supabase } from '../lib/supabase'
import {
  Users, Calendar, ClipboardList, Video,
  ArrowRight, Plus, Clock, TrendingUp, DollarSign, Building2,
} from 'lucide-react'
import { cn } from '../utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const fmt = (n) => n != null
  ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n)
  : '$0'

function StatCard({ label, value, icon: Icon, color, sub, onClick, valueColor }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between gap-4 transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:border-primary-200' : ''}`}
    >
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${valueColor || 'text-slate-800'}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  )
}

const TIPO_LABEL   = { presencial: 'Presencial', videoconsulta: 'Videoconsulta', urgencia: 'Urgencia' }
const ESTADO_STYLE = {
  programada: 'bg-blue-100 text-blue-700',
  confirmada: 'bg-green-100 text-green-700',
  cancelada:  'bg-red-100 text-red-600',
}

export default function DashboardPage() {
  const navigate   = useNavigate()
  const { doctor } = useAuthStore()
  const { clinics, activeClinic, setActiveClinic } = useClinicStore()
  const [stats, setStats]           = useState({ pacientes: 0, citasHoy: 0, consultasMes: 0, videoHoy: 0, ingresosMes: 0 })
  const [citasHoy, setCitasHoy]     = useState([])
  const [recentPats, setRecentPats] = useState([])
  const [proximasCitas, setProximasCitas] = useState([])
  const [chartData, setChartData]   = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    fetchAll()
    if (clinics.length === 0 && doctor?.id) useClinicStore.getState().fetchClinics(doctor.id)
  }, [doctor?.id])

  const fetchAll = async () => {
    try {
      const now      = new Date()
      const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      const startMon = new Date(now.getFullYear(), now.getMonth(), 1)
      const next7    = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8)
      const start6m  = new Date(now.getFullYear(), now.getMonth() - 5, 1)

      const [
        { count: pacientes },
        { count: consMes },
        { data: apptHoy },
        { data: latestPats },
        { data: proximas },
        { data: invoicesMes },
        { data: appts6m },
        { data: consults6m },
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
          .lte('fecha_hora', next7.toISOString())
          .in('estado', ['programada', 'confirmada'])
          .order('fecha_hora')
          .limit(6),
        supabase.from('invoices')
          .select('total')
          .gte('fecha', startMon.toISOString())
          .eq('estado', 'timbrada'),
        supabase.from('appointments')
          .select('fecha_hora')
          .gte('fecha_hora', start6m.toISOString()),
        supabase.from('consultations')
          .select('fecha')
          .gte('fecha', start6m.toISOString()),
      ])

      const citasHoyList = apptHoy || []
      const videoHoy     = citasHoyList.filter(a => a.tipo === 'videoconsulta').length
      const ingresosMes  = (invoicesMes || []).reduce((s, i) => s + (i.total || 0), 0)

      setStats({ pacientes: pacientes || 0, citasHoy: citasHoyList.length, consultasMes: consMes || 0, videoHoy, ingresosMes })
      setCitasHoy(citasHoyList)
      setRecentPats(latestPats || [])
      setProximasCitas(proximas || [])

      // Bar chart: últimos 6 meses
      const mesMap = {}
      for (let i = 5; i >= 0; i--) {
        const d   = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        mesMap[key] = { mes: d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }), consultas: 0, citas: 0 }
      }
      ;(consults6m || []).forEach(c => {
        const d = new Date(c.fecha); const key = `${d.getFullYear()}-${d.getMonth()}`
        if (mesMap[key]) mesMap[key].consultas++
      })
      ;(appts6m || []).forEach(a => {
        const d = new Date(a.fecha_hora); const key = `${d.getFullYear()}-${d.getMonth()}`
        if (mesMap[key]) mesMap[key].citas++
      })
      setChartData(Object.values(mesMap))

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

      {/* ── Clinic filter ── */}
      {clinics.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <button onClick={() => setActiveClinic(null)}
            className={cn('px-3 py-1.5 text-xs rounded-xl font-semibold border transition-all',
              !activeClinic ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}>
            Todos
          </button>
          {clinics.map(c => (
            <button key={c.id} onClick={() => setActiveClinic(activeClinic?.id === c.id ? null : c)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl font-semibold border transition-all',
                activeClinic?.id === c.id ? 'text-white border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}
              style={activeClinic?.id === c.id ? { background: c.color } : {}}>
              <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
              {c.nombre}
            </button>
          ))}
        </div>
      )}

      {/* Stats — 5 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Pacientes"          value={loading ? '—' : stats.pacientes}    icon={Users}         color="bg-blue-50 text-blue-600"     onClick={() => navigate('/pacientes')} />
        <StatCard label="Citas hoy"          value={loading ? '—' : stats.citasHoy}     icon={Calendar}      color="bg-emerald-50 text-emerald-600" onClick={() => navigate('/agenda')} />
        <StatCard label="Consultas este mes" value={loading ? '—' : stats.consultasMes} icon={ClipboardList} color="bg-violet-50 text-violet-600" />
        <StatCard label="Videoconsultas hoy" value={loading ? '—' : stats.videoHoy}     icon={Video}         color="bg-indigo-50 text-indigo-600"   onClick={() => navigate('/consultas')} />
        <StatCard label="Ingresos del mes"   value={loading ? '—' : fmt(stats.ingresosMes)} icon={DollarSign} color="bg-green-50 text-green-600" valueColor="text-green-700" onClick={() => navigate('/facturacion')} />
      </div>

      {/* Activity chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-700">Actividad últimos 6 meses</h2>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-sky-400 inline-block" />Consultas</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-violet-400 inline-block" />Citas</span>
          </div>
        </div>
        {loading ? (
          <div className="h-52 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} />
              <Bar dataKey="consultas" name="Consultas" fill="#0ea5e9" radius={[4,4,0,0]} />
              <Bar dataKey="citas"     name="Citas"     fill="#8b5cf6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Citas hoy + Próximos 7 días */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

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
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
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
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {proximasCitas.map(cita => (
                <div key={cita.id}
                  onClick={() => navigate(`/pacientes/${cita.patient_id}`)}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group">
                  <div className="w-11 text-center flex-shrink-0 bg-slate-50 rounded-xl py-1">
                    <p className="text-lg font-bold text-slate-800 leading-none">
                      {new Date(cita.fecha_hora).getDate()}
                    </p>
                    <p className="text-[10px] text-slate-400 capitalize">
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
          <div className="h-16 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentPats.length === 0 ? (
          <div className="h-16 flex items-center justify-center text-slate-400">
            <p className="text-sm">No hay pacientes registrados</p>
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
