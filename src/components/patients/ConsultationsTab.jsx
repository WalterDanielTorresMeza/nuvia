import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { usePatientsStore } from '../../store/patientsStore'
import { useAuthStore } from '../../store/authStore'
import { Plus, Loader2, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { formatFechaHora } from '../../utils'

export default function ConsultationsTab({ patient }) {
  const { fetchPatient } = usePatientsStore()
  const { doctor } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const consultations = patient.consultations || []

  const [form, setForm] = useState({
    motivo: '', exploracion_fisica: '', diagnostico: '',
    diagnostico_cie10: '', plan_tratamiento: '', receta: '', proxima_cita: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('consultations').insert([{
      ...form,
      patient_id: patient.id,
      doctor_id: doctor?.id,
    }])
    setLoading(false)
    if (!error) {
      setShowForm(false)
      setForm({ motivo: '', exploracion_fisica: '', diagnostico: '', diagnostico_cie10: '', plan_tratamiento: '', receta: '', proxima_cita: '' })
      fetchPatient(patient.id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-700">Historial de consultas</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" /> Nueva consulta
        </button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h3 className="font-medium text-slate-700 mb-4">Registrar consulta</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Motivo de consulta *</label>
              <textarea rows={2} className="input resize-none" placeholder="Motivo por el que acude el paciente..." value={form.motivo} onChange={e => set('motivo', e.target.value)} required />
            </div>
            <div>
              <label className="label">Exploración física</label>
              <textarea rows={3} className="input resize-none" placeholder="Hallazgos en la exploración física..." value={form.exploracion_fisica} onChange={e => set('exploracion_fisica', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Diagnóstico</label>
                <textarea rows={2} className="input resize-none" placeholder="Diagnóstico clínico..." value={form.diagnostico} onChange={e => set('diagnostico', e.target.value)} />
              </div>
              <div>
                <label className="label">Código CIE-10</label>
                <input className="input" placeholder="E11.9, J06.9..." value={form.diagnostico_cie10} onChange={e => set('diagnostico_cie10', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Plan de tratamiento</label>
              <textarea rows={3} className="input resize-none" placeholder="Indicaciones, estudios solicitados, referidos..." value={form.plan_tratamiento} onChange={e => set('plan_tratamiento', e.target.value)} />
            </div>
            <div>
              <label className="label">Receta / Medicamentos prescritos</label>
              <textarea rows={3} className="input resize-none" placeholder="Medicamentos, dosis, duración..." value={form.receta} onChange={e => set('receta', e.target.value)} />
            </div>
            <div>
              <label className="label">Próxima cita</label>
              <input type="date" className="input" value={form.proxima_cita} onChange={e => set('proxima_cita', e.target.value)} />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar consulta
              </button>
            </div>
          </form>
        </div>
      )}

      {consultations.length > 0 ? (
        <div className="space-y-3">
          {consultations.map((c, i) => (
            <div key={c.id} className="card overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-primary-600" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-800 text-sm line-clamp-1">
                      {c.motivo || 'Consulta general'}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {formatFechaHora(c.fecha)}
                      {c.diagnostico_cie10 && ` · CIE-10: ${c.diagnostico_cie10}`}
                    </div>
                  </div>
                </div>
                {expanded === c.id
                  ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                }
              </button>

              {expanded === c.id && (
                <div className="border-t border-slate-100 p-4 space-y-4">
                  {[
                    { label: 'Motivo de consulta', value: c.motivo },
                    { label: 'Exploración física', value: c.exploracion_fisica },
                    { label: 'Diagnóstico', value: c.diagnostico },
                    { label: 'Plan de tratamiento', value: c.plan_tratamiento },
                    { label: 'Receta', value: c.receta },
                  ].map(({ label, value }) => value ? (
                    <div key={label}>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{value}</p>
                    </div>
                  ) : null)}
                  {c.proxima_cita && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 rounded-lg text-sm text-primary-700">
                      <Calendar className="w-3.5 h-3.5" />
                      Próxima cita: {new Date(c.proxima_cita).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !showForm && (
        <div className="card p-12 text-center">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No hay consultas registradas</p>
        </div>
      )}
    </div>
  )
}
