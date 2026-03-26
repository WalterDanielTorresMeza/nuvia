import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { calcEdad } from '../utils'
import {
  Download, Loader2, Users, Calendar, ClipboardList,
  DollarSign, Search, FileText, Filter,
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

const todayStr      = () => new Date().toISOString().slice(0,10)
const monthStartStr = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10)

const TIPOS = [
  { id: 'pacientes',   label: 'Pacientes',   icon: Users,         color: 'text-blue-600'   },
  { id: 'citas',       label: 'Citas',        icon: Calendar,      color: 'text-emerald-600'},
  { id: 'consultas',   label: 'Consultas',    icon: ClipboardList, color: 'text-violet-600' },
  { id: 'facturacion', label: 'Facturación',  icon: DollarSign,    color: 'text-amber-600'  },
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
    { label: 'Fecha',    get: r => toDate(r.fecha) },
    { label: 'Folio',    get: r => r.folio || '—' },
    { label: 'Paciente', get: r => r.patients ? `${r.patients.nombre} ${r.patients.apellidos}` : '—' },
    { label: 'Concepto', get: r => r.concepto || '—' },
    { label: 'Total',    get: r => r.total != null ? r.total.toString() : '—' },
    { label: 'Estado',   get: r => ({ pendiente:'Pendiente', timbrada:'Pagada', cancelada:'Cancelada' }[r.estado] || r.estado) },
  ],
}

const ESTADO_CLS = {
  programada: 'bg-blue-100 text-blue-700',
  confirmada:  'bg-green-100 text-green-700',
  completada:  'bg-emerald-100 text-emerald-700',
  cancelada:   'bg-red-100 text-red-600',
  no_asistio:  'bg-slate-100 text-slate-500',
  pendiente:   'bg-amber-100 text-amber-700',
  timbrada:    'bg-green-100 text-green-700',
}

function CellContent({ col, row }) {
  const val = col.get(row)
  if (col.label === 'Estado') {
    return <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-lg', ESTADO_CLS[row.estado] || 'bg-slate-100 text-slate-600')}>{val}</span>
  }
  if (col.label === 'Total') return <span className="font-semibold text-slate-800">{fmt(row.total)}</span>
  return <>{val}</>
}

function Summary({ tipo, rows }) {
  if (!rows.length) return null
  if (tipo === 'pacientes') {
    const m = rows.filter(r => r.sexo === 'M').length
    const f = rows.filter(r => r.sexo === 'F').length
    return (
      <div className="flex gap-3 flex-wrap text-sm">
        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-medium">{rows.length} pacientes</span>
        <span className="bg-slate-50 text-slate-600 px-3 py-1 rounded-lg">♂ {m}</span>
        <span className="bg-slate-50 text-slate-600 px-3 py-1 rounded-lg">♀ {f}</span>
      </div>
    )
  }
  if (tipo === 'citas') {
    const completadas = rows.filter(r => r.estado === 'completada').length
    const canceladas  = rows.filter(r => r.estado === 'cancelada').length
    return (
      <div className="flex gap-3 flex-wrap text-sm">
        <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg font-medium">{rows.length} citas</span>
        <span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg">{completadas} completadas</span>
        <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg">{canceladas} canceladas</span>
      </div>
    )
  }
  if (tipo === 'consultas') {
    return <span className="bg-violet-50 text-violet-700 px-3 py-1 rounded-lg font-medium text-sm">{rows.length} consultas</span>
  }
  if (tipo === 'facturacion') {
    const pagado    = rows.filter(r => r.estado === 'timbrada').reduce((s, r) => s + (r.total || 0), 0)
    const pendiente = rows.filter(r => r.estado === 'pendiente').reduce((s, r) => s + (r.total || 0), 0)
    return (
      <div className="flex gap-3 flex-wrap text-sm">
        <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg font-medium">{rows.length} registros</span>
        <span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg">Cobrado: {fmt(pagado)}</span>
        <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-lg">Pendiente: {fmt(pendiente)}</span>
      </div>
    )
  }
  return null
}

const PRESETS = [
  { label: 'Este mes',      desde: () => monthStartStr(),  hasta: () => todayStr() },
  { label: 'Últ. 3 meses', desde: () => new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).toISOString().slice(0,10), hasta: () => todayStr() },
  { label: 'Últ. 6 meses', desde: () => new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString().slice(0,10), hasta: () => todayStr() },
  { label: 'Este año',      desde: () => `${new Date().getFullYear()}-01-01`, hasta: () => todayStr() },
]

/* ── Per-type client-side filter definitions ── */
function FilterPanel({ tipo, filters, setFilters }) {
  const s = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  if (tipo === 'pacientes') return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
      <div>
        <label className="text-xs font-semibold text-slate-500 block mb-1">Buscar nombre</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input className="input pl-8 text-sm py-2 w-full" placeholder="Nombre o apellidos..."
            value={filters.nombre || ''} onChange={e => s('nombre', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 block mb-1">Sexo</label>
        <select className="input text-sm py-2 w-full" value={filters.sexo || ''} onChange={e => s('sexo', e.target.value)}>
          <option value="">Todos</option>
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
          <option value="Otro">Otro</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 block mb-1">Rango de edad</label>
        <select className="input text-sm py-2 w-full" value={filters.edad || ''} onChange={e => s('edad', e.target.value)}>
          <option value="">Todos</option>
          <option value="0-17">0–17 años</option>
          <option value="18-35">18–35 años</option>
          <option value="36-50">36–50 años</option>
          <option value="51-65">51–65 años</option>
          <option value="66+">66+ años</option>
        </select>
      </div>
      <div className="sm:col-span-3 grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Registrado desde</label>
          <input type="date" className="input text-sm py-2 w-full" value={filters.regDesde || ''}
            onChange={e => s('regDesde', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Registrado hasta</label>
          <input type="date" className="input text-sm py-2 w-full" value={filters.regHasta || ''}
            onChange={e => s('regHasta', e.target.value)} />
        </div>
      </div>
    </div>
  )

  if (tipo === 'citas') return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
      <div>
        <label className="text-xs font-semibold text-slate-500 block mb-1">Buscar paciente</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input className="input pl-8 text-sm py-2 w-full" placeholder="Nombre o apellidos..."
            value={filters.nombre || ''} onChange={e => s('nombre', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 block mb-1">Tipo</label>
        <select className="input text-sm py-2 w-full" value={filters.tipo || ''} onChange={e => s('tipo', e.target.value)}>
          <option value="">Todos</option>
          <option value="presencial">Presencial</option>
          <option value="videoconsulta">Videoconsulta</option>
          <option value="urgencia">Urgencia</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 block mb-1">Estado</label>
        <select className="input text-sm py-2 w-full" value={filters.estado || ''} onChange={e => s('estado', e.target.value)}>
          <option value="">Todos</option>
          <option value="programada">Programada</option>
          <option value="confirmada">Confirmada</option>
          <option value="completada">Completada</option>
          <option value="cancelada">Cancelada</option>
          <option value="no_asistio">No asistió</option>
        </select>
      </div>
    </div>
  )

  if (tipo === 'consultas') return (
    <div className="pt-3 border-t border-slate-100">
      <label className="text-xs font-semibold text-slate-500 block mb-1">Buscar paciente</label>
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input className="input pl-8 text-sm py-2 w-full" placeholder="Nombre o apellidos..."
          value={filters.nombre || ''} onChange={e => s('nombre', e.target.value)} />
      </div>
    </div>
  )

  if (tipo === 'facturacion') return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
      <div>
        <label className="text-xs font-semibold text-slate-500 block mb-1">Buscar paciente</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input className="input pl-8 text-sm py-2 w-full" placeholder="Nombre o apellidos..."
            value={filters.nombre || ''} onChange={e => s('nombre', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 block mb-1">Estado</label>
        <select className="input text-sm py-2 w-full" value={filters.estado || ''} onChange={e => s('estado', e.target.value)}>
          <option value="">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="timbrada">Pagada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>
    </div>
  )

  return null
}

/* ── apply client-side filters ── */
function applyFilters(tipo, rows, filters) {
  let result = rows
  const q = (filters.nombre || '').toLowerCase().trim()

  if (tipo === 'pacientes') {
    if (q)
      result = result.filter(r => `${r.nombre} ${r.apellidos}`.toLowerCase().includes(q))
    if (filters.sexo)
      result = result.filter(r => r.sexo === filters.sexo)
    if (filters.edad) {
      const [min, max] = filters.edad === '66+'
        ? [66, 999]
        : filters.edad.split('-').map(Number)
      result = result.filter(r => {
        const e = calcEdad(r.fecha_nacimiento)
        return e != null && e >= min && e <= max
      })
    }
    if (filters.regDesde)
      result = result.filter(r => new Date(r.created_at) >= new Date(filters.regDesde))
    if (filters.regHasta)
      result = result.filter(r => new Date(r.created_at) <= new Date(filters.regHasta + 'T23:59:59'))
  }

  if (tipo === 'citas') {
    if (q)
      result = result.filter(r => `${r.patients?.nombre || ''} ${r.patients?.apellidos || ''}`.toLowerCase().includes(q))
    if (filters.tipo)   result = result.filter(r => r.tipo   === filters.tipo)
    if (filters.estado) result = result.filter(r => r.estado === filters.estado)
  }

  if (tipo === 'consultas' && q)
    result = result.filter(r => `${r.patients?.nombre || ''} ${r.patients?.apellidos || ''}`.toLowerCase().includes(q))

  if (tipo === 'facturacion') {
    if (q)
      result = result.filter(r => `${r.patients?.nombre || ''} ${r.patients?.apellidos || ''}`.toLowerCase().includes(q))
    if (filters.estado) result = result.filter(r => r.estado === filters.estado)
  }

  return result
}

/* ══════════════════════════════════════════════ */
export default function ReportsPage() {
  const [tipo,    setTipo]    = useState('pacientes')
  const [desde,   setDesde]   = useState(monthStartStr())
  const [hasta,   setHasta]   = useState(todayStr())
  const [rows,    setRows]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [filters, setFilters] = useState({})

  const hasFecha = tipo !== 'pacientes'

  const resetFilters = () => setFilters({})

  const changeTipo = (t) => { setTipo(t); setRows(null); resetFilters() }

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
      resetFilters()
    } catch (e) {
      setError(e?.message || 'Error al generar reporte')
    } finally {
      setLoading(false)
    }
  }

  const cols         = COLUMNS[tipo]
  const hasRows      = rows !== null
  const filtered     = useMemo(() => rows ? applyFilters(tipo, rows, filters) : [], [rows, tipo, filters])
  const hasActiveFilter = Object.values(filters).some(v => v)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reportes</h1>
          <p className="text-slate-400 text-sm mt-0.5">Genera y descarga reportes de tu práctica médica</p>
        </div>
        {hasRows && filtered.length > 0 && (
          <button
            onClick={() => downloadCSV(filtered, cols, `reporte_${tipo}`)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Descargar CSV ({filtered.length})
          </button>
        )}
      </div>

      {/* Type selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex gap-1 flex-wrap">
        {TIPOS.map(({ id, label, icon: Icon, color }) => (
          <button key={id} onClick={() => changeTipo(id)}
            className={cn(
              'flex items-center gap-2 flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
              tipo === id ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            )}>
            <Icon className={cn('w-4 h-4', tipo === id ? 'text-white' : color)} />
            {label}
          </button>
        ))}
      </div>

      {/* Config panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">

        {/* Date range */}
        {hasFecha && (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {PRESETS.map(p => {
                const pd = p.desde(); const ph = p.hasta()
                return (
                  <button key={p.label}
                    onClick={() => { setDesde(pd); setHasta(ph); setRows(null) }}
                    className={cn('px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors',
                      desde === pd && hasta === ph
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    )}>
                    {p.label}
                  </button>
                )
              })}
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
          </div>
        )}

        {!hasFecha && (
          <p className="text-sm text-slate-500">Todos los pacientes activos registrados en el sistema.</p>
        )}

        {/* Filters (shown when results exist) */}
        {hasRows && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500">Filtrar resultados</span>
              {hasActiveFilter && (
                <button onClick={resetFilters} className="text-xs text-primary-600 hover:text-primary-700 ml-auto">Limpiar filtros</button>
              )}
            </div>
            <FilterPanel tipo={tipo} filters={filters} setFilters={setFilters} />
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button onClick={generate} disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Generando...' : hasRows ? 'Actualizar' : 'Generar reporte'}
          </button>
          {hasRows && <Summary tipo={tipo} rows={filtered} />}
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">{error}</p>}
      </div>

      {/* Empty state */}
      {!hasRows && !loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-slate-600 font-medium">Configura los filtros y genera el reporte</p>
          <p className="text-slate-400 text-sm mt-1">Los resultados aparecerán aquí listos para descargar</p>
        </div>
      )}

      {hasRows && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">No hay datos que coincidan con los filtros seleccionados.</p>
        </div>
      )}

      {/* Results table */}
      {hasRows && filtered.length > 0 && (
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
                {filtered.map((row, i) => (
                  <tr key={row.id || i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    {cols.map(col => (
                      <td key={col.label} className="px-4 py-3 text-slate-700">
                        <CellContent col={col} row={row} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>
              {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
              {hasActiveFilter && rows && ` (de ${rows.length} totales)`}
            </span>
            <button onClick={() => downloadCSV(filtered, cols, `reporte_${tipo}`)}
              className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-medium">
              <Download className="w-3.5 h-3.5" /> Descargar CSV
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
