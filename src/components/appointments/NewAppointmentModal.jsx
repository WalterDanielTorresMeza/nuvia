import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Calendar, X, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '../../utils'

function detectsConflict(existing, newStart, newEnd) {
  const s = new Date(existing.fecha_hora)
  const e = new Date(s.getTime() + (existing.duracion_min || 30) * 60000)
  return s < newEnd && e > newStart
}

export default function NewAppointmentModal({
  patients, doctorId, existingAppointments = [],
  clinics = [], activeClinic = null,
  preselectedPatientId = null, defaultTipo = 'presencial', onClose, onSaved,
}) {
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [conflict, setConflict] = useState(null)
  const [form, setForm] = useState({
    patient_id:   preselectedPatientId || '',
    fecha_hora:   '',
    duracion_min: '30',
    tipo:         defaultTipo,
    estado:       'programada',
    motivo:       '',
    notas:        '',
    clinic_id:    activeClinic?.id || '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const checkConflict = (fechaHora, duracion) => {
    if (!fechaHora) { setConflict(null); return }
    const newStart = new Date(fechaHora)
    const newEnd   = new Date(newStart.getTime() + parseInt(duracion || 30) * 60000)
    setConflict(existingAppointments.find(a =>
      a.estado !== 'cancelada' && a.estado !== 'no_asistio' && detectsConflict(a, newStart, newEnd)
    ) || null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.patient_id) { setError('Selecciona un paciente.'); return }
    if (!form.fecha_hora) { setError('Selecciona fecha y hora.'); return }
    if (conflict)         { setError('Hay un conflicto de horario. Cambia la fecha u hora.'); return }
    setSaving(true); setError('')

    let did = doctorId
    if (!did) {
      const { data: doc } = await supabase.from('doctors').select('id').single()
      did = doc?.id
    }
    if (!did) { setError('No se encontró el perfil del médico.'); setSaving(false); return }

    // Build payload — omit clinic_id if empty to avoid schema cache errors
    const payload = {
      patient_id:   form.patient_id,
      doctor_id:    did,
      fecha_hora:   new Date(form.fecha_hora).toISOString(),
      duracion_min: parseInt(form.duracion_min),
      tipo:         form.tipo,
      estado:       form.estado,
      motivo:       form.motivo || null,
      notas:        form.notas  || null,
    }
    if (form.clinic_id) payload.clinic_id = form.clinic_id

    const { error: dbErr } = await supabase.from('appointments').insert([payload])
    setSaving(false)
    if (dbErr) {
      // If clinic_id column doesn't exist yet, retry without it
      if (dbErr.message.includes('clinic_id')) {
        delete payload.clinic_id
        const { error: retryErr } = await supabase.from('appointments').insert([payload])
        if (retryErr) { setError(retryErr.message); return }
        onSaved?.(); onClose(); return
      }
      setError(dbErr.message); return
    }
    onSaved?.(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
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
          {clinics.length > 0 && (
            <div>
              <label className="label">Consultorio</label>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => set('clinic_id', '')}
                  className={cn('px-3 py-1.5 text-xs rounded-xl font-semibold border transition-all',
                    !form.clinic_id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}>
                  Sin asignar
                </button>
                {clinics.map(c => (
                  <button key={c.id} type="button" onClick={() => set('clinic_id', c.id)}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl font-semibold border transition-all',
                      form.clinic_id === c.id ? 'text-white border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}
                    style={form.clinic_id === c.id ? { background: c.color } : {}}>
                    <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />{c.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label">Paciente *</label>
            <select className="input" value={form.patient_id} onChange={e => set('patient_id', e.target.value)} required disabled={!!preselectedPatientId}>
              <option value="">Seleccionar paciente...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha y hora *</label>
              <input type="datetime-local" className="input" value={form.fecha_hora}
                onChange={e => { set('fecha_hora', e.target.value); checkConflict(e.target.value, form.duracion_min) }} required />
            </div>
            <div>
              <label className="label">Duración</label>
              <select className="input" value={form.duracion_min}
                onChange={e => { set('duracion_min', e.target.value); checkConflict(form.fecha_hora, e.target.value) }}>
                {[15,20,30,45,60,90].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>

          {conflict && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Conflicto con cita de {conflict.patients?.nombre} {conflict.patients?.apellidos} a las{' '}
                {new Date(conflict.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                <option value="presencial">Presencial</option>
                <option value="videoconsulta">Videoconsulta</option>
                <option value="urgencia">Urgencia</option>
              </select>
            </div>
            <div>
              <label className="label">Estado inicial</label>
              <select className="input" value={form.estado} onChange={e => set('estado', e.target.value)}>
                <option value="programada">Programada</option>
                <option value="confirmada">Confirmada</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Motivo</label>
            <input className="input" placeholder="Consulta general, seguimiento, revisión..."
              value={form.motivo} onChange={e => set('motivo', e.target.value)} />
          </div>

          <div>
            <label className="label">Notas adicionales</label>
            <textarea rows={2} className="input resize-none" placeholder="Indicaciones previas, documentos a traer..."
              value={form.notas} onChange={e => set('notas', e.target.value)} />
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
            <button type="submit" disabled={saving || !!conflict}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Guardando...' : 'Guardar cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
