import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { usePatientsStore } from '../store/patientsStore'
import {
  Plus, Loader2, X, AlertTriangle, Receipt,
  DollarSign, Clock, TrendingUp, Download, FileText,
  Printer,
} from 'lucide-react'
import { cn } from '../utils'

/* ── CSV download ── */
function downloadCSV(rows, cols, filename) {
  const header = cols.map(c => c.label).join(',')
  const body   = rows.map(r =>
    cols.map(c => {
      const v = c.value(r) ?? ''
      return `"${String(v).replace(/"/g, '""')}"`
    }).join(',')
  ).join('\n')
  const blob = new Blob(['\uFEFF' + header + '\n' + body], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url
  a.download = filename + '_' + new Date().toISOString().slice(0, 10) + '.csv'
  a.click(); URL.revokeObjectURL(url)
}

const fmt = (n) => n != null
  ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n)
  : '—'

const ESTADOS = ['pendiente', 'timbrada', 'cancelada']
const ESTADO_STYLE = {
  pendiente: { cls: 'bg-amber-100 text-amber-700',  label: 'Pendiente' },
  timbrada:  { cls: 'bg-green-100 text-green-700',  label: 'Pagada'    },
  cancelada: { cls: 'bg-red-100 text-red-600',      label: 'Cancelada' },
}
const METODOS = ['Efectivo', 'Tarjeta débito', 'Tarjeta crédito', 'Transferencia', 'Cheque']

/* ══ Nuevo cobro modal ══ */
function NuevoCobro({ patients, onClose, onSaved }) {
  const { doctor } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [form, setForm] = useState({
    patient_id: '', concepto: '', total: '', estado: 'pendiente',
    metodo_pago: 'Efectivo', requiere_factura: false,
    rfc_receptor: '', razon_social: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto-fill RFC when patient selected
  const onPatientChange = (pid) => {
    set('patient_id', pid)
    const p = patients.find(p => p.id === pid)
    if (p?.rfc)                set('rfc_receptor', p.rfc)
    if (p?.razon_social_factura) set('razon_social', p.razon_social_factura)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.patient_id)           { setError('Selecciona un paciente.'); return }
    if (!form.concepto.trim())      { setError('Escribe el concepto.'); return }
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
    const payload = {
      patient_id:  form.patient_id,
      doctor_id:   did,
      folio:       `C-${Date.now().toString().slice(-6)}`,
      subtotal:    monto,
      iva:         0,
      total:       monto,
      concepto:    form.concepto.trim(),
      estado:      form.estado,
      metodo_pago: form.metodo_pago,
      rfc_receptor: form.rfc_receptor.trim() || null,
      razon_social: form.razon_social.trim() || null,
      requiere_factura: form.requiere_factura,
    }

    const { error: dbErr } = await supabase.from('invoices').insert([payload])
    setSaving(false)
    if (dbErr) {
      // Si faltan columnas de la migración, reintenta con campos básicos
      if (dbErr.message.includes('requiere_factura') || dbErr.message.includes('metodo_pago')) {
        const { concepto, estado, patient_id, doctor_id, folio, subtotal, iva, rfc_receptor, razon_social } = payload
        const { error: e2 } = await supabase.from('invoices').insert([{
          patient_id, doctor_id, folio, subtotal, iva, total: monto, concepto, estado, rfc_receptor, razon_social
        }])
        if (e2) { setError(e2.message); return }
        onSaved(); onClose(); return
      }
      setError(dbErr.message); return
    }
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
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
          {/* Paciente */}
          <div>
            <label className="label">Paciente *</label>
            <select className="input" value={form.patient_id} onChange={e => onPatientChange(e.target.value)} required>
              <option value="">Seleccionar paciente...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>)}
            </select>
          </div>

          {/* Concepto + monto */}
          <div>
            <label className="label">Concepto *</label>
            <input className="input" placeholder="Consulta general, revisión, procedimiento..."
              value={form.concepto} onChange={e => set('concepto', e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Monto (MXN) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" min="0" step="0.01" className="input pl-7"
                  placeholder="0.00" value={form.total} onChange={e => set('total', e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="label">Método de pago</label>
              <select className="input" value={form.metodo_pago} onChange={e => set('metodo_pago', e.target.value)}>
                {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Estado</label>
            <select className="input" value={form.estado} onChange={e => set('estado', e.target.value)}>
              <option value="pendiente">Pendiente de cobro</option>
              <option value="timbrada">Pagado</option>
            </select>
          </div>

          {/* Requiere factura toggle */}
          <div className={cn('rounded-xl border p-4 transition-colors', form.requiere_factura ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50')}>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => set('requiere_factura', !form.requiere_factura)}
                className={cn('w-10 h-6 rounded-full transition-colors relative flex-shrink-0',
                  form.requiere_factura ? 'bg-blue-500' : 'bg-slate-300')}
              >
                <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all',
                  form.requiere_factura ? 'left-5' : 'left-1')} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">El paciente requiere factura (CFDI)</p>
                <p className="text-xs text-slate-400">Captura RFC y razón social para tenerlos listos</p>
              </div>
            </label>

            {form.requiere_factura && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="label">RFC del paciente</label>
                  <input className="input uppercase" placeholder="XAXX010101000"
                    value={form.rfc_receptor} onChange={e => set('rfc_receptor', e.target.value.toUpperCase())} maxLength={13} />
                </div>
                <div>
                  <label className="label">Razón social / Nombre fiscal</label>
                  <input className="input" placeholder="Nombre completo o empresa como aparece en su constancia"
                    value={form.razon_social} onChange={e => set('razon_social', e.target.value)} />
                </div>
              </div>
            )}
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

/* ══ Pre-factura modal (imprimible) ══ */
function PreFactura({ invoice, doctorData, onClose }) {
  const p       = invoice.patients || {}
  const fecha   = new Date(invoice.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Toolbar (no imprime) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 print:hidden">
          <h2 className="font-bold text-slate-800">Pre-factura</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors">
              <Printer className="w-4 h-4" /> Imprimir / PDF
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Contenido imprimible */}
        <div className="p-8 space-y-6 print:p-4">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">PRE-FACTURA</h1>
              <p className="text-xs text-slate-400 mt-1">Este documento no tiene validez fiscal. Es solo una referencia para la elaboración del CFDI.</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-slate-800">{invoice.folio || '—'}</p>
              <p className="text-sm text-slate-500">{fecha}</p>
            </div>
          </div>

          <div className="h-px bg-slate-200" />

          {/* Emisor y receptor */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Emisor (Médico)</p>
              <div className="space-y-1">
                <p className="font-semibold text-slate-800">Dr. {doctorData?.nombre} {doctorData?.apellidos}</p>
                {doctorData?.rfc && <p className="text-sm text-slate-600">RFC: <span className="font-mono font-semibold">{doctorData.rfc}</span></p>}
                {doctorData?.razon_social_fiscal && <p className="text-sm text-slate-600">{doctorData.razon_social_fiscal}</p>}
                {doctorData?.regimen_fiscal && <p className="text-sm text-slate-500">{doctorData.regimen_fiscal}</p>}
                {doctorData?.direccion_fiscal && <p className="text-sm text-slate-500">{doctorData.direccion_fiscal}</p>}
                {doctorData?.cp_fiscal && <p className="text-sm text-slate-500">CP {doctorData.cp_fiscal}</p>}
                {doctorData?.especialidad && <p className="text-sm text-slate-500">{doctorData.especialidad}</p>}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Receptor (Paciente)</p>
              <div className="space-y-1">
                <p className="font-semibold text-slate-800">{p.nombre} {p.apellidos}</p>
                {invoice.rfc_receptor && <p className="text-sm text-slate-600">RFC: <span className="font-mono font-semibold">{invoice.rfc_receptor}</span></p>}
                {invoice.razon_social && <p className="text-sm text-slate-600">{invoice.razon_social}</p>}
                {!invoice.rfc_receptor && <p className="text-sm text-amber-600 font-medium">⚠ Sin RFC registrado</p>}
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-200" />

          {/* Concepto y monto */}
          <div className="bg-slate-50 rounded-xl p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Concepto</p>
            <p className="text-slate-800 font-medium">{invoice.concepto}</p>
            <p className="text-xs text-slate-400 mt-1">Clave SAT: 85121800 — Servicios de medicina general</p>
          </div>

          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-500">Subtotal</td>
                <td className="py-2 text-right font-medium text-slate-800">{fmt(invoice.subtotal || invoice.total)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-500">IVA (exento — honorarios médicos)</td>
                <td className="py-2 text-right text-slate-400">$0</td>
              </tr>
              <tr>
                <td className="py-3 font-bold text-slate-800 text-base">Total</td>
                <td className="py-3 text-right font-bold text-emerald-700 text-xl">{fmt(invoice.total)}</td>
              </tr>
            </tbody>
          </table>

          <div className="h-px bg-slate-200" />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Método de pago: </span>
              <span className="font-medium text-slate-700">{invoice.metodo_pago || 'Efectivo'}</span>
            </div>
            <div>
              <span className="text-slate-400">Estado: </span>
              <span className="font-medium text-slate-700">{ESTADO_STYLE[invoice.estado]?.label || invoice.estado}</span>
            </div>
          </div>

          <p className="text-xs text-center text-slate-300 pt-4 border-t border-slate-100">
            Generado por Nuvia · Sistema de Gestión Médica · Este documento no sustituye al CFDI emitido por el SAT
          </p>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════ */
export default function BillingPage() {
  const { doctor }                  = useAuthStore()
  const { patients, fetchPatients } = usePatientsStore()
  const [invoices, setInvoices]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [preFactura, setPreFactura] = useState(null)
  const [tab, setTab]               = useState('todos')
  const [doctorData, setDoctorData] = useState(null)

  useEffect(() => { if (patients.length === 0) fetchPatients() }, [])
  useEffect(() => { fetchInvoices() }, [])
  useEffect(() => { if (doctor?.id) fetchDoctorData() }, [doctor?.id])

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

  const fetchDoctorData = async () => {
    try {
      const { data } = await supabase
        .from('doctors')
        .select('nombre, apellidos, especialidad, rfc, razon_social_fiscal, regimen_fiscal, direccion_fiscal, cp_fiscal')
        .eq('id', doctor.id)
        .single()
      setDoctorData(data)
    } catch {
      // Columnas fiscales aún no existen — carga solo los básicos
      const { data } = await supabase
        .from('doctors').select('nombre, apellidos, especialidad').eq('id', doctor.id).single()
      setDoctorData(data)
    }
  }

  const updateEstado = async (id, estado) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, estado } : inv))
    await supabase.from('invoices').update({ estado }).eq('id', id)
  }

  // Filtered lists
  const pendientes    = invoices.filter(i => i.estado === 'pendiente')
  const pagados       = invoices.filter(i => i.estado === 'timbrada')
  const paraContador  = invoices.filter(i => i.requiere_factura)

  const tabRows = {
    todos:      invoices,
    pendientes,
    contador:   paraContador,
    pagados,
  }
  const filtered = tabRows[tab] || invoices

  // Stats
  const totalCobrado = pagados.reduce((s, i) => s + (i.total || 0), 0)
  const totalPendiente = pendientes.reduce((s, i) => s + (i.total || 0), 0)
  const now = new Date()
  const estesMes = pagados.filter(i => {
    const d = new Date(i.fecha)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).reduce((s, i) => s + (i.total || 0), 0)

  // CSV columns para el contador
  const contadorCols = [
    { label: 'Folio',            value: r => r.folio },
    { label: 'Fecha',            value: r => new Date(r.fecha).toLocaleDateString('es-MX') },
    { label: 'Paciente',         value: r => `${r.patients?.nombre} ${r.patients?.apellidos}` },
    { label: 'RFC Receptor',     value: r => r.rfc_receptor || r.patients?.rfc || '' },
    { label: 'Razón Social',     value: r => r.razon_social || r.patients?.razon_social_factura || '' },
    { label: 'Concepto',         value: r => r.concepto },
    { label: 'Subtotal',         value: r => r.subtotal || r.total },
    { label: 'IVA',              value: r => r.iva || 0 },
    { label: 'Total',            value: r => r.total },
    { label: 'Método de pago',   value: r => r.metodo_pago || 'Efectivo' },
    { label: 'RFC Emisor',       value: () => doctorData?.rfc || '' },
    { label: 'Razón Social Emisor', value: () => doctorData?.razon_social_fiscal || `Dr. ${doctorData?.nombre} ${doctorData?.apellidos}` },
    { label: 'Régimen Fiscal',   value: () => doctorData?.regimen_fiscal || '' },
    { label: 'Estado',           value: r => ESTADO_STYLE[r.estado]?.label || r.estado },
  ]

  const allCols = [
    ...contadorCols.slice(0, 10),
    { label: 'Requiere Factura', value: r => r.requiere_factura ? 'Sí' : 'No' },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Facturación</h1>
          <p className="text-slate-400 text-sm mt-0.5">Registro de cobros, pre-facturas y reporte para contador</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nuevo cobro
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Cobrado este mes',      value: fmt(estesMes),      icon: TrendingUp, color: 'bg-green-50 text-green-600' },
          { label: 'Por cobrar',            value: fmt(totalPendiente), icon: Clock,      color: 'bg-amber-50 text-amber-600', valueColor: 'text-amber-600' },
          { label: 'Pendientes de factura', value: paraContador.length, icon: FileText,   color: 'bg-blue-50 text-blue-600',   valueColor: 'text-blue-600' },
        ].map(({ label, value, icon: Icon, color, valueColor }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{label}</p>
              <p className={cn('text-2xl font-bold mt-1', valueColor || 'text-slate-800')}>{value}</p>
            </div>
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap items-center">
        {[
          ['todos',      'Todos',             invoices.length],
          ['pendientes', 'Por cobrar',         pendientes.length],
          ['contador',   'Para el contador',   paraContador.length],
          ['pagados',    'Pagados',            pagados.length],
        ].map(([val, label, count]) => (
          <button key={val} onClick={() => setTab(val)}
            className={cn('flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl font-medium transition-colors',
              tab === val ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}>
            {label}
            <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-bold',
              tab === val ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>
              {count}
            </span>
          </button>
        ))}

        {/* Botón descargar — visible en pestaña contador y todos */}
        {(tab === 'contador' || tab === 'todos') && filtered.length > 0 && (
          <button
            onClick={() => downloadCSV(
              tab === 'contador' ? paraContador : invoices,
              tab === 'contador' ? contadorCols : allCols,
              tab === 'contador' ? 'para_contador' : 'todos_cobros'
            )}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
            <Download className="w-4 h-4" />
            {tab === 'contador' ? 'Descargar para contador' : 'Exportar todo'}
          </button>
        )}
      </div>

      {/* Banner para el contador */}
      {tab === 'contador' && (
        <div className="flex items-start gap-3 px-4 py-3.5 bg-blue-50 border border-blue-200 rounded-2xl">
          <FileText className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 space-y-0.5">
            <p className="font-semibold">Reporte para tu contador</p>
            <p>Aquí aparecen todos los cobros donde el paciente pidió factura. Descarga el CSV y dáselo a tu contador — tiene RFC, razón social, concepto y todos los datos que necesita para generar el CFDI.</p>
          </div>
        </div>
      )}

      {/* Tabla */}
      {loading && invoices.length === 0 ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-slate-600 font-medium">
            {tab === 'contador' ? 'Ningún cobro requiere factura' : 'Sin cobros en esta categoría'}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            {tab === 'contador'
              ? 'Cuando registres un cobro con "requiere factura" aparecerá aquí'
              : 'Registra cobros con el botón de arriba'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Folio','Paciente','Concepto','Monto','Método','Fecha','Factura','Estado',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => {
                  const st = ESTADO_STYLE[inv.estado] || ESTADO_STYLE.pendiente
                  return (
                    <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{inv.folio || '—'}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 whitespace-nowrap">
                          {inv.patients?.nombre} {inv.patients?.apellidos}
                        </p>
                        {(inv.rfc_receptor || inv.patients?.rfc) && (
                          <p className="text-xs text-slate-400 font-mono">{inv.rfc_receptor || inv.patients?.rfc}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate">{inv.concepto || '—'}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{fmt(inv.total)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{inv.metodo_pago || 'Efectivo'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(inv.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        {inv.requiere_factura
                          ? <span className="flex items-center gap-1 text-xs font-semibold text-blue-600"><FileText className="w-3 h-3" />Sí</span>
                          : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <select value={inv.estado}
                          onChange={e => updateEstado(inv.id, e.target.value)}
                          className={cn('text-xs font-semibold px-2.5 py-1 rounded-xl border-0 cursor-pointer focus:outline-none', st.cls)}>
                          {ESTADOS.map(s => (
                            <option key={s} value={s}>{ESTADO_STYLE[s]?.label || s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setPreFactura(inv)}
                          title="Ver pre-factura"
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary-600 px-2.5 py-1.5 rounded-lg hover:bg-primary-50 transition-colors whitespace-nowrap">
                          <Receipt className="w-3.5 h-3.5" /> Pre-factura
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
            <span>Total cobrado: <span className="font-semibold text-green-600 ml-1">{fmt(totalCobrado)}</span></span>
          </div>
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <NuevoCobro patients={patients} onClose={() => setShowModal(false)} onSaved={fetchInvoices} />
      )}
      {preFactura && (
        <PreFactura invoice={preFactura} doctorData={doctorData} onClose={() => setPreFactura(null)} />
      )}
    </div>
  )
}
