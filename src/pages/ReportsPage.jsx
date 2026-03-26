import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { calcEdad } from '../utils'
import {
  Download, Loader2, Users, Calendar, ClipboardList,
  DollarSign, Search, FileText,
} from 'lucide-react'
import { cn } from '../utils'

/* ─── helpers ─── */
const toDate = (s) => s ? new Date(s).toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric' }) : '—'
const toTime = (s) => s ? new Date(s).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' }) : ''
const fmt    = (n) => n != null ? new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN', minimumFractionDigits:0 }).format(n) : '—'

function downloadCSV(rows, cols, filename) {
  if (!rows.length) return
  const header = cols.map(c => c.label).join(',')
  const body   = rows.map(r => cols.map(c => `"${(c.get(r) ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob   = new Blob(['\uFEFF' + header + '\n' + body], { type: 'text/csv;charset=utf-8' })
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a')
  a.href = url; a.download = filename + '_' + new Date().toISOString().slice(0,10) + '.csv'; a.click()
  URL.revokeObjectURL(url)
}

const todayStr     = () => new Date().toISOString().slice(0,10)
const monthStartStr = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10)

/* ─── Report type definitions ─── */
const TIPOS = [
  { id: 'pacientes',   label: 'Pacientes',    icon: Users,         color: 'text-blue-600'   },
  { id: 'citas',       label: 'Citas',         icon: Calendar,      color: 'text-emerald-600'},
  { id: 'consultas',   label: 'Consultas',     icon: ClipboardList, color: 'text-violet-600' },
  { id: 'facturacion', label: 'Facturación',   icon: DollarSign,    color: 'text-amber-600'  },
]

const COLUMNS = {
  pacientes: [
    { label: 'Nombre',         get: r => `${r.nombre} ${r.apellidos}` },
    { label: 'Sexo',           get: r => r.sexo === 'M' ? 'Masculino' : r.sexo === 'F' ? 'Femenino' : r.sexo || '—' },
    { label: 'Edad',           get: r => calcEdad(r.fecha_nacimiento) != null ? `${calcEdad(r.fecha_nacimiento)} años` : '—' },
    { label: 'Teléfono',       get: r => r.telefono || '—' },
    { label: 'Email',          get: r => r.email || '—' },
    { label: 'Fecha registro', get: r => toDate(r.created_at) },
  ],
  citas: [
    { label: 'Fecha',    get: r => toDate(r.fecha_hora) },
    { label: 'Hora',     get: r => toTime(r.fecha_hora) },
    { label: 'Paciente', get: r => r.patients ? `${r.patients.nombre} ${r.patients.apellidos}` : '—' },
    { label: 'Tipo',     get: r => ({ presencial:'Presencial', videoconsulta:'Videoconsulta', urgencia:'Urgencia' }[r.tipo] || r.tipo) },
    { label: 'Estado',   get: r => ({ programada:'Programada', confirmada:'Confirmada', completada:'Completada', cancelada:'Cancelada', no_asistio:'No asistió' }[r.estado] || r.estado) },
    { label: 'Motivo',   get: r => r.motivo || '—' },
  ],
  consultas: [
    { label: 'Fecha',       get: r => toDate(r.fecha) },
    { label: 'Paciente',    get: r => r.patients ? `${r.patients.nombre} ${r.patients.apellidos}` : '—' },
    { label: 'Motivo',      get: r => r.motivo || '—' },
    { label: 'Diagnóstico', get: r => r.diagnostico || '—' },
    { label: 'Plan',        get: r => r.plan_tratamiento || '—' },
  ],
  facturacion: [
    { label: 'Fecha',     get: r => toDate(r.fecha) },
    { label: 'Folio',     get: r => r.folio || '—' },
    { label: 'Paciente',  get: r => r.patients ? `${r.patients.nombre} ${r.patients.apellidos}` : '—' },
    { label: 'Concepto',  get: r => r.concepto || '—' },
    { label: 'Total',     get: r => r.total != null ? r.total.toString() : '—' },
    { label: 'Estado',    get: r => ({ pendiente:'Pendiente', timbrada:'Pagada', cancelada:'Cancelada' }[r.estado] || r.estado) },
  ],
}

/* ─── Summary stats per type ─── */
function Summary({ tipo, rows }) {
  if (!rows.length) return null
  if (tipo === 'pacientes') {
    const m = rows.filter(r => r.sexo === 'M').length
    const f = rows.filter(r => r.sexo === 'F').length
    return (
      <div className="flex gap-4 flex-wrap text-sm">
        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-medium">{rows.length} pacientes</span>
        <span className="bg-slate-50 text-slate-600 px-3 py-1 rounded-lg">♂ {m} masculino</span>
        <span className="bg-slate-50 text-slate-600 px-3 py-1 rounded-lg">♀ {f} femenino</span>
      </div>
    )
  }
  if (tipo === 'citas') {
    const completadas = rows.filter(r => r.estado === 'completada').length
    const canceladas  = rows.filter(r => r.estado === 'cancelada').length
    return (
      <div className="flex gap-4 flex-wrap text-sm">
        <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg font-medium">{rows.length} citas</span>
        <span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg">{completadas} completadas</span>
        <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg">{canceladas} canceladas</span>
      </div>
    )
  }
  if (tipo === 'consultas') {
    return (
      <div className="flex gap-4 flex-wrap text-sm">
        <span className="bg-violet-50 text-violet-700 px-3 py-1 rounded-lg font-medium">{rows.length} consultas</span>
      </div>
    )
  }
  if (tipo === 'facturacion') {
    const pagado    = rows.filter(r => r.estado === 'timbrada').reduce((s, r) => s + (r.total || 0), 0)
    const pendiente = rows.filter(r => r.estado === 'pendiente').reduce((s, r) => s + (r.total || 0), 0)
    return (
      <div className="flex gap-4 flex-wrap text-sm">
        <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg font-medium">{rows.length} registros</span>
        <span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg">Cobrado: {fmt(pagado)}</span>
        <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-lg">Pendiente: {fmt(pendiente)}</span>
      </div>
    )
  }
  return null
}

/* ─── Status badge ─── */
const ESTADO_CLS = {
  programada: 'bg-blue-100 text-blue-700',
  confirmada:  'bg-green-100 text-green-700',
  completada:  'bg-emerald-100 text-emerald-700',
  cancelada:   'bg-red-100 text-red-600',
  no_asistio:  'bg-slate-100 text-slate-500',
  pendiente:   'bg-amber-100 text-amber-700',
  timbrada:    'bg-green-100 text-green-700',
}

function CellContent({ tipo, col, row }) {
  const val = col.get(row)
  // Color-code Estado column
  if (col.label === 'Estado') {
    return <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-lg', ESTADO_CLS[row.estado] || 'bg-slate-100 text-slate-600')}>{val}</span>
  }
  if (col.label === 'Total') {
    return <span className="font-semibold text-slate-800">{fmt(row.total)}</span>
  }
  return <>{val}</>
}

/* ══════════════════════════════════════════════ */
export default function ReportsPage() {
  const [tipo,    setTipo]    = useState('pacientes')
  const [desde,   setDesde]   = useState(monthStartStr())
  const [hasta,   setHasta]   = useState(todayStr())
  const [rows,    setRows]    = useState(null)   // null = not yet generated
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const hasFecha = tipo !== 'pacientes'

  const generate = async () => {
    setLoading(true); setError('')
    try {
      let data = []
      if (tipo === 'pacientes') {
        const { data: d, error: e } = await supabase
          .from('patients').select('*').eq('activo', true).order('apellidos')
        if (e) throw e
        data = d || []
      } else if (tipo === 'citas') {
        const { data: d, error: e } = await supabase
          .from('appointments')
          .select('*, patients(nombre, apellidos)')
          .gte('fecha_hora', new Date(desde).toISOString())
          .lte('fecha_hora', new Date(hasta + 'T23:59:59').toISOString())
          .order('fecha_hora', { ascending: false })
        if (e) throw e
        data = d || []
      } else if (tipo === 'consultas') {
        const { data: d, error: e } = await supabase
          .from('consultations')
          .select('*, patients(nombre, apellidos)')
          .gte('fecha', new Date(desde).toISOString())
          .lte('fecha', new Date(hasta + 'T23:59:59').toISOString())
          .order('fecha', { ascending: false })
        if (e) throw e
        data = d || []
      } else if (tipo === 'facturacion') {
        const { data: d, error: e } = await supabase
          .from('invoices')
          .select('*, patients(nombre, apellidos)')
          .gte('fecha', new Date(desde).toISOString())
          .lte('fecha', new Date(hasta + 'T23:59:59').toISOString())
          .order('fecha', { ascending: false })
        if (e) throw e
        data = d || []
      }
      setRows(data)
    } catch (e) {
      setError(e?.message || 'Error al generar reporte')
    } finally {
      setLoading(false)
    }
  }

  const cols    = COLUMNS[tipo]
  const hasRows = rows !== null

  const PRESETS = [
    { label: 'Este mes',     desde: monthStartStr(),  hasta: todayStr() },
    { label: 'Últ. 3 meses', desde: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).toISOString().slice(0,10), hasta: todayStr() },
    { label: 'Últ. 6 meses', desde: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString().slice(0,10), hasta: todayStr() },
    { label: 'Este año',     desde: `${new Date().getFullYear()}-01-01`, hasta: todayStr() },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reportes</h1>
          <p className="text-slate-400 text-sm mt-0.5">Genera y descarga reportes de tu práctica médica</p>
        </div>
        {hasRows && rows.length > 0 && (
          <button
            onClick={() => downloadCSV(rows, cols, `reporte_${tipo}`)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Descargar CSV
          </button>
        )}
      </div>

      {/* Report type selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex gap-1 flex-wrap">
        {TIPOS.map(({ id, label, icon: Icon, color }) => (
          <button key={id} onClick={() => { setTipo(id); setRows(null) }}
            className={cn(
              'flex items-center gap-2 flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
              tipo === id
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            )}>
            <Icon className={cn('w-4 h-4', tipo === id ? 'text-white' : color)} />
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        {hasFecha && (
          <>
            <div className="flex gap-2 flex-wrap">
              {PRESETS.map(p => (
                <button key={p.label}
                  onClick={() => { setDesde(p.desde); setHasta(p.hasta); setRows(null) }}
                  className={cn('px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors',
                    desde === p.desde && hasta === p.hasta
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}>
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500 w-10">Desde</label>
                <input type="date" value={desde} onChange={e => { setDesde(e.target.value); setRows(null) }}
                  className="input text-sm py-2" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500 w-10">Hasta</label>
                <input type="date" value={hasta} onChange={e => { setHasta(e.target.value); setRows(null) }}
                  className="input text-sm py-2" />
              </div>
            </div>
          </>
        )}

        {!hasFecha && (
          <p className="text-sm text-slate-500">Todos los pacientes activos registrados en el sistema.</p>
        )}

        <div className="flex items-center justify-between">
          <button onClick={generate} disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Generando...' : 'Generar reporte'}
          </button>
          {hasRows && <Summary tipo={tipo} rows={rows} />}
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">{error}</p>}
      </div>

      {/* Table */}
      {!hasRows && !loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-slate-600 font-medium">Configura los filtros y genera el reporte</p>
          <p className="text-slate-400 text-sm mt-1">Los resultados aparecerán aquí listos para descargar</p>
        </div>
      )}

      {hasRows && rows.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">No hay datos en el periodo seleccionado.</p>
        </div>
      )}

      {hasRows && rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {cols.map(c => (
                    <th key={c.label} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id || i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    {cols.map(col => (
                      <td key={col.label} className="px-4 py-3 text-slate-700">
                        <CellContent tipo={tipo} col={col} row={row} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>{rows.length} registro{rows.length !== 1 ? 's' : ''}</span>
            <button onClick={() => downloadCSV(rows, cols, `reporte_${tipo}`)}
              className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-medium">
              <Download className="w-3.5 h-3.5" /> Descargar CSV
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
