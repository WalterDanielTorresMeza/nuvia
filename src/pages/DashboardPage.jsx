import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { Users, Calendar, ClipboardList, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatFecha } from '../utils'

export default function DashboardPage() {
  const { doctor } = useAuthStore()
  const [stats, setStats] = useState({ pacientes: 0, citasHoy: 0, consultasMes: 0 })
  const [citasHoy, setCitasHoy] = useState([])
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    const hoy = new Date()
    const inicioHoy = new Date(hoy.setHours(0,0,0,0)).toISOString()
    const finHoy = new Date(hoy.setHours(23,59,59,999)).toISOString()
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString()

    const [{ count: pacientes }, { count: citasMes }, { data: apptHoy }] = await Promise.all([
      supabase.from('patients').select('*', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('consultations').select('*', { count: 'exact', head: true }).gte('fecha', inicioMes),
      supabase.from('appointments')
        .select('*, patients(nombre, apellidos)')
        .gte('fecha_hora', inicioHoy)
        .lte('fecha_hora', finHoy)
        .in('estado', ['programada', 'confirmada'])
        .order('fecha_hora'),
    ])

    setStats({ pacientes: pacientes || 0, citasHoy: apptHoy?.length || 0, consultasMes: citasMes || 0 })
    setCitasHoy(apptHoy || [])

    // Chart: consultas por mes (últimos 6 meses)
    const meses = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const inicio = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
      const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString()
      const { count } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .gte('fecha', inicio)
        .lte('fecha', fin)
      meses.push({
        mes: d.toLocaleDateString('es-MX', { month: 'short' }),
        consultas: count || 0
      })
    }
    setChartData(meses)
    setLoading(false)
  }

  const estadoColor = {
    programada: 'badge-blue',
    confirmada: 'badge-green',
    cancelada: 'badge-red',
  }

  const tipoLabel = {
    presencial: '🏥 Presencial',
    videoconsulta: '💻 Video',
    urgencia: '🚨 Urgencia',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Buenos días, Dr. {doctor?.nombre} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total pacientes</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{stats.pacientes}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Citas hoy</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{stats.citasHoy}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Consultas este mes</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{stats.consultasMes}</p>
            </div>
            <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-violet-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Chart + Citas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-700">Consultas por mes</h2>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Cargando...</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
                />
                <Bar dataKey="consultas" fill="#0ea5e9" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Citas hoy */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-700">Citas de hoy</h2>
          </div>
          {citasHoy.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-slate-400 text-sm">No hay citas programadas para hoy</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-52 overflow-y-auto">
              {citasHoy.map(cita => (
                <div key={cita.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs font-mono text-slate-500 w-12 flex-shrink-0">
                    {new Date(cita.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">
                      {cita.patients?.nombre} {cita.patients?.apellidos}
                    </div>
                    <div className="text-xs text-slate-400">{tipoLabel[cita.tipo]}</div>
                  </div>
                  <span className={estadoColor[cita.estado] || 'badge-gray'}>
                    {cita.estado}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
