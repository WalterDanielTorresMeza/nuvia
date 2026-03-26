import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { Loader2, Save, Check, User, Stethoscope, Phone, Mail, Hash, Shield } from 'lucide-react'

function Field({ label, icon: Icon, ...props }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 block mb-1.5">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon className="w-4 h-4 text-slate-400" />
          </div>
        )}
        <input
          className={`input w-full ${Icon ? 'pl-9' : ''}`}
          {...props}
        />
      </div>
    </div>
  )
}

export default function ConfigPage() {
  const { doctor, fetchDoctor } = useAuthStore()
  const [form, setForm]     = useState({ nombre: '', apellidos: '', especialidad: '', cedula: '', telefono: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState('')

  // Password change
  const [pwForm, setPwForm] = useState({ nueva: '', confirmar: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg]   = useState('')

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
    if (!form.nombre.trim() || !form.apellidos.trim()) {
      setError('Nombre y apellidos son requeridos.')
      return
    }
    setSaving(true)
    setError('')
    const { error: dbErr } = await supabase
      .from('doctors')
      .update({
        nombre:       form.nombre.trim(),
        apellidos:    form.apellidos.trim(),
        especialidad: form.especialidad.trim() || null,
        cedula:       form.cedula.trim()       || null,
        telefono:     form.telefono.trim()     || null,
      })
      .eq('id', doctor.id)

    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }

    // Refresh doctor in store
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) await fetchDoctor(session.user.id)

    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handlePassword = async (e) => {
    e.preventDefault()
    if (pwForm.nueva.length < 6)        { setPwMsg('error:La contraseña debe tener al menos 6 caracteres.'); return }
    if (pwForm.nueva !== pwForm.confirmar) { setPwMsg('error:Las contraseñas no coinciden.'); return }

    setPwSaving(true)
    setPwMsg('')
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

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configuración</h1>
        <p className="text-slate-400 text-sm mt-0.5">Gestión de tu perfil y cuenta</p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <User className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-slate-700">Perfil del médico</h2>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Avatar preview */}
          <div className="flex items-center gap-4 pb-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center text-white font-bold text-xl shadow-sm">
              {form.nombre?.[0]?.toUpperCase()}{form.apellidos?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-800">Dr. {form.nombre} {form.apellidos}</p>
              <p className="text-sm text-slate-400">{form.especialidad || 'Sin especialidad'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre *"       icon={User}        value={form.nombre}       onChange={e => set('nombre', e.target.value)}       placeholder="Walter" />
            <Field label="Apellidos *"    icon={User}        value={form.apellidos}    onChange={e => set('apellidos', e.target.value)}    placeholder="Torres Meza" />
            <Field label="Especialidad"  icon={Stethoscope}  value={form.especialidad} onChange={e => set('especialidad', e.target.value)} placeholder="Medicina General" />
            <Field label="Cédula prof."  icon={Hash}         value={form.cedula}       onChange={e => set('cedula', e.target.value)}       placeholder="12345678" />
            <Field label="Teléfono"      icon={Phone}        value={form.telefono}     onChange={e => set('telefono', e.target.value)}     placeholder="+52 55 0000 0000" type="tel" />
            <Field label="Correo"        icon={Mail}         value={form.email}        disabled placeholder={form.email || 'correo@ejemplo.com'} className="opacity-60 cursor-not-allowed" />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end pt-1">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>

      {/* Password change */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-slate-700">Cambiar contraseña</h2>
        </div>

        <form onSubmit={handlePassword} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">Nueva contraseña</label>
              <input type="password" className="input w-full" placeholder="Mínimo 6 caracteres"
                value={pwForm.nueva} onChange={e => setPwForm(f => ({ ...f, nueva: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">Confirmar contraseña</label>
              <input type="password" className="input w-full" placeholder="Repite la contraseña"
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
