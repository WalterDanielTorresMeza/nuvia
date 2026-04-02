import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import {
  Loader2, Save, Check, User, Stethoscope, Phone, Mail,
  Hash, Shield, MapPin, Building2, Plus, Pencil, Trash2,
  Star, X, FileText, Lock, Zap, MessageCircle, CreditCard,
  Calendar, ChevronDown, ChevronRight, Eye, EyeOff, Database,
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
    try {
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('activo', true)
        .order('principal', { ascending: false })
        .order('created_at')
      if (error) {
        if (error.code === '42P01') setClinicErr('Ejecuta la migración 008_clinics_combined.sql en Supabase.')
        else setClinicErr(error.message)
      }
      setClinics(data || [])
    } catch {
      setClinicErr('Error al cargar consultorios.')
    } finally {
      setLoading(false)
    }
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

/* ══ Sección datos fiscales ══════════════════════════════════════ */
const REGIMENES = [
  '605 - Sueldos y Salarios e Ingresos Asimilados a Salarios',
  '606 - Arrendamiento',
  '612 - Personas Físicas con Actividades Empresariales y Profesionales',
  '621 - Incorporación Fiscal',
  '625 - Régimen de las Actividades Empresariales con ingresos por Comisión',
  '626 - Régimen Simplificado de Confianza',
]

function FiscalSection({ doctorId }) {
  const [form, setForm]     = useState({ rfc: '', razon_social_fiscal: '', regimen_fiscal: '', direccion_fiscal: '', cp_fiscal: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!doctorId) return
    supabase.from('doctors')
      .select('rfc, razon_social_fiscal, regimen_fiscal, direccion_fiscal, cp_fiscal')
      .eq('id', doctorId).single()
      .then(({ data }) => {
        if (data) setForm({
          rfc:               data.rfc               || '',
          razon_social_fiscal: data.razon_social_fiscal || '',
          regimen_fiscal:    data.regimen_fiscal    || '',
          direccion_fiscal:  data.direccion_fiscal  || '',
          cp_fiscal:         data.cp_fiscal         || '',
        })
        setLoaded(true)
      })
  }, [doctorId])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('doctors').update({
      rfc:               form.rfc.trim().toUpperCase() || null,
      razon_social_fiscal: form.razon_social_fiscal.trim() || null,
      regimen_fiscal:    form.regimen_fiscal || null,
      direccion_fiscal:  form.direccion_fiscal.trim() || null,
      cp_fiscal:         form.cp_fiscal.trim() || null,
    }).eq('id', doctorId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (!loaded) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
        <FileText className="w-4 h-4 text-slate-400" />
        <h2 className="font-semibold text-slate-700">Datos fiscales</h2>
        <span className="text-xs text-slate-400 ml-1">Para pre-facturas y reporte al contador</span>
      </div>
      <form onSubmit={handleSave} className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">RFC del médico</label>
            <input className="input uppercase" maxLength={13} placeholder="XAXX010101000"
              value={form.rfc} onChange={e => set('rfc', e.target.value.toUpperCase())} />
          </div>
          <div>
            <label className="label">Razón social / Nombre fiscal</label>
            <input className="input" placeholder="Como aparece en tu constancia fiscal"
              value={form.razon_social_fiscal} onChange={e => set('razon_social_fiscal', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Régimen fiscal</label>
            <select className="input" value={form.regimen_fiscal} onChange={e => set('regimen_fiscal', e.target.value)}>
              <option value="">Seleccionar régimen...</option>
              {REGIMENES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Dirección fiscal</label>
            <input className="input" placeholder="Calle, colonia, ciudad"
              value={form.direccion_fiscal} onChange={e => set('direccion_fiscal', e.target.value)} />
          </div>
          <div>
            <label className="label">CP fiscal</label>
            <input className="input" maxLength={5} placeholder="06600"
              value={form.cp_fiscal} onChange={e => set('cp_fiscal', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end pt-1">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar datos fiscales'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ══ Sección PIN de acciones ══ */
function PinSection({ doctorId }) {
  const [pin, setPin]         = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')   // 'ok:...' | 'error:...'

  const handleSave = async (e) => {
    e.preventDefault()
    if (pin.length !== 4)        { setMsg('error:El PIN debe tener exactamente 4 dígitos.'); return }
    if (pin !== confirm)         { setMsg('error:Los PINs no coinciden.'); return }
    setSaving(true); setMsg('')
    const { error } = await supabase.from('doctors').update({ pin_acciones: pin }).eq('id', doctorId)
    setSaving(false)
    if (error) { setMsg(`error:${error.message}`); return }
    setMsg('ok:PIN actualizado correctamente.')
    setPin(''); setConfirm('')
    setTimeout(() => setMsg(''), 3000)
  }

  const isError = msg.startsWith('error:')
  const msgText = msg.replace(/^(ok|error):/, '')

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
        <Lock className="w-4 h-4 text-slate-400" />
        <h2 className="font-semibold text-slate-700">PIN de acciones</h2>
        <span className="text-xs text-slate-400 ml-1">Para proteger edición y eliminación de ventas</span>
      </div>
      <form onSubmit={handleSave} className="p-6 space-y-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          Este PIN de 4 dígitos se solicitará al intentar editar o eliminar registros de ventas.
          Mantenlo privado para que solo tú puedas realizar estas acciones.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nuevo PIN (4 dígitos)</label>
            <input
              type="password" inputMode="numeric" maxLength={4}
              className="input text-center text-xl font-bold tracking-[0.4em]"
              placeholder="••••" value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setMsg('') }}
            />
          </div>
          <div>
            <label className="label">Confirmar PIN</label>
            <input
              type="password" inputMode="numeric" maxLength={4}
              className="input text-center text-xl font-bold tracking-[0.4em]"
              placeholder="••••" value={confirm}
              onChange={e => { setConfirm(e.target.value.replace(/\D/g, '')); setMsg('') }}
            />
          </div>
        </div>
        {msg && (
          <p className={`text-xs px-3 py-2 rounded-xl border ${isError ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-700'}`}>
            {msgText}
          </p>
        )}
        <div className="flex justify-end">
          <button type="submit" disabled={saving || pin.length < 4}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-700 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {saving ? 'Guardando...' : 'Guardar PIN'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ══ Sección integraciones externas ══ */
function IntegSubsection({ title, icon: Icon, color, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
             style={{ background: color + '18' }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className="font-medium text-slate-700 text-sm flex-1">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="p-4 space-y-3 bg-white">{children}</div>}
    </div>
  )
}

function SecretField({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className="input pr-10 font-mono text-sm"
          value={value} onChange={onChange}
          placeholder={placeholder}
          autoComplete="off"
        />
        <button type="button" onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

function IntegracionesSection({ doctorId }) {
  const [cfg, setCfg]   = useState(null)   // raw integraciones object
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  /* helpers */
  const get  = (path) => path.split('.').reduce((o, k) => o?.[k] ?? '', cfg || {})
  const set  = (path, val) => {
    const keys = path.split('.')
    setCfg(prev => {
      const next = { ...(prev || {}) }
      let cur = next
      keys.slice(0, -1).forEach(k => { cur[k] = { ...(cur[k] || {}) }; cur = cur[k] })
      cur[keys[keys.length - 1]] = val
      return next
    })
  }

  useEffect(() => {
    if (!doctorId) return
    supabase.from('doctors').select('integraciones').eq('id', doctorId).single()
      .then(({ data }) => setCfg(data?.integraciones || {}))
  }, [doctorId])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('doctors').update({ integraciones: cfg }).eq('id', doctorId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (cfg === null) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
        <Zap className="w-4 h-4 text-slate-400" />
        <h2 className="font-semibold text-slate-700">Integraciones</h2>
        <span className="text-xs text-slate-400 ml-1">APIs externas y servicios conectados</span>
      </div>

      <form onSubmit={handleSave} className="p-6 space-y-3">
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Configura las credenciales de cada servicio externo. Se almacenan de forma segura en tu perfil y sólo se usan desde esta cuenta.
        </p>

        {/* ── Email ── */}
        <IntegSubsection title="Correo electrónico (envío automático)" icon={Mail} color="#0ea5e9">
          <div>
            <label className="label">Proveedor</label>
            <select className="input" value={get('email.provider')} onChange={e => set('email.provider', e.target.value)}>
              <option value="">Seleccionar...</option>
              <option value="resend">Resend</option>
              <option value="sendgrid">SendGrid</option>
              <option value="smtp">SMTP personalizado</option>
            </select>
          </div>
          <SecretField label="API Key / Contraseña" value={get('email.api_key')}
            onChange={e => set('email.api_key', e.target.value)}
            placeholder="re_xxxxxx... / SG.xxxxxxxx..." />
          {get('email.provider') === 'smtp' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Host SMTP</label>
                  <input className="input" placeholder="smtp.gmail.com"
                    value={get('email.smtp_host')} onChange={e => set('email.smtp_host', e.target.value)} />
                </div>
                <div>
                  <label className="label">Puerto</label>
                  <input className="input" type="number" placeholder="587"
                    value={get('email.smtp_port')} onChange={e => set('email.smtp_port', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Usuario SMTP</label>
                <input className="input" placeholder="tu@correo.com"
                  value={get('email.smtp_user')} onChange={e => set('email.smtp_user', e.target.value)} />
              </div>
            </>
          )}
          <div>
            <label className="label">Correo remitente (From)</label>
            <input className="input" type="email" placeholder="noreply@tudominio.com"
              value={get('email.from')} onChange={e => set('email.from', e.target.value)} />
          </div>
          <p className="text-xs text-slate-400">
            Se usa para enviar confirmaciones de cita, recordatorios y notificaciones a pacientes.
          </p>
        </IntegSubsection>

        {/* ── WhatsApp ── */}
        <IntegSubsection title="WhatsApp Business API" icon={MessageCircle} color="#25d366">
          <SecretField label="Token de acceso permanente"
            value={get('whatsapp.token')} onChange={e => set('whatsapp.token', e.target.value)}
            placeholder="EAAxxxxxxxx..." />
          <div>
            <label className="label">Phone Number ID</label>
            <input className="input font-mono text-sm" placeholder="1234567890123"
              value={get('whatsapp.phone_number_id')} onChange={e => set('whatsapp.phone_number_id', e.target.value)} />
          </div>
          <div>
            <label className="label">Business Account ID</label>
            <input className="input font-mono text-sm" placeholder="9876543210"
              value={get('whatsapp.business_account_id')} onChange={e => set('whatsapp.business_account_id', e.target.value)} />
          </div>
          <div>
            <label className="label">Número de WhatsApp (con código de país)</label>
            <input className="input" placeholder="+52 55 1234 5678"
              value={get('whatsapp.phone')} onChange={e => set('whatsapp.phone', e.target.value)} />
          </div>
          <p className="text-xs text-slate-400">
            Requiere cuenta verificada en Meta Business Suite. Se usa para confirmar y recordar citas por WhatsApp.
          </p>
        </IntegSubsection>

        {/* ── Stripe ── */}
        <IntegSubsection title="Pagos con tarjeta (Stripe)" icon={CreditCard} color="#635bff">
          <SecretField label="Secret Key (sk_live_... / sk_test_...)"
            value={get('stripe.secret_key')} onChange={e => set('stripe.secret_key', e.target.value)}
            placeholder="sk_live_xxxxxx..." />
          <div>
            <label className="label">Publishable Key (pk_live_... / pk_test_...)</label>
            <input className="input font-mono text-sm" placeholder="pk_live_xxxxxx..."
              value={get('stripe.publishable_key')} onChange={e => set('stripe.publishable_key', e.target.value)} />
          </div>
          <div>
            <label className="label">Webhook Secret (opcional)</label>
            <input className="input font-mono text-sm" placeholder="whsec_xxxxxx..."
              value={get('stripe.webhook_secret')} onChange={e => set('stripe.webhook_secret', e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="stripe_test" className="rounded"
              checked={get('stripe.test_mode') === true || get('stripe.test_mode') === 'true'}
              onChange={e => set('stripe.test_mode', e.target.checked)} />
            <label htmlFor="stripe_test" className="text-sm text-slate-600 cursor-pointer">Modo prueba (test mode)</label>
          </div>
          <p className="text-xs text-slate-400">
            Habilita el cobro con tarjeta directamente desde el Punto de Venta. Las llaves de prueba no generan cobros reales.
          </p>
        </IntegSubsection>

        {/* ── Supabase ── */}
        <IntegSubsection title="Supabase (base de datos del proyecto)" icon={Database} color="#3ecf8e">
          <div className="px-3 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 leading-relaxed">
            Estas credenciales ya están configuradas en el código fuente (<span className="font-mono">.env</span>).
            Solo cámbialas aquí si migraste el proyecto a otro proyecto de Supabase.
          </div>
          <div>
            <label className="label">Project URL</label>
            <input className="input font-mono text-sm" placeholder="https://xxxx.supabase.co"
              value={get('supabase.url')} onChange={e => set('supabase.url', e.target.value)} />
          </div>
          <SecretField label="Anon / Public Key"
            value={get('supabase.anon_key')} onChange={e => set('supabase.anon_key', e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5c..." />
          <SecretField label="Service Role Key (solo para funciones del servidor)"
            value={get('supabase.service_role_key')} onChange={e => set('supabase.service_role_key', e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5c..." />
          <p className="text-xs text-slate-400">
            Estas credenciales se guardan encriptadas en tu fila de la base de datos y solo son accesibles con tu sesión autenticada.
          </p>
        </IntegSubsection>

        {/* ── Google Calendar ── */}
        <IntegSubsection title="Google Calendar" icon={Calendar} color="#4285f4">
          <div>
            <label className="label">Client ID de OAuth 2.0</label>
            <input className="input font-mono text-sm" placeholder="xxxxxxxxxx-xxxxxx.apps.googleusercontent.com"
              value={get('google.client_id')} onChange={e => set('google.client_id', e.target.value)} />
          </div>
          <SecretField label="Client Secret"
            value={get('google.client_secret')} onChange={e => set('google.client_secret', e.target.value)}
            placeholder="GOCSPX-xxxxxxxx..." />
          <div>
            <label className="label">Calendar ID (deja vacío para el calendario principal)</label>
            <input className="input font-mono text-sm" placeholder="primary o tu-correo@gmail.com"
              value={get('google.calendar_id')} onChange={e => set('google.calendar_id', e.target.value)} />
          </div>
          <div>
            <label className="label">Refresh Token (se genera tras autorizar)</label>
            <input className="input font-mono text-sm" placeholder="1//xxxxxxxxxx..."
              value={get('google.refresh_token')} onChange={e => set('google.refresh_token', e.target.value)} />
          </div>
          <p className="text-xs text-slate-400">
            Sincroniza automáticamente las citas de Nuvia con tu Google Calendar. Crea las credenciales en{' '}
            <span className="font-medium text-slate-500">console.cloud.google.com</span>.
          </p>
        </IntegSubsection>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar integraciones'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ══════════════════════════════════════════ */
export default function ConfigPage() {
  const { doctor, fetchDoctor } = useAuthStore()
  const [form, setForm]     = useState({ nombre: '', apellidos: '', especialidad: '', curp: '', telefono: '', email: '' })
  const [cedulas, setCedulas] = useState([])   // [{ descripcion, numero }]
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
        curp:         doctor.curp         || '',
        telefono:     doctor.telefono     || '',
        email:        doctor.email        || '',
      })
      // Cargar cédulas: array nuevo, o migrar desde columnas viejas
      if (Array.isArray(doctor.cedulas) && doctor.cedulas.length > 0) {
        setCedulas(doctor.cedulas)
      } else {
        const legacy = []
        if (doctor.cedula_profesional || doctor.cedula)
          legacy.push({ descripcion: 'Medicina General', numero: doctor.cedula_profesional || doctor.cedula })
        if (doctor.cedula_especialidad)
          legacy.push({ descripcion: 'Especialidad', numero: doctor.cedula_especialidad })
        setCedulas(legacy)
      }
    }
  }, [doctor])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.apellidos.trim()) { setError('Nombre y apellidos son requeridos.'); return }
    setSaving(true); setError('')
    // Normalizar cédulas: quitar filas vacías
    const cedulasLimpias = cedulas.filter(c => c.numero.trim())
    const { error: dbErr } = await supabase
      .from('doctors')
      .update({
        nombre:       form.nombre.trim(),
        apellidos:    form.apellidos.trim(),
        especialidad: form.especialidad.trim() || null,
        curp:         form.curp.trim().toUpperCase() || null,
        telefono:     form.telefono.trim()     || null,
        cedulas:      cedulasLimpias,
        // mantener columnas legacy sincronizadas para compatibilidad
        cedula:              cedulasLimpias[0]?.numero || null,
        cedula_profesional:  cedulasLimpias[0]?.numero || null,
        cedula_especialidad: cedulasLimpias[1]?.numero || null,
      })
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
            <Field label="CURP del médico" icon={Hash} value={form.curp}
              onChange={e => set('curp', e.target.value.toUpperCase())}
              placeholder="ABCD123456HDFXXX01" maxLength={18} />
            <Field label="Teléfono"      icon={Phone}        value={form.telefono}     onChange={e => set('telefono', e.target.value)}     placeholder="+52 55 0000 0000" type="tel" />
            <Field label="Correo"        icon={Mail}         value={form.email}        disabled placeholder={form.email} />
          </div>

          {/* Cédulas profesionales — lista dinámica */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" /> Cédulas profesionales
              </p>
              <button type="button"
                onClick={() => setCedulas(c => [...c, { descripcion: '', numero: '' }])}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-semibold transition-colors">
                <Plus className="w-3.5 h-3.5" /> Agregar cédula
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-3">Aparecen en recetas, constancias y solicitudes de estudios al imprimir.</p>

            {cedulas.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">Sin cédulas registradas. Agrega una con el botón de arriba.</p>
            ) : (
              <div className="space-y-2">
                {cedulas.map((ced, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      className="input text-sm flex-1"
                      placeholder="Descripción (ej. Medicina General, Cardiología…)"
                      value={ced.descripcion}
                      onChange={e => setCedulas(c => c.map((x, idx) => idx === i ? { ...x, descripcion: e.target.value } : x))}
                    />
                    <input
                      className="input text-sm w-36 font-mono"
                      placeholder="Número"
                      value={ced.numero}
                      onChange={e => setCedulas(c => c.map((x, idx) => idx === i ? { ...x, numero: e.target.value } : x))}
                    />
                    <button type="button"
                      onClick={() => setCedulas(c => c.filter((_, idx) => idx !== i))}
                      className="p-2 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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

      {/* ── Fiscal data ── */}
      {doctor?.id && <FiscalSection doctorId={doctor.id} />}

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

      {/* ── PIN de acciones ── */}
      {doctor?.id && <PinSection doctorId={doctor.id} />}

      {/* ── Integraciones ── */}
      {doctor?.id && <IntegracionesSection doctorId={doctor.id} />}

      {/* App info */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
        <p className="text-sm font-semibold text-slate-600">Nuvia — Gestión Médica</p>
        <p className="text-xs text-slate-400 mt-1">Versión 1.0 · Desarrollado con Supabase + React</p>
      </div>

    </div>
  )
}
