import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import {
  Loader2, Save, Check, User, Stethoscope, Phone, Mail,
  Hash, Shield, MapPin, Building2, Plus, Pencil, Trash2,
  Star, X, ChevronRight,
} from 'lucide-react'

/* ── Preset colors for clinics ── */
const COLORS = [
  '#0ea5e9','#0284c7','#7c3aed','#059669','#d97706',
  '#dc2626','#db2777','#0891b2','#65a30d','#ea580c',
]

function Field({ label, icon: Icon, ...props }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        {Icon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"><Icon className="w-4 h-4 text-slate-400" /></div>}
        <input className={`input ${Icon ? 'pl-10' : ''}`} {...props} />
      </div>
    </div>
  )
}

/* ── Clinic modal (add / edit) ── */
function ClinicModal({ initial, onSave, onClose }) {
  const blank = { nombre: '', direccion: '', ciudad: '', telefono: '', color: COLORS[0] }
  const [form, setForm] = useState(initial || blank)
  const [saving, setSaving] = useState(false)
  const s = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.nombre.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{initial ? 'Editar consultorio' : 'Agregar consultorio'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Color picker */}
          <div>
            <label className="label">Color identificador</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => s('color', c)}
                  className="w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                  style={{ backgroundColor: c }}>
                  {form.color === c && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          <Field label="Nombre del consultorio *" icon={Building2}
            value={form.nombre} onChange={e => s('nombre', e.target.value)}
            placeholder="Consultorio Norte" />

          <Field label="Dirección" icon={MapPin}
            value={form.direccion || ''} onChange={e => s('direccion', e.target.value)}
            placeholder="Av. Insurgentes 100, Col. Centro" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ciudad" icon={MapPin}
              value={form.ciudad || ''} onChange={e => s('ciudad', e.target.value)}
              placeholder="Ciudad de México" />
            <Field label="Teléfono" icon={Phone}
              value={form.telefono || ''} onChange={e => s('telefono', e.target.value)}
              placeholder="+52 55 1234 5678" type="tel" />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !form.nombre.trim()} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Clinics section ── */
function ClinicsSection({ doctorId }) {
  const [clinics, setClinics]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)   // null | 'new' | clinic-object
  const [deleting, setDeleting]   = useState(null)
  const [clinicErr, setClinicErr] = useState('')

  useEffect(() => { fetchClinics() }, [doctorId])

  const fetchClinics = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('clinics')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('activo', true)
      .order('principal', { ascending: false })
      .order('created_at')
    setClinics(data || [])
    setLoading(false)
  }

  const handleSave = async (form) => {
    setClinicErr('')
    let err
    if (modal === 'new') {
      const { error } = await supabase.from('clinics').insert([{ ...form, doctor_id: doctorId }])
      err = error
    } else {
      const { error } = await supabase.from('clinics').update({
        nombre: form.nombre, direccion: form.direccion,
        ciudad: form.ciudad, telefono: form.telefono, color: form.color,
      }).eq('id', modal.id)
      err = error
    }
    if (err) {
      // Common: table doesn't exist yet (migration not run)
      const msg = err.code === '42P01'
        ? 'La tabla de consultorios no existe. Ejecuta la migración 006_clinics.sql en Supabase SQL Editor.'
        : err.message
      setClinicErr(msg)
      return
    }
    setModal(null)
    fetchClinics()
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    await supabase.from('clinics').update({ activo: false }).eq('id', id)
    setClinics(c => c.filter(x => x.id !== id))
    setDeleting(null)
  }

  const setPrincipal = async (clinic) => {
    // Unset all, then set this one
    await supabase.from('clinics').update({ principal: false }).eq('doctor_id', doctorId)
    await supabase.from('clinics').update({ principal: true }).eq('id', clinic.id)
    setClinics(c => c.map(x => ({ ...x, principal: x.id === clinic.id })))
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-700">Mis consultorios</h2>
            {clinics.length > 0 && (
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{clinics.length}</span>
            )}
          </div>
          <button onClick={() => setModal('new')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold transition-colors">
            <Plus className="w-3.5 h-3.5" /> Agregar
          </button>
        </div>

        <div className="p-6">
          {clinicErr && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 leading-relaxed">
              ⚠ {clinicErr}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : clinics.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-slate-600 font-medium text-sm">Sin consultorios registrados</p>
              <p className="text-slate-400 text-xs mt-1 mb-4">Agrega los consultorios donde atiendes pacientes</p>
              <button onClick={() => setModal('new')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" /> Agregar consultorio
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {clinics.map(c => (
                <div key={c.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all group">

                  {/* Color dot */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-sm"
                       style={{ backgroundColor: c.color || '#0ea5e9' }}>
                    {c.nombre[0]?.toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800 truncate">{c.nombre}</p>
                      {c.principal && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-amber-700 bg-amber-50 border border-amber-100">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Principal
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {c.direccion && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {c.direccion}{c.ciudad ? `, ${c.ciudad}` : ''}
                        </span>
                      )}
                      {c.telefono && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {c.telefono}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {!c.principal && (
                      <button onClick={() => setPrincipal(c)} title="Marcar como principal"
                        className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all">
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => setModal(c)}
                      className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                      {deleting === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}

              <p className="text-xs text-slate-400 pt-2 flex items-center gap-1.5">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                Hover sobre un consultorio para ver opciones · La estrella marca el consultorio principal
              </p>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <ClinicModal
          initial={modal === 'new' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}

/* ══════════════════════════════════════════ */
export default function ConfigPage() {
  const { doctor, fetchDoctor } = useAuthStore()
  const [form, setForm]     = useState({ nombre: '', apellidos: '', especialidad: '', cedula: '', telefono: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState('')

  const [pwForm, setPwForm]   = useState({ nueva: '', confirmar: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg]     = useState('')

  useEffect(() => {
    if (doctor) {
      setForm({
        nombre:       doctor.nombre       || '',
        apellidos:    doctor.apellidos    || '',
        especialidad: doctor.especialidad || '',
        cedula:       doctor.cedula       || '',
        telefono:     doctor.telefono     || '',
        email:        doctor.email        || '',
      })
    }
  }, [doctor])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.apellidos.trim()) { setError('Nombre y apellidos son requeridos.'); return }
    setSaving(true); setError('')
    const { error: dbErr } = await supabase
      .from('doctors')
      .update({ nombre: form.nombre.trim(), apellidos: form.apellidos.trim(), especialidad: form.especialidad.trim() || null, cedula: form.cedula.trim() || null, telefono: form.telefono.trim() || null })
      .eq('id', doctor.id)
    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) await fetchDoctor(session.user.id)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handlePassword = async (e) => {
    e.preventDefault()
    if (pwForm.nueva.length < 6)           { setPwMsg('error:La contraseña debe tener al menos 6 caracteres.'); return }
    if (pwForm.nueva !== pwForm.confirmar)  { setPwMsg('error:Las contraseñas no coinciden.'); return }
    setPwSaving(true); setPwMsg('')
    const { error } = await supabase.auth.updateUser({ password: pwForm.nueva })
    setPwSaving(false)
    if (error) { setPwMsg(`error:${error.message}`); return }
    setPwMsg('ok:Contraseña actualizada correctamente.')
    setPwForm({ nueva: '', confirmar: '' })
  }

  const pwIsError = pwMsg.startsWith('error:')
  const pwText    = pwMsg.replace(/^(ok|error):/, '')

  return (
    <div className="space-y-8 max-w-2xl">

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configuración</h1>
        <p className="text-slate-400 text-sm mt-0.5">Gestión de tu perfil, consultorios y cuenta</p>
      </div>

      {/* ── Profile ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <User className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-slate-700">Perfil del médico</h2>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="flex items-center gap-4 pb-1">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-sm"
                 style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
              {form.nombre?.[0]?.toUpperCase()}{form.apellidos?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-800">Dr. {form.nombre} {form.apellidos}</p>
              <p className="text-sm text-slate-400">{form.especialidad || 'Sin especialidad'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre *"      icon={User}        value={form.nombre}       onChange={e => set('nombre', e.target.value)}       placeholder="Walter" />
            <Field label="Apellidos *"   icon={User}        value={form.apellidos}    onChange={e => set('apellidos', e.target.value)}    placeholder="Torres Meza" />
            <Field label="Especialidad"  icon={Stethoscope}  value={form.especialidad} onChange={e => set('especialidad', e.target.value)} placeholder="Medicina General" />
            <Field label="Cédula prof."  icon={Hash}         value={form.cedula}       onChange={e => set('cedula', e.target.value)}       placeholder="12345678" />
            <Field label="Teléfono"      icon={Phone}        value={form.telefono}     onChange={e => set('telefono', e.target.value)}     placeholder="+52 55 0000 0000" type="tel" />
            <Field label="Correo"        icon={Mail}         value={form.email}        disabled placeholder={form.email} />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

          <div className="flex justify-end pt-1">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Clinics ── */}
      {doctor?.id && <ClinicsSection doctorId={doctor.id} />}

      {/* ── Password ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-slate-700">Cambiar contraseña</h2>
        </div>
        <form onSubmit={handlePassword} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nueva contraseña</label>
              <input type="password" className="input" placeholder="Mínimo 6 caracteres"
                value={pwForm.nueva} onChange={e => setPwForm(f => ({ ...f, nueva: e.target.value }))} />
            </div>
            <div>
              <label className="label">Confirmar contraseña</label>
              <input type="password" className="input" placeholder="Repite la contraseña"
                value={pwForm.confirmar} onChange={e => setPwForm(f => ({ ...f, confirmar: e.target.value }))} />
            </div>
          </div>
          {pwMsg && (
            <p className={`text-xs px-3 py-2 rounded-xl border ${pwIsError ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-700'}`}>
              {pwText}
            </p>
          )}
          <div className="flex justify-end">
            <button type="submit" disabled={pwSaving || !pwForm.nueva}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-700 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors">
              {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              {pwSaving ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </div>
        </form>
      </div>

      {/* App info */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
        <p className="text-sm font-semibold text-slate-600">Nuvia — Gestión Médica</p>
        <p className="text-xs text-slate-400 mt-1">Versión 1.0 · Desarrollado con Supabase + React</p>
      </div>

    </div>
  )
}
