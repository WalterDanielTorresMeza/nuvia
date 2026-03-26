import { useState, useEffect } from 'react'
import { usePatientsStore } from '../../store/patientsStore'
import { Save, Loader2, FileText, Edit2 } from 'lucide-react'
import { formatFechaHora } from '../../utils'

const FIELDS = [
  { key: 'antec_familiares',         label: 'Antecedentes familiares',          placeholder: 'Diabetes, hipertensión, cáncer, enfermedades hereditarias...' },
  { key: 'antec_patologicos',        label: 'Antecedentes patológicos',          placeholder: 'Enfermedades previas, cirugías, hospitalizaciones, traumatismos...' },
  { key: 'antec_no_patologicos',     label: 'Antecedentes no patológicos',       placeholder: 'Tabaquismo, alcoholismo, toxicomanías, actividad física, alimentación...' },
  { key: 'antec_gineco_obstetricos', label: 'Antecedentes gineco-obstétricos',   placeholder: 'Menarca, ciclos, gestas, partos, cesáreas, abortos, FUM...' },
  { key: 'antec_perinatales',        label: 'Antecedentes perinatales',          placeholder: 'Tipo de parto, peso al nacer, semanas de gestación, complicaciones...' },
  { key: 'antec_postnatales',        label: 'Antecedentes postnatales',          placeholder: 'Lactancia, desarrollo psicomotor, enfermedades de la infancia...' },
  { key: 'antec_psiquiatricos',      label: 'Antecedentes psiquiátricos',        placeholder: 'Depresión, ansiedad, trastornos, tratamientos psiquiátricos previos...' },
  { key: 'alergias',                 label: 'Alergias',                          placeholder: 'Medicamentos, alimentos, sustancias, tipo de reacción...' },
]

export default function BackgroundTab({ patient }) {
  const { upsertBackground, fetchPatient } = usePatientsStore()
  const bg = patient.clinical_background || {}
  const [editing, setEditing] = useState(!bg.id)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    antec_familiares: bg.antec_familiares || '',
    antec_patologicos: bg.antec_patologicos || '',
    antec_no_patologicos: bg.antec_no_patologicos || '',
    antec_gineco_obstetricos: bg.antec_gineco_obstetricos || '',
    antec_perinatales: bg.antec_perinatales || '',
    antec_postnatales: bg.antec_postnatales || '',
    antec_psiquiatricos: bg.antec_psiquiatricos || '',
    alergias: bg.alergias || '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setLoading(true)
    await upsertBackground(patient.id, form)
    await fetchPatient(patient.id)
    setLoading(false)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-700">Antecedentes clínicos</h2>
        <div className="flex items-center gap-3">
          {bg.updated_at && !editing && (
            <span className="text-xs text-slate-400">
              Actualizado: {formatFechaHora(bg.updated_at)}
            </span>
          )}
          {saved && (
            <span className="text-xs text-emerald-600 font-medium">✓ Guardado correctamente</span>
          )}
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-secondary">
              <Edit2 className="w-4 h-4" /> Editar
            </button>
          ) : (
            <button onClick={handleSave} disabled={loading} className="btn-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {FIELDS.map(({ key, label, placeholder }) => {
          const val = form[key]
          const isEmpty = !val?.trim()
          return (
            <div key={key} className={key === 'alergias' ? 'lg:col-span-2' : ''}>
              {editing ? (
                <div>
                  <label className="label">{label}</label>
                  <textarea
                    rows={key === 'alergias' ? 3 : 4}
                    className="input resize-none"
                    placeholder={placeholder}
                    value={val}
                    onChange={e => set(key, e.target.value)}
                  />
                </div>
              ) : (
                <div className="card p-4">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</div>
                  {isEmpty ? (
                    <p className="text-sm text-slate-400 italic">Sin registrar</p>
                  ) : (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{val}</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!bg.id && !editing && (
        <div className="card p-12 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No hay antecedentes registrados</p>
          <button onClick={() => setEditing(true)} className="btn-primary mt-4 mx-auto">
            Registrar antecedentes
          </button>
        </div>
      )}
    </div>
  )
}
