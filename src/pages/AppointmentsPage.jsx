import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { usePatientsStore } from '../store/patientsStore'
import {
  Plus, Loader2, Calendar, X, AlertTriangle
} from 'lucide-react'
import { FaStethoscope, FaVideo, FaTriangleExclamation } from 'react-icons/fa6'
import { cn } from '../utils'

const ESTADOS = ['programada','confirmada','completada','cancelada','no_asistio']

const ESTADO_STYLE = {
  programada:  { cls: 'bg-blue-100 text-blue-700',   label: 'Programada'  },
  confirmada:  { cls: 'bg-green-100 text-green-700',  label: 'Confirmada'  },
  completada:  { cls: 'bg-slate-100 text-slate-600',  label: 'Completada'  },
  cancelada:   { cls: 'bg-red-100 text-red-600',      label: 'Cancelada'   },
  no_asistio:  { cls: 'bg-amber-100 text-amber-700',  label: 'No asistió'  },
}

const TIPO_ICON = {
  presencial:    <FaStethoscope className="w-3.5 h-3.5" />,
  videoconsulta: <FaVideo className="w-3.5 h-3.5" />,
  urgencia:      <FaTriangleExclamation className="w-3.5 h-3.5" />,
}

/* ── Detects if two appointments overlap ── */
function detectsConflict(existing, newStart, newEnd) {
  const aptStart = new Date(existing.fecha_hora)
  const aptEnd   = new Date(aptStart.getTime() + (existing.duracion_min || 30) * 60000)
  return aptStart < newEnd && aptEnd > newStart
}

/* ══════════════════════════════════════════════ */
export default function AppointmentsPage() {
  const { doctor }                   = useAuthStore()
  const { patients, fetchPatients }  = usePatientsStore()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading]        = useState(true)
  const [showModal, setShowModal]    = useState(false)
  const [filter, setFilter]          = useState('hoy')

  // Only fetch patients once if the list is empty
  useEffect(() => {
    if (patients.length === 0) fetchPatients()
  }, [])

  const fetchData = useCallback(async () => {
    if (!doctor?.id) return
    setLoading(true)

    let query = supabase
      .from('appointments')
      .select('*, patients(nombre, apellidos, telefono, tipo_sangre)')
      .eq('doctor_id', doctor.id)
      .order('fecha_hora')

    const now  = new Date()
    const hoy  = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (filter === 'hoy') {
      const fin = new Date(hoy.getTime() + 86399999)
      query = query.gte('fecha_hora', hoy.toISOString()).lte('fecha_hora', fin.toISOString())
    } else if (filter === 'semana') {
      const lunes = new Date(hoy)
      lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))
      const domingo = new Date(lunes)
      domingo.setDate(lunes.getDate() + 6)
      domingo.setHours(23, 59, 59, 999)
      query = query.gte('fecha_hora', lunes.toISOString()).lte('fecha_hora', domingo.toISOString())
    } else if (filter === 'mes') {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      const fin    = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999)
      query = query.gte('fecha_hora', inicio.toISOString()).lte('fecha_hora', fin.toISOString())
    }

    const { data } = await query
    setAppointments(data || [])
    setLoading(false)
  }, [doctor?.id, filter])

  useEffect(() => { fetchData() }, [fetchData])

  const updateEstado = async (id, estado) => {
    await supabase.from('appointments').update({ estado }).eq('id', id)
    fetchData()
  }

  // Group by date for display
  const grouped = appointments.reduce((acc, apt) => {
    const key = new Date(apt.fecha_hora).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!acc[key]) acc[key] = []
    acc[key].push(apt)
    return acc
  }, {})

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agenda</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {loading ? 'Cargando...' : `${appointments.length} cita${appointments.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nueva cita
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[['hoy','Hoy'],['semana','Esta semana'],['mes','Este mes'],['todas','Todas']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={cn(
              'px-4 py-2 text-sm rounded-xl font-medium transition-colors',
              filter === val
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>

      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-slate-600 font-medium">No hay citas para este período</p>
          <p className="text-slate-400 text-sm mt-1">Crea una nueva cita con el botón de arriba</p>
        </div>

      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, apts]) => (
            <div key={date}>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 capitalize">{date}</h2>
              <div className="space-y-2">
                {apts.map(apt => {
                  const st = ESTADO_STYLE[apt.estado] || ESTADO_STYLE.programada
                  const hora = new Date(apt.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                  const horaFin = new Date(new Date(apt.fecha_hora).getTime() + apt.duracion_min * 60000)
                    .toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <div key={apt.id}
                      className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">

                      {/* Time block */}
                      <div className="flex-shrink-0 text-center w-16">
                        <p className="text-base font-bold text-slate-800">{hora}</p>
                        <p className="text-xs text-slate-400">{horaFin}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{apt.duracion_min} min</p>
                      </div>

                      <div className="w-px h-12 bg-slate-100 flex-shrink-0" />

                      {/* Patient + info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-slate-800 text-sm">
                            {apt.patients?.nombre} {apt.patients?.apellidos}
                          </span>
                          <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-medium', st.cls)}>
                            {st.label}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            {TIPO_ICON[apt.tipo]}
                            <span className="capitalize">{apt.tipo}</span>
                          </span>
                        </div>
                        {apt.motivo && (
                          <p className="text-xs text-slate-500 truncate">{apt.motivo}</p>
                        )}
                        {apt.patients?.telefono && (
                          <p className="text-xs text-slate-400 mt-0.5">📱 {apt.patients.telefono}</p>
                        )}
                      </div>

                      {/* Estado selector */}
                      <select
                        value={apt.estado}
                        onChange={e => updateEstado(apt.id, e.target.value)}
                        className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-600 flex-shrink-0 focus:outline-none focus:border-primary-300"
                      >
                        {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_STYLE[e]?.label || e}</option>)}
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <NewAppointmentModal
          patients={patients}
          doctorId={doctor?.id}
          existingAppointments={appointments}
          onClose={() => setShowModal(false)}
          onSaved={fetchData}
        />
      )}
    </div>
  )
}

/* ══ NewAppointmentModal ═══════════════════════ */
export function NewAppointmentModal({ patients, doctorId, existingAppointments = [], preselectedPatientId = null, onClose, onSaved }) {
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [conflict, setConflict] = useState(null)
  const [form, setForm] = useState({
    patient_id:   preselectedPatientId || '',
    fecha_hora:   '',
    duracion_min: '30',
    tipo:         'presencial',
    estado:       'programada',
    motivo:       '',
    notas:        '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Check conflicts on date/duration change
  const checkConflict = (fechaHora, duracion) => {
    if (!fechaHora || !doctorId) { setConflict(null); return }
    const newStart = new Date(fechaHora)
    const newEnd   = new Date(newStart.getTime() + parseInt(duracion || 30) * 60000)
    const found    = existingAppointments.find(apt =>
      apt.estado !== 'cancelada' && apt.estado !== 'no_asistio' &&
      detectsConflict(apt, newStart, newEnd)
    )
    setConflict(found || null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!doctorId) { setError('No se encontró el perfil del médico. Recarga la página.'); return }
    if (conflict) { setError('Hay un conflicto de horario con otra cita. Cambia la fecha u hora.'); return }

    setSaving(true)
    setError('')
    const { error: dbErr } = await supabase.from('appointments').insert([{
      patient_id:   form.patient_id,
      doctor_id:    doctorId,
      fecha_hora:   form.fecha_hora,
      duracion_min: parseInt(form.duracion_min),
      tipo:         form.tipo,
      estado:       form.estado,
      motivo:       form.motivo || null,
      notas:        form.notas  || null,
    }])
    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    onSaved?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-50 rounded-xl flex items-center justify-center">
              <Calendar className="w-4 h-4 text-primary-500" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Nueva cita</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Patient */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Paciente *</label>
            <select className="input" value={form.patient_id} onChange={e => set('patient_id', e.target.value)} required
              disabled={!!preselectedPatientId}>
              <option value="">Seleccionar paciente...</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>
              ))}
            </select>
          </div>

          {/* Date + Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">Fecha y hora *</label>
              <input type="datetime-local" className="input" value={form.fecha_hora}
                onChange={e => { set('fecha_hora', e.target.value); checkConflict(e.target.value, form.duracion_min) }}
                required />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">Duración</label>
              <select className="input" value={form.duracion_min}
                onChange={e => { set('duracion_min', e.target.value); checkConflict(form.fecha_hora, e.target.value) }}>
                {[15,20,30,45,60,90].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>

          {/* Conflict warning */}
          {conflict && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-700">Conflicto de horario</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Ya tienes una cita con {conflict.patients?.nombre} {conflict.patients?.apellidos} a las{' '}
                  {new Date(conflict.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  {' '}({conflict.duracion_min} min). Cambia la fecha u hora.
                </p>
              </div>
            </div>
          )}

          {/* Tipo + Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">Tipo</label>
              <select className="input" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                <option value="presencial">Presencial</option>
                <option value="videoconsulta">Videoconsulta</option>
                <option value="urgencia">Urgencia</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">Estado inicial</label>
              <select className="input" value={form.estado} onChange={e => set('estado', e.target.value)}>
                <option value="programada">Programada</option>
                <option value="confirmada">Confirmada</option>
              </select>
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Motivo</label>
            <input className="input" placeholder="Consulta general, seguimiento, revisión..."
              value={form.motivo} onChange={e => set('motivo', e.target.value)} />
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Notas adicionales</label>
            <textarea rows={2} className="input resize-none" placeholder="Indicaciones previas, documentos a traer..."
              value={form.notas} onChange={e => set('notas', e.target.value)} />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !!conflict}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Guardando...' : 'Guardar cita'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
