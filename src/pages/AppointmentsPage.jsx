import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { usePatientsStore } from '../store/patientsStore'
import { Plus, Loader2, Calendar, Clock, User, X } from 'lucide-react'
import { formatFechaHora, formatFecha } from '../utils'

const ESTADOS = ['programada','confirmada','completada','cancelada','no_asistio']
const TIPOS = ['presencial','videoconsulta','urgencia']
const estadoColor = {
  programada: 'badge-blue', confirmada: 'badge-green',
  completada: 'badge-gray', cancelada: 'badge-red', no_asistio: 'badge-amber'
}

export default function AppointmentsPage() {
  const { doctor } = useAuthStore()
  const { patients, fetchPatients } = usePatientsStore()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('hoy')

  useEffect(() => { fetchData(); fetchPatients() }, [filter])

  const fetchData = async () => {
    setLoading(true)
    let query = supabase
      .from('appointments')
      .select('*, patients(nombre, apellidos, telefono)')
      .eq('doctor_id', doctor?.id)
      .order('fecha_hora')

    const hoy = new Date()
    if (filter === 'hoy') {
      const inicio = new Date(hoy.setHours(0,0,0,0)).toISOString()
      const fin = new Date(new Date().setHours(23,59,59,999)).toISOString()
      query = query.gte('fecha_hora', inicio).lte('fecha_hora', fin)
    } else if (filter === 'semana') {
      const lunes = new Date()
      lunes.setDate(lunes.getDate() - lunes.getDay() + 1)
      lunes.setHours(0,0,0,0)
      const domingo = new Date(lunes)
      domingo.setDate(domingo.getDate() + 6)
      domingo.setHours(23,59,59,999)
      query = query.gte('fecha_hora', lunes.toISOString()).lte('fecha_hora', domingo.toISOString())
    } else if (filter === 'mes') {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString()
      const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59).toISOString()
      query = query.gte('fecha_hora', inicio).lte('fecha_hora', fin)
    }

    const { data } = await query
    setAppointments(data || [])
    setLoading(false)
  }

  const updateEstado = async (id, estado) => {
    await supabase.from('appointments').update({ estado }).eq('id', id)
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agenda</h1>
          <p className="text-slate-500 text-sm mt-1">{appointments.length} citas</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Nueva cita
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[['hoy','Hoy'],['semana','Esta semana'],['mes','Este mes'],['todas','Todas']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              filter === val ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="card p-12 text-center">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay citas para este período</p>
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {appointments.map(apt => (
            <div key={apt.id} className="p-4 flex items-center gap-4">
              <div className="text-center w-14 flex-shrink-0">
                <div className="text-xs text-slate-400 uppercase">
                  {new Date(apt.fecha_hora).toLocaleDateString('es-MX', { month: 'short' })}
                </div>
                <div className="text-xl font-bold text-slate-800 leading-tight">
                  {new Date(apt.fecha_hora).getDate()}
                </div>
                <div className="text-xs font-medium text-primary-600">
                  {new Date(apt.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-800 text-sm">
                    {apt.patients?.nombre} {apt.patients?.apellidos}
                  </span>
                  <span className={estadoColor[apt.estado] || 'badge-gray'}>{apt.estado}</span>
                  <span className="badge-gray">{apt.tipo}</span>
                </div>
                {apt.motivo && <p className="text-xs text-slate-500 mt-0.5 truncate">{apt.motivo}</p>}
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {apt.duracion_min} min
                  </span>
                  {apt.patients?.telefono && (
                    <span className="text-xs text-slate-400">📱 {apt.patients.telefono}</span>
                  )}
                </div>
              </div>
              <select
                value={apt.estado}
                onChange={e => updateEstado(apt.id, e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600 flex-shrink-0"
              >
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      {showModal && <NewAppointmentModal patients={patients} doctorId={doctor?.id} onClose={() => setShowModal(false)} onSaved={fetchData} />}
    </div>
  )
}

function NewAppointmentModal({ patients, doctorId, onClose, onSaved }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    patient_id: '', fecha_hora: '', duracion_min: '30',
    tipo: 'presencial', estado: 'programada', motivo: '', notas: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await supabase.from('appointments').insert([{ ...form, doctor_id: doctorId }])
    setLoading(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Nueva cita</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Paciente *</label>
            <select className="input" value={form.patient_id} onChange={e => set('patient_id', e.target.value)} required>
              <option value="">Seleccionar paciente</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha y hora *</label>
              <input type="datetime-local" className="input" value={form.fecha_hora} onChange={e => set('fecha_hora', e.target.value)} required />
            </div>
            <div>
              <label className="label">Duración (min)</label>
              <select className="input" value={form.duracion_min} onChange={e => set('duracion_min', e.target.value)}>
                {[15,20,30,45,60,90].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Estado</label>
              <select className="input" value={form.estado} onChange={e => set('estado', e.target.value)}>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Motivo</label>
            <input className="input" placeholder="Consulta general, seguimiento..." value={form.motivo} onChange={e => set('motivo', e.target.value)} />
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea rows={2} className="input resize-none" value={form.notas} onChange={e => set('notas', e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar cita
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
