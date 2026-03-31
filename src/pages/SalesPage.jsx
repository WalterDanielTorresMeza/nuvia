import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useClinicStore } from '../store/clinicStore'
import { usePatientsStore } from '../store/patientsStore'
import {
  ShoppingCart, Search, X, Loader2, AlertTriangle,
  Trash2, Printer, CreditCard, Banknote, Smartphone, Clock, Plus,
  TrendingUp, Receipt, Calendar, Edit2, Lock,
  DollarSign, Download, FileText, Check, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '../utils'

const fmt = (n) => n != null
  ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n)
  : '—'

const METODOS = [
  { id: 'Efectivo',       label: 'Efectivo',      icon: Banknote    },
  { id: 'Tarjeta',        label: 'Tarjeta',        icon: CreditCard  },
  { id: 'Transferencia',  label: 'Transferencia',  icon: Smartphone  },
]

const ESTADO_STYLE = {
  pendiente: { cls: 'bg-amber-100 text-amber-700', label: 'Pendiente' },
  timbrada:  { cls: 'bg-green-100 text-green-700', label: 'Pagado'    },
  cancelada: { cls: 'bg-red-100 text-red-600',     label: 'Cancelada' },
}

function downloadCSV(rows, cols, filename) {
  const header = cols.map(c => c.label).join(',')
  const body   = rows.map(r =>
    cols.map(c => `"${String(c.value(r) ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n')
  const blob = new Blob(['\uFEFF' + header + '\n' + body], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url
  a.download = filename + '_' + new Date().toISOString().slice(0, 10) + '.csv'
  a.click(); URL.revokeObjectURL(url)
}

/* ══ TransaccionModal — formulario unificado ══ */
function TransaccionModal({ inventoryItems, onClose, onSaved }) {
  const { doctor }                = useAuthStore()
  const { activeClinic }          = useClinicStore()
  const { patients: allPatients } = usePatientsStore()

  /* — Paciente — */
  const [patSearch, setPatSearch]       = useState('')
  const [selectedPatient, setSelPat]    = useState(null)

  /* — Consulta — */
  const [hasConsulta, setHasConsulta]   = useState(false)
  const [concepto, setConcepto]         = useState('')
  const [fee, setFee]                   = useState('')

  /* — Productos — */
  const [cart, setCart]   = useState([])
  const [search, setSearch] = useState('')

  /* — Pago — */
  const [metodo, setMetodo]   = useState('Efectivo')
  const [estado, setEstado]   = useState('timbrada')
  const [descuento, setDesc]  = useState('')
  const [notas, setNotas]     = useState('')

  /* — Factura — */
  const [reqFact, setReqFact]         = useState(false)
  const [rfc, setRfc]                 = useState('')
  const [razonSocial, setRazonSocial] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [done, setDone]     = useState(false)
  const [lastData, setLastData] = useState(null)

  /* ── búsqueda de paciente ── */
  const patResults = patSearch.length >= 2
    ? allPatients.filter(p => {
        const q = patSearch.toLowerCase()
        return p.nombre?.toLowerCase().includes(q) || p.apellidos?.toLowerCase().includes(q)
      }).slice(0, 6)
    : []

  const onPatientSelect = (p) => {
    setSelPat(p); setPatSearch('')
    if (p.rfc)                  setRfc(p.rfc)
    if (p.razon_social_factura) setRazonSocial(p.razon_social_factura)
  }

  /* ── carrito ── */
  const available = inventoryItems.filter(i =>
    i.stock_actual > 0 && (!search || i.nombre.toLowerCase().includes(search.toLowerCase()))
  )
  const addToCart = (item) => {
    setCart(c => {
      const ex = c.find(r => r.item.id === item.id)
      if (ex) return c.map(r => r.item.id === item.id ? { ...r, cantidad: r.cantidad + 1 } : r)
      return [...c, { item, cantidad: 1 }]
    })
    setSearch('')
  }
  const updateCant = (id, val) => {
    const n = Math.max(1, parseInt(val) || 1)
    setCart(c => c.map(r => r.item.id === id ? { ...r, cantidad: n } : r))
  }
  const removeFromCart = (id) => setCart(c => c.filter(r => r.item.id !== id))

  /* ── totales ── */
  const productosSubtotal = cart.reduce((s, r) => s + (r.item.precio_unitario || 0) * r.cantidad, 0)
  const consultaFee       = parseFloat(fee) || 0
  const subtotal          = productosSubtotal + consultaFee
  const desc              = Math.min(parseFloat(descuento) || 0, subtotal)
  const total             = subtotal - desc

  const hasProducts    = cart.length > 0
  const hasConsultaFee = hasConsulta && consultaFee > 0

  /* ── guardar ── */
  const handleSave = async () => {
    if (!hasProducts && !hasConsultaFee) {
      setError('Agrega un cobro de consulta o al menos un producto'); return
    }
    if (hasConsulta && !concepto.trim()) { setError('Escribe el concepto de la consulta'); return }
    if (hasConsulta && consultaFee <= 0) { setError('Ingresa el monto de la consulta'); return }

    setSaving(true); setError('')

    let did = doctor?.id
    if (!did) { const { data } = await supabase.from('doctors').select('id').single(); did = data?.id }
    const patientId  = selectedPatient?.id || null
    const clinicId   = activeClinic?.id || null

    /* Si hay consulta O factura → crear invoice */
    if (hasConsultaFee || reqFact) {
      const invConcepto = hasConsultaFee
        ? concepto.trim()
        : cart.map(r => `${r.item.nombre} ×${r.cantidad}`).join(', ')
      const invTotal = hasConsultaFee
        ? Math.max(0, consultaFee - (hasProducts ? 0 : desc))
        : Math.max(0, productosSubtotal - desc)

      await supabase.from('invoices').insert([{
        patient_id: patientId, doctor_id: did,
        folio:      `C-${Date.now().toString().slice(-6)}`,
        subtotal:   hasConsultaFee ? consultaFee : productosSubtotal,
        iva: 0, total: invTotal,
        concepto:        invConcepto,
        estado,
        metodo_pago:     metodo,
        rfc_receptor:    rfc.trim() || null,
        razon_social:    razonSocial.trim() || null,
        requiere_factura: reqFact,
        clinic_id:       clinicId,
      }])
    }

    /* Si hay productos → crear sale + items + descontar stock */
    if (hasProducts) {
      const prodDesc  = hasConsultaFee ? 0 : desc
      const prodTotal = Math.max(0, productosSubtotal - prodDesc)
      const metodoSale = metodo === 'Tarjeta' ? 'tarjeta'
                       : metodo === 'Transferencia' ? 'transferencia'
                       : 'efectivo'

      const { data: sale, error: e1 } = await supabase.from('sales').insert([{
        doctor_id: did, clinic_id: clinicId, patient_id: patientId,
        total: prodTotal, descuento: prodDesc,
        metodo_pago: metodoSale,
        notas: notas.trim() || null,
      }]).select().single()

      if (!e1 && sale) {
        await supabase.from('sale_items').insert(
          cart.map(r => ({
            sale_id:    sale.id,
            item_id:    r.item.id,
            nombre:     r.item.nombre,
            cantidad:   r.cantidad,
            precio_unit: r.item.precio_unitario || 0,
            subtotal:   (r.item.precio_unitario || 0) * r.cantidad,
          }))
        )
        await Promise.all(cart.map(r =>
          supabase.from('inventory_items')
            .update({ stock_actual: Math.max(0, r.item.stock_actual - r.cantidad) })
            .eq('id', r.item.id)
        ))
      }
    }

    setLastData({
      patientName: selectedPatient ? `${selectedPatient.nombre} ${selectedPatient.apellidos}` : null,
      hasConsulta: hasConsultaFee,
      hasProducts,
      total,
      concepto: concepto.trim(),
      cartItems: cart,
    })
    setSaving(false); setDone(true); onSaved()
  }

  /* ── Pantalla de éxito ── */
  if (done && lastData) return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
          <div className="p-6 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">¡Registrado!</h3>
            <p className="text-2xl font-bold text-green-600 mb-4">{fmt(lastData.total)}</p>
            <div className="text-left bg-slate-50 rounded-xl p-4 mb-4 space-y-1.5">
              {lastData.patientName && (
                <p className="text-sm text-slate-600">Paciente: <span className="font-medium">{lastData.patientName}</span></p>
              )}
              {lastData.hasConsulta && (
                <p className="text-sm text-slate-600">Consulta: <span className="font-medium">{lastData.concepto}</span></p>
              )}
              {lastData.hasProducts && lastData.cartItems.map((r, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-600">{r.item.nombre} ×{r.cantidad}</span>
                  <span className="font-medium">{fmt((r.item.precio_unitario || 0) * r.cantidad)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                <Printer className="w-4 h-4" /> Imprimir
              </button>
              <button onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center">
                <Receipt className="w-4 h-4 text-green-600" />
              </div>
              <h2 className="text-base font-bold text-slate-800">Nueva transacción</h2>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-5">

            {/* ── Paciente ── */}
            <div>
              <label className="label">Paciente <span className="text-slate-400 font-normal">(opcional)</span></label>
              {selectedPatient ? (
                <div className="flex items-center justify-between px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl">
                  <span className="text-sm font-medium text-green-800">{selectedPatient.nombre} {selectedPatient.apellidos}</span>
                  <button type="button" onClick={() => { setSelPat(null); setPatSearch('') }} className="text-green-500 hover:text-green-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input className="input pl-9 text-sm" placeholder="Buscar paciente por nombre..."
                    value={patSearch} onChange={e => setPatSearch(e.target.value)} />
                  {patResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                      {patResults.map(p => (
                        <button key={p.id} type="button" onClick={() => onPatientSelect(p)}
                          className="w-full text-left px-4 py-2.5 hover:bg-green-50 transition-colors text-sm border-b border-slate-50 last:border-0">
                          {p.nombre} {p.apellidos}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Cobro de consulta (toggle) ── */}
            <div className={cn('rounded-xl border transition-colors', hasConsulta ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50')}>
              <button type="button" onClick={() => setHasConsulta(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <DollarSign className={cn('w-4 h-4', hasConsulta ? 'text-blue-600' : 'text-slate-400')} />
                  <span className={cn('text-sm font-semibold', hasConsulta ? 'text-blue-800' : 'text-slate-600')}>
                    Cobro de consulta
                  </span>
                </div>
                {hasConsulta ? <ChevronUp className="w-4 h-4 text-blue-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {hasConsulta && (
                <div className="px-4 pb-4 space-y-3">
                  <div>
                    <label className="label">Concepto *</label>
                    <input className="input" placeholder="Consulta general, revisión, procedimiento..."
                      value={concepto} onChange={e => setConcepto(e.target.value)} autoFocus />
                  </div>
                  <div>
                    <label className="label">Monto de consulta *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input type="number" min="0" step="0.01" className="input pl-7" placeholder="0.00"
                        value={fee} onChange={e => setFee(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Productos ── */}
            <div>
              <label className="label">Medicamentos / Productos</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input className="input pl-9 text-sm" placeholder="Buscar producto del inventario..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              {search && available.length > 0 && (
                <div className="mt-1 border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-40 overflow-y-auto">
                  {available.map(item => (
                    <button key={item.id} type="button" onClick={() => addToCart(item)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-green-50 transition-colors text-left border-b border-slate-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{item.nombre}</p>
                        <p className="text-xs text-slate-400">Stock: {item.stock_actual} {item.unidad}</p>
                      </div>
                      <span className="text-sm font-semibold text-green-600">{fmt(item.precio_unitario)}</span>
                    </button>
                  ))}
                </div>
              )}
              {search && available.length === 0 && (
                <p className="mt-1 text-xs text-slate-400 text-center py-2">Sin productos disponibles</p>
              )}
              {cart.length > 0 && (
                <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-400">
                    <span className="col-span-5">Producto</span>
                    <span className="col-span-2 text-center">Cant.</span>
                    <span className="col-span-2 text-right">Precio</span>
                    <span className="col-span-2 text-right">Subtotal</span>
                    <span className="col-span-1" />
                  </div>
                  {cart.map(r => (
                    <div key={r.item.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center border-t border-slate-100">
                      <div className="col-span-5">
                        <p className="text-sm font-medium text-slate-800 truncate">{r.item.nombre}</p>
                        <p className="text-xs text-slate-400">máx. {r.item.stock_actual}</p>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <input type="number" min="1" max={r.item.stock_actual} value={r.cantidad}
                          onChange={e => updateCant(r.item.id, e.target.value)}
                          className="w-14 text-center border border-slate-200 rounded-lg py-1 text-sm font-semibold focus:outline-none focus:border-green-300" />
                      </div>
                      <span className="col-span-2 text-right text-sm text-slate-600">{fmt(r.item.precio_unitario || 0)}</span>
                      <span className="col-span-2 text-right text-sm font-semibold">{fmt((r.item.precio_unitario || 0) * r.cantidad)}</span>
                      <button onClick={() => removeFromCart(r.item.id)} className="col-span-1 flex justify-center text-slate-300 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Totales + descuento ── */}
            {(hasConsultaFee || hasProducts) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Descuento ($)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input type="number" min="0" step="0.01" className="input pl-7" placeholder="0.00"
                      value={descuento} onChange={e => setDesc(e.target.value)} />
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 space-y-1">
                  {hasConsultaFee && (
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Consulta</span><span>{fmt(consultaFee)}</span>
                    </div>
                  )}
                  {hasProducts && (
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Productos</span><span>{fmt(productosSubtotal)}</span>
                    </div>
                  )}
                  {desc > 0 && (
                    <div className="flex justify-between text-sm text-red-500">
                      <span>Descuento</span><span>−{fmt(desc)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-slate-800 pt-1 border-t border-slate-200">
                    <span>Total</span><span className="text-green-600">{fmt(total)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Método de pago ── */}
            <div>
              <label className="label">Método de pago</label>
              <div className="grid grid-cols-3 gap-2">
                {METODOS.map(m => (
                  <button key={m.id} type="button" onClick={() => setMetodo(m.id)}
                    className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all',
                      metodo === m.id ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}>
                    <m.icon className="w-4 h-4" />{m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Estado ── */}
            <div>
              <label className="label">Estado del cobro</label>
              <div className="grid grid-cols-2 gap-2">
                {[['timbrada','Pagado'],['pendiente','Pendiente de cobro']].map(([val, lbl]) => (
                  <button key={val} type="button" onClick={() => setEstado(val)}
                    className={cn('py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all',
                      estado === val ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Requiere Factura (toggle) ── */}
            <div className={cn('rounded-xl border p-4 transition-colors', reqFact ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50')}>
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setReqFact(v => !v)}
                  className={cn('w-10 h-6 rounded-full transition-colors relative flex-shrink-0', reqFact ? 'bg-blue-500' : 'bg-slate-300')}>
                  <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all', reqFact ? 'left-5' : 'left-1')} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Requiere factura (CFDI)</p>
                  <p className="text-xs text-slate-400">Captura RFC y razón social para el contador</p>
                </div>
              </label>
              {reqFact && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="label">RFC del paciente</label>
                    <input className="input uppercase" placeholder="XAXX010101000" maxLength={13}
                      value={rfc} onChange={e => setRfc(e.target.value.toUpperCase())} />
                  </div>
                  <div>
                    <label className="label">Razón social</label>
                    <input className="input" placeholder="Nombre o empresa como aparece en constancia fiscal"
                      value={razonSocial} onChange={e => setRazonSocial(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {/* ── Notas ── */}
            <div>
              <label className="label">Notas <span className="text-slate-400 font-normal">(opcional)</span></label>
              <input className="input text-sm" placeholder="Observaciones..."
                value={notas} onChange={e => setNotas(e.target.value)} />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving || (!hasProducts && !hasConsultaFee)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Registrando...' : `Registrar ${total > 0 ? fmt(total) : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══ PIN Modal ══ */
function PinModal({ doctorId, onSuccess, onCancel }) {
  const [pin, setPin]         = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const verify = async () => {
    if (pin.length < 4) { setError('Ingresa tu PIN de 4 dígitos'); return }
    setLoading(true)
    const { data } = await supabase.from('doctors').select('pin_acciones').eq('id', doctorId).single()
    setLoading(false)
    if (!data?.pin_acciones) { setError('No tienes PIN configurado. Ve a Configuración → PIN de acciones.'); return }
    if (data.pin_acciones !== pin) { setError('PIN incorrecto'); setPin(''); return }
    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5 text-slate-600" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Verificación requerida</h3>
          <p className="text-xs text-slate-400 mt-1">Ingresa tu PIN para continuar</p>
        </div>
        <input type="password" inputMode="numeric" maxLength={4}
          className="input text-center text-2xl font-bold tracking-[0.5em] mb-3"
          placeholder="••••" value={pin}
          onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError('') }}
          autoFocus />
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 mb-3">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 px-3 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={verify} disabled={loading || pin.length < 4}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══ PreFactura Modal ══ */
function PreFactura({ invoice, doctorData, onClose }) {
  const p     = invoice.patients || {}
  const fecha = new Date(invoice.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex min-h-full items-start sm:items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4" onClick={e => e.stopPropagation()}>
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
          <div className="p-8 space-y-6 print:p-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">PRE-FACTURA</h1>
                <p className="text-xs text-slate-400 mt-1">Este documento no tiene validez fiscal.</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-800">{invoice.folio || '—'}</p>
                <p className="text-sm text-slate-500">{fecha}</p>
              </div>
            </div>
            <div className="h-px bg-slate-200" />
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Emisor (Médico)</p>
                <p className="font-semibold text-slate-800">Dr. {doctorData?.nombre} {doctorData?.apellidos}</p>
                {doctorData?.rfc && <p className="text-sm text-slate-600">RFC: <span className="font-mono font-semibold">{doctorData.rfc}</span></p>}
                {doctorData?.razon_social_fiscal && <p className="text-sm text-slate-600">{doctorData.razon_social_fiscal}</p>}
                {doctorData?.regimen_fiscal && <p className="text-sm text-slate-500">{doctorData.regimen_fiscal}</p>}
                {doctorData?.especialidad && <p className="text-sm text-slate-500">{doctorData.especialidad}</p>}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Receptor (Paciente)</p>
                <p className="font-semibold text-slate-800">{p.nombre} {p.apellidos}</p>
                {invoice.rfc_receptor && <p className="text-sm text-slate-600">RFC: <span className="font-mono font-semibold">{invoice.rfc_receptor}</span></p>}
                {invoice.razon_social && <p className="text-sm text-slate-600">{invoice.razon_social}</p>}
                {!invoice.rfc_receptor && <p className="text-sm text-amber-600 font-medium">⚠ Sin RFC registrado</p>}
              </div>
            </div>
            <div className="h-px bg-slate-200" />
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
              <div><span className="text-slate-400">Método de pago: </span><span className="font-medium text-slate-700">{invoice.metodo_pago || 'Efectivo'}</span></div>
              <div><span className="text-slate-400">Estado: </span><span className="font-medium text-slate-700">{ESTADO_STYLE[invoice.estado]?.label || invoice.estado}</span></div>
            </div>
            <p className="text-xs text-center text-slate-300 pt-4 border-t border-slate-100">
              Generado por Nuvia · Este documento no sustituye al CFDI emitido por el SAT
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══ Historial unificado ══ */
function UnifiedHistory({ doctorId, refreshKey, onDeleteSale, onDeleteInvoice, onPreFactura, onMarkPaid }) {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('todos')

  useEffect(() => {
    if (!doctorId) return
    setLoading(true)
    Promise.all([
      supabase.from('sales')
        .select('*, sale_items(*)')
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('invoices')
        .select('id, folio, concepto, total, subtotal, estado, metodo_pago, rfc_receptor, razon_social, requiere_factura, fecha, patients(nombre, apellidos)')
        .order('fecha', { ascending: false })
        .limit(100),
    ]).then(([{ data: sales }, { data: invoices }]) => {
      const s = (sales || []).map(r => ({ ...r, _type: 'venta',  _date: new Date(r.created_at) }))
      const i = (invoices || []).map(r => ({ ...r, _type: 'cobro', _date: new Date(r.fecha) }))
      const merged = [...s, ...i].sort((a, b) => b._date - a._date)
      setRows(merged)
      setLoading(false)
    })
  }, [doctorId, refreshKey])

  const filtered = filter === 'todos'      ? rows
    : filter === 'ventas'    ? rows.filter(r => r._type === 'venta')
    : filter === 'cobros'    ? rows.filter(r => r._type === 'cobro')
    : filter === 'pendientes'? rows.filter(r => r._type === 'cobro' && r.estado === 'pendiente')
    : filter === 'contador'  ? rows.filter(r => r._type === 'cobro' && r.requiere_factura)
    : rows

  const contadorRows = rows.filter(r => r._type === 'cobro' && r.requiere_factura)
  const contadorCols = [
    { label: 'Folio',        value: r => r.folio },
    { label: 'Fecha',        value: r => new Date(r.fecha).toLocaleDateString('es-MX') },
    { label: 'Paciente',     value: r => `${r.patients?.nombre} ${r.patients?.apellidos}` },
    { label: 'RFC Receptor', value: r => r.rfc_receptor || '' },
    { label: 'Razón Social', value: r => r.razon_social || '' },
    { label: 'Concepto',     value: r => r.concepto },
    { label: 'Total',        value: r => r.total },
    { label: 'Método pago',  value: r => r.metodo_pago || 'Efectivo' },
    { label: 'Estado',       value: r => ESTADO_STYLE[r.estado]?.label || r.estado },
  ]

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-green-400" /></div>

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-2 flex-wrap items-center">
        {[
          ['todos',      'Todos',           rows.length],
          ['ventas',     'Ventas',          rows.filter(r => r._type === 'venta').length],
          ['cobros',     'Cobros',          rows.filter(r => r._type === 'cobro').length],
          ['pendientes', 'Por cobrar',      rows.filter(r => r._type === 'cobro' && r.estado === 'pendiente').length],
          ['contador',   'Para contador',   contadorRows.length],
        ].map(([val, lbl, cnt]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl font-medium transition-colors',
              filter === val ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
            {lbl}
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-bold',
              filter === val ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>{cnt}</span>
          </button>
        ))}
        {filter === 'contador' && contadorRows.length > 0 && (
          <button onClick={() => downloadCSV(contadorRows, contadorCols, 'para_contador')}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors">
            <Download className="w-3.5 h-3.5" /> Descargar CSV
          </button>
        )}
      </div>

      {filter === 'contador' && (
        <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <FileText className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">Cobros donde el paciente pidió factura. Descarga el CSV para tu contador — tiene RFC, razón social y todos los datos para emitir el CFDI.</p>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-14 text-slate-400 text-sm">
          <Receipt className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          Sin registros en esta categoría
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(row => {
            const isVenta = row._type === 'venta'
            const dateStr = isVenta
              ? new Date(row.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : new Date(row.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

            return (
              <div key={`${row._type}-${row.id}`}
                className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors group">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                    isVenta ? 'bg-green-100' : 'bg-emerald-100')}>
                    {isVenta
                      ? <ShoppingCart className="w-4 h-4 text-green-600" />
                      : <DollarSign className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 line-clamp-1">
                      {isVenta
                        ? row.sale_items?.map(i => `${i.nombre} ×${i.cantidad}`).join(', ')
                        : row.concepto}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Clock className="w-3 h-3 text-slate-300" />
                      <span className="text-xs text-slate-400">{dateStr}</span>
                      {!isVenta && row.patients && (
                        <span className="text-xs text-slate-400">{row.patients.nombre} {row.patients.apellidos}</span>
                      )}
                      {isVenta && (
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                          row.metodo_pago === 'efectivo' ? 'bg-green-50 text-green-600' :
                          row.metodo_pago === 'tarjeta'  ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600')}>
                          {{ efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' }[row.metodo_pago] || row.metodo_pago}
                        </span>
                      )}
                      {!isVenta && (
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ESTADO_STYLE[row.estado]?.cls)}>
                          {ESTADO_STYLE[row.estado]?.label}
                        </span>
                      )}
                      {!isVenta && row.requiere_factura && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600">Factura</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className={cn('text-base font-bold', isVenta ? 'text-green-600' : 'text-emerald-600')}>
                    {fmt(row.total)}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isVenta && (
                      <button onClick={() => onPreFactura(row)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Pre-factura">
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!isVenta && row.estado === 'pendiente' && (
                      <button onClick={() => onMarkPaid(row.id)}
                        className="px-2 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded-lg font-medium transition-colors">
                        Pagado
                      </button>
                    )}
                    {isVenta && (
                      <button onClick={() => onDeleteSale(row)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!isVenta && (
                      <button onClick={() => onDeleteInvoice(row)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ══ SalesPage ══ */
export default function SalesPage() {
  const { doctor } = useAuthStore()
  const { fetchPatients, patients: allPatients } = usePatientsStore()

  const [items, setItems]         = useState([])
  const [sales, setSales]         = useState([])
  const [invoices, setInvoices]   = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  const [txModal, setTxModal]     = useState(false)
  const [pinAction, setPinAction] = useState(null)   // { type:'delete-sale'|'delete-invoice', row }
  const [preFactura, setPreFactura] = useState(null)
  const [doctorData, setDoctorData] = useState(null)

  useEffect(() => { if (allPatients.length === 0) fetchPatients() }, [])

  useEffect(() => {
    supabase.from('inventory_items').select('*').eq('activo', true).order('nombre')
      .then(({ data }) => setItems(data || []))
  }, [refreshKey])

  useEffect(() => {
    if (!doctor?.id) return
    supabase.from('sales').select('*, sale_items(*)')
      .eq('doctor_id', doctor.id).order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => setSales(data || []))
    supabase.from('invoices')
      .select('id, folio, concepto, total, subtotal, estado, metodo_pago, fecha, patients(nombre, apellidos)')
      .order('fecha', { ascending: false }).limit(100)
      .then(({ data }) => setInvoices(data || []))
    supabase.from('doctors')
      .select('nombre, apellidos, especialidad, rfc, razon_social_fiscal, regimen_fiscal, cp_fiscal')
      .eq('id', doctor.id).single()
      .then(({ data }) => { if (data) setDoctorData(data) })
  }, [doctor?.id, refreshKey])

  /* Stats */
  const hoy   = new Date().toDateString()
  const mesN  = new Date().getMonth()
  const yearN = new Date().getFullYear()

  const salesToday = sales.filter(s => new Date(s.created_at).toDateString() === hoy)
  const salesMonth = sales.filter(s => {
    const d = new Date(s.created_at)
    return d.getMonth() === mesN && d.getFullYear() === yearN
  })
  const paidInvToday = invoices.filter(i => i.estado === 'timbrada' && new Date(i.fecha).toDateString() === hoy)
  const paidInvMonth = invoices.filter(i => {
    const d = new Date(i.fecha)
    return i.estado === 'timbrada' && d.getMonth() === mesN && d.getFullYear() === yearN
  })

  const totalHoy = salesToday.reduce((s, v) => s + (v.total || 0), 0)
                 + paidInvToday.reduce((s, v) => s + (v.total || 0), 0)
  const totalMes = salesMonth.reduce((s, v) => s + (v.total || 0), 0)
                 + paidInvMonth.reduce((s, v) => s + (v.total || 0), 0)
  const porCobrar = invoices.filter(i => i.estado === 'pendiente').reduce((s, i) => s + (i.total || 0), 0)

  const handlePinSuccess = async () => {
    if (!pinAction) return
    if (pinAction.type === 'delete-sale') {
      await supabase.from('sales').delete().eq('id', pinAction.row.id)
    } else if (pinAction.type === 'delete-invoice') {
      await supabase.from('invoices').delete().eq('id', pinAction.row.id)
    }
    setPinAction(null)
    setRefreshKey(k => k + 1)
  }

  const markPaid = async (id) => {
    await supabase.from('invoices').update({ estado: 'timbrada' }).eq('id', id)
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Punto de Venta</h1>
          <p className="text-slate-400 text-sm mt-0.5">Consultas, medicamentos y cobros en un solo lugar</p>
        </div>
        <button onClick={() => setTxModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nueva transacción
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total hoy',      value: fmt(totalHoy),                        sub: `${salesToday.length + paidInvToday.length} transacciones`, icon: TrendingUp,   color: 'bg-green-50 text-green-600'    },
          { label: 'Total del mes',  value: fmt(totalMes),                        sub: `${salesMonth.length + paidInvMonth.length} transacciones`, icon: Calendar,     color: 'bg-blue-50 text-blue-600'      },
          { label: 'Por cobrar',     value: fmt(porCobrar),                       sub: `${invoices.filter(i => i.estado === 'pendiente').length} cobros pendientes`, icon: Clock, color: 'bg-amber-50 text-amber-600', valueColor: 'text-amber-600' },
          { label: 'Para contador',  value: invoices.filter(i=>i.requiere_factura).length, sub: 'cobros con CFDI', icon: FileText, color: 'bg-violet-50 text-violet-600' },
        ].map(({ label, value, sub, icon: Icon, color, valueColor }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
              <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', color)}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className={cn('text-xl font-bold truncate', valueColor || 'text-slate-800')}>{value}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>
          </div>
        ))}
      </div>

      {/* Historial */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-green-600" />
            <h2 className="font-semibold text-slate-700 text-sm">Historial</h2>
          </div>
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Lock className="w-3 h-3" /> PIN requerido para eliminar
          </span>
        </div>
        <div className="p-4">
          <UnifiedHistory
            doctorId={doctor?.id}
            refreshKey={refreshKey}
            onDeleteSale={row => setPinAction({ type: 'delete-sale', row })}
            onDeleteInvoice={row => setPinAction({ type: 'delete-invoice', row })}
            onPreFactura={setPreFactura}
            onMarkPaid={markPaid}
          />
        </div>
      </div>

      {/* Modals */}
      {txModal && (
        <TransaccionModal
          inventoryItems={items}
          onClose={() => setTxModal(false)}
          onSaved={() => { setTxModal(false); setRefreshKey(k => k + 1) }}
        />
      )}
      {pinAction && (
        <PinModal doctorId={doctor?.id} onSuccess={handlePinSuccess} onCancel={() => setPinAction(null)} />
      )}
      {preFactura && (
        <PreFactura invoice={preFactura} doctorData={doctorData} onClose={() => setPreFactura(null)} />
      )}
    </div>
  )
}
