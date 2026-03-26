import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { usePatientsStore } from '../../store/patientsStore'
import { Plus, Loader2, Salad } from 'lucide-react'
import { formatFecha } from '../../utils'

export default function DietTab({ patient }) {
  const { fetchPatient } = usePatientsStore()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const diets = patient.diets || []

  const [form, setForm] = useState({
    nutriologo: '', descripcion: '', calorias: '', restricciones: '', inicio: '', fin: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await supabase.from('diets').insert([{ ...form, patient_id: patient.id, activa: true }])
    await fetchPatient(patient.id)
    setLoading(false)
    setShowForm(false)
    setForm({ nutriologo: '', descripcion: '', calorias: '', restricciones: '', inicio: '', fin: '' })
  }

  const toggleActiva = async (diet) => {
    await supabase.from('diets').update({ activa: !diet.activa }).eq('id', diet.id)
    fetchPatient(patient.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-700">Dietas y nutrición</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" /> Agregar dieta
        </button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h3 className="font-medium text-slate-700 mb-4">Nueva dieta</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nutriólogo</label>
                <input className="input" placeholder="Nombre del nutriólogo" value={form.nutriologo} onChange={e => set('nutriologo', e.target.value)} />
              </div>
              <div>
                <label className="label">Calorías diarias (kcal)</label>
                <input type="number" className="input" placeholder="2000" value={form.calorias} onChange={e => set('calorias', e.target.value)} />
              </div>
              <div>
                <label className="label">Fecha de inicio</label>
                <input type="date" className="input" value={form.inicio} onChange={e => set('inicio', e.target.value)} />
              </div>
              <div>
                <label className="label">Fecha de fin</label>
                <input type="date" className="input" value={form.fin} onChange={e => set('fin', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">Descripción de la dieta</label>
                <textarea rows={3} className="input resize-none" placeholder="Descripción del plan alimenticio..." value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">Restricciones / alimentos prohibidos</label>
                <textarea rows={2} className="input resize-none" placeholder="Azúcar, harinas refinadas, lácteos..." value={form.restricciones} onChange={e => set('restricciones', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar dieta
              </button>
            </div>
          </form>
        </div>
      )}

      {diets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {diets.map(d => (
            <div key={d.id} className={`card p-5 ${!d.activa ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className={d.activa ? 'badge-green' : 'badge-gray'}>
                    {d.activa ? 'Activa' : 'Inactiva'}
                  </span>
                  {d.calorias && <span className="ml-2 text-sm text-slate-500">{d.calorias} kcal/día</span>}
                </div>
                <button onClick={() => toggleActiva(d)} className="text-xs text-slate-400 hover:text-slate-600">
                  {d.activa ? 'Desactivar' : 'Activar'}
                </button>
              </div>
              {d.nutriologo && <p className="text-sm font-medium text-slate-700 mb-1">Nutriólogo: {d.nutriologo}</p>}
              {d.descripcion && <p className="text-sm text-slate-600 mb-2">{d.descripcion}</p>}
              {d.restricciones && (
                <div className="text-xs text-red-600 bg-red-50 rounded-lg p-2">
                  <strong>Restricciones:</strong> {d.restricciones}
                </div>
              )}
              {(d.inicio || d.fin) && (
                <p className="text-xs text-slate-400 mt-2">
                  {d.inicio && formatFecha(d.inicio)} {d.fin && `→ ${formatFecha(d.fin)}`}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : !showForm && (
        <div className="card p-12 text-center">
          <Salad className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No hay dietas registradas</p>
        </div>
      )}
    </div>
  )
}
