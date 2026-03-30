import { useEffect, useRef, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useClinicStore } from '../store/clinicStore'
import {
  Plus, Search, X, Loader2, AlertTriangle, Package,
  TrendingUp, TrendingDown, RotateCcw, Edit2, ShoppingCart,
  Trash2, Printer, CreditCard, Banknote, Smartphone, Clock,
} from 'lucide-react'
import { cn } from '../utils'

/* ── helpers ── */
const fmt = (n) => n != null
  ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n)
  : '—'

const CATEGORIAS = ['medicamento', 'insumo', 'equipo', 'otro']
const CAT_LABEL  = { medicamento: 'Medicamento', insumo: 'Insumo', equipo: 'Equipo', otro: 'Otro' }
const CAT_COLOR  = {
  medicamento: 'bg-blue-100 text-blue-700',
  insumo:      'bg-violet-100 text-violet-700',
  equipo:      'bg-amber-100 text-amber-700',
  otro:        'bg-slate-100 text-slate-600',
}

function stockStatus(item) {
  if (item.stock_actual <= 0)                    return { cls: 'bg-red-100 text-red-700',    label: 'Agotado',    dot: 'bg-red-500'    }
  if (item.stock_actual <= item.stock_minimo)    return { cls: 'bg-red-50 text-red-600',     label: 'Stock bajo', dot: 'bg-red-400'    }
  if (item.stock_actual <= item.stock_minimo * 2) return { cls: 'bg-amber-50 text-amber-600', label: 'Por agotarse', dot: 'bg-amber-400' }
  return                                               { cls: 'bg-green-50 text-green-700',  label: 'OK',         dot: 'bg-green-500'  }
}

/* ══ Item modal (crear / editar) ══ */
function ItemModal({ item, onClose, onSaved }) {
  const { doctor } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [form, setForm]     = useState({
    nombre:          item?.nombre           || '',
    categoria:       item?.categoria        || 'medicamento',
    descripcion:     item?.descripcion      || '',
    unidad:          item?.unidad           || 'piezas',
    stock_actual:    item?.stock_actual     ?? 0,
    stock_minimo:    item?.stock_minimo     ?? 5,
    precio_unitario: item?.precio_unitario  ?? '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('Escribe el nombre del producto.'); return }
    setSaving(true); setError('')
    let did = doctor?.id
    if (!did) {
      const { data } = await supabase.from('doctors').select('id').single()
      did = data?.id
    }
    const payload = {
      ...form,
      doctor_id:       did,
      stock_actual:    parseInt(form.stock_actual) || 0,
      stock_minimo:    parseInt(form.stock_minimo) || 0,
      precio_unitario: form.precio_unitario !== '' ? parseFloat(form.precio_unitario) : null,
    }
    const { error: err } = item?.id
      ? await supabase.from('inventory_items').update(payload).eq('id', item.id)
      : await supabase.from('inventory_items').insert([payload])
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center">
              <Package className="w-4 h-4 text-violet-600" />
            </div>
            <h2 className="text-base font-bold text-slate-800">{item ? 'Editar producto' : 'Nuevo producto'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input className="input" placeholder="Ej. Amoxicilina 500mg, Guantes de látex..."
              value={form.nombre} onChange={e => set('nombre', e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Categoría</label>
              <select className="input" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Unidad</label>
              <input className="input" placeholder="piezas, cajas, ml..."
                value={form.unidad} onChange={e => set('unidad', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Stock actual</label>
              <input type="number" min="0" className="input" value={form.stock_actual}
                onChange={e => set('stock_actual', e.target.value)} />
            </div>
            <div>
              <label className="label">Stock mínimo</label>
              <input type="number" min="0" className="input" value={form.stock_minimo}
                onChange={e => set('stock_minimo', e.target.value)} />
            </div>
            <div>
              <label className="label">Precio unitario</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" min="0" step="0.01" className="input pl-7" placeholder="0.00"
                  value={form.precio_unitario} onChange={e => set('precio_unitario', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Descripción</label>
            <textarea rows={2} className="input resize-none text-sm" placeholder="Notas adicionales..."
              value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
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
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Guardando...' : item ? 'Guardar cambios' : 'Agregar producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ══ Movimiento modal (entrada / salida / ajuste) ══ */
function MovementModal({ item, tipo: tipoInicial, onClose, onSaved }) {
  const { doctor } = useAuthStore()
  const [tipo, setTipo]     = useState(tipoInicial || 'entrada')
  const [cantidad, setCant] = useState('')
  const [nota, setNota]     = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const TIPOS = [
    { id: 'entrada',  label: 'Entrada',  icon: TrendingUp,   color: 'text-green-600',  bg: 'bg-green-50 border-green-200 text-green-700' },
    { id: 'salida',   label: 'Salida',   icon: TrendingDown, color: 'text-red-600',    bg: 'bg-red-50 border-red-200 text-red-700'       },
    { id: 'ajuste',   label: 'Ajuste',   icon: RotateCcw,    color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200 text-amber-700' },
  ]
  const tipoData = TIPOS.find(t => t.id === tipo)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const cant = parseInt(cantidad)
    if (!cant || cant <= 0) { setError('Ingresa una cantidad válida.'); return }
    setSaving(true); setError('')
    let did = doctor?.id
    if (!did) {
      const { data } = await supabase.from('doctors').select('id').single()
      did = data?.id
    }
    // Compute new stock
    const delta    = tipo === 'salida' ? -cant : cant
    const newStock = tipo === 'ajuste' ? cant : Math.max(0, item.stock_actual + delta)
    const movCant  = tipo === 'ajuste' ? cant - item.stock_actual : (tipo === 'salida' ? -cant : cant)

    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('inventory_items').update({ stock_actual: newStock }).eq('id', item.id),
      supabase.from('inventory_movements').insert([{
        item_id: item.id, doctor_id: did, tipo, cantidad: movCant, nota: nota.trim() || null,
      }]),
    ])
    setSaving(false)
    if (e1 || e2) { setError((e1 || e2).message); return }
    onSaved()
  }

  const resultingStock = (() => {
    const cant = parseInt(cantidad) || 0
    if (!cant) return item.stock_actual
    if (tipo === 'ajuste') return cant
    if (tipo === 'salida') return Math.max(0, item.stock_actual - cant)
    return item.stock_actual + cant
  })()

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">{item.nombre}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Stock actual: <span className="font-semibold text-slate-600">{item.stock_actual} {item.unidad}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo selector */}
          <div className="grid grid-cols-3 gap-2">
            {TIPOS.map(t => (
              <button key={t.id} type="button" onClick={() => { setTipo(t.id); setError('') }}
                className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all',
                  tipo === t.id ? t.bg : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50')}>
                <t.icon className={cn('w-4 h-4', tipo === t.id ? '' : t.color)} />
                {t.label}
              </button>
            ))}
          </div>

          <div>
            <label className="label">
              {tipo === 'ajuste' ? 'Nuevo stock total' : 'Cantidad'}
            </label>
            <input type="number" min="1" className="input text-lg font-semibold" placeholder="0"
              value={cantidad} onChange={e => { setCant(e.target.value); setError('') }} autoFocus required />
          </div>

          {/* Preview */}
          {cantidad && (
            <div className={cn('flex items-center justify-between px-4 py-3 rounded-xl border text-sm', tipoData?.bg)}>
              <span className="font-medium">Stock resultante</span>
              <span className="font-bold text-lg">{resultingStock} {item.unidad}</span>
            </div>
          )}

          <div>
            <label className="label">Nota (opcional)</label>
            <input className="input text-sm" placeholder="Ej. Compra a proveedor, uso en consulta..."
              value={nota} onChange={e => setNota(e.target.value)} />
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
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ══ Punto de venta modal ══ */
const METODOS_PAGO = [
  { id: 'efectivo',     label: 'Efectivo',     icon: Banknote    },
  { id: 'tarjeta',      label: 'Tarjeta',      icon: CreditCard  },
  { id: 'transferencia',label: 'Transferencia',icon: Smartphone  },
]

function SaleModal({ items, onClose, onSaved }) {
  const { doctor }       = useAuthStore()
  const { activeClinic } = useClinicStore()
  const [cart, setCart]    = useState([])         // [{ item, cantidad }]
  const [search, setSearch]= useState('')
  const [descuento, setDesc]= useState('')
  const [metodo, setMetodo]= useState('efectivo')
  const [notas, setNotas]  = useState('')
  const [saving, setSaving]= useState(false)
  const [error, setError]  = useState('')
  const [done, setDone]    = useState(false)
  const [lastSale, setLastSale] = useState(null)

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
    // Insert sale
    const { data: sale, error: e1 } = await supabase.from('sales').insert([{
      doctor_id:   did,
      clinic_id:   activeClinic?.id || null,
      total,
      descuento:   desc,
      metodo_pago: metodo,
      notas:       notas.trim() || null,
    }]).select().single()
    if (e1) { setError(e1.message); setSaving(false); return }

    // Insert sale items
    const saleItems = cart.map(r => ({
      sale_id:    sale.id,
      item_id:    r.item.id,
      nombre:     r.item.nombre,
      cantidad:   r.cantidad,
      precio_unit: r.item.precio_unitario || 0,
      subtotal:   (r.item.precio_unitario || 0) * r.cantidad,
    }))
    const { error: e2 } = await supabase.from('sale_items').insert(saleItems)
    if (e2) { setError(e2.message); setSaving(false); return }

    // Deduct stock
    await Promise.all(cart.map(r =>
      supabase.from('inventory_items')
        .update({ stock_actual: Math.max(0, r.item.stock_actual - r.cantidad) })
        .eq('id', r.item.id)
    ))

    setLastSale({ ...sale, items: saleItems })
    setDone(true)
    setSaving(false)
    onSaved()
  }

  if (done && lastSale) return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
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
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
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

        <div className="p-6 space-y-5">
          {/* Buscador de productos */}
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
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-violet-50 transition-colors text-left border-b border-slate-50 last:border-0">
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
                      className="w-14 text-center border border-slate-200 rounded-lg py-1 text-sm font-semibold focus:outline-none focus:border-violet-300" />
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
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
              <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Busca y agrega productos</p>
            </div>
          )}

          {/* Descuento y totales */}
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
                      metodo === m.id ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}>
                    <m.icon className="w-4 h-4" />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          {cart.length > 0 && (
            <div>
              <label className="label">Notas (opcional)</label>
              <input className="input text-sm" placeholder="Paciente, motivo de compra..."
                value={notas} onChange={e => setNotas(e.target.value)} />
            </div>
          )}

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

/* ══ Historial de ventas ══ */
function SalesHistory({ doctorId }) {
  const [sales, setSales]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!doctorId) return
    supabase.from('sales')
      .select('*, sale_items(*)')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { setSales(data || []); setLoading(false) })
  }, [doctorId])

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
  if (sales.length === 0) return (
    <div className="text-center py-10 text-slate-400 text-sm">Sin ventas registradas</div>
  )

  return (
    <div className="space-y-2">
      {sales.map(sale => (
        <div key={sale.id} className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">
                {sale.sale_items?.map(i => `${i.nombre} ×${i.cantidad}`).join(', ')}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Clock className="w-3 h-3 text-slate-300" />
                <span className="text-xs text-slate-400">
                  {new Date(sale.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-xs text-slate-400">· {METODOS_PAGO.find(m => m.id === sale.metodo_pago)?.label}</span>
                {sale.notas && <span className="text-xs text-slate-400 truncate max-w-[150px]">· {sale.notas}</span>}
              </div>
            </div>
          </div>
          <span className="text-sm font-bold text-green-600">{fmt(sale.total)}</span>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════ */
export default function InventoryPage() {
  const { doctor }          = useAuthStore()
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [tableExists, setTableExists] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [showBajos, setShowBajos] = useState(false)
  const [itemModal, setItemModal]   = useState(null)  // null | 'new' | item object
  const [movModal, setMovModal]     = useState(null)  // null | { item, tipo }
  const [saleModal, setSaleModal]   = useState(false)
  const [salesKey, setSalesKey]     = useState(0)
  const loadedOnce = useRef(false)

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    if (!loadedOnce.current) setLoading(true)
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('activo', true)
        .order('nombre')
      if (error) {
        if (error.message.includes('does not exist') || error.code === '42P01') {
          setTableExists(false)
        }
        return
      }
      setItems(data || [])
    } finally {
      setLoading(false)
      loadedOnce.current = true
    }
  }

  const handleDelete = async (id) => {
    await supabase.from('inventory_items').update({ activo: false }).eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const filtered = useMemo(() => {
    let result = items
    if (showBajos)  result = result.filter(i => i.stock_actual <= i.stock_minimo)
    if (catFilter)  result = result.filter(i => i.categoria === catFilter)
    if (search)     result = result.filter(i => i.nombre.toLowerCase().includes(search.toLowerCase()))
    return result
  }, [items, search, catFilter, showBajos])

  const bajosCount = items.filter(i => i.stock_actual <= i.stock_minimo).length
  const totalValue = items.reduce((s, i) => s + ((i.stock_actual || 0) * (i.precio_unitario || 0)), 0)
  const cats = [...new Set(items.map(i => i.categoria))]

  if (!tableExists) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventario</h1>
          <p className="text-slate-400 text-sm mt-0.5">Control de medicamentos e insumos</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="font-semibold text-amber-800 mb-2">Módulo pendiente de activar</p>
          <p className="text-sm text-amber-700 mb-4">
            Ejecuta la migración <span className="font-mono font-bold">011_inventory.sql</span> en Supabase → SQL Editor para habilitar el inventario.
          </p>
          <pre className="text-xs bg-amber-100 text-amber-900 rounded-xl p-4 text-left inline-block">
{`-- supabase/migrations/011_inventory.sql
-- (ya está en tu repositorio, solo córrela en Supabase)`}
          </pre>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventario</h1>
          <p className="text-slate-400 text-sm mt-0.5">Control de medicamentos e insumos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSaleModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm">
            <ShoppingCart className="w-4 h-4" /> Nueva venta
          </button>
          <button onClick={() => setItemModal('new')}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Nuevo producto
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total productos', value: loading ? '—' : items.length,      color: 'bg-violet-50 text-violet-600' },
          { label: 'Stock bajo',      value: loading ? '—' : bajosCount,         color: 'bg-red-50 text-red-600',     onClick: () => { setShowBajos(!showBajos); setCatFilter('') } },
          { label: 'Categorías',      value: loading ? '—' : cats.length,        color: 'bg-blue-50 text-blue-600'    },
          { label: 'Valor total',     value: loading ? '—' : fmt(totalValue),    color: 'bg-green-50 text-green-600'  },
        ].map(({ label, value, color, onClick }) => (
          <div key={label} onClick={onClick}
            className={cn('bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between', onClick && 'cursor-pointer hover:shadow-sm transition-shadow')}>
            <div>
              <p className="text-sm text-slate-500">{label}</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
            </div>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
              <Package className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Alert for low stock */}
      {bajosCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            <span className="font-semibold">{bajosCount} producto{bajosCount !== 1 ? 's' : ''} con stock bajo o agotado.</span>
            {' '}
            <button onClick={() => setShowBajos(true)} className="underline hover:no-underline">Ver cuáles</button>
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9 text-sm py-2 w-full" placeholder="Buscar producto..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Categoria chips */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setCatFilter(''); setShowBajos(false) }}
            className={cn('px-3 py-1.5 text-xs rounded-xl font-semibold border transition-all',
              !catFilter && !showBajos ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}>
            Todos
          </button>
          <button onClick={() => { setShowBajos(!showBajos); setCatFilter('') }}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl font-semibold border transition-all',
              showBajos ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}>
            <AlertTriangle className="w-3 h-3" /> Stock bajo
          </button>
          {CATEGORIAS.filter(c => cats.includes(c)).map(c => (
            <button key={c} onClick={() => { setCatFilter(catFilter === c ? '' : c); setShowBajos(false) }}
              className={cn('px-3 py-1.5 text-xs rounded-xl font-semibold border transition-all',
                catFilter === c ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}>
              {CAT_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading && !loadedOnce.current ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-slate-600 font-medium">
            {items.length === 0 ? 'Sin productos en el inventario' : 'Sin resultados para estos filtros'}
          </p>
          {items.length === 0 && (
            <button onClick={() => setItemModal('new')}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold mx-auto hover:bg-violet-700 transition-colors">
              <Plus className="w-4 h-4" /> Agregar primer producto
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Producto', 'Categoría', 'Stock', 'Mínimo', 'Unidad', 'Precio unit.', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const st = stockStatus(item)
                  return (
                    <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{item.nombre}</p>
                        {item.descripcion && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.descripcion}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', CAT_COLOR[item.categoria] || CAT_COLOR.otro)}>
                          {CAT_LABEL[item.categoria] || item.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={cn('flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full', st.cls)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                            {item.stock_actual}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{item.stock_minimo}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{item.unidad}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-700">
                        {item.precio_unitario != null ? fmt(item.precio_unitario) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setMovModal({ item, tipo: 'entrada' })}
                            title="Entrada"
                            className="flex items-center gap-1 text-xs text-green-600 hover:bg-green-50 px-2 py-1.5 rounded-lg transition-colors font-semibold">
                            <TrendingUp className="w-3.5 h-3.5" /> +
                          </button>
                          <button onClick={() => setMovModal({ item, tipo: 'salida' })}
                            title="Salida"
                            className="flex items-center gap-1 text-xs text-red-500 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors font-semibold">
                            <TrendingDown className="w-3.5 h-3.5" /> −
                          </button>
                          <button onClick={() => setItemModal(item)}
                            title="Editar"
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>{filtered.length} producto{filtered.length !== 1 ? 's' : ''}</span>
            <span>Valor total en stock: <span className="font-semibold text-slate-600 ml-1">{fmt(totalValue)}</span></span>
          </div>
        </div>
      )}

      {/* Historial de ventas */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-green-600" />
          <h2 className="font-semibold text-slate-700 text-sm">Últimas ventas</h2>
        </div>
        <div className="p-4">
          <SalesHistory key={salesKey} doctorId={doctor?.id} />
        </div>
      </div>

      {/* Modals */}
      {itemModal && (
        <ItemModal
          item={itemModal === 'new' ? null : itemModal}
          onClose={() => setItemModal(null)}
          onSaved={() => { setItemModal(null); fetchItems() }}
        />
      )}
      {movModal && (
        <MovementModal
          item={movModal.item}
          tipo={movModal.tipo}
          onClose={() => setMovModal(null)}
          onSaved={() => { setMovModal(null); fetchItems() }}
        />
      )}
      {saleModal && (
        <SaleModal
          items={items}
          onClose={() => setSaleModal(false)}
          onSaved={() => { setSaleModal(false); fetchItems(); setSalesKey(k => k + 1) }}
        />
      )}
    </div>
  )
}
