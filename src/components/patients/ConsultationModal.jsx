import { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { usePatientsStore } from '../../store/patientsStore'
import {
  X, Save, CheckCircle, Loader2, Plus, Trash2,
  Bold, Italic, List, ListOrdered, BookOpen,
  AlertCircle, Calendar, FileText, Stethoscope, Pill
} from 'lucide-react'
import { cn, formatFechaHora } from '../../utils'
import BodyMap from './BodyMap'

const TABS = [
  { id: 'notas',       label: 'Notas de Padecimiento', icon: FileText },
  { id: 'examen',      label: 'Examen Físico',          icon: Stethoscope },
  { id: 'diagnostico', label: 'Diagnóstico y Tratamiento', icon: Pill },
]

function RichEditor({ editor, placeholder }) {
  if (!editor) return null
  const btn = (action, active, title, children) => (
    <button type="button" onMouseDown={e => { e.preventDefault(); action() }} title={title}
      className={cn('p-1.5 rounded text-sm transition-colors',
        active ? 'bg-primary-100 text-primary-700' : 'text-slate-500 hover:bg-slate-100')}>
      {children}
    </button>
  )
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-slate-50 border-b border-slate-200 flex-wrap">
        {btn(() => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), 'Negrita', <Bold className="w-3.5 h-3.5" />)}
        {btn(() => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), 'Cursiva', <Italic className="w-3.5 h-3.5" />)}
        <div className="w-px h-4 bg-slate-200 mx-0.5" />
        {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive('heading', { level: 3 }), 'Título', <span className="text-xs font-bold">H</span>)}
        {btn(() => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'), 'Lista', <List className="w-3.5 h-3.5" />)}
        {btn(() => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), 'Numerada', <ListOrdered className="w-3.5 h-3.5" />)}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

function MedicamentoRow({ med, onChange, onDelete }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center p-2 bg-slate-50 rounded-lg">
      <input className="col-span-4 text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary-400"
        placeholder="Medicamento" value={med.nombre} onChange={e => onChange({ ...med, nombre: e.target.value })} />
      <input className="col-span-3 text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary-400"
        placeholder="Dosis" value={med.dosis} onChange={e => onChange({ ...med, dosis: e.target.value })} />
      <input className="col-span-3 text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary-400"
        placeholder="Frecuencia" value={med.frecuencia} onChange={e => onChange({ ...med, frecuencia: e.target.value })} />
      <input className="col-span-1 text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary-400"
        placeholder="Días" value={med.duracion} onChange={e => onChange({ ...med, duracion: e.target.value })} />
      <button onClick={onDelete} className="col-span-1 p-1.5 text-slate-400 hover:text-red-500 transition-colors flex justify-center">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default function ConsultationModal({ patient, consultation, onClose, onSaved }) {
  const { doctor } = useAuthStore()
  const { fetchPatient } = usePatientsStore()
  const isNew = !consultation?.id
  const [activeTab, setActiveTab] = useState('notas')
  const [saving, setSaving] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [consultId, setConsultId] = useState(consultation?.id || null)

  const [form, setForm] = useState({
    motivo:              consultation?.motivo || '',
    notas_padecimiento:  consultation?.notas_padecimiento || '',
    exploracion_fisica:  consultation?.exploracion_fisica || '',
    exploracion_topografica: consultation?.exploracion_topografica || {},
    diagnostico:         consultation?.diagnostico || '',
    diagnostico_cie10:   consultation?.diagnostico_cie10 || '',
    solicitudes_lab:     consultation?.solicitudes_lab || '',
    procedimientos:      consultation?.procedimientos || '',
    instrucciones_medicas: consultation?.instrucciones_medicas || '',
    plan_tratamiento:    consultation?.plan_tratamiento || '',
    medicamentos_receta: consultation?.medicamentos_receta || [],
    proxima_cita:        consultation?.proxima_cita || '',
    estado:              consultation?.estado || 'activa',
  })

  const editorNotas = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: 'Describe el padecimiento actual, evolución y síntomas...' })],
    content: form.notas_padecimiento,
    editorProps: { attributes: { class: 'prose prose-sm max-w-none focus:outline-none min-h-[160px] px-3 py-2 text-slate-700' } },
    onUpdate: ({ editor }) => setForm(f => ({ ...f, notas_padecimiento: editor.getHTML() })),
  })

  const editorExamen = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: 'Hallazgos generales de la exploración física...' })],
    content: form.exploracion_fisica,
    editorProps: { attributes: { class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2 text-slate-700' } },
    onUpdate: ({ editor }) => setForm(f => ({ ...f, exploracion_fisica: editor.getHTML() })),
  })

  const editorInstrucciones = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: 'Instrucciones médicas para el paciente...' })],
    content: form.instrucciones_medicas,
    editorProps: { attributes: { class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2 text-slate-700' } },
    onUpdate: ({ editor }) => setForm(f => ({ ...f, instrucciones_medicas: editor.getHTML() })),
  })

  const editorPlan = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: 'Plan de tratamiento a seguir...' })],
    content: form.plan_tratamiento,
    editorProps: { attributes: { class: 'prose prose-sm max-w-none focus:outline-none min-h-[100px] px-3 py-2 text-slate-700' } },
    onUpdate: ({ editor }) => setForm(f => ({ ...f, plan_tratamiento: editor.getHTML() })),
  })

  const addMedicamento = () => {
    setForm(f => ({ ...f, medicamentos_receta: [...f.medicamentos_receta, { nombre: '', dosis: '', frecuencia: '', duracion: '' }] }))
  }

  const updateMed = (i, med) => {
    setForm(f => ({ ...f, medicamentos_receta: f.medicamentos_receta.map((m, idx) => idx === i ? med : m) }))
  }

  const deleteMed = (i) => {
    setForm(f => ({ ...f, medicamentos_receta: f.medicamentos_receta.filter((_, idx) => idx !== i) }))
  }

  const saveData = async (estado = form.estado) => {
    const payload = { ...form, estado, patient_id: patient.id, doctor_id: doctor?.id }
    if (consultId) {
      const { error } = await supabase.from('consultations').update(payload).eq('id', consultId)
      return !error
    } else {
      const { data, error } = await supabase.from('consultations').insert([payload]).select().single()
      if (!error && data) { setConsultId(data.id); return true }
      return false
    }
  }

  const handleSave = async () => {
    setSaving(true)
    await saveData()
    setSaving(false)
    fetchPatient(patient.id)
    onSaved?.()
  }

  const handleFinish = async () => {
    setFinishing(true)
    const ok = await saveData('terminada')
    setFinishing(false)
    if (ok) { fetchPatient(patient.id); onClose() }
  }

  const problemasActivos = (patient.patient_problems || []).filter(p => p.estado === 'activo')
  const consultasPrevias = (patient.consultations || [])
    .filter(c => c.id !== consultId && c.estado === 'terminada')
    .slice(0, 5)

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">{patient.nombre} {patient.apellidos}</span>
              <span className="text-slate-400">·</span>
              <span className="text-sm text-slate-500">{patient.fecha_nacimiento ? `${new Date().getFullYear() - new Date(patient.fecha_nacimiento).getFullYear()} años` : ''}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                form.estado === 'terminada' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                {form.estado === 'terminada' ? 'Terminada' : 'Consulta activa'}
              </span>
              {form.motivo && <span className="text-xs text-slate-500">· {form.motivo}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={saving}
            className="btn-secondary flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
          {form.estado !== 'terminada' && (
            <button onClick={handleFinish} disabled={finishing}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors">
              {finishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Terminar consulta
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Motivo */}
          <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex-shrink-0">
            <input
              className="w-full bg-transparent text-sm focus:outline-none text-slate-700 placeholder:text-slate-400"
              placeholder="Motivo de consulta..."
              value={form.motivo}
              onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
            />
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 bg-white flex-shrink-0 px-6">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={cn('flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeTab === id ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700')}>
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* NOTAS DE PADECIMIENTO */}
            {activeTab === 'notas' && (
              <div className="space-y-5 max-w-3xl">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Notas de padecimiento</label>
                  <RichEditor editor={editorNotas} />
                </div>
              </div>
            )}

            {/* EXAMEN FÍSICO */}
            {activeTab === 'examen' && (
              <div className="space-y-6 max-w-3xl">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Exploración topográfica</label>
                  <div className="card p-4">
                    <BodyMap
                      value={form.exploracion_topografica}
                      onChange={v => setForm(f => ({ ...f, exploracion_topografica: v }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Exploración física general</label>
                  <RichEditor editor={editorExamen} />
                </div>
              </div>
            )}

            {/* DIAGNÓSTICO Y TRATAMIENTO */}
            {activeTab === 'diagnostico' && (
              <div className="space-y-6 max-w-3xl">
                {/* Diagnóstico */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Diagnóstico</label>
                    <textarea rows={3} className="input resize-none text-sm" placeholder="Diagnóstico clínico..."
                      value={form.diagnostico} onChange={e => setForm(f => ({ ...f, diagnostico: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Código CIE-10</label>
                    <input className="input font-mono" placeholder="Ej: E11.9, J06.9..." value={form.diagnostico_cie10}
                      onChange={e => setForm(f => ({ ...f, diagnostico_cie10: e.target.value.toUpperCase() }))} />
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block mt-3">Próxima cita</label>
                    <input type="date" className="input" value={form.proxima_cita}
                      onChange={e => setForm(f => ({ ...f, proxima_cita: e.target.value }))} />
                  </div>
                </div>

                {/* Solicitudes lab */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Solicitudes de laboratorio e imágenes</label>
                    <textarea rows={4} className="input resize-none text-sm" placeholder="Hemograma, BH, QS, Rx tórax..."
                      value={form.solicitudes_lab} onChange={e => setForm(f => ({ ...f, solicitudes_lab: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Procedimientos</label>
                    <textarea rows={4} className="input resize-none text-sm" placeholder="Procedimientos realizados o indicados..."
                      value={form.procedimientos} onChange={e => setForm(f => ({ ...f, procedimientos: e.target.value }))} />
                  </div>
                </div>

                {/* Receta */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Receta médica</label>
                    <button onClick={addMedicamento} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                      <Plus className="w-3.5 h-3.5" /> Agregar medicamento
                    </button>
                  </div>
                  {form.medicamentos_receta.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
                      <Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">Sin medicamentos prescritos</p>
                      <button onClick={addMedicamento} className="mt-2 text-sm text-primary-600 hover:underline">+ Agregar</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 px-2">
                        {['Medicamento', 'Dosis', 'Frecuencia', 'Días', ''].map((h, i) => (
                          <span key={i} className={cn('text-xs text-slate-400 font-medium',
                            i === 0 ? 'col-span-4' : i === 4 ? 'col-span-1' : 'col-span-3')}>{h}</span>
                        ))}
                      </div>
                      {form.medicamentos_receta.map((med, i) => (
                        <MedicamentoRow key={i} med={med} onChange={m => updateMed(i, m)} onDelete={() => deleteMed(i)} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Instrucciones */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Instrucciones médicas</label>
                  <RichEditor editor={editorInstrucciones} />
                </div>

                {/* Plan tratamiento */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Plan de tratamiento</label>
                  <RichEditor editor={editorPlan} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-72 border-l border-slate-200 overflow-y-auto bg-slate-50 flex-shrink-0">
          <div className="p-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Resumen clínico</h3>

            {/* Problemas activos */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-slate-700">Lista de problemas</span>
                {problemasActivos.length > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">{problemasActivos.length}</span>
                )}
              </div>
              {problemasActivos.length === 0 ? (
                <p className="text-xs text-slate-400 pl-6">Sin problemas activos</p>
              ) : (
                <div className="space-y-1 pl-2">
                  {problemasActivos.map(p => (
                    <div key={p.id} className="flex items-start gap-2 p-2 bg-white rounded-lg border border-slate-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                      <div>
                        {p.cie10_codigo && <span className="text-xs font-mono text-slate-400">{p.cie10_codigo} </span>}
                        <span className="text-xs text-slate-700">{p.cie10_descripcion}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200" />

            {/* Consultas previas */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-semibold text-slate-700">Consultas previas</span>
              </div>
              {consultasPrevias.length === 0 ? (
                <p className="text-xs text-slate-400 pl-6">Sin consultas anteriores</p>
              ) : (
                <div className="space-y-1 pl-2">
                  {consultasPrevias.map(c => (
                    <div key={c.id} className="p-2 bg-white rounded-lg border border-slate-100">
                      <p className="text-xs font-medium text-slate-700 line-clamp-1">{c.motivo || 'Consulta general'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{new Date(c.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200" />

            {/* Antecedentes rápidos */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-semibold text-slate-700">Antecedentes</span>
              </div>
              <div className="space-y-1 pl-2">
                {[
                  { label: 'Alergias', value: patient.clinical_background?.alergias },
                  { label: 'Patológicos', value: patient.clinical_background?.antec_patologicos },
                  { label: 'Tipo sangre', value: patient.tipo_sangre },
                ].map(({ label, value }) => value ? (
                  <div key={label} className="p-2 bg-white rounded-lg border border-slate-100">
                    <p className="text-xs font-semibold text-slate-500">{label}</p>
                    <p className="text-xs text-slate-700 line-clamp-2">{value}</p>
                  </div>
                ) : null)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
