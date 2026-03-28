import { useEffect, useRef, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import {
  Plus, Search, X, Loader2, AlertTriangle, Package,
  TrendingUp, TrendingDown, RotateCcw, Edit2, ChevronDown,
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
        <button onClick={() => setItemModal('new')}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nuevo producto
        </button>
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
          onSaved={() => {
            setMovModal(null)
            fetchItems()
          }}
        />
      )}
    </div>
  )
}
