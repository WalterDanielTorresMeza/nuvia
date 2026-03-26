import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Loader2, AlertCircle, CheckCircle, XCircle, Search, Trash2 } from 'lucide-react'
import { cn } from '../../utils'

const STATUS_TABS = [
  { id: 'activo',    label: 'Activos',    icon: AlertCircle,   color: 'text-red-600',    bg: 'bg-red-50',    badge: 'bg-red-100 text-red-700' },
  { id: 'inactivo',  label: 'Inactivos',  icon: XCircle,       color: 'text-slate-500',  bg: 'bg-slate-50',  badge: 'bg-slate-100 text-slate-600' },
  { id: 'resuelto',  label: 'Resueltos',  icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50',  badge: 'bg-green-100 text-green-700' },
]

export default function ProblemListTab({ patient }) {
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeStatus, setActiveStatus] = useState('activo')
  const [showForm, setShowForm] = useState(false)
  const [searchCie, setSearchCie] = useState('')
  const [form, setForm] = useState({ cie10_codigo: '', cie10_descripcion: '', estado: 'activo', notas: '', fecha_inicio: '' })

  const fetchProblems = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('patient_problems')
      .select('*')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
    setProblems(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchProblems() }, [patient.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('patient_problems').insert([{ ...form, patient_id: patient.id }])
    setSaving(false)
    setShowForm(false)
    setForm({ cie10_codigo: '', cie10_descripcion: '', estado: 'activo', notas: '', fecha_inicio: '' })
    fetchProblems()
  }

  const changeStatus = async (id, estado) => {
    await supabase.from('patient_problems').update({ estado }).eq('id', id)
    fetchProblems()
  }

  const deleteProblem = async (id) => {
    await supabase.from('patient_problems').delete().eq('id', id)
    fetchProblems()
  }

  const filtered = problems.filter(p => p.estado === activeStatus)

  const currentTab = STATUS_TABS.find(t => t.id === activeStatus)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-700">Lista de Problemas</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo problema
        </button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h3 className="font-medium text-slate-700 mb-4">Agregar problema / diagnóstico</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Código CIE-10</label>
                <input
                  className="input font-mono"
                  placeholder="Ej: E11.9, J06.9, I10"
                  value={form.cie10_codigo}
                  onChange={e => setForm(f => ({ ...f, cie10_codigo: e.target.value.toUpperCase() }))}
                />
              </div>
              <div>
                <label className="label">Estado</label>
                <select className="input" value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="resuelto">Resuelto</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Descripción / Diagnóstico *</label>
              <input
                className="input"
                placeholder="Ej: Diabetes mellitus tipo 2, Hipertensión arterial..."
                value={form.cie10_descripcion}
                onChange={e => setForm(f => ({ ...f, cie10_descripcion: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Fecha de inicio</label>
                <input type="date" className="input" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} />
              </div>
              <div>
                <label className="label">Notas</label>
                <input className="input" placeholder="Observaciones adicionales..." value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs de estado */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {STATUS_TABS.map(tab => {
          const count = problems.filter(p => p.estado === tab.id).length
          return (
            <button
              key={tab.id}
              onClick={() => setActiveStatus(tab.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                activeStatus === tab.id ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-semibold', tab.badge)}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <currentTab.icon className={cn('w-10 h-10 mx-auto mb-3', currentTab.color, 'opacity-30')} />
          <p className="text-slate-500 text-sm">No hay problemas {currentTab.label.toLowerCase()} registrados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(prob => (
            <div key={prob.id} className={cn('card p-4 flex items-start justify-between gap-4', currentTab.bg)}>
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <currentTab.icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', currentTab.color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {prob.cie10_codigo && (
                      <span className="text-xs font-mono font-bold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">
                        {prob.cie10_codigo}
                      </span>
                    )}
                    <span className="font-medium text-slate-800 text-sm">{prob.cie10_descripcion}</span>
                  </div>
                  {prob.notas && <p className="text-xs text-slate-500 mt-1">{prob.notas}</p>}
                  {prob.fecha_inicio && (
                    <p className="text-xs text-slate-400 mt-1">
                      Desde: {new Date(prob.fecha_inicio).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {activeStatus !== 'activo' && (
                  <button onClick={() => changeStatus(prob.id, 'activo')} className="text-xs px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                    Activo
                  </button>
                )}
                {activeStatus !== 'resuelto' && (
                  <button onClick={() => changeStatus(prob.id, 'resuelto')} className="text-xs px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors">
                    Resuelto
                  </button>
                )}
                {activeStatus !== 'inactivo' && (
                  <button onClick={() => changeStatus(prob.id, 'inactivo')} className="text-xs px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                    Inactivo
                  </button>
                )}
                <button onClick={() => deleteProblem(prob.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-white transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
