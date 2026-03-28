import { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { usePatientsStore } from '../../store/patientsStore'
import { useClinicStore } from '../../store/clinicStore'
import {
  X, Save, CheckCircle, Loader2, Plus, Trash2,
  Bold, Italic, List, ListOrdered,
  AlertCircle, Calendar, BookOpen, ChevronDown, ChevronUp,
  Stethoscope, Pill, FileText, Activity, ClipboardList, Printer
} from 'lucide-react'
import { cn } from '../../utils'
import BodyMap from './BodyMap'
import { CIE10 } from '../../data/cie10'

/* ── Mini rich-text toolbar ── */
function RichEditor({ editor }) {
  if (!editor) return null
  const B = ({ fn, active, title, children }) => (
    <button type="button" onMouseDown={e => { e.preventDefault(); fn() }} title={title}
      className={cn('p-1.5 rounded text-sm transition-colors',
        active ? 'bg-primary-100 text-primary-700' : 'text-slate-500 hover:bg-slate-100')}>
      {children}
    </button>
  )
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:border-primary-300 transition-colors">
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-slate-50 border-b border-slate-200">
        <B fn={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrita"><Bold className="w-3.5 h-3.5" /></B>
        <B fn={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Cursiva"><Italic className="w-3.5 h-3.5" /></B>
        <div className="w-px h-4 bg-slate-200 mx-0.5" />
        <B fn={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Título"><span className="text-xs font-bold px-0.5">H</span></B>
        <B fn={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista"><List className="w-3.5 h-3.5" /></B>
        <B fn={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numerada"><ListOrdered className="w-3.5 h-3.5" /></B>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

/* ── Section wrapper ── */
function Section({ icon: Icon, title, color = 'text-slate-600', children, collapsible = false }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => collapsible && setOpen(o => !o)}
        className={cn('w-full flex items-center justify-between px-5 py-4 border-b border-slate-100',
          collapsible ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default')}
      >
        <div className="flex items-center gap-2.5">
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100', color.replace('text-', 'text-'))}>
            <Icon className={cn('w-4 h-4', color)} />
          </div>
          <span className="font-semibold text-slate-700 text-sm">{title}</span>
        </div>
        {collapsible && (open
          ? <ChevronUp className="w-4 h-4 text-slate-400" />
          : <ChevronDown className="w-4 h-4 text-slate-400" />)}
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  )
}

/* ── Medication row ── */
function MedRow({ med, onChange, onDelete }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <input className="col-span-4 input text-sm py-2" placeholder="Medicamento" value={med.nombre} onChange={e => onChange({ ...med, nombre: e.target.value })} />
      <input className="col-span-2 input text-sm py-2" placeholder="Dosis" value={med.dosis} onChange={e => onChange({ ...med, dosis: e.target.value })} />
      <input className="col-span-3 input text-sm py-2" placeholder="Frecuencia" value={med.frecuencia} onChange={e => onChange({ ...med, frecuencia: e.target.value })} />
      <input className="col-span-2 input text-sm py-2 text-center" placeholder="Días" value={med.duracion} onChange={e => onChange({ ...med, duracion: e.target.value })} />
      <button onClick={onDelete} className="col-span-1 flex justify-center text-slate-300 hover:text-red-400 transition-colors">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

/* ── CIE-10 autocomplete input ── */
function CIE10Input({ value, onChange }) {
  const [query, setQuery]       = useState(value || '')
  const [open, setOpen]         = useState(false)
  const [results, setResults]   = useState([])
  const containerRef            = useRef(null)

  useEffect(() => {
    const q = query.trim().toLowerCase()
    if (!q) { setResults([]); return }
    const matches = CIE10.filter(item =>
      item.code.toLowerCase().startsWith(q) ||
      item.desc.toLowerCase().includes(q)
    ).slice(0, 8)
    setResults(matches)
    setOpen(matches.length > 0)
  }, [query])

  useEffect(() => {
    const handler = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = item => {
    setQuery(item.code)
    onChange(item.code)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        className="input font-mono text-sm"
        placeholder="E11.9, J06.9… o buscar por nombre"
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value.toUpperCase()) }}
        onFocus={() => results.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {results.map(item => (
            <button
              key={item.code}
              type="button"
              onMouseDown={() => select(item)}
              className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-primary-50 transition-colors"
            >
              <span className="font-mono text-xs text-primary-600 font-bold mt-0.5 w-14 flex-shrink-0">{item.code}</span>
              <span className="text-xs text-slate-700 leading-snug">{item.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Solicitud de estudios de imagen imprimible ── */
function PrintUltraSound({ form, patient, doctor, onClose }) {
  const [docFull, setDocFull] = useState(null)
  useEffect(() => {
    if (!doctor?.id) return
    supabase.from('doctors')
      .select('nombre, apellidos, especialidad, cedula_profesional, telefono')
      .eq('id', doctor.id).single()
      .then(({ data }) => { if (data) setDocFull(data) })
  }, [doctor?.id])
  const doc   = docFull || doctor
  const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
  const edad  = patient.fecha_nacimiento
    ? `${new Date().getFullYear() - new Date(patient.fecha_nacimiento).getFullYear()} años` : ''

  const estudios = [
    // Ultrasonidos
    { label: 'Ultrasonido abdominal completo' },
    { label: 'Ultrasonido pélvico / ginecológico' },
    { label: 'Ultrasonido obstétrico' },
    { label: 'Ultrasonido renal y vías urinarias' },
    { label: 'Ultrasonido tiroideo' },
    { label: 'Ultrasonido Doppler vascular' },
    { label: 'Ultrasonido musculoesquelético' },
    // Tomografías
    { label: 'Tomografía de cráneo (TC)' },
    { label: 'Tomografía de tórax (TC)' },
    { label: 'Tomografía de abdomen y pelvis (TC)' },
    { label: 'Tomografía de columna (TC)' },
    // Resonancias
    { label: 'Resonancia magnética (RM) de cerebro' },
    { label: 'Resonancia magnética (RM) de columna' },
    { label: 'Resonancia magnética (RM) de rodilla/cadera' },
    // Angiotomografía / Angiografía
    { label: 'Angiotomografía coronaria (AngioTC)' },
    { label: 'Angiotomografía pulmonar (AngioTC)' },
    { label: 'Angiografía cerebral' },
    // Otros
    { label: 'Radiografía de tórax (Rx)' },
    { label: 'Radiografía ósea / articular (Rx)' },
    { label: 'Densitometría ósea (DEXA)' },
    { label: 'Gammagrafía / Medicina nuclear' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-[60] p-4 overflow-y-auto"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4" onClick={e => e.stopPropagation()}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 print:hidden">
          <h2 className="font-bold text-slate-800">Solicitud de Estudios de Imagen</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors">
              <Printer className="w-4 h-4" /> Imprimir / PDF
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Printable content */}
        <div className="print-area p-8 space-y-5 print:p-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Dr. {doc?.nombre} {doc?.apellidos}</h1>
              {doc?.especialidad    && <p className="text-sm text-slate-500">{doc.especialidad}</p>}
              {doc?.cedula_profesional && <p className="text-sm text-slate-500">Cédula Prof.: {doc.cedula_profesional}</p>}
              {doc?.telefono        && <p className="text-sm text-slate-500">Tel.: {doc.telefono}</p>}
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Solicitud de Estudios de Imagen</p>
              <p className="text-sm text-slate-500 mt-1">{fecha}</p>
            </div>
          </div>

          <div className="h-px bg-slate-200" />

          {/* Paciente */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Paciente</p>
            <p className="font-semibold text-slate-800">{patient.nombre} {patient.apellidos}</p>
            <div className="flex gap-4 mt-1 flex-wrap">
              {edad         && <p className="text-sm text-slate-500">Edad: {edad}</p>}
              {patient.sexo && <p className="text-sm text-slate-500">Sexo: {patient.sexo === 'M' ? 'Masculino' : patient.sexo === 'F' ? 'Femenino' : patient.sexo}</p>}
            </div>
          </div>

          {/* Estudios a realizar */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Estudio(s) solicitado(s)</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {estudios.map(({ label }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 border-2 border-slate-400 rounded flex-shrink-0" />
                  <span className="text-xs text-slate-700">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2.5 mt-2">
              <div className="w-3.5 h-3.5 border-2 border-slate-400 rounded flex-shrink-0" />
              <span className="text-xs text-slate-500 flex-1">Otro:&nbsp;
                <span className="inline-block border-b border-slate-300 w-48" />
              </span>
            </div>
          </div>

          <div className="h-px bg-slate-200" />

          {/* Indicación clínica */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Indicación clínica / Diagnóstico presuntivo</p>
            {(form.diagnostico || form.diagnostico_cie10) ? (
              <p className="text-sm text-slate-700">
                {form.diagnostico_cie10 && <span className="font-mono text-slate-400 mr-2">{form.diagnostico_cie10}</span>}
                {form.diagnostico}
              </p>
            ) : (
              <div className="space-y-1">
                <div className="border-b border-slate-200 h-5 w-full" />
                <div className="border-b border-slate-200 h-5 w-full" />
              </div>
            )}
          </div>

          {/* Solicitudes adicionales del médico */}
          {form.solicitudes_lab && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Indicaciones adicionales</p>
              <p className="text-sm text-slate-700 whitespace-pre-line">{form.solicitudes_lab}</p>
            </div>
          )}

          {/* Firma */}
          <div className="flex justify-end pt-6">
            <div className="text-center min-w-[180px]">
              <div className="border-t border-slate-800 pt-2">
                <p className="text-sm font-medium text-slate-700">Dr. {doc?.nombre} {doc?.apellidos}</p>
                {doc?.cedula_profesional && <p className="text-xs text-slate-400">Céd. {doc.cedula_profesional}</p>}
                <p className="text-xs text-slate-400">Firma y sello</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-center text-slate-300 border-t border-slate-100 pt-3">
            Generado por Nuvia · Sistema de Gestión Médica
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── Receta imprimible ── */
function PrintReceta({ form, patient, doctor, onClose }) {
  const [docFull, setDocFull] = useState(null)
  useEffect(() => {
    if (!doctor?.id) return
    supabase.from('doctors')
      .select('nombre, apellidos, especialidad, cedula_profesional, telefono')
      .eq('id', doctor.id).single()
      .then(({ data }) => { if (data) setDocFull(data) })
  }, [doctor?.id])
  const doc   = docFull || doctor
  const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
  const meds  = form.medicamentos_receta || []
  const edad  = patient.fecha_nacimiento
    ? `${new Date().getFullYear() - new Date(patient.fecha_nacimiento).getFullYear()} años` : ''

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-[60] p-4 overflow-y-auto"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4" onClick={e => e.stopPropagation()}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 print:hidden">
          <h2 className="font-bold text-slate-800">Receta médica</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors">
              <Printer className="w-4 h-4" /> Imprimir / PDF
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Printable content */}
        <div className="print-area p-8 space-y-5 print:p-4">
          {/* Doctor */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Dr. {doc?.nombre} {doc?.apellidos}</h1>
              {doc?.especialidad && <p className="text-sm text-slate-500">{doc.especialidad}</p>}
              {doc?.cedula_profesional && <p className="text-sm text-slate-500">Cédula Prof.: {doc.cedula_profesional}</p>}
              {doc?.telefono && <p className="text-sm text-slate-500">Tel.: {doc.telefono}</p>}
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Receta Médica</p>
              <p className="text-sm text-slate-500 mt-1">{fecha}</p>
            </div>
          </div>

          <div className="h-px bg-slate-200" />

          {/* Paciente */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Paciente</p>
            <p className="font-semibold text-slate-800">{patient.nombre} {patient.apellidos}</p>
            <div className="flex gap-4 mt-1 flex-wrap">
              {edad && <p className="text-sm text-slate-500">Edad: {edad}</p>}
              {patient.sexo && <p className="text-sm text-slate-500">Sexo: {patient.sexo === 'M' ? 'Masculino' : patient.sexo === 'F' ? 'Femenino' : patient.sexo}</p>}
              {patient.tipo_sangre && <p className="text-sm text-red-500 font-medium">Tipo sangre: {patient.tipo_sangre}</p>}
            </div>
          </div>

          {/* Diagnóstico */}
          {(form.diagnostico || form.diagnostico_cie10) && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Diagnóstico</p>
              <p className="text-slate-700">
                {form.diagnostico_cie10 && <span className="font-mono text-slate-400 mr-2 text-sm">{form.diagnostico_cie10}</span>}
                {form.diagnostico}
              </p>
            </div>
          )}

          <div className="h-px bg-slate-200" />

          {/* Medicamentos */}
          <div>
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-4xl font-serif text-slate-600 leading-none">℞</span>
              <p className="text-sm font-semibold text-slate-500">Medicamentos prescritos</p>
            </div>
            {meds.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Sin medicamentos prescritos en esta consulta.</p>
            ) : (
              <div className="space-y-4">
                {meds.map((med, i) => (
                  <div key={i} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0">
                    <span className="text-sm font-bold text-slate-400 mt-0.5 w-5 text-right flex-shrink-0">{i + 1}.</span>
                    <div>
                      <p className="font-semibold text-slate-800">{med.nombre || '—'}</p>
                      <p className="text-sm text-slate-600 mt-0.5">
                        {[med.dosis, med.frecuencia, med.duracion ? `por ${med.duracion} días` : null]
                          .filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Indicaciones */}
          {form.instrucciones_medicas && !['<p></p>', '<p><br></p>'].includes(form.instrucciones_medicas) && (
            <>
              <div className="h-px bg-slate-200" />
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Indicaciones</p>
                <div className="text-sm text-slate-700 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: form.instrucciones_medicas }} />
              </div>
            </>
          )}

          {/* Próxima cita */}
          {form.proxima_cita && (
            <div className="flex items-center gap-2 text-sm bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
              <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <p className="text-blue-700">
                <span className="font-semibold">Próxima cita:</span>{' '}
                {new Date(form.proxima_cita + 'T12:00:00').toLocaleDateString('es-MX',
                  { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          )}

          {/* Firma */}
          <div className="flex justify-end pt-6">
            <div className="text-center min-w-[180px]">
              <div className="border-t border-slate-800 pt-2">
                <p className="text-sm font-medium text-slate-700">Dr. {doc?.nombre} {doc?.apellidos}</p>
                {doc?.cedula_profesional && <p className="text-xs text-slate-400">Céd. {doc.cedula_profesional}</p>}
                <p className="text-xs text-slate-400">Firma y sello</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-center text-slate-300 border-t border-slate-100 pt-3">
            Generado por Nuvia · Sistema de Gestión Médica
          </p>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════ */
export default function ConsultationModal({ patient, consultation, onClose, onSaved }) {
  const { doctor } = useAuthStore()
  const { clinics, activeClinic } = useClinicStore()
  usePatientsStore()
  const [saving, setSaving] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [consultId, setConsultId] = useState(consultation?.id || null)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showReceta, setShowReceta] = useState(false)
  const [showUltra,  setShowUltra]  = useState(false)

  const [form, setForm] = useState({
    motivo:                  consultation?.motivo || '',
    notas_padecimiento:      consultation?.notas_padecimiento || '',
    exploracion_fisica:      consultation?.exploracion_fisica || '',
    exploracion_topografica: consultation?.exploracion_topografica || {},
    diagnostico:             consultation?.diagnostico || '',
    diagnostico_cie10:       consultation?.diagnostico_cie10 || '',
    solicitudes_lab:         consultation?.solicitudes_lab || '',
    procedimientos:          consultation?.procedimientos || '',
    instrucciones_medicas:   consultation?.instrucciones_medicas || '',
    plan_tratamiento:        consultation?.plan_tratamiento || '',
    medicamentos_receta:     consultation?.medicamentos_receta || [],
    proxima_cita:            consultation?.proxima_cita || '',
    estado:                  consultation?.estado || 'activa',
    clinic_id:               consultation?.clinic_id || activeClinic?.id || '',
  })

  // Sync clinic_id when activeClinic loads (only for new consultations)
  useEffect(() => {
    if (!consultation?.id && activeClinic?.id && !form.clinic_id) {
      set('clinic_id', activeClinic.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClinic?.id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const makeEditor = (field, placeholder, minH = '120px') => useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder })],
    content: form[field],
    editorProps: { attributes: { class: `prose prose-sm max-w-none focus:outline-none px-3 py-2.5 text-slate-700 min-h-[${minH}]` } },
    onUpdate: ({ editor }) => set(field, editor.getHTML()),
  })

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const editorNotas   = makeEditor('notas_padecimiento', 'Describe el padecimiento actual, síntomas y evolución...', '150px')
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const editorExamen  = makeEditor('exploracion_fisica', 'Hallazgos generales de la exploración física...', '100px')
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const editorIndic   = makeEditor('instrucciones_medicas', 'Instrucciones médicas para el paciente...', '100px')
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const editorPlan    = makeEditor('plan_tratamiento', 'Plan de tratamiento a seguir...', '80px')

  // Resolve doctor ID — from auth store or fallback to DB query
  const resolveDoctorId = async () => {
    if (doctor?.id) return doctor.id
    const { data } = await supabase.from('doctors').select('id').single()
    return data?.id || null
  }

  const saveData = async (estado = form.estado) => {
    const doctorId = await resolveDoctorId()
    // Read directly from editor instances to avoid stale closure issues with async state
    const payload = {
      ...form,
      notas_padecimiento:    editorNotas?.getHTML()  ?? form.notas_padecimiento,
      exploracion_fisica:    editorExamen?.getHTML() ?? form.exploracion_fisica,
      instrucciones_medicas: editorIndic?.getHTML()  ?? form.instrucciones_medicas,
      plan_tratamiento:      editorPlan?.getHTML()   ?? form.plan_tratamiento,
      estado,
      patient_id: patient.id,
      doctor_id:  doctorId,
      clinic_id:  form.clinic_id || null,
    }
    if (!payload.proxima_cita) delete payload.proxima_cita
    if (consultId) {
      const { error } = await supabase.from('consultations').update(payload).eq('id', consultId)
      if (error) return error.message
      return null
    }
    const { data, error } = await supabase.from('consultations').insert([payload]).select().single()
    if (error) return error.message
    if (data) setConsultId(data.id)
    return null
  }

  // When proxima_cita is set, create appointment in Agenda (only once per date)
  const syncProximaCita = async () => {
    if (!form.proxima_cita) return
    const doctorId = await resolveDoctorId()
    if (!doctorId) return
    // Avoid duplicate: check if appointment already exists for this patient on that date
    const dayStart = `${form.proxima_cita}T00:00:00`
    const dayEnd   = `${form.proxima_cita}T23:59:59`
    const { data: existing } = await supabase
      .from('appointments')
      .select('id')
      .eq('patient_id', patient.id)
      .eq('doctor_id', doctorId)
      .gte('fecha_hora', dayStart)
      .lte('fecha_hora', dayEnd)
      .limit(1)
    if (existing?.length > 0) return // ya existe
    const fechaHora = new Date(`${form.proxima_cita}T09:00:00`).toISOString()
    await supabase.from('appointments').insert([{
      patient_id:   patient.id,
      doctor_id:    doctorId,
      fecha_hora:   fechaHora,
      duracion_min: 30,
      tipo:         'presencial',
      estado:       'programada',
      motivo:       form.motivo ? `Seguimiento: ${form.motivo}` : 'Próxima cita',
      clinic_id:    form.clinic_id || null,
    }])
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    const err = await saveData()
    if (!err) await syncProximaCita()
    setSaving(false)
    if (err) { setSaveError(err); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    onSaved?.()
  }

  const handleFinish = async () => {
    setFinishing(true)
    setSaveError('')
    const err = await saveData('terminada')
    if (err) { setSaveError(err); setFinishing(false); return }
    // Create appointment for next visit if date is set
    await syncProximaCita()
    setFinishing(false)
    onSaved?.()
    onClose()
  }

  const addMed = () => set('medicamentos_receta', [...form.medicamentos_receta, { nombre: '', dosis: '', frecuencia: '', duracion: '' }])

  const problemasActivos = (patient.patient_problems || []).filter(p => p.estado === 'activo')
  const consultasPrevias = (patient.consultations || [])
    .filter(c => c.id !== consultId)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 6)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100">
      {/* ── Header ── */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left: close + patient */}
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center font-bold text-primary-700 text-sm flex-shrink-0">
                {patient.nombre?.[0]}{patient.apellidos?.[0]}
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm leading-tight">
                  {patient.nombre} {patient.apellidos}
                </p>
                <p className="text-xs text-slate-400 leading-tight">
                  {patient.fecha_nacimiento
                    ? `${new Date().getFullYear() - new Date(patient.fecha_nacimiento).getFullYear()} años`
                    : ''}
                  {patient.tipo_sangre && ` · Tipo ${patient.tipo_sangre}`}
                </p>
              </div>
            </div>
            <span className={cn('text-xs px-3 py-1 rounded-full font-semibold',
              form.estado === 'terminada' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
              {form.estado === 'terminada' ? '✓ Terminada' : '● Consulta activa'}
            </span>
            {/* Selector de consultorio */}
            {clinics.length > 0 && (
              <select
                value={form.clinic_id}
                onChange={e => set('clinic_id', e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-primary-300 transition-colors"
              >
                <option value="">Sin consultorio</option>
                {clinics.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            {saveError && (
              <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl max-w-xs truncate">
                ⚠ {saveError}
              </span>
            )}
            <button onClick={() => setShowReceta(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition-all">
              <Printer className="w-4 h-4" /> Receta
            </button>
            <button onClick={handleSave} disabled={saving}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                saved ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50')}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Guardado' : 'Guardar'}
            </button>
            {form.estado !== 'terminada' && (
              <button onClick={handleFinish} disabled={finishing}
                className="flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
                {finishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Terminar consulta
              </button>
            )}
          </div>
        </div>

        {/* Motivo bar */}
        <div className="px-6 pb-3">
          <input
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-primary-300 focus:bg-white transition-all"
            placeholder="Motivo de consulta..."
            value={form.motivo}
            onChange={e => set('motivo', e.target.value)}
          />
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 overflow-hidden flex gap-4 p-4">

        {/* Main scrollable column */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">

          {/* Notas de padecimiento */}
          <Section icon={FileText} title="Notas de padecimiento" color="text-blue-500">
            <RichEditor editor={editorNotas} />
          </Section>

          {/* Exploración física */}
          <Section icon={Stethoscope} title="Exploración física" color="text-purple-500" collapsible>
            <div className="space-y-4">
              <BodyMap value={form.exploracion_topografica} onChange={v => set('exploracion_topografica', v)} />
              <div>
                <p className="text-xs text-slate-500 font-medium mb-2">Exploración general</p>
                <RichEditor editor={editorExamen} />
              </div>
            </div>
          </Section>

          {/* Diagnóstico */}
          <Section icon={ClipboardList} title="Diagnóstico" color="text-orange-500">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Diagnóstico clínico</label>
                <textarea rows={3} className="input resize-none text-sm"
                  placeholder="Diagnóstico principal..."
                  value={form.diagnostico} onChange={e => set('diagnostico', e.target.value)} />
              </div>
              <div>
                <label className="label">Código CIE-10</label>
                <CIE10Input value={form.diagnostico_cie10} onChange={v => set('diagnostico_cie10', v)} />
              </div>
            </div>
          </Section>

          {/* Solicitudes + procedimientos */}
          <Section icon={Activity} title="Solicitudes y procedimientos" color="text-teal-500" collapsible>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Solicitudes de laboratorio e imágenes</label>
                <textarea rows={4} className="input resize-none text-sm"
                  placeholder="BH, QS, Rx de tórax, USG..."
                  value={form.solicitudes_lab} onChange={e => set('solicitudes_lab', e.target.value)} />
              </div>
              <div>
                <label className="label">Procedimientos</label>
                <textarea rows={4} className="input resize-none text-sm"
                  placeholder="Procedimientos realizados o indicados..."
                  value={form.procedimientos} onChange={e => set('procedimientos', e.target.value)} />
              </div>
            </div>
            <button onClick={() => setShowUltra(true)}
              className="mt-3 flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors">
              <Printer className="w-4 h-4" /> Generar solicitud de estudios de imagen
            </button>
          </Section>

          {/* Receta */}
          <Section icon={Pill} title="Receta médica" color="text-red-500">
            {form.medicamentos_receta.length > 0 && (
              <div className="grid grid-cols-12 gap-2 mb-2 px-1">
                <span className="col-span-4 text-xs text-slate-400 font-semibold">Medicamento</span>
                <span className="col-span-2 text-xs text-slate-400 font-semibold">Dosis</span>
                <span className="col-span-3 text-xs text-slate-400 font-semibold">Frecuencia</span>
                <span className="col-span-2 text-xs text-slate-400 font-semibold">Días</span>
                <span className="col-span-1" />
              </div>
            )}
            <div className="space-y-2">
              {form.medicamentos_receta.map((med, i) => (
                <MedRow key={i} med={med}
                  onChange={m => set('medicamentos_receta', form.medicamentos_receta.map((x, idx) => idx === i ? m : x))}
                  onDelete={() => set('medicamentos_receta', form.medicamentos_receta.filter((_, idx) => idx !== i))} />
              ))}
            </div>
            <button onClick={addMed}
              className="mt-3 flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
              <Plus className="w-4 h-4" /> Agregar medicamento
            </button>
          </Section>

          {/* Instrucciones + Plan */}
          <Section icon={BookOpen} title="Instrucciones y plan de tratamiento" color="text-green-500">
            <div className="space-y-4">
              <div>
                <label className="label">Instrucciones médicas</label>
                <RichEditor editor={editorIndic} />
              </div>
              <div>
                <label className="label">Plan de tratamiento</label>
                <RichEditor editor={editorPlan} />
              </div>
            </div>
          </Section>

        </div>

        {/* ── Right sidebar ── */}
        <aside className="w-64 flex-shrink-0 overflow-y-auto space-y-3">

          {/* Patient quick info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Datos del paciente</p>
            <div className="space-y-2">
              {[
                { label: 'Tipo de sangre', value: patient.tipo_sangre, highlight: true },
                { label: 'CURP', value: patient.curp },
                { label: 'Teléfono', value: patient.telefono },
              ].map(({ label, value, highlight }) => value ? (
                <div key={label}>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className={cn('text-sm font-medium', highlight ? 'text-red-600' : 'text-slate-700')}>{value}</p>
                </div>
              ) : null)}
              {patient.clinical_background?.alergias && (
                <div className="mt-2 p-2.5 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-xs font-semibold text-red-600 mb-0.5">⚠ Alergias</p>
                  <p className="text-xs text-red-700 leading-relaxed">{patient.clinical_background.alergias}</p>
                </div>
              )}
            </div>
          </div>

          {/* Próxima cita */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Próxima cita
            </p>
            <input
              type="date"
              className="input text-sm"
              value={form.proxima_cita}
              onChange={e => set('proxima_cita', e.target.value)}
            />
            {form.proxima_cita && (
              <p className="text-[10px] text-primary-500 mt-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 inline-block" />
                Se agendará automáticamente al guardar
              </p>
            )}
          </div>

          {/* Active problems */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Problemas activos</p>
              {problemasActivos.length > 0 && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{problemasActivos.length}</span>
              )}
            </div>
            {problemasActivos.length === 0 ? (
              <p className="text-xs text-slate-400">Sin problemas activos</p>
            ) : (
              <div className="space-y-1.5">
                {problemasActivos.map(p => (
                  <div key={p.id} className="flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      {p.cie10_codigo && <span className="text-xs font-mono text-slate-400">{p.cie10_codigo} </span>}
                      <span className="text-xs text-slate-700">{p.cie10_descripcion}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Previous consultations */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Consultas anteriores</p>
            {consultasPrevias.length === 0 ? (
              <p className="text-xs text-slate-400">Sin consultas previas</p>
            ) : (
              <div className="space-y-2">
                {consultasPrevias.map(c => (
                  <div key={c.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs font-semibold text-slate-700 line-clamp-1">{c.motivo || 'Consulta general'}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <p className="text-xs text-slate-400">
                        {new Date(c.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    {c.diagnostico && <p className="text-xs text-slate-500 mt-1 line-clamp-1 italic">{c.diagnostico}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

        </aside>
      </div>
      {showReceta && (
        <PrintReceta form={form} patient={patient} doctor={doctor} onClose={() => setShowReceta(false)} />
      )}
      {showUltra && (
        <PrintUltraSound form={form} patient={patient} doctor={doctor} onClose={() => setShowUltra(false)} />
      )}
    </div>
  )
}
