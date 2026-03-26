import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePatientsStore } from '../store/patientsStore'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import {
  ArrowLeft, Edit2, Plus, Loader2, ChevronDown, ChevronUp,
  Activity, Calendar, AlertCircle, Pill, Syringe, FileText,
  Paperclip, Salad, BookOpen, CheckCircle, Clock,
  Thermometer, Heart, Wind, Droplets, Scale, Ruler,
  XCircle, Trash2
} from 'lucide-react'
import { calcEdad, calcIMC, clasificarIMC, formatFecha, formatFechaHora, cn } from '../utils'
import EditPatientModal from '../components/patients/EditPatientModal'
import ConsultationModal from '../components/patients/ConsultationModal'

/* ─── helpers ─────────────────────────────────────────────────── */
function SectionCard({ icon: Icon, title, iconBg = 'bg-slate-100', iconColor = 'text-slate-500',
  action, children, collapsible = false, defaultOpen = true, badge }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div
        onClick={() => collapsible && setOpen(o => !o)}
        className={cn('flex items-center justify-between px-5 py-3.5 border-b border-slate-100',
          collapsible && 'cursor-pointer hover:bg-slate-50 select-none')}
      >
        <div className="flex items-center gap-3">
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', iconBg)}>
            <Icon className={cn('w-4 h-4', iconColor)} />
          </div>
          <span className="font-semibold text-slate-700 text-sm">{title}</span>
          {badge != null && badge > 0 && (
            <span className="text-xs bg-primary-100 text-primary-700 font-bold px-2 py-0.5 rounded-full">{badge}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
          {collapsible && (open
            ? <ChevronUp className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-400" />)}
        </div>
      </div>
      {open && <div className="p-5">{children}</div>}
    </div>
  )
}

function StatBox({ label, value, unit, icon: Icon, color = 'text-slate-800', bg = 'bg-slate-50' }) {
  return (
    <div className={cn('rounded-xl p-3 flex flex-col gap-1', bg)}>
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex items-end gap-1">
        <span className={cn('text-xl font-bold leading-none', color)}>{value ?? '—'}</span>
        {unit && <span className="text-xs text-slate-400 mb-0.5">{unit}</span>}
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="text-center py-8">
      <Icon className="w-8 h-8 text-slate-200 mx-auto mb-2" />
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  )
}

/* ─── main component ───────────────────────────────────────────── */
export default function PatientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { fetchPatient, currentPatient, loading, addVitalSigns, addMedication,
    updateMedication, addVaccine } = usePatientsStore()
  const { doctor } = useAuthStore()

  const [showEdit, setShowEdit]       = useState(false)
  const [openConsult, setOpenConsult] = useState(null)

  // Extra data (not in store)
  const [problems, setProblems]   = useState([])
  const [notes, setNotes]         = useState([])
  const [files, setFiles]         = useState([])

  // Section forms
  const [showVitalsForm, setShowVitalsForm]   = useState(false)
  const [showMedForm, setShowMedForm]         = useState(false)
  const [showVaxForm, setShowVaxForm]         = useState(false)
  const [showProbForm, setShowProbForm]       = useState(false)

  useEffect(() => { fetchPatient(id) }, [id])

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('patient_problems').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
      supabase.from('clinical_notes').select('*').eq('patient_id', id).order('created_at', { ascending: false }).limit(3),
      supabase.from('patient_files').select('*').eq('patient_id', id).order('created_at', { ascending: false }).limit(6),
    ]).then(([{ data: p }, { data: n }, { data: f }]) => {
      setProblems(p || [])
      setNotes(n || [])
      setFiles(f || [])
    })
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
    </div>
  )
  if (!currentPatient) return (
    <div className="text-center py-32 text-slate-400">Paciente no encontrado</div>
  )

  const p = currentPatient
  const edad = calcEdad(p.fecha_nacimiento)
  const vitals = [...(p.vital_signs || [])].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  const latest = vitals[0]
  const meds = p.medications || []
  const activeMeds = meds.filter(m => m.activo)
  const vaccines = p.vaccines || []
  const consultations = [...(p.consultations || [])].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  const activeProblems = problems.filter(x => x.estado === 'activo')
  const diets = p.diets || []
  const activeDiet = diets.find(d => d.activa)

  const sexLabel = { M: 'Masculino', F: 'Femenino', Otro: 'Otro' }
  const imcInfo = latest?.imc ? clasificarIMC(latest.imc) : null

  const refresh = () => {
    fetchPatient(id)
    supabase.from('patient_problems').select('*').eq('patient_id', id).order('created_at', { ascending: false })
      .then(({ data }) => setProblems(data || []))
  }

  return (
    <div className="min-h-screen bg-slate-50 -m-6">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 px-6 py-3">
          <button onClick={() => navigate('/pacientes')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Pacientes
          </button>
          <div className="w-px h-5 bg-slate-200" />
          {/* Patient summary */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center font-bold text-primary-700 text-sm flex-shrink-0">
              {p.nombre?.[0]}{p.apellidos?.[0]}
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-slate-800 text-sm leading-tight truncate">
                {p.nombre} {p.apellidos}
              </h1>
              <p className="text-xs text-slate-400 leading-tight">
                {sexLabel[p.sexo] || p.sexo}
                {edad ? ` · ${edad} años` : ''}
                {p.fecha_nacimiento ? ` · ${formatFecha(p.fecha_nacimiento)}` : ''}
                {p.tipo_sangre ? ` · Tipo ${p.tipo_sangre}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
              <Edit2 className="w-3.5 h-3.5" /> Editar
            </button>
            <button onClick={() => setOpenConsult('new')}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-sm">
              <Plus className="w-3.5 h-3.5" /> Nueva consulta
            </button>
          </div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex gap-4 p-6 max-w-screen-xl mx-auto">

        {/* ── Left column ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Signos vitales */}
          <SectionCard icon={Activity} title="Signos vitales"
            iconBg="bg-blue-50" iconColor="text-blue-500"
            action={
              <button onClick={() => setShowVitalsForm(v => !v)}
                className="flex items-center gap-1 text-xs text-primary-600 font-semibold hover:underline">
                <Plus className="w-3.5 h-3.5" /> Registrar
              </button>
            }
          >
            {showVitalsForm && <VitalsForm patientId={p.id} onDone={() => { setShowVitalsForm(false); fetchPatient(id) }} />}
            {latest ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Última medición: {formatFechaHora(latest.fecha)}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                  {latest.peso_kg    && <StatBox label="Peso" value={latest.peso_kg} unit="kg" icon={Scale} />}
                  {latest.talla_cm   && <StatBox label="Talla" value={latest.talla_cm} unit="cm" icon={Ruler} />}
                  {latest.imc        && <StatBox label="IMC" value={latest.imc} icon={Scale}
                    color={imcInfo?.color?.includes('red') ? 'text-red-600' : imcInfo?.color?.includes('amber') ? 'text-amber-600' : 'text-emerald-600'}
                    bg={imcInfo?.color?.includes('red') ? 'bg-red-50' : imcInfo?.color?.includes('amber') ? 'bg-amber-50' : 'bg-emerald-50'} />}
                  {latest.temperatura && <StatBox label="Temperatura" value={latest.temperatura} unit="°C" icon={Thermometer}
                    color={latest.temperatura >= 38 ? 'text-red-600' : 'text-slate-800'}
                    bg={latest.temperatura >= 38 ? 'bg-red-50' : 'bg-slate-50'} />}
                  {latest.frec_cardiaca && <StatBox label="Frec. cardíaca" value={latest.frec_cardiaca} unit="lpm" icon={Heart} />}
                  {latest.frec_respiratoria && <StatBox label="Frec. resp." value={latest.frec_respiratoria} unit="rpm" icon={Wind} />}
                  {latest.presion_sistolica && <StatBox label="Presión" value={`${latest.presion_sistolica}/${latest.presion_diastolica}`} unit="mmHg" icon={Activity}
                    color={latest.presion_sistolica >= 140 ? 'text-red-600' : 'text-slate-800'}
                    bg={latest.presion_sistolica >= 140 ? 'bg-red-50' : 'bg-slate-50'} />}
                  {latest.saturacion_o2 && <StatBox label="SpO₂" value={latest.saturacion_o2} unit="%" icon={Droplets}
                    color={latest.saturacion_o2 < 95 ? 'text-red-600' : 'text-slate-800'}
                    bg={latest.saturacion_o2 < 95 ? 'bg-red-50' : 'bg-slate-50'} />}
                  {latest.porc_grasa && <StatBox label="% Grasa" value={latest.porc_grasa} unit="%" />}
                  {latest.masa_muscular && <StatBox label="M. Muscular" value={latest.masa_muscular} unit="kg" />}
                </div>
              </div>
            ) : !showVitalsForm && <EmptyState icon={Activity} text="Sin mediciones registradas" />}
          </SectionCard>

          {/* Consultas */}
          <SectionCard icon={Calendar} title="Consultas" badge={consultations.length}
            iconBg="bg-primary-50" iconColor="text-primary-500"
            action={
              <button onClick={() => setOpenConsult('new')}
                className="flex items-center gap-1 text-xs text-primary-600 font-semibold hover:underline">
                <Plus className="w-3.5 h-3.5" /> Nueva
              </button>
            }
          >
            {consultations.length === 0
              ? <EmptyState icon={Calendar} text="Sin consultas registradas" />
              : <div className="space-y-2">
                  {consultations.slice(0, 5).map(c => (
                    <button key={c.id} onClick={() => setOpenConsult(c)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left group border border-transparent hover:border-slate-200">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        c.estado === 'terminada' ? 'bg-green-50' : 'bg-blue-50')}>
                        {c.estado === 'terminada'
                          ? <CheckCircle className="w-4 h-4 text-green-500" />
                          : <Clock className="w-4 h-4 text-blue-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{c.motivo || 'Consulta general'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-400">{formatFecha(c.fecha)}</span>
                          {c.diagnostico_cie10 && <span className="text-xs font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{c.diagnostico_cie10}</span>}
                        </div>
                      </div>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0',
                        c.estado === 'terminada' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                        {c.estado === 'terminada' ? 'Terminada' : 'Activa'}
                      </span>
                    </button>
                  ))}
                  {consultations.length > 5 && (
                    <p className="text-xs text-slate-400 text-center pt-1">+{consultations.length - 5} consultas más</p>
                  )}
                </div>}
          </SectionCard>

          {/* Problemas */}
          <SectionCard icon={AlertCircle} title="Lista de problemas" badge={activeProblems.length}
            iconBg="bg-red-50" iconColor="text-red-500"
            action={
              <button onClick={() => setShowProbForm(v => !v)}
                className="flex items-center gap-1 text-xs text-primary-600 font-semibold hover:underline">
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            }
          >
            {showProbForm && <ProblemForm patientId={p.id} onDone={() => { setShowProbForm(false); refresh() }} />}
            {problems.length === 0 && !showProbForm
              ? <EmptyState icon={AlertCircle} text="Sin problemas registrados" />
              : <ProblemsView problems={problems} onRefresh={refresh} />}
          </SectionCard>

          {/* Medicamentos */}
          <SectionCard icon={Pill} title="Medicamentos" badge={activeMeds.length}
            iconBg="bg-purple-50" iconColor="text-purple-500"
            action={
              <button onClick={() => setShowMedForm(v => !v)}
                className="flex items-center gap-1 text-xs text-primary-600 font-semibold hover:underline">
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            }
          >
            {showMedForm && <MedForm patientId={p.id}
              onDone={() => { setShowMedForm(false); fetchPatient(id) }} />}
            {meds.length === 0 && !showMedForm
              ? <EmptyState icon={Pill} text="Sin medicamentos registrados" />
              : <MedsView meds={meds} onToggle={async (med) => {
                  await updateMedication(med.id, { activo: !med.activo })
                  fetchPatient(id)
                }} />}
          </SectionCard>

          {/* Vacunas */}
          <SectionCard icon={Syringe} title="Vacunas" badge={vaccines.length}
            iconBg="bg-amber-50" iconColor="text-amber-500"
            collapsible defaultOpen={vaccines.length > 0}
            action={
              <button onClick={() => setShowVaxForm(v => !v)}
                className="flex items-center gap-1 text-xs text-primary-600 font-semibold hover:underline">
                <Plus className="w-3.5 h-3.5" /> Registrar
              </button>
            }
          >
            {showVaxForm && <VaxForm patientId={p.id} onDone={() => { setShowVaxForm(false); fetchPatient(id) }} />}
            {vaccines.length === 0 && !showVaxForm
              ? <EmptyState icon={Syringe} text="Sin vacunas registradas" />
              : <VaccinesView vaccines={vaccines} />}
          </SectionCard>

          {/* Antecedentes */}
          <SectionCard icon={FileText} title="Antecedentes clínicos"
            iconBg="bg-teal-50" iconColor="text-teal-500"
            collapsible defaultOpen={false}>
            <BackgroundView background={p.clinical_background} patientId={p.id} onDone={() => fetchPatient(id)} />
          </SectionCard>

          {/* Notas clínicas */}
          <SectionCard icon={BookOpen} title="Notas clínicas" badge={notes.length}
            iconBg="bg-indigo-50" iconColor="text-indigo-500"
            collapsible defaultOpen={notes.length > 0}>
            {notes.length === 0
              ? <EmptyState icon={BookOpen} text="Sin notas clínicas" />
              : <div className="space-y-2">
                  {notes.map(n => (
                    <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-400 mb-1">{formatFechaHora(n.created_at)}</p>
                      <div className="text-sm text-slate-700 prose prose-sm max-w-none line-clamp-3"
                        dangerouslySetInnerHTML={{ __html: n.contenido }} />
                    </div>
                  ))}
                </div>}
          </SectionCard>

          {/* Archivos */}
          <SectionCard icon={Paperclip} title="Archivos adjuntos" badge={files.length}
            iconBg="bg-slate-100" iconColor="text-slate-500"
            collapsible defaultOpen={files.length > 0}>
            {files.length === 0
              ? <EmptyState icon={Paperclip} text="Sin archivos adjuntos" />
              : <div className="grid grid-cols-3 gap-2">
                  {files.map(f => (
                    <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer"
                      className="p-2 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary-200 hover:bg-primary-50 transition-all group text-center">
                      <Paperclip className="w-5 h-5 text-slate-400 group-hover:text-primary-500 mx-auto mb-1" />
                      <p className="text-xs text-slate-600 truncate">{f.nombre}</p>
                    </a>
                  ))}
                </div>}
          </SectionCard>

          {/* Nutrición */}
          {(activeDiet || diets.length > 0) && (
            <SectionCard icon={Salad} title="Nutrición"
              iconBg="bg-green-50" iconColor="text-green-500"
              collapsible defaultOpen={false}>
              {activeDiet ? (
                <div className="space-y-2 text-sm text-slate-700">
                  {activeDiet.descripcion && <p>{activeDiet.descripcion}</p>}
                  {activeDiet.calorias && <p className="text-slate-500">Calorías: <strong>{activeDiet.calorias} kcal</strong></p>}
                  {activeDiet.restricciones && <p className="text-slate-500">Restricciones: {activeDiet.restricciones}</p>}
                </div>
              ) : <EmptyState icon={Salad} text="Sin plan nutricional activo" />}
            </SectionCard>
          )}

        </div>

        {/* ── Right sidebar ── */}
        <aside className="w-60 flex-shrink-0 space-y-4">

          {/* Nueva consulta CTA */}
          <button onClick={() => setOpenConsult('new')}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Nueva consulta
          </button>

          {/* Stats */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Resumen</p>
            <div className="space-y-2.5">
              {[
                { label: 'Consultas', value: consultations.length, color: 'text-primary-600' },
                { label: 'Problemas activos', value: activeProblems.length, color: 'text-red-500' },
                { label: 'Medicamentos activos', value: activeMeds.length, color: 'text-purple-500' },
                { label: 'Vacunas', value: vaccines.length, color: 'text-amber-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className={cn('text-sm font-bold', color)}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Patient info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Datos</p>
            <div className="space-y-2">
              {[
                { label: 'Tipo de sangre', value: p.tipo_sangre, highlight: 'text-red-600 font-bold' },
                { label: 'CURP', value: p.curp, mono: true },
                { label: 'Teléfono', value: p.telefono },
                { label: 'Correo', value: p.email },
                { label: 'Dirección', value: p.direccion },
              ].map(({ label, value, highlight, mono }) => value ? (
                <div key={label}>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className={cn('text-xs', highlight || 'text-slate-700', mono && 'font-mono')}>{value}</p>
                </div>
              ) : null)}
            </div>
          </div>

          {/* Allergies alert */}
          {p.clinical_background?.alergias && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-red-600 mb-1">⚠ Alergias</p>
              <p className="text-xs text-red-700 leading-relaxed">{p.clinical_background.alergias}</p>
            </div>
          )}

          {/* Próxima cita */}
          {(() => {
            const upcoming = [...(p.appointments || [])]
              .filter(a => new Date(a.fecha_hora) > new Date() && a.estado !== 'cancelada')
              .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))[0]
            return upcoming ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Próxima cita</p>
                <p className="text-sm font-semibold text-slate-700">
                  {new Date(upcoming.fecha_hora).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'long' })}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(upcoming.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {upcoming.motivo && <p className="text-xs text-slate-500 mt-1 italic">{upcoming.motivo}</p>}
              </div>
            ) : null
          })()}

        </aside>
      </div>

      {/* Modals */}
      {showEdit && <EditPatientModal patient={p} onClose={() => setShowEdit(false)} />}
      {openConsult !== null && (
        <ConsultationModal
          patient={{ ...p, patient_problems: problems }}
          consultation={openConsult === 'new' ? null : openConsult}
          onClose={() => setOpenConsult(null)}
          onSaved={() => fetchPatient(id)}
        />
      )}
    </div>
  )
}

/* ─── inline form components ───────────────────────────────────── */

function VitalsForm({ patientId, onDone }) {
  const { addVitalSigns } = usePatientsStore()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ peso_kg:'', talla_cm:'', temperatura:'', frec_cardiaca:'',
    frec_respiratoria:'', presion_sistolica:'', presion_diastolica:'', saturacion_o2:'',
    porc_grasa:'', masa_muscular:'' })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const imc = calcIMC(f.peso_kg, f.talla_cm)
  const imcInfo = clasificarIMC(imc)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = { patient_id: patientId }
    Object.entries(f).forEach(([k, v]) => { if (v !== '') payload[k] = parseFloat(v) || parseInt(v) })
    await addVitalSigns(payload)
    setSaving(false)
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="mb-5 p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
      <p className="text-sm font-semibold text-blue-700">Nueva medición</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { k:'peso_kg', label:'Peso (kg)', ph:'70.5' },
          { k:'talla_cm', label:'Talla (cm)', ph:'170' },
          { k:'temperatura', label:'Temp. (°C)', ph:'36.5' },
          { k:'frec_cardiaca', label:'FC (lpm)', ph:'72' },
          { k:'frec_respiratoria', label:'FR (rpm)', ph:'16' },
          { k:'presion_sistolica', label:'P. sistólica', ph:'120' },
          { k:'presion_diastolica', label:'P. diastólica', ph:'80' },
          { k:'saturacion_o2', label:'SpO₂ (%)', ph:'98' },
          { k:'porc_grasa', label:'% Grasa', ph:'20' },
          { k:'masa_muscular', label:'M. Muscular (kg)', ph:'35' },
        ].map(({ k, label, ph }) => (
          <div key={k}>
            <label className="text-xs text-slate-500 mb-1 block">{label}</label>
            <input type="number" step="0.1" className="input text-sm py-2" placeholder={ph}
              value={f[k]} onChange={e => set(k, e.target.value)} />
          </div>
        ))}
        {imc && (
          <div>
            <label className="text-xs text-slate-500 mb-1 block">IMC</label>
            <div className="input text-sm py-2 bg-white flex items-center gap-2">
              <span className="font-semibold">{imc}</span>
              {imcInfo && <span className="text-xs text-slate-500">{imcInfo.label}</span>}
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="btn-secondary text-sm py-2">Cancelar</button>
        <button type="submit" disabled={saving} className="btn-primary text-sm py-2">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Guardar
        </button>
      </div>
    </form>
  )
}

function MedForm({ patientId, onDone }) {
  const { addMedication } = usePatientsStore()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ nombre:'', dosis:'', frecuencia:'', via:'', notas:'' })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await addMedication({ ...f, patient_id: patientId, activo: true })
    setSaving(false)
    onDone()
  }
  return (
    <form onSubmit={handleSubmit} className="mb-5 p-4 bg-purple-50 rounded-xl border border-purple-100 space-y-3">
      <p className="text-sm font-semibold text-purple-700">Nuevo medicamento</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-slate-500 mb-1 block">Nombre *</label>
          <input className="input text-sm py-2" placeholder="Metformina 850mg" value={f.nombre} onChange={e => set('nombre', e.target.value)} required />
        </div>
        <div><label className="text-xs text-slate-500 mb-1 block">Dosis</label><input className="input text-sm py-2" placeholder="850mg" value={f.dosis} onChange={e => set('dosis', e.target.value)} /></div>
        <div><label className="text-xs text-slate-500 mb-1 block">Frecuencia</label><input className="input text-sm py-2" placeholder="Cada 12 hrs" value={f.frecuencia} onChange={e => set('frecuencia', e.target.value)} /></div>
        <div><label className="text-xs text-slate-500 mb-1 block">Vía</label>
          <select className="input text-sm py-2" value={f.via} onChange={e => set('via', e.target.value)}>
            <option value="">—</option>
            {['Oral','IV','IM','SC','Tópica','Inhalatoria','Sublingual'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div><label className="text-xs text-slate-500 mb-1 block">Notas</label><input className="input text-sm py-2" placeholder="Con alimentos..." value={f.notas} onChange={e => set('notas', e.target.value)} /></div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="btn-secondary text-sm py-2">Cancelar</button>
        <button type="submit" disabled={saving} className="btn-primary text-sm py-2">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Guardar
        </button>
      </div>
    </form>
  )
}

function VaxForm({ patientId, onDone }) {
  const { addVaccine } = usePatientsStore()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ nombre:'', fecha_aplicacion:'', lote:'', laboratorio:'', dosis_numero:'', proxima_dosis:'' })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await addVaccine({ ...f, patient_id: patientId })
    setSaving(false)
    onDone()
  }
  return (
    <form onSubmit={handleSubmit} className="mb-5 p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-3">
      <p className="text-sm font-semibold text-amber-700">Nueva vacuna</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-slate-500 mb-1 block">Vacuna *</label>
          <select className="input text-sm py-2" value={f.nombre} onChange={e => set('nombre', e.target.value)} required>
            <option value="">Seleccionar</option>
            {['COVID-19','Influenza','Hepatitis A','Hepatitis B','Tétanos','Neumococo','VPH','Sarampión/Rubéola','Varicela','Otra'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div><label className="text-xs text-slate-500 mb-1 block">Fecha aplicación</label><input type="date" className="input text-sm py-2" value={f.fecha_aplicacion} onChange={e => set('fecha_aplicacion', e.target.value)} /></div>
        <div><label className="text-xs text-slate-500 mb-1 block">Próxima dosis</label><input type="date" className="input text-sm py-2" value={f.proxima_dosis} onChange={e => set('proxima_dosis', e.target.value)} /></div>
        <div><label className="text-xs text-slate-500 mb-1 block">Lote</label><input className="input text-sm py-2" value={f.lote} onChange={e => set('lote', e.target.value)} /></div>
        <div><label className="text-xs text-slate-500 mb-1 block">Laboratorio</label><input className="input text-sm py-2" value={f.laboratorio} onChange={e => set('laboratorio', e.target.value)} /></div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="btn-secondary text-sm py-2">Cancelar</button>
        <button type="submit" disabled={saving} className="btn-primary text-sm py-2">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Guardar
        </button>
      </div>
    </form>
  )
}

function ProblemForm({ patientId, onDone }) {
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ cie10_codigo:'', cie10_descripcion:'', estado:'activo', notas:'' })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('patient_problems').insert([{ ...f, patient_id: patientId }])
    setSaving(false)
    onDone()
  }
  return (
    <form onSubmit={handleSubmit} className="mb-5 p-4 bg-red-50 rounded-xl border border-red-100 space-y-3">
      <p className="text-sm font-semibold text-red-600">Nuevo problema / diagnóstico</p>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-slate-500 mb-1 block">Código CIE-10</label><input className="input text-sm py-2 font-mono" placeholder="E11.9" value={f.cie10_codigo} onChange={e => set('cie10_codigo', e.target.value.toUpperCase())} /></div>
        <div><label className="text-xs text-slate-500 mb-1 block">Estado</label>
          <select className="input text-sm py-2" value={f.estado} onChange={e => set('estado', e.target.value)}>
            <option value="activo">Activo</option><option value="inactivo">Inactivo</option><option value="resuelto">Resuelto</option>
          </select>
        </div>
        <div className="col-span-2"><label className="text-xs text-slate-500 mb-1 block">Descripción *</label><input className="input text-sm py-2" placeholder="Diabetes mellitus tipo 2..." value={f.cie10_descripcion} onChange={e => set('cie10_descripcion', e.target.value)} required /></div>
        <div className="col-span-2"><label className="text-xs text-slate-500 mb-1 block">Notas</label><input className="input text-sm py-2" placeholder="Observaciones..." value={f.notas} onChange={e => set('notas', e.target.value)} /></div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="btn-secondary text-sm py-2">Cancelar</button>
        <button type="submit" disabled={saving} className="btn-primary text-sm py-2">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Guardar
        </button>
      </div>
    </form>
  )
}

function ProblemsView({ problems, onRefresh }) {
  const STATUS = { activo: { label:'Activo', cls:'bg-red-100 text-red-700' }, inactivo: { label:'Inactivo', cls:'bg-slate-100 text-slate-500' }, resuelto: { label:'Resuelto', cls:'bg-green-100 text-green-700' } }
  const changeStatus = async (id, estado) => {
    await supabase.from('patient_problems').update({ estado }).eq('id', id)
    onRefresh()
  }
  return (
    <div className="space-y-2">
      {problems.map(prob => {
        const s = STATUS[prob.estado] || STATUS.activo
        return (
          <div key={prob.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            {prob.cie10_codigo && <span className="text-xs font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600 flex-shrink-0">{prob.cie10_codigo}</span>}
            <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{prob.cie10_descripcion}</span>
            <select value={prob.estado}
              onChange={e => changeStatus(prob.id, e.target.value)}
              className={cn('text-xs px-2 py-1 rounded-full font-semibold border-0 focus:outline-none cursor-pointer', s.cls)}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="resuelto">Resuelto</option>
            </select>
          </div>
        )
      })}
    </div>
  )
}

function MedsView({ meds, onToggle }) {
  const active = meds.filter(m => m.activo)
  const inactive = meds.filter(m => !m.activo)
  return (
    <div className="space-y-3">
      {active.length > 0 && (
        <div className="space-y-2">
          {active.map(m => (
            <div key={m.id} className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
              <Pill className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{m.nombre}</p>
                <p className="text-xs text-slate-500">{[m.dosis, m.frecuencia, m.via].filter(Boolean).join(' · ')}</p>
              </div>
              <button onClick={() => onToggle(m)} title="Desactivar" className="flex-shrink-0 text-slate-300 hover:text-red-400 transition-colors">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      {inactive.length > 0 && (
        <details className="group">
          <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 list-none flex items-center gap-1">
            <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" /> {inactive.length} medicamento(s) inactivo(s)
          </summary>
          <div className="mt-2 space-y-1 opacity-50">
            {inactive.map(m => (
              <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50">
                <Pill className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-500 line-through">{m.nombre}</span>
                <button onClick={() => onToggle(m)} className="ml-auto text-slate-300 hover:text-green-500 transition-colors">
                  <CheckCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function VaccinesView({ vaccines }) {
  const hoy = new Date()
  return (
    <div className="space-y-2">
      {vaccines.map(v => {
        const pending = v.proxima_dosis && new Date(v.proxima_dosis) <= hoy
        return (
          <div key={v.id} className={cn('flex items-center gap-3 p-3 rounded-xl border',
            pending ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100')}>
            <Syringe className={cn('w-4 h-4 flex-shrink-0', pending ? 'text-amber-500' : 'text-slate-400')} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">{v.nombre}</p>
              <p className="text-xs text-slate-400">{v.fecha_aplicacion ? `Aplicada: ${formatFecha(v.fecha_aplicacion)}` : ''}{v.dosis_numero ? ` · Dosis ${v.dosis_numero}` : ''}</p>
            </div>
            {v.proxima_dosis && (
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0',
                pending ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500')}>
                {pending ? '⚠ ' : ''}{formatFecha(v.proxima_dosis)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function BackgroundView({ background, patientId, onDone }) {
  const FIELDS = [
    { k: 'alergias', label: 'Alergias' },
    { k: 'antec_patologicos', label: 'Antecedentes patológicos' },
    { k: 'antec_no_patologicos', label: 'No patológicos' },
    { k: 'antec_familiares', label: 'Heredofamiliares' },
    { k: 'antec_gineco_obstetricos', label: 'Gineco-obstétricos' },
    { k: 'antec_perinatales', label: 'Perinatales' },
    { k: 'antec_postnatales', label: 'Postnatales' },
    { k: 'antec_psiquiatricos', label: 'Psiquiátricos' },
  ]
  const { upsertBackground } = usePatientsStore()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(background || {})

  const handleSave = async () => {
    setSaving(true)
    await upsertBackground(patientId, form)
    setSaving(false)
    setEditing(false)
    onDone()
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {editing
          ? <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="btn-secondary text-xs py-1.5">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-1.5">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Guardar
              </button>
            </div>
          : <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-primary-600 font-semibold hover:underline">
              <Edit2 className="w-3 h-3" /> Editar
            </button>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FIELDS.map(({ k, label }) => (
          <div key={k}>
            <label className="text-xs font-semibold text-slate-500 block mb-1">{label}</label>
            {editing
              ? <textarea rows={2} className="input text-sm resize-none"
                  value={form[k] || ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
              : <p className={cn('text-sm', form[k] ? 'text-slate-700' : 'text-slate-300 italic')}>
                  {form[k] || 'No registrado'}
                </p>}
          </div>
        ))}
      </div>
    </div>
  )
}
