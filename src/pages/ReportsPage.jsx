import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { calcEdad } from '../utils'
import { Users, Calendar, ClipboardList, TrendingUp, Loader2, Activity } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts'
import { cn } from '../utils'

const COLORS = ['#0ea5e9','#8b5cf6','#ef4444','#10b981','#f59e0b','#ec4899','#6366f1']

const TIPO_LABEL = { presencial: 'Presencial', videoconsulta: 'Videoconsulta', urgencia: 'Urgencia' }
const ESTADO_LABEL = { programada:'Programada', confirmada:'Confirmada', completada:'Completada', cancelada:'Cancelada', no_asistio:'No asistió' }

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between gap-4">
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

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData]       = useState(null)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const now      = new Date()
      const startMon = new Date(now.getFullYear(), now.getMonth(), 1)
      const start6m  = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      const start12m = new Date(now.getFullYear(), now.getMonth() - 11, 1)

      const [
        { data: patients },
        { count: totalConsults },
        { data: consults6m },
        { data: appts12m },
        { count: citasMes },
      ] = await Promise.all([
        supabase.from('patients').select('sexo, fecha_nacimiento, created_at').eq('activo', true),
        supabase.from('consultations').select('*', { count: 'exact', head: true }),
        supabase.from('consultations').select('fecha').gte('fecha', start6m.toISOString()),
        supabase.from('appointments').select('tipo, estado, fecha_hora').gte('fecha_hora', start12m.toISOString()),
        supabase.from('appointments').select('*', { count: 'exact', head: true })
          .gte('fecha_hora', startMon.toISOString()),
      ])

      const pats = patients || []
      const apts = appts12m || []

      // Patients by sex
      const sexMap = { M: 0, F: 0, Otro: 0 }
      pats.forEach(p => { sexMap[p.sexo] = (sexMap[p.sexo] || 0) + 1 })
      const bySex = [
        { name: 'Masculino', value: sexMap.M },
        { name: 'Femenino',  value: sexMap.F },
        { name: 'Otro',      value: sexMap.Otro },
      ].filter(d => d.value > 0)

      // Patients by age group
      const ageGroups = { '0-17': 0, '18-35': 0, '36-50': 0, '51-65': 0, '66+': 0 }
      pats.forEach(p => {
        const e = calcEdad(p.fecha_nacimiento)
        if (e == null) return
        if (e <= 17) ageGroups['0-17']++
        else if (e <= 35) ageGroups['18-35']++
        else if (e <= 50) ageGroups['36-50']++
        else if (e <= 65) ageGroups['51-65']++
        else ageGroups['66+']++
      })
      const byAge = Object.entries(ageGroups).map(([name, value]) => ({ name, value }))

      // Consultations by month (last 6)
      const mesMap = {}
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        mesMap[key] = { mes: d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }), consultas: 0 }
      }
      ;(consults6m || []).forEach(c => {
        const d = new Date(c.fecha)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        if (mesMap[key]) mesMap[key].consultas++
      })
      const byMonth = Object.values(mesMap)

      // Appointments by type
      const tipoMap = {}
      apts.forEach(a => { tipoMap[a.tipo] = (tipoMap[a.tipo] || 0) + 1 })
      const byTipo = Object.entries(tipoMap).map(([k, v]) => ({ name: TIPO_LABEL[k] || k, value: v }))

      // Appointments by status
      const estadoMap = {}
      apts.forEach(a => { estadoMap[a.estado] = (estadoMap[a.estado] || 0) + 1 })
      const byEstado = Object.entries(estadoMap).map(([k, v]) => ({ name: ESTADO_LABEL[k] || k, value: v }))

      // New patients by month (last 6)
      const newPatsMap = {}
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        newPatsMap[key] = { mes: d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }), nuevos: 0 }
      }
      pats.forEach(p => {
        const d = new Date(p.created_at)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        if (newPatsMap[key]) newPatsMap[key].nuevos++
      })
      const newPatsByMonth = Object.values(newPatsMap)

      setData({
        totalPats: pats.length,
        totalConsults: totalConsults || 0,
        citasMes: citasMes || 0,
        completionRate: apts.length ? Math.round((apts.filter(a => a.estado === 'completada').length / apts.length) * 100) : 0,
        bySex, byAge, byMonth, byTipo, byEstado, newPatsByMonth,
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
    </div>
  )

  const d = data || {}

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reportes</h1>
        <p className="text-slate-400 text-sm mt-0.5">Análisis de tu práctica médica</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total pacientes"   value={d.totalPats}      icon={Users}         color="bg-blue-50 text-blue-600" />
        <StatCard label="Total consultas"   value={d.totalConsults}  icon={ClipboardList} color="bg-violet-50 text-violet-600" />
        <StatCard label="Citas este mes"    value={d.citasMes}       icon={Calendar}      color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Tasa de asistencia" value={`${d.completionRate}%`} icon={Activity} color="bg-amber-50 text-amber-600" sub="últimos 12 meses" />
      </div>

      {/* Row 1: Consultas por mes + Nuevos pacientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-700">Consultas por mes</h2>
            <span className="text-xs text-slate-400 ml-auto">últimos 6 meses</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d.byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} />
              <Bar dataKey="consultas" name="Consultas" fill="#0ea5e9" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-700">Nuevos pacientes por mes</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={d.newPatsByMonth}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} />
              <Area type="monotone" dataKey="nuevos" name="Nuevos" stroke="#8b5cf6" fill="url(#grad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Distribución */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Por sexo */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-700 mb-4">Pacientes por sexo</h2>
          {d.bySex.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-slate-400 text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={d.bySex} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {d.bySex.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Por rango de edad */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-700 mb-4">Pacientes por edad</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={d.byAge} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={45} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" name="Pacientes" fill="#10b981" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Por tipo de cita */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-700 mb-4">Tipos de cita</h2>
          {d.byTipo.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-slate-400 text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={d.byTipo} cx="50%" cy="50%" outerRadius={70} dataKey="value" paddingAngle={3}>
                  {d.byTipo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 3: Estado de citas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-700 mb-5">Estado de citas — últimos 12 meses</h2>
        {d.byEstado.length === 0 ? (
          <div className="h-16 flex items-center justify-center text-slate-400 text-sm">Sin datos</div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {d.byEstado.map((e, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <div>
                  <p className="text-xs text-slate-500">{e.name}</p>
                  <p className="text-xl font-bold text-slate-800">{e.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
