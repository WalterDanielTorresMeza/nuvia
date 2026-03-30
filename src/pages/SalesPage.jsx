import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useClinicStore } from '../store/clinicStore'
import { usePatientsStore } from '../store/patientsStore'
import {
  ShoppingCart, Search, X, Loader2, AlertTriangle,
  Trash2, Printer, CreditCard, Banknote, Smartphone, Clock, Plus,
  TrendingUp, Receipt, Calendar, Edit2, Lock,
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

/* ══ SalesPage ══ */
export default function SalesPage() {
  const { doctor }        = useAuthStore()
  const [items, setItems] = useState([])
  const [sales, setSales] = useState([])
  const [saleModal, setSaleModal]   = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  // PIN flow: { type: 'edit' | 'delete', sale }
  const [pinAction, setPinAction]   = useState(null)
  const [editModal, setEditModal]   = useState(null)  // sale to edit (after PIN)

  useEffect(() => {
    supabase.from('inventory_items')
      .select('*').eq('activo', true).order('nombre')
      .then(({ data }) => setItems(data || []))
  }, [refreshKey])

  useEffect(() => {
    if (!doctor?.id) return
    supabase.from('sales')
      .select('*, sale_items(*)')
      .eq('doctor_id', doctor.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setSales(data || []))
  }, [doctor?.id, refreshKey])

  const hoy       = new Date().toDateString()
  const ventasHoy = sales.filter(s => new Date(s.created_at).toDateString() === hoy)
  const totalHoy  = ventasHoy.reduce((s, v) => s + (v.total || 0), 0)

  const mesActual  = new Date().getMonth()
  const ventasMes  = sales.filter(s => new Date(s.created_at).getMonth() === mesActual)
  const totalMes   = ventasMes.reduce((s, v) => s + (v.total || 0), 0)

  const handlePinSuccess = async () => {
    if (!pinAction) return
    if (pinAction.type === 'delete') {
      await supabase.from('sales').delete().eq('id', pinAction.sale.id)
      setPinAction(null)
      setRefreshKey(k => k + 1)
    } else if (pinAction.type === 'edit') {
      setEditModal(pinAction.sale)
      setPinAction(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Punto de Venta</h1>
          <p className="text-slate-400 text-sm mt-0.5">Registra ventas y consulta el historial</p>
        </div>
        <button onClick={() => setSaleModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nueva venta
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Ventas hoy',      value: ventasHoy.length,   sub: fmt(totalHoy),  icon: ShoppingCart, color: 'bg-green-50 text-green-600'   },
          { label: 'Total hoy',       value: fmt(totalHoy),      sub: `${ventasHoy.length} transacciones`, icon: TrendingUp,   color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Ventas del mes',  value: ventasMes.length,   sub: fmt(totalMes),  icon: Calendar,     color: 'bg-blue-50 text-blue-600'      },
          { label: 'Total del mes',   value: fmt(totalMes),      sub: `${ventasMes.length} transacciones`, icon: Receipt,      color: 'bg-violet-50 text-violet-600'  },
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

      {/* Historial */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-green-600" />
            <h2 className="font-semibold text-slate-700 text-sm">Historial de ventas</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">{sales.length} registros</span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Lock className="w-3 h-3" /> PIN requerido para editar/eliminar
            </span>
          </div>
        </div>
        <div className="p-4">
          <SalesHistory
            doctorId={doctor?.id}
            refreshKey={refreshKey}
            onEdit={sale => setPinAction({ type: 'edit', sale })}
            onDelete={sale => setPinAction({ type: 'delete', sale })}
          />
        </div>
      </div>

      {/* Modals */}
      {saleModal && (
        <SaleModal
          items={items}
          onClose={() => setSaleModal(false)}
          onSaved={() => { setSaleModal(false); setRefreshKey(k => k + 1) }}
        />
      )}

      {pinAction && (
        <PinModal
          doctorId={doctor?.id}
          onSuccess={handlePinSuccess}
          onCancel={() => setPinAction(null)}
        />
      )}

      {editModal && (
        <EditSaleModal
          sale={editModal}
          onClose={() => setEditModal(null)}
          onSaved={() => { setEditModal(null); setRefreshKey(k => k + 1) }}
        />
      )}
    </div>
  )
}
