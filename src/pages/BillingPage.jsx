import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { usePatientsStore } from '../store/patientsStore'
import {
  Plus, Loader2, X, AlertTriangle, Receipt,
  DollarSign, Clock, TrendingUp,
} from 'lucide-react'
import { cn } from '../utils'

const ESTADOS = ['pendiente', 'timbrada', 'cancelada']
const ESTADO_STYLE = {
  pendiente: { cls: 'bg-amber-100 text-amber-700',  label: 'Pendiente' },
  timbrada:  { cls: 'bg-green-100 text-green-700',   label: 'Pagada'    },
  cancelada: { cls: 'bg-red-100 text-red-600',       label: 'Cancelada' },
}

/* ── New cobro modal ── */
function NuevoCobro({ patients, onClose, onSaved }) {
  const { doctor } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [form, setForm] = useState({
    patient_id: '', concepto: '', total: '', estado: 'pendiente', notas: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.patient_id)  { setError('Selecciona un paciente.'); return }
    if (!form.concepto.trim()) { setError('Escribe el concepto.'); return }
    if (!form.total || isNaN(parseFloat(form.total)) || parseFloat(form.total) <= 0) {
      setError('Ingresa un monto válido.'); return
    }

    setSaving(true); setError('')

    let did = doctor?.id
    if (!did) {
      const { data: doc } = await supabase.from('doctors').select('id').single()
      did = doc?.id
    }

    const monto = parseFloat(form.total)
    const { error: dbErr } = await supabase.from('invoices').insert([{
      patient_id: form.patient_id,
      doctor_id:  did,
      folio:      `C-${Date.now().toString().slice(-6)}`,
      subtotal:   monto,
      iva:        0,
      total:      monto,
      concepto:   form.concepto.trim(),
      estado:     form.estado,
      razon_social: form.notas || null,
    }])

    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Nuevo cobro</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Paciente *</label>
            <select className="input" value={form.patient_id} onChange={e => set('patient_id', e.target.value)} required>
              <option value="">Seleccionar paciente...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Concepto *</label>
            <input className="input" placeholder="Consulta general, revisión, procedimiento..."
              value={form.concepto} onChange={e => set('concepto', e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">Monto (MXN) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" min="0" step="0.01" className="input pl-7"
                  placeholder="0.00" value={form.total} onChange={e => set('total', e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">Estado</label>
              <select className="input" value={form.estado} onChange={e => set('estado', e.target.value)}>
                <option value="pendiente">Pendiente</option>
                <option value="timbrada">Pagada</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Notas</label>
            <textarea rows={2} className="input resize-none" placeholder="Observaciones, método de pago..."
              value={form.notas} onChange={e => set('notas', e.target.value)} />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Guardando...' : 'Registrar cobro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════ */
export default function BillingPage() {
  const { patients, fetchPatients } = usePatientsStore()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter]     = useState('todas')

  useEffect(() => { if (patients.length === 0) fetchPatients() }, [])
  useEffect(() => { fetchInvoices() }, [])

  const fetchInvoices = async () => {
    if (invoices.length === 0) setLoading(true)
    try {
      const { data } = await supabase
        .from('invoices')
        .select('*, patients(nombre, apellidos)')
        .order('fecha', { ascending: false })
      setInvoices(data || [])
    } finally {
      setLoading(false)
    }
  }

  const updateEstado = async (id, estado) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, estado } : inv))
    await supabase.from('invoices').update({ estado }).eq('id', id)
  }

  const filtered = filter === 'todas' ? invoices : invoices.filter(inv => inv.estado === filter)

  const fmt = (n) => n != null
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n)
    : '—'

  const totalIngresos = invoices.filter(i => i.estado === 'timbrada').reduce((s, i) => s + (i.total || 0), 0)
  const pendiente     = invoices.filter(i => i.estado === 'pendiente').reduce((s, i) => s + (i.total || 0), 0)
  const thisMon       = invoices.filter(i => {
    const d = new Date(i.fecha); const n = new Date()
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear() && i.estado === 'timbrada'
  }).reduce((s, i) => s + (i.total || 0), 0)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Facturación</h1>
          <p className="text-slate-400 text-sm mt-0.5">Registro de cobros y pagos</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nuevo cobro
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Ingresos totales', value: fmt(totalIngresos), icon: TrendingUp, color: 'bg-green-50 text-green-600' },
          { label: 'Este mes',         value: fmt(thisMon),       icon: Receipt,    color: 'bg-blue-50 text-blue-600' },
          { label: 'Por cobrar',       value: fmt(pendiente),     icon: Clock,      color: 'bg-amber-50 text-amber-600', valueColor: 'text-amber-600' },
        ].map(({ label, value, icon: Icon, color, valueColor }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${valueColor || 'text-slate-800'}`}>{value}</p>
            </div>
            <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[['todas','Todas'],['pendiente','Pendientes'],['timbrada','Pagadas'],['cancelada','Canceladas']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={cn('px-4 py-2 text-sm rounded-xl font-medium transition-colors',
              filter === val ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}>
            {label}
          </button>
        ))}
      </div>

      {/* Table / empty */}
      {loading && invoices.length === 0 ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-slate-600 font-medium">No hay cobros registrados</p>
          <p className="text-slate-400 text-sm mt-1">Registra tu primer cobro con el botón de arriba</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Folio','Paciente','Concepto','Monto','Fecha','Estado'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => {
                  const st = ESTADO_STYLE[inv.estado] || ESTADO_STYLE.pendiente
                  return (
                    <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-400">{inv.folio || '—'}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-800">
                        {inv.patients?.nombre} {inv.patients?.apellidos}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 max-w-[180px] truncate">{inv.concepto || '—'}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{fmt(inv.total)}</td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">
                        {new Date(inv.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3.5">
                        <select value={inv.estado}
                          onChange={e => updateEstado(inv.id, e.target.value)}
                          className={cn('text-xs font-semibold px-2.5 py-1 rounded-xl border-0 cursor-pointer focus:outline-none', st.cls)}>
                          {ESTADOS.map(s => (
                            <option key={s} value={s}>{ESTADO_STYLE[s]?.label || s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
            <span>Total pagado: <span className="font-semibold text-green-600 ml-1">{fmt(totalIngresos)}</span></span>
          </div>
        </div>
      )}

      {showModal && (
        <NuevoCobro patients={patients} onClose={() => setShowModal(false)} onSaved={fetchInvoices} />
      )}
    </div>
  )
}
