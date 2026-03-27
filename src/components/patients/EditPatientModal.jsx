import { useState } from 'react'
import { usePatientsStore } from '../../store/patientsStore'
import { X, Loader2, Save } from 'lucide-react'

export default function EditPatientModal({ patient, onClose }) {
  const { updatePatient } = usePatientsStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nombre: patient.nombre || '',
    apellidos: patient.apellidos || '',
    fecha_nacimiento: patient.fecha_nacimiento || '',
    curp: patient.curp || '',
    sexo: patient.sexo || '',
    tipo_sangre: patient.tipo_sangre || '',
    telefono: patient.telefono || '',
    email: patient.email || '',
    direccion: patient.direccion || '',
    rfc: patient.rfc || '',
    razon_social_factura: patient.razon_social_factura || '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await updatePatient(patient.id, form)
    setLoading(false)
    if (error) { setError(error); return }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-semibold text-slate-800">Editar paciente</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre *</label>
              <input className="input" value={form.nombre} onChange={e => set('nombre', e.target.value)} required />
            </div>
            <div>
              <label className="label">Apellidos *</label>
              <input className="input" value={form.apellidos} onChange={e => set('apellidos', e.target.value)} required />
            </div>
            <div>
              <label className="label">Fecha de nacimiento</label>
              <input type="date" className="input" value={form.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} />
            </div>
            <div>
              <label className="label">Sexo</label>
              <select className="input" value={form.sexo} onChange={e => set('sexo', e.target.value)}>
                <option value="">Seleccionar</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="label">Tipo de sangre</label>
              <select className="input" value={form.tipo_sangre} onChange={e => set('tipo_sangre', e.target.value)}>
                <option value="">Seleccionar</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">CURP</label>
              <input className="input uppercase" value={form.curp} onChange={e => set('curp', e.target.value.toUpperCase())} maxLength={18} />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input className="input" value={form.telefono} onChange={e => set('telefono', e.target.value)} />
            </div>
            <div>
              <label className="label">Correo electrónico</label>
              <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label">Dirección</label>
              <input className="input" value={form.direccion} onChange={e => set('direccion', e.target.value)} />
            </div>
          </div>

          {/* Datos fiscales */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Datos para factura (opcional)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">RFC del paciente</label>
                <input className="input uppercase" maxLength={13} placeholder="XAXX010101000"
                  value={form.rfc} onChange={e => set('rfc', e.target.value.toUpperCase())} />
              </div>
              <div>
                <label className="label">Razón social / Nombre fiscal</label>
                <input className="input" placeholder="Como aparece en su constancia"
                  value={form.razon_social_factura} onChange={e => set('razon_social_factura', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
