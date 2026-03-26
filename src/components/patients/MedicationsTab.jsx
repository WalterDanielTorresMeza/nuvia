import { useState } from 'react'
import { usePatientsStore } from '../../store/patientsStore'
import { Plus, Loader2, Pill, CheckCircle, XCircle } from 'lucide-react'
import { formatFecha } from '../../utils'

export default function MedicationsTab({ patient }) {
  const { addMedication, updateMedication, fetchPatient } = usePatientsStore()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const meds = patient.medications || []
  const activos = meds.filter(m => m.activo)
  const inactivos = meds.filter(m => !m.activo)

  const [form, setForm] = useState({
    nombre: '', dosis: '', frecuencia: '', via: '', inicio: '', fin: '', notas: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await addMedication({ ...form, patient_id: patient.id, activo: true })
    await fetchPatient(patient.id)
    setLoading(false)
    setShowForm(false)
    setForm({ nombre: '', dosis: '', frecuencia: '', via: '', inicio: '', fin: '', notas: '' })
  }

  const toggleActivo = async (med) => {
    await updateMedication(med.id, { activo: !med.activo })
    await fetchPatient(patient.id)
  }

  const vias = ['Oral', 'Intravenosa', 'Intramuscular', 'Subcutánea', 'Tópica', 'Inhalatoria', 'Sublingual', 'Otra']

  const MedCard = ({ med }) => (
    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${med.activo ? 'bg-emerald-100' : 'bg-slate-200'}`}>
        <Pill className={`w-4 h-4 ${med.activo ? 'text-emerald-600' : 'text-slate-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-800 text-sm">{med.nombre}</div>
        <div className="text-xs text-slate-500 mt-0.5 space-x-2">
          {med.dosis && <span>💊 {med.dosis}</span>}
          {med.frecuencia && <span>🔄 {med.frecuencia}</span>}
          {med.via && <span>📍 {med.via}</span>}
        </div>
        {(med.inicio || med.fin) && (
          <div className="text-xs text-slate-400 mt-1">
            {med.inicio && `Inicio: ${formatFecha(med.inicio)}`}
            {med.fin && ` · Fin: ${formatFecha(med.fin)}`}
          </div>
        )}
        {med.notas && <div className="text-xs text-slate-400 mt-1 italic">{med.notas}</div>}
      </div>
      <button
        onClick={() => toggleActivo(med)}
        title={med.activo ? 'Marcar como inactivo' : 'Activar'}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
      >
        {med.activo
          ? <XCircle className="w-4 h-4 text-red-400 hover:text-red-600" />
          : <CheckCircle className="w-4 h-4 text-emerald-400 hover:text-emerald-600" />
        }
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-700">Medicamentos</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" /> Agregar medicamento
        </button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h3 className="font-medium text-slate-700 mb-4">Nuevo medicamento</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Nombre del medicamento *</label>
                <input className="input" placeholder="Metformina 850mg" value={form.nombre} onChange={e => set('nombre', e.target.value)} required />
              </div>
              <div>
                <label className="label">Dosis</label>
                <input className="input" placeholder="850 mg" value={form.dosis} onChange={e => set('dosis', e.target.value)} />
              </div>
              <div>
                <label className="label">Frecuencia</label>
                <input className="input" placeholder="Cada 12 horas" value={form.frecuencia} onChange={e => set('frecuencia', e.target.value)} />
              </div>
              <div>
                <label className="label">Vía de administración</label>
                <select className="input" value={form.via} onChange={e => set('via', e.target.value)}>
                  <option value="">Seleccionar</option>
                  {vias.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Fecha de inicio</label>
                <input type="date" className="input" value={form.inicio} onChange={e => set('inicio', e.target.value)} />
              </div>
              <div>
                <label className="label">Fecha de fin</label>
                <input type="date" className="input" value={form.fin} onChange={e => set('fin', e.target.value)} />
              </div>
              <div>
                <label className="label">Notas</label>
                <input className="input" placeholder="Tomar con alimentos..." value={form.notas} onChange={e => set('notas', e.target.value)} />
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

      {activos.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Medicamentos activos ({activos.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activos.map(m => <MedCard key={m.id} med={m} />)}
          </div>
        </div>
      )}

      {inactivos.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-3">Historial ({inactivos.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-60">
            {inactivos.map(m => <MedCard key={m.id} med={m} />)}
          </div>
        </div>
      )}

      {meds.length === 0 && !showForm && (
        <div className="card p-12 text-center">
          <Pill className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No hay medicamentos registrados</p>
        </div>
      )}
    </div>
  )
}
