import { useState } from 'react'
import { usePatientsStore } from '../../store/patientsStore'
import { Plus, Loader2, Syringe, AlertCircle } from 'lucide-react'
import { formatFecha } from '../../utils'

const VACUNAS_COMUNES = [
  'COVID-19','Influenza','Hepatitis A','Hepatitis B','Tétanos','Neumococo',
  'VPH','Sarampión/Rubéola','Varicela','Meningococo','Fiebre amarilla','Otra'
]

export default function VaccinesTab({ patient }) {
  const { addVaccine, fetchPatient } = usePatientsStore()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const vaccines = patient.vaccines || []

  const [form, setForm] = useState({
    nombre: '', fecha_aplicacion: '', lote: '',
    laboratorio: '', dosis_numero: '', proxima_dosis: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await addVaccine({ ...form, patient_id: patient.id })
    await fetchPatient(patient.id)
    setLoading(false)
    setShowForm(false)
    setForm({ nombre: '', fecha_aplicacion: '', lote: '', laboratorio: '', dosis_numero: '', proxima_dosis: '' })
  }

  const hoy = new Date()
  const proximas = vaccines.filter(v => v.proxima_dosis && new Date(v.proxima_dosis) > hoy)
  const vencidas = vaccines.filter(v => v.proxima_dosis && new Date(v.proxima_dosis) <= hoy)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-700">Vacunas</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" /> Registrar vacuna
        </button>
      </div>

      {proximas.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Dosis próximas pendientes</p>
            <ul className="text-sm text-amber-700 mt-1 space-y-0.5">
              {proximas.map(v => (
                <li key={v.id}>• {v.nombre} — {formatFecha(v.proxima_dosis)}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card p-6">
          <h3 className="font-medium text-slate-700 mb-4">Nueva vacuna</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Vacuna *</label>
                <select className="input" value={form.nombre} onChange={e => set('nombre', e.target.value)} required>
                  <option value="">Seleccionar vacuna</option>
                  {VACUNAS_COMUNES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Fecha de aplicación</label>
                <input type="date" className="input" value={form.fecha_aplicacion} onChange={e => set('fecha_aplicacion', e.target.value)} />
              </div>
              <div>
                <label className="label">Número de dosis</label>
                <input type="number" min="1" className="input" placeholder="1" value={form.dosis_numero} onChange={e => set('dosis_numero', e.target.value)} />
              </div>
              <div>
                <label className="label">Lote</label>
                <input className="input" placeholder="AB12345" value={form.lote} onChange={e => set('lote', e.target.value)} />
              </div>
              <div>
                <label className="label">Laboratorio</label>
                <input className="input" placeholder="Pfizer, AstraZeneca..." value={form.laboratorio} onChange={e => set('laboratorio', e.target.value)} />
              </div>
              <div>
                <label className="label">Próxima dosis</label>
                <input type="date" className="input" value={form.proxima_dosis} onChange={e => set('proxima_dosis', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {vaccines.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                {['Vacuna','Fecha aplicación','Dosis','Lote','Laboratorio','Próxima dosis'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vaccines.map(v => {
                const vencida = v.proxima_dosis && new Date(v.proxima_dosis) <= hoy
                return (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{v.nombre}</td>
                    <td className="px-4 py-3 text-slate-500">{formatFecha(v.fecha_aplicacion)}</td>
                    <td className="px-4 py-3 text-slate-500">{v.dosis_numero || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{v.lote || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{v.laboratorio || '—'}</td>
                    <td className="px-4 py-3">
                      {v.proxima_dosis ? (
                        <span className={vencida ? 'badge-red' : 'badge-amber'}>
                          {formatFecha(v.proxima_dosis)}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : !showForm && (
        <div className="card p-12 text-center">
          <Syringe className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No hay vacunas registradas</p>
        </div>
      )}
    </div>
  )
}
