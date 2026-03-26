import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import {
  Users, Calendar, ClipboardList, Video,
  TrendingUp, ArrowRight, Plus, Clock,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { calcEdad } from '../utils'

const TIPO_COLORS = {
  presencial:    '#0ea5e9',
  videoconsulta: '#8b5cf6',
  urgencia:      '#ef4444',
}

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

export default function DashboardPage() {
  const navigate   = useNavigate()
  const { doctor } = useAuthStore()
  const [stats, setStats]         = useState({ pacientes: 0, citasHoy: 0, consultasMes: 0, videoHoy: 0 })
  const [citasHoy, setCitasHoy]   = useState([])
  const [recentPats, setRecentPats] = useState([])
  const [chartBar, setChartBar]   = useState([])
  const [chartPie, setChartPie]   = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const now      = new Date()
      const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      const startMon = new Date(now.getFullYear(), now.getMonth(), 1)
      const start6m  = new Date(now.getFullYear(), now.getMonth() - 5, 1)

      const [
        { count: pacientes },
        { count: consMes },
        { data: apptHoy },
        { data: allConsults },
        { data: allAppts },
        { data: latestPats },
      ] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('consultations').select('*', { count: 'exact', head: true }).gte('fecha', startMon.toISOString()),
        supabase.from('appointments')
          .select('*, patients(id, nombre, apellidos)')
          .gte('fecha_hora', startDay.toISOString())
          .lte('fecha_hora', endDay.toISOString())
          .in('estado', ['programada', 'confirmada'])
          .order('fecha_hora'),
        supabase.from('consultations')
          .select('fecha')
          .gte('fecha', start6m.toISOString()),
        supabase.from('appointments')
          .select('tipo, estado')
          .gte('fecha_hora', start6m.toISOString()),
        supabase.from('patients')
          .select('id, nombre, apellidos, especialidad, sexo, created_at')
          .eq('activo', true)
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const citasHoyList = apptHoy || []
      const videoHoy = citasHoyList.filter(a => a.tipo === 'videoconsulta').length

      setStats({ pacientes: pacientes || 0, citasHoy: citasHoyList.length, consultasMes: consMes || 0, videoHoy })
      setCitasHoy(citasHoyList)
      setRecentPats(latestPats || [])

      // Bar chart: consultas por mes (últimos 6)
      const mesMap = {}
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        mesMap[key] = { mes: d.toLocaleDateString('es-MX', { month: 'short' }), consultas: 0, citas: 0 }
      }
      ;(allConsults || []).forEach(c => {
        const d = new Date(c.fecha)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        if (mesMap[key]) mesMap[key].consultas++
      })
      ;(allAppts || []).forEach(a => {
        const d = new Date(a.fecha_hora || a.created_at)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        if (mesMap[key]) mesMap[key].citas++
      })
      setChartBar(Object.values(mesMap))

      // Pie chart: tipos de citas
      const tipos = {}
      ;(allAppts || []).forEach(a => { tipos[a.tipo] = (tipos[a.tipo] || 0) + 1 })
      setChartPie(Object.entries(tipos).map(([name, value]) => ({ name, value })))

    } finally {
      setLoading(false)
    }
  }

  const ESTADO_STYLE = {
    programada: 'bg-blue-100 text-blue-700',
    confirmada: 'bg-green-100 text-green-700',
    cancelada:  'bg-red-100 text-red-600',
  }

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
        {/* Quick actions */}
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
        <StatCard label="Total pacientes"      value={stats.pacientes}    icon={Users}         color="bg-blue-50 text-blue-600"    onClick={() => navigate('/pacientes')} />
        <StatCard label="Citas hoy"            value={stats.citasHoy}     icon={Calendar}      color="bg-emerald-50 text-emerald-600" onClick={() => navigate('/agenda')} />
        <StatCard label="Consultas este mes"   value={stats.consultasMes} icon={ClipboardList} color="bg-violet-50 text-violet-600" />
        <StatCard label="Videoconsultas hoy"   value={stats.videoHoy}     icon={Video}         color="bg-indigo-50 text-indigo-600" onClick={() => navigate('/consultas')} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Bar chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-700">Actividad últimos 6 meses</h2>
          </div>
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartBar} barGap={4}>
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

        {/* Pie chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-700 mb-5">Tipos de citas</h2>
          {loading || chartPie.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
              {loading ? <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" /> : 'Sin datos aún'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={chartPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {chartPie.map((entry, i) => (
                    <Cell key={i} fill={TIPO_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n.charAt(0).toUpperCase() + n.slice(1)]} />
                <Legend formatter={n => n.charAt(0).toUpperCase() + n.slice(1)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
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
          {citasHoy.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400">
              <Calendar className="w-8 h-8 mb-2 text-slate-200" />
              <p className="text-sm">No hay citas para hoy</p>
              <button onClick={() => navigate('/agenda')}
                className="mt-3 text-xs text-primary-600 hover:underline">
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
                      {' · '}{cita.tipo}
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
          {recentPats.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400">
              <Users className="w-8 h-8 mb-2 text-slate-200" />
              <p className="text-sm">No hay pacientes registrados</p>
              <button onClick={() => navigate('/pacientes')}
                className="mt-3 text-xs text-primary-600 hover:underline">
                + Agregar paciente
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPats.map((p, i) => {
                const colors = ['from-blue-400 to-blue-600','from-emerald-400 to-emerald-600','from-violet-400 to-violet-600','from-amber-400 to-amber-600','from-pink-400 to-pink-600']
                return (
                  <div key={p.id}
                    onClick={() => navigate(`/pacientes/${p.id}`)}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colors[i % colors.length]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {p.nombre?.[0]}{p.apellidos?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate group-hover:text-primary-700">
                        {p.nombre} {p.apellidos}
                      </p>
                      <p className="text-xs text-slate-400">
                        {p.sexo === 'M' ? '♂' : p.sexo === 'F' ? '♀' : ''}{' '}
                        Registrado {new Date(p.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary-400 flex-shrink-0" />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
