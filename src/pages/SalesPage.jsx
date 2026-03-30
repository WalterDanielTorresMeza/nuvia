import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useClinicStore } from '../store/clinicStore'
import { usePatientsStore } from '../store/patientsStore'
import {
  ShoppingCart, Search, X, Loader2, AlertTriangle,
  Trash2, Printer, CreditCard, Banknote, Smartphone, Clock, Plus,
  TrendingUp, Receipt, Calendar, Edit2, Lock,
  DollarSign, Download, FileText,
} from 'lucide-react'
import { cn } from '../utils'

const fmt = (n) => n != null
  ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n)
  : '—'

const METODOS_PAGO = [
  { id: 'efectivo',      label: 'Efectivo',      icon: Banknote    },
  { id: 'tarjeta',       label: 'Tarjeta',        icon: CreditCard  },
  { id: 'transferencia', label: 'Transferencia',  icon: Smartphone  },
]

const METODOS_COBRO = ['Efectivo', 'Tarjeta débito', 'Tarjeta crédito', 'Transferencia', 'Cheque']

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

/* ══ SaleModal ══ */
function SaleModal({ items, onClose, onSaved }) {
  const { doctor }       = useAuthStore()
  const { activeClinic } = useClinicStore()
  const { patients: allPatients } = usePatientsStore()
  const [cart, setCart]      = useState([])
  const [search, setSearch]  = useState('')
  const [descuento, setDesc] = useState('')
  const [metodo, setMetodo]  = useState('efectivo')
  const [notas, setNotas]    = useState('')
  const [saving, setSaving]  = useState(false)
  const [error, setError]    = useState('')
  const [done, setDone]      = useState(false)
  const [lastSale, setLastSale] = useState(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)

  const patients = patientSearch.length >= 2
    ? allPatients.filter(p => {
        const q = patientSearch.toLowerCase()
        return p.nombre?.toLowerCase().includes(q) || p.apellidos?.toLowerCase().includes(q)
      }).slice(0, 6)
    : []

  const available = items.filter(i =>
    i.stock_actual > 0 &&
    (!search || i.nombre.toLowerCase().includes(search.toLowerCase()))
  )

  const addToCart = (item) => {
    setCart(c => {
      const existing = c.find(r => r.item.id === item.id)
      if (existing) return c.map(r => r.item.id === item.id ? { ...r, cantidad: r.cantidad + 1 } : r)
      return [...c, { item, cantidad: 1 }]
    })
    setSearch('')
  }

  const updateCant = (id, val) => {
    const n = Math.max(1, parseInt(val) || 1)
    setCart(c => c.map(r => r.item.id === id ? { ...r, cantidad: n } : r))
  }

  const removeFromCart = (id) => setCart(c => c.filter(r => r.item.id !== id))

  const subtotal = cart.reduce((s, r) => s + (r.item.precio_unitario || 0) * r.cantidad, 0)
  const desc     = Math.min(parseFloat(descuento) || 0, subtotal)
  const total    = subtotal - desc

  const handleSale = async () => {
    if (cart.length === 0) { setError('Agrega al menos un producto'); return }
    setSaving(true); setError('')
    let did = doctor?.id
    if (!did) {
      const { data } = await supabase.from('doctors').select('id').single()
      did = data?.id
    }
    const { data: sale, error: e1 } = await supabase.from('sales').insert([{
      doctor_id:   did,
      clinic_id:   activeClinic?.id || null,
      patient_id:  selectedPatient?.id || null,
      total,
      descuento:   desc,
      metodo_pago: metodo,
      notas:       notas.trim() || null,
    }]).select().single()
    if (e1) { setError(e1.message); setSaving(false); return }

    const saleItems = cart.map(r => ({
      sale_id:     sale.id,
      item_id:     r.item.id,
      nombre:      r.item.nombre,
      cantidad:    r.cantidad,
      precio_unit: r.item.precio_unitario || 0,
      subtotal:    (r.item.precio_unitario || 0) * r.cantidad,
    }))
    const { error: e2 } = await supabase.from('sale_items').insert(saleItems)
    if (e2) { setError(e2.message); setSaving(false); return }

    await Promise.all(cart.map(r =>
      supabase.from('inventory_items')
        .update({ stock_actual: Math.max(0, r.item.stock_actual - r.cantidad) })
        .eq('id', r.item.id)
    ))

    setLastSale({ ...sale, items: saleItems, patientName: selectedPatient ? `${selectedPatient.nombre} ${selectedPatient.apellidos}` : null })
    setDone(true)
    setSaving(false)
    onSaved()
  }

  /* ── Pantalla de éxito ── */
  if (done && lastSale) return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
          <div className="p-6 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShoppingCart className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">¡Venta registrada!</h3>
            <p className="text-2xl font-bold text-green-600 mb-4">{fmt(lastSale.total)}</p>
            <div className="text-left bg-slate-50 rounded-xl p-4 mb-4 space-y-1">
              {lastSale.items.map((it, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-600">{it.nombre} ×{it.cantidad}</span>
                  <span className="font-medium">{fmt(it.subtotal)}</span>
                </div>
              ))}
              {lastSale.descuento > 0 && (
                <div className="flex justify-between text-sm text-red-500 pt-1 border-t border-slate-200 mt-1">
                  <span>Descuento</span><span>−{fmt(lastSale.descuento)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-200 mt-1">
                <span>Total</span><span>{fmt(lastSale.total)}</span>
              </div>
              <p className="text-xs text-slate-400 pt-1">Pago: {METODOS_PAGO.find(m => m.id === lastSale.metodo_pago)?.label}</p>
              {lastSale.patientName && <p className="text-xs text-slate-400">Paciente: {lastSale.patientName}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                <Printer className="w-4 h-4" /> Imprimir
              </button>
              <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  /* ── Modal principal ── */
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-green-600" />
              </div>
              <h2 className="text-base font-bold text-slate-800">Nueva venta</h2>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Contenido scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-5">
            {/* Buscador */}
            <div>
              <label className="label">Agregar producto</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input className="input pl-9 text-sm" placeholder="Buscar producto del inventario..."
                  value={search} onChange={e => setSearch(e.target.value)} autoFocus />
              </div>
              {search && available.length > 0 && (
                <div className="mt-1 border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-48 overflow-y-auto">
                  {available.map(item => (
                    <button key={item.id} type="button" onClick={() => addToCart(item)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-green-50 transition-colors text-left border-b border-slate-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{item.nombre}</p>
                        <p className="text-xs text-slate-400">Stock: {item.stock_actual} {item.unidad}</p>
                      </div>
                      <span className="text-sm font-semibold text-green-600">{item.precio_unitario != null ? fmt(item.precio_unitario) : 'Sin precio'}</span>
                    </button>
                  ))}
                </div>
              )}
              {search && available.length === 0 && (
                <p className="mt-2 text-xs text-slate-400 text-center">Sin productos disponibles</p>
              )}
            </div>

            {/* Carrito */}
            {cart.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
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
                    <span className="col-span-2 text-right text-sm font-semibold text-slate-800">{fmt((r.item.precio_unitario || 0) * r.cantidad)}</span>
                    <button onClick={() => removeFromCart(r.item.id)} className="col-span-1 flex justify-center text-slate-300 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center">
                <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Busca y agrega productos al carrito</p>
              </div>
            )}

            {/* Descuento + totales */}
            {cart.length > 0 && (
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
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Subtotal</span><span>{fmt(subtotal)}</span>
                  </div>
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

            {/* Método de pago */}
            {cart.length > 0 && (
              <div>
                <label className="label">Método de pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {METODOS_PAGO.map(m => (
                    <button key={m.id} type="button" onClick={() => setMetodo(m.id)}
                      className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all',
                        metodo === m.id ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}>
                      <m.icon className="w-4 h-4" />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Paciente */}
            <div>
              <label className="label">Paciente <span className="text-slate-400 font-normal">(opcional)</span></label>
              {selectedPatient ? (
                <div className="flex items-center justify-between px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl">
                  <span className="text-sm font-medium text-green-800">
                    {selectedPatient.nombre} {selectedPatient.apellidos}
                  </span>
                  <button type="button" onClick={() => { setSelectedPatient(null); setPatientSearch('') }}
                    className="text-green-500 hover:text-green-700 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input className="input pl-9 text-sm" placeholder="Buscar paciente por nombre..."
                    value={patientSearch} onChange={e => setPatientSearch(e.target.value)} />
                  {patients.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                      {patients.map(p => (
                        <button key={p.id} type="button"
                          onClick={() => { setSelectedPatient(p); setPatientSearch('') }}
                          className="w-full text-left px-4 py-2.5 hover:bg-green-50 transition-colors text-sm border-b border-slate-50 last:border-0">
                          {p.nombre} {p.apellidos}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notas */}
            <div>
              <label className="label">Notas <span className="text-slate-400 font-normal">(opcional)</span></label>
              <input className="input text-sm" placeholder="Motivo de compra, observaciones..."
                value={notas} onChange={e => setNotas(e.target.value)} />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}
              </div>
            )}
          </div>

          {/* Footer fijo */}
          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSale} disabled={saving || cart.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
              {saving ? 'Registrando...' : `Cobrar ${cart.length > 0 ? fmt(total) : ''}`}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

/* ══ PIN Modal ══ */
function PinModal({ doctorId, onSuccess, onCancel }) {
  const [pin, setPin]       = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const verify = async () => {
    if (pin.length < 4) { setError('Ingresa tu PIN de 4 dígitos'); return }
    setLoading(true)
    const { data } = await supabase.from('doctors').select('pin_acciones').eq('id', doctorId).single()
    setLoading(false)
    if (!data?.pin_acciones) {
      setError('No tienes un PIN configurado. Ve a Configuración → Seguridad para crearlo.')
      return
    }
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
        <input
          type="password" inputMode="numeric" maxLength={4}
          className="input text-center text-2xl font-bold tracking-[0.5em] mb-3"
          placeholder="••••" value={pin}
          onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError('') }}
          autoFocus
        />
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

/* ══ Edit Sale Modal ══ */
function EditSaleModal({ sale, onClose, onSaved }) {
  const [metodo, setMetodo] = useState(sale.metodo_pago)
  const [notas, setNotas]   = useState(sale.notas || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('sales').update({ metodo_pago: metodo, notas: notas.trim() || null }).eq('id', sale.id)
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm">Editar venta</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Método de pago</label>
            <div className="grid grid-cols-3 gap-2">
              {METODOS_PAGO.map(m => (
                <button key={m.id} type="button" onClick={() => setMetodo(m.id)}
                  className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all',
                    metodo === m.id ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}>
                  <m.icon className="w-4 h-4" />{m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Notas</label>
            <input className="input text-sm" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones..." />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══ Historial de ventas ══ */
function SalesHistory({ doctorId, refreshKey, onEdit, onDelete }) {
  const [sales, setSales]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!doctorId) return
    setLoading(true)
    supabase.from('sales')
      .select('*, sale_items(*)')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setSales(data || []); setLoading(false) })
  }, [doctorId, refreshKey])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-green-400" /></div>
  if (sales.length === 0) return (
    <div className="text-center py-16 text-slate-400 text-sm">
      <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-slate-200" />
      Sin ventas registradas aún
    </div>
  )

  return (
    <div className="space-y-2">
      {sales.map(sale => (
        <div key={sale.id} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors group">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-4 h-4 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 line-clamp-1">
                {sale.sale_items?.map(i => `${i.nombre} ×${i.cantidad}`).join(', ')}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Clock className="w-3 h-3 text-slate-300" />
                <span className="text-xs text-slate-400">
                  {new Date(sale.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                  sale.metodo_pago === 'efectivo'      ? 'bg-green-50 text-green-600' :
                  sale.metodo_pago === 'tarjeta'       ? 'bg-blue-50 text-blue-600'  :
                  'bg-violet-50 text-violet-600')}>
                  {METODOS_PAGO.find(m => m.id === sale.metodo_pago)?.label}
                </span>
                {sale.descuento > 0 && <span className="text-xs text-red-400">−{fmt(sale.descuento)}</span>}
                {sale.notas && <span className="text-xs text-slate-400 truncate max-w-[150px]">{sale.notas}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span className="text-base font-bold text-green-600">{fmt(sale.total)}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(sale)}
                className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                title="Editar venta"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(sale)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar venta"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ══ NuevoCobro Modal ══ */
function NuevoCobro({ onClose, onSaved }) {
  const { doctor }                  = useAuthStore()
  const { patients: allPatients }   = usePatientsStore()
  const { clinics }                 = useClinicStore()
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [form, setForm] = useState({
    patient_id: '', concepto: '', total: '', estado: 'pendiente',
    metodo_pago: 'Efectivo', requiere_factura: false,
    rfc_receptor: '', razon_social: '', clinic_id: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const onPatientChange = (pid) => {
    set('patient_id', pid)
    const p = allPatients.find(p => p.id === pid)
    if (p?.rfc)                  set('rfc_receptor', p.rfc)
    if (p?.razon_social_factura) set('razon_social', p.razon_social_factura)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.patient_id)      { setError('Selecciona un paciente.'); return }
    if (!form.concepto.trim()) { setError('Escribe el concepto.'); return }
    if (!form.total || parseFloat(form.total) <= 0) { setError('Ingresa un monto válido.'); return }
    setSaving(true); setError('')
    let did = doctor?.id
    if (!did) { const { data } = await supabase.from('doctors').select('id').single(); did = data?.id }
    const monto = parseFloat(form.total)
    const payload = {
      patient_id: form.patient_id, doctor_id: did,
      folio: `C-${Date.now().toString().slice(-6)}`,
      subtotal: monto, iva: 0, total: monto,
      concepto: form.concepto.trim(), estado: form.estado,
      metodo_pago: form.metodo_pago,
      rfc_receptor: form.rfc_receptor.trim() || null,
      razon_social: form.razon_social.trim() || null,
      requiere_factura: form.requiere_factura,
    }
    if (form.clinic_id) payload.clinic_id = form.clinic_id
    const { error: dbErr } = await supabase.from('invoices').insert([payload])
    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
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

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 p-6 space-y-4">
            {/* Consultorio */}
            {clinics.length > 0 && (
              <div>
                <label className="label">Consultorio</label>
                <div className="flex gap-2 flex-wrap">
                  <button type="button" onClick={() => set('clinic_id', '')}
                    className={cn('px-3 py-1.5 text-xs rounded-xl font-semibold border transition-all',
                      !form.clinic_id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}>
                    Sin asignar
                  </button>
                  {clinics.map(c => (
                    <button key={c.id} type="button" onClick={() => set('clinic_id', c.id)}
                      className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl font-semibold border transition-all',
                        form.clinic_id === c.id ? 'text-white border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}
                      style={form.clinic_id === c.id ? { background: c.color } : {}}>
                      <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />{c.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Paciente */}
            <div>
              <label className="label">Paciente *</label>
              <select className="input" value={form.patient_id} onChange={e => onPatientChange(e.target.value)} required>
                <option value="">Seleccionar paciente...</option>
                {allPatients.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>)}
              </select>
            </div>

            {/* Concepto */}
            <div>
              <label className="label">Concepto *</label>
              <input className="input" placeholder="Consulta general, revisión, procedimiento..."
                value={form.concepto} onChange={e => set('concepto', e.target.value)} required />
            </div>

            {/* Monto + método */}
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
                  {METODOS_COBRO.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            {/* Estado */}
            <div>
              <label className="label">Estado</label>
              <select className="input" value={form.estado} onChange={e => set('estado', e.target.value)}>
                <option value="pendiente">Pendiente de cobro</option>
                <option value="timbrada">Pagado</option>
              </select>
            </div>

            {/* Requiere factura */}
            <div className={cn('rounded-xl border p-4 transition-colors', form.requiere_factura ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50')}>
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => set('requiere_factura', !form.requiere_factura)}
                  className={cn('w-10 h-6 rounded-full transition-colors relative flex-shrink-0', form.requiere_factura ? 'bg-blue-500' : 'bg-slate-300')}>
                  <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all', form.requiere_factura ? 'left-5' : 'left-1')} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">El paciente requiere factura (CFDI)</p>
                  <p className="text-xs text-slate-400">Captura RFC y razón social para el contador</p>
                </div>
              </label>
              {form.requiere_factura && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="label">RFC del paciente</label>
                    <input className="input uppercase" placeholder="XAXX010101000" maxLength={13}
                      value={form.rfc_receptor} onChange={e => set('rfc_receptor', e.target.value.toUpperCase())} />
                  </div>
                  <div>
                    <label className="label">Razón social</label>
                    <input className="input" placeholder="Nombre o empresa como aparece en constancia fiscal"
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
          </form>

          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
              {saving ? 'Guardando...' : 'Registrar cobro'}
            </button>
          </div>
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

/* ══ SalesPage ══ */
export default function SalesPage() {
  const { doctor } = useAuthStore()
  const { fetchPatients, patients: allPatients } = usePatientsStore()

  const [tab, setTab] = useState('ventas')   // 'ventas' | 'cobros'

  // — Ventas (productos) —
  const [items, setItems]       = useState([])
  const [sales, setSales]       = useState([])
  const [saleModal, setSaleModal]   = useState(false)
  const [salesKey, setSalesKey]     = useState(0)
  const [pinAction, setPinAction]   = useState(null)
  const [editModal, setEditModal]   = useState(null)

  // — Cobros (consultas) —
  const [invoices, setInvoices]     = useState([])
  const [cobrosLoading, setCobrosLoading] = useState(true)
  const [cobroModal, setCobroModal] = useState(false)
  const [preFactura, setPreFactura] = useState(null)
  const [cobrosKey, setCobrosKey]   = useState(0)
  const [billingTab, setBillingTab] = useState('todos')
  const [doctorData, setDoctorData] = useState(null)
  const loadedOnce = useRef(false)

  useEffect(() => {
    if (allPatients.length === 0) fetchPatients()
  }, [])

  useEffect(() => {
    supabase.from('inventory_items').select('*').eq('activo', true).order('nombre')
      .then(({ data }) => setItems(data || []))
  }, [salesKey])

  useEffect(() => {
    if (!doctor?.id) return
    supabase.from('sales').select('*, sale_items(*)')
      .eq('doctor_id', doctor.id).order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => setSales(data || []))
  }, [doctor?.id, salesKey])

  useEffect(() => {
    if (!loadedOnce.current) setCobrosLoading(true)
    supabase.from('invoices')
      .select('id, folio, concepto, total, subtotal, iva, estado, metodo_pago, rfc_receptor, razon_social, requiere_factura, fecha, clinic_id, patients(nombre, apellidos)')
      .order('fecha', { ascending: false })
      .then(({ data }) => { setInvoices(data || []); setCobrosLoading(false); loadedOnce.current = true })
  }, [cobrosKey])

  useEffect(() => {
    if (!doctor?.id) return
    supabase.from('doctors')
      .select('nombre, apellidos, especialidad, rfc, razon_social_fiscal, regimen_fiscal, direccion_fiscal, cp_fiscal')
      .eq('id', doctor.id).single()
      .then(({ data }) => { if (data) setDoctorData(data) })
  }, [doctor?.id])

  // Ventas stats
  const hoy       = new Date().toDateString()
  const ventasHoy = sales.filter(s => new Date(s.created_at).toDateString() === hoy)
  const totalHoy  = ventasHoy.reduce((s, v) => s + (v.total || 0), 0)
  const mesActual = new Date().getMonth()
  const ventasMes = sales.filter(s => new Date(s.created_at).getMonth() === mesActual)
  const totalMes  = ventasMes.reduce((s, v) => s + (v.total || 0), 0)

  // Cobros stats
  const pendientes   = invoices.filter(i => i.estado === 'pendiente')
  const pagados      = invoices.filter(i => i.estado === 'timbrada')
  const paraContador = invoices.filter(i => i.requiere_factura)
  const now          = new Date()
  const cobradoMes   = pagados.filter(i => {
    const d = new Date(i.fecha)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).reduce((s, i) => s + (i.total || 0), 0)

  const billingRows = { todos: invoices, pendientes, contador: paraContador, pagados }
  const filteredInvoices = billingRows[billingTab] || invoices

  const handlePinSuccess = async () => {
    if (!pinAction) return
    if (pinAction.type === 'delete') {
      await supabase.from('sales').delete().eq('id', pinAction.sale.id)
      setPinAction(null); setSalesKey(k => k + 1)
    } else if (pinAction.type === 'edit') {
      setEditModal(pinAction.sale); setPinAction(null)
    }
  }

  const updateEstado = async (id, estado) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, estado } : inv))
    await supabase.from('invoices').update({ estado }).eq('id', id)
  }

  const contadorCols = [
    { label: 'Folio',        value: r => r.folio },
    { label: 'Fecha',        value: r => new Date(r.fecha).toLocaleDateString('es-MX') },
    { label: 'Paciente',     value: r => `${r.patients?.nombre} ${r.patients?.apellidos}` },
    { label: 'RFC Receptor', value: r => r.rfc_receptor || '' },
    { label: 'Razón Social', value: r => r.razon_social || '' },
    { label: 'Concepto',     value: r => r.concepto },
    { label: 'Total',        value: r => r.total },
    { label: 'Método pago',  value: r => r.metodo_pago || 'Efectivo' },
    { label: 'RFC Emisor',   value: () => doctorData?.rfc || '' },
    { label: 'Razón Social Emisor', value: () => doctorData?.razon_social_fiscal || `Dr. ${doctorData?.nombre} ${doctorData?.apellidos}` },
    { label: 'Estado',       value: r => ESTADO_STYLE[r.estado]?.label || r.estado },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Punto de Venta</h1>
          <p className="text-slate-400 text-sm mt-0.5">Ventas de productos y cobros de consulta</p>
        </div>
        {tab === 'ventas' ? (
          <button onClick={() => setSaleModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Nueva venta
          </button>
        ) : (
          <button onClick={() => setCobroModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Nuevo cobro
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('ventas')}
          className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors',
            tab === 'ventas' ? 'bg-green-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
          <ShoppingCart className="w-4 h-4" /> Ventas de productos
        </button>
        <button onClick={() => setTab('cobros')}
          className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors',
            tab === 'cobros' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
          <DollarSign className="w-4 h-4" /> Cobros de consulta
        </button>
      </div>

      {/* ══ TAB: VENTAS ══ */}
      {tab === 'ventas' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Ventas hoy',     value: ventasHoy.length, sub: fmt(totalHoy), icon: ShoppingCart, color: 'bg-green-50 text-green-600' },
              { label: 'Total hoy',      value: fmt(totalHoy),    sub: `${ventasHoy.length} transacciones`, icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
              { label: 'Ventas del mes', value: ventasMes.length, sub: fmt(totalMes), icon: Calendar, color: 'bg-blue-50 text-blue-600' },
              { label: 'Total del mes',  value: fmt(totalMes),    sub: `${ventasMes.length} transacciones`, icon: Receipt, color: 'bg-violet-50 text-violet-600' },
            ].map(({ label, value, sub, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
                  <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl font-bold text-slate-800 truncate">{value}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-green-600" />
                <h2 className="font-semibold text-slate-700 text-sm">Historial de ventas</h2>
              </div>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Lock className="w-3 h-3" /> PIN requerido para editar/eliminar
              </span>
            </div>
            <div className="p-4">
              <SalesHistory
                doctorId={doctor?.id} refreshKey={salesKey}
                onEdit={sale => setPinAction({ type: 'edit', sale })}
                onDelete={sale => setPinAction({ type: 'delete', sale })}
              />
            </div>
          </div>
        </>
      )}

      {/* ══ TAB: COBROS ══ */}
      {tab === 'cobros' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Cobrado este mes',      value: fmt(cobradoMes),      icon: TrendingUp, color: 'bg-green-50 text-green-600' },
              { label: 'Por cobrar',            value: fmt(pendientes.reduce((s,i) => s+(i.total||0),0)), icon: Clock, color: 'bg-amber-50 text-amber-600', valueColor: 'text-amber-600' },
              { label: 'Pendientes de factura', value: paraContador.length,  icon: FileText, color: 'bg-blue-50 text-blue-600', valueColor: 'text-blue-600' },
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

          {/* Sub-tabs + export */}
          <div className="flex gap-2 flex-wrap items-center">
            {[
              ['todos',      'Todos',           invoices.length],
              ['pendientes', 'Por cobrar',       pendientes.length],
              ['contador',   'Para el contador', paraContador.length],
              ['pagados',    'Pagados',          pagados.length],
            ].map(([val, label, count]) => (
              <button key={val} onClick={() => setBillingTab(val)}
                className={cn('flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl font-medium transition-colors',
                  billingTab === val ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
                {label}
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-bold',
                  billingTab === val ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>{count}</span>
              </button>
            ))}
            {(billingTab === 'contador' || billingTab === 'todos') && filteredInvoices.length > 0 && (
              <button onClick={() => downloadCSV(filteredInvoices, contadorCols, billingTab === 'contador' ? 'para_contador' : 'todos_cobros')}
                className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
                <Download className="w-4 h-4" />
                {billingTab === 'contador' ? 'Descargar para contador' : 'Exportar todo'}
              </button>
            )}
          </div>

          {billingTab === 'contador' && (
            <div className="flex items-start gap-3 px-4 py-3.5 bg-blue-50 border border-blue-200 rounded-2xl">
              <FileText className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                <span className="font-semibold">Reporte para tu contador — </span>
                Aquí aparecen los cobros donde el paciente pidió factura. Descarga el CSV con RFC, razón social y todos los datos para el CFDI.
              </p>
            </div>
          )}

          {/* Lista de cobros */}
          {cobrosLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-emerald-400" /></div>
          ) : filteredInvoices.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
              <Receipt className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium text-sm">Sin cobros en esta categoría</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {filteredInvoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{inv.concepto}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-slate-400">{inv.patients?.nombre} {inv.patients?.apellidos}</span>
                          <span className="text-xs text-slate-300">·</span>
                          <span className="text-xs text-slate-400">{new Date(inv.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ESTADO_STYLE[inv.estado]?.cls)}>
                            {ESTADO_STYLE[inv.estado]?.label}
                          </span>
                          {inv.requiere_factura && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600">Factura</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-base font-bold text-emerald-600">{fmt(inv.total)}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setPreFactura(inv)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Ver pre-factura">
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        {inv.estado === 'pendiente' && (
                          <button onClick={() => updateEstado(inv.id, 'timbrada')}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded-lg font-medium transition-colors">
                            Marcar pagado
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ══ Modals ══ */}
      {saleModal && (
        <SaleModal items={items} onClose={() => setSaleModal(false)}
          onSaved={() => { setSaleModal(false); setSalesKey(k => k + 1) }} />
      )}
      {cobroModal && (
        <NuevoCobro onClose={() => setCobroModal(false)}
          onSaved={() => { setCobroModal(false); setCobrosKey(k => k + 1) }} />
      )}
      {pinAction && (
        <PinModal doctorId={doctor?.id} onSuccess={handlePinSuccess} onCancel={() => setPinAction(null)} />
      )}
      {editModal && (
        <EditSaleModal sale={editModal} onClose={() => setEditModal(null)}
          onSaved={() => { setEditModal(null); setSalesKey(k => k + 1) }} />
      )}
      {preFactura && (
        <PreFactura invoice={preFactura} doctorData={doctorData} onClose={() => setPreFactura(null)} />
      )}
    </div>
  )
}
