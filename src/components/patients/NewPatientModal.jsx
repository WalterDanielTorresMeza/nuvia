import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePatientsStore } from '../../store/patientsStore'
import { useAuthStore } from '../../store/authStore'
import { X, Loader2 } from 'lucide-react'

export default function NewPatientModal({ onClose }) {
  const { createPatient } = usePatientsStore()
  const { doctor } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nombre: '', apellidos: '', fecha_nacimiento: '', curp: '',
    sexo: '', tipo_sangre: '', telefono: '', email: '', direccion: ''
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre || !form.apellidos) { setError('Nombre y apellidos son requeridos'); return }
    setLoading(true)
    const { data, error } = await createPatient({ ...form, doctor_id: doctor?.id })
    setLoading(false)
    if (error) { setError(error); return }
    onClose()
    navigate(`/pacientes/${data.id}`)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-semibold text-slate-800">Nuevo paciente</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre *</label>
              <input className="input" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Juan" required />
            </div>
            <div>
              <label className="label">Apellidos *</label>
              <input className="input" value={form.apellidos} onChange={e => set('apellidos', e.target.value)} placeholder="Pérez García" required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
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
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">CURP</label>
            <input className="input uppercase" value={form.curp} onChange={e => set('curp', e.target.value.toUpperCase())} placeholder="PEGA123456HDFRRN01" maxLength={18} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Teléfono</label>
              <input className="input" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="55 1234 5678" />
            </div>
            <div>
              <label className="label">Correo electrónico</label>
              <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="paciente@email.com" />
            </div>
          </div>

          <div>
            <label className="label">Dirección</label>
            <input className="input" value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Calle, colonia, ciudad" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Guardando...' : 'Crear paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
