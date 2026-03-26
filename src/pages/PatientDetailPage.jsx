import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePatientsStore } from '../store/patientsStore'
import { supabase } from '../lib/supabase'
import {
  ArrowLeft, Edit2, Plus, Loader2, ChevronDown, ChevronUp,
  CheckCircle, Clock, XCircle, Calendar
} from 'lucide-react'
import {
  FaStethoscope, FaHeartPulse, FaWeightScale, FaLungs,
  FaPills, FaFileMedical, FaNotesMedical,
  FaUserDoctor, FaClipboardList, FaTemperatureHalf,
  FaDroplet, FaTriangleExclamation, FaPaperclip
} from 'react-icons/fa6'
import { MdVaccines } from 'react-icons/md'
import { GiBodyHeight } from 'react-icons/gi'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'
import { calcEdad, calcIMC, clasificarIMC, formatFecha, formatFechaHora, cn } from '../utils'
import EditPatientModal from '../components/patients/EditPatientModal'
import ConsultationModal from '../components/patients/ConsultationModal'

/* ─── mini helpers ──────────────────────────────────────────────── */
function Card({ children, className = '' }) {
  return (
    <div className={cn('bg-white rounded-2xl border border-slate-200', className)}>
      {children}
    </div>
  )
}

function SectionHeader({ icon: Icon, iconBg, iconColor, title, badge, action, collapsible, open, onToggle }) {
  return (
    <div
      onClick={() => collapsible && onToggle?.()}
      className={cn(
        'flex items-center justify-between px-5 py-3.5 border-b border-slate-100',
        collapsible && 'cursor-pointer hover:bg-slate-50 select-none'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
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
          ? <ChevronUp className="w-4 h-4 text-slate-300" />
          : <ChevronDown className="w-4 h-4 text-slate-300" />)}
      </div>
    </div>
  )
}

function CollapsibleCard({ icon, iconBg, iconColor, title, badge, action, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card>
      <SectionHeader icon={icon} iconBg={iconBg} iconColor={iconColor} title={title}
        badge={badge} action={action} collapsible open={open} onToggle={() => setOpen(o => !o)} />
      {open && <div className="p-5">{children}</div>}
    </Card>
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

function AddBtn({ onClick, label = 'Agregar' }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1 text-xs text-primary-600 font-semibold hover:underline">
      <Plus className="w-3.5 h-3.5" /> {label}
    </button>
  )
}

/* ─── stat card ─────────────────────────────────────────────────── */
function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub, alert }) {
  return (
    <Card className={cn('p-4 flex items-center gap-4', alert && 'border-red-200 bg-red-50')}>
      <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0', iconBg)}>
        <Icon className={cn('w-5 h-5', iconColor)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 leading-tight">{label}</p>
        <p className={cn('text-lg font-bold leading-tight truncate', alert ? 'text-red-600' : 'text-slate-800')}>{value}</p>
        {sub && <p className="text-xs text-slate-400 leading-tight truncate">{sub}</p>}
      </div>
    </Card>
  )
}

/* ─── vital chip ────────────────────────────────────────────────── */
function VitalChip({ icon: Icon, label, value, unit, alert }) {
  return (
    <div className={cn('flex flex-col gap-0.5 p-3 rounded-xl', alert ? 'bg-red-50' : 'bg-slate-50')}>
      <div className="flex items-center gap-1.5">
        <Icon className={cn('w-3.5 h-3.5', alert ? 'text-red-500' : 'text-slate-400')} />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className="flex items-end gap-1">
        <span className={cn('text-base font-bold leading-none', alert ? 'text-red-600' : 'text-slate-800')}>{value}</span>
        {unit && <span className="text-xs text-slate-400 mb-0.5">{unit}</span>}
      </div>
    </div>
  )
}

/* ─── main component ────────────────────────────────────────────── */
export default function PatientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { fetchPatient, currentPatient, loading, updateMedication } = usePatientsStore()

  const [showEdit, setShowEdit]           = useState(false)
  const [openConsult, setOpenConsult]     = useState(null)
  const [problems, setProblems]           = useState([])
  const [notes, setNotes]                 = useState([])
  const [files, setFiles]                 = useState([])
  const [showVitalsForm, setShowVitalsForm] = useState(false)
  const [showMedForm, setShowMedForm]     = useState(false)
  const [showVaxForm, setShowVaxForm]     = useState(false)
  const [showProbForm, setShowProbForm]   = useState(false)

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
  const lastConsult = consultations[0]
  const alergias = p.clinical_background?.alergias

  const imc = latest?.imc
  const imcInfo = imc ? clasificarIMC(imc) : null

  const imcColor = !imcInfo ? 'text-slate-800'
    : imcInfo.label === 'Normal' ? 'text-emerald-600'
    : imcInfo.label?.includes('Obesidad') ? 'text-red-600'
    : 'text-amber-600'

  const sexLabel = { M: 'Masculino', F: 'Femenino', Otro: 'Otro' }

  const refresh = () => {
    fetchPatient(id)
    supabase.from('patient_problems').select('*').eq('patient_id', id).order('created_at', { ascending: false })
      .then(({ data }) => setProblems(data || []))
  }

  // Chart data: last 7 vitals reversed (oldest→newest)
  const chartData = vitals.slice(0, 7).reverse().map(v => ({
    fecha: formatFecha(v.fecha),
    pas: v.presion_sistolica,
    fc: v.frec_cardiaca,
    peso: v.peso_kg,
  }))

  return (
    <div className="min-h-screen bg-slate-50 -m-6">

      {/* ══ STICKY HEADER ══════════════════════════════════════════ */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 px-6 py-3 max-w-screen-xl mx-auto">
          <button onClick={() => navigate('/pacientes')}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Pacientes</span>
          </button>

          <div className="w-px h-6 bg-slate-200 flex-shrink-0" />

          {/* Avatar + name */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0 shadow-sm">
              {p.nombre?.[0]}{p.apellidos?.[0]}
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-slate-800 text-base leading-tight truncate">
                {p.nombre} {p.apellidos}
              </h1>
              <p className="text-xs text-slate-400 leading-tight truncate">
                {sexLabel[p.sexo] || p.sexo}
                {edad ? ` · ${edad} años` : ''}
                {p.tipo_sangre && (
                  <span className="text-red-500 font-semibold"> · {p.tipo_sangre}</span>
                )}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Editar</span>
            </button>
            <button onClick={() => setOpenConsult('new')}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-sm">
              <FaStethoscope className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nueva consulta</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-5">

        {/* ══ ALLERGY ALERT ══════════════════════════════════════════ */}
        {alergias && (
          <div className="flex items-center gap-3 px-5 py-3.5 bg-red-50 border border-red-200 rounded-2xl">
            <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FaTriangleExclamation className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-red-600 uppercase tracking-wide">Alergias conocidas</span>
              <p className="text-sm text-red-700 leading-snug">{alergias}</p>
            </div>
          </div>
        )}

        {/* ══ 4 STAT CARDS ═══════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Calendar}
            iconBg="bg-primary-50" iconColor="text-primary-500"
            label="Última consulta"
            value={lastConsult ? formatFecha(lastConsult.fecha) : 'Sin registro'}
            sub={lastConsult?.motivo || undefined}
          />
          <StatCard
            icon={FaClipboardList}
            iconBg={activeProblems.length > 0 ? 'bg-red-100' : 'bg-slate-100'}
            iconColor={activeProblems.length > 0 ? 'text-red-500' : 'text-slate-400'}
            label="Problemas activos"
            value={activeProblems.length}
            sub={activeProblems[0]?.cie10_descripcion || 'Sin problemas'}
            alert={activeProblems.length > 0}
          />
          <StatCard
            icon={FaPills}
            iconBg="bg-purple-50" iconColor="text-purple-500"
            label="Medicamentos activos"
            value={activeMeds.length}
            sub={activeMeds[0]?.nombre || 'Sin medicamentos'}
          />
          <StatCard
            icon={FaWeightScale}
            iconBg={imcInfo && imcInfo.label !== 'Normal' ? 'bg-amber-50' : 'bg-emerald-50'}
            iconColor={imcColor}
            label="IMC / Peso"
            value={imc ? `${imc} kg/m²` : latest?.peso_kg ? `${latest.peso_kg} kg` : '—'}
            sub={imcInfo?.label || (latest?.peso_kg ? 'Sin IMC' : 'Sin registro')}
          />
        </div>

        {/* ══ MAIN 2-COLUMN GRID ═════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── LEFT: Consultas (3/5) ─────────────────────────────── */}
          <div className="lg:col-span-3">
            <CollapsibleCard
              icon={FaStethoscope} iconBg="bg-primary-50" iconColor="text-primary-500"
              title="Historial de consultas" badge={consultations.length}
              action={<AddBtn onClick={() => setOpenConsult('new')} label="Nueva" />}
            >
              {consultations.length === 0
                ? <EmptyState icon={FaStethoscope} text="Sin consultas registradas" />
                : (
                  <div className="space-y-2">
                    {consultations.map((c, i) => (
                      <button key={c.id} onClick={() => setOpenConsult(c)}
                        className="w-full flex items-stretch gap-3 text-left group">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center gap-0 flex-shrink-0 pt-1">
                          <div className={cn('w-3 h-3 rounded-full border-2 flex-shrink-0 mt-1',
                            c.estado === 'terminada'
                              ? 'bg-green-400 border-green-400'
                              : 'bg-blue-400 border-blue-400')} />
                          {i < consultations.length - 1 && (
                            <div className="w-px flex-1 bg-slate-200 mt-1" style={{ minHeight: '24px' }} />
                          )}
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-3">
                          <div className={cn(
                            'flex items-center justify-between gap-2 p-3 rounded-xl border transition-all',
                            'group-hover:shadow-sm group-hover:border-primary-200 group-hover:bg-primary-50/30',
                            c.estado === 'terminada' ? 'border-slate-200 bg-white' : 'border-blue-100 bg-blue-50/40'
                          )}>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">
                                {c.motivo || 'Consulta general'}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                <span className="text-xs text-slate-400">{formatFecha(c.fecha)}</span>
                                {c.diagnostico_cie10 && (
                                  <span className="text-xs font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                    {c.diagnostico_cie10}
                                  </span>
                                )}
                                {c.diagnostico && (
                                  <span className="text-xs text-slate-400 truncate max-w-[200px]">{c.diagnostico}</span>
                                )}
                              </div>
                            </div>
                            <span className={cn(
                              'text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0',
                              c.estado === 'terminada'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            )}>
                              {c.estado === 'terminada' ? '✓ Terminada' : '● Activa'}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
            </CollapsibleCard>
          </div>

          {/* ── RIGHT: Estado actual (2/5) ───────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Problemas activos */}
            <Card>
              <SectionHeader
                icon={FaClipboardList} iconBg="bg-red-50" iconColor="text-red-500"
                title="Problemas" badge={activeProblems.length}
                action={<AddBtn onClick={() => setShowProbForm(v => !v)} />}
              />
              <div className="p-4 space-y-3">
                {showProbForm && (
                  <ProblemForm patientId={p.id} onDone={() => { setShowProbForm(false); refresh() }} />
                )}
                {problems.length === 0 && !showProbForm
                  ? <EmptyState icon={FaClipboardList} text="Sin problemas registrados" />
                  : <ProblemsView problems={problems} onRefresh={refresh} />}
              </div>
            </Card>

            {/* Medicamentos */}
            <Card>
              <SectionHeader
                icon={FaPills} iconBg="bg-purple-50" iconColor="text-purple-500"
                title="Medicamentos" badge={activeMeds.length}
                action={<AddBtn onClick={() => setShowMedForm(v => !v)} />}
              />
              <div className="p-4 space-y-3">
                {showMedForm && (
                  <MedForm patientId={p.id} onDone={() => { setShowMedForm(false); fetchPatient(id) }} />
                )}
                {meds.length === 0 && !showMedForm
                  ? <EmptyState icon={FaPills} text="Sin medicamentos" />
                  : <MedsView meds={meds} onToggle={async (med) => {
                      await updateMedication(med.id, { activo: !med.activo })
                      fetchPatient(id)
                    }} />}
              </div>
            </Card>

            {/* Vacunas */}
            <Card>
              <SectionHeader
                icon={MdVaccines} iconBg="bg-amber-50" iconColor="text-amber-500"
                title="Vacunas" badge={vaccines.length}
                action={<AddBtn onClick={() => setShowVaxForm(v => !v)} label="Registrar" />}
              />
              <div className="p-4 space-y-3">
                {showVaxForm && (
                  <VaxForm patientId={p.id} onDone={() => { setShowVaxForm(false); fetchPatient(id) }} />
                )}
                {vaccines.length === 0 && !showVaxForm
                  ? <EmptyState icon={MdVaccines} text="Sin vacunas registradas" />
                  : <VaccinesView vaccines={vaccines} />}
              </div>
            </Card>

          </div>
        </div>

        {/* ══ SIGNOS VITALES ═════════════════════════════════════════ */}
        <CollapsibleCard
          icon={FaHeartPulse} iconBg="bg-rose-50" iconColor="text-rose-500"
          title="Signos vitales"
          action={<AddBtn onClick={() => setShowVitalsForm(v => !v)} label="Registrar" />}
          defaultOpen={!!latest}
        >
          {showVitalsForm && (
            <VitalsForm patientId={p.id} onDone={() => { setShowVitalsForm(false); fetchPatient(id) }} />
          )}
          {latest ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-400">Última medición: {formatFechaHora(latest.fecha)}</span>
              </div>

              {/* Vital chips grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {latest.peso_kg    && <VitalChip icon={FaWeightScale} label="Peso" value={latest.peso_kg} unit="kg" />}
                {latest.talla_cm   && <VitalChip icon={GiBodyHeight} label="Talla" value={latest.talla_cm} unit="cm" />}
                {latest.imc        && <VitalChip icon={FaWeightScale} label="IMC" value={latest.imc} unit="kg/m²"
                  alert={latest.imc >= 30 || latest.imc < 18.5} />}
                {latest.temperatura && <VitalChip icon={FaTemperatureHalf} label="Temperatura" value={latest.temperatura} unit="°C"
                  alert={latest.temperatura >= 38} />}
                {latest.frec_cardiaca && <VitalChip icon={FaHeartPulse} label="Frec. cardíaca" value={latest.frec_cardiaca} unit="lpm"
                  alert={latest.frec_cardiaca > 100 || latest.frec_cardiaca < 60} />}
                {latest.frec_respiratoria && <VitalChip icon={FaLungs} label="Frec. resp." value={latest.frec_respiratoria} unit="rpm"
                  alert={latest.frec_respiratoria > 20 || latest.frec_respiratoria < 12} />}
                {latest.presion_sistolica && <VitalChip icon={FaDroplet} label="Presión" value={`${latest.presion_sistolica}/${latest.presion_diastolica}`} unit="mmHg"
                  alert={latest.presion_sistolica >= 140} />}
                {latest.saturacion_o2 && <VitalChip icon={FaLungs} label="SpO₂" value={latest.saturacion_o2} unit="%"
                  alert={latest.saturacion_o2 < 95} />}
                {latest.porc_grasa && <VitalChip icon={FaWeightScale} label="% Grasa" value={latest.porc_grasa} unit="%" />}
                {latest.masa_muscular && <VitalChip icon={FaWeightScale} label="M. Muscular" value={latest.masa_muscular} unit="kg" />}
              </div>

              {/* Mini chart if multiple readings */}
              {chartData.length >= 2 && (
                <div className="mt-2">
                  <p className="text-xs text-slate-400 mb-2">Evolución presión sistólica / frec. cardíaca</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="gPas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gFc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #e2e8f0' }}
                        labelStyle={{ fontWeight: 600 }}
                      />
                      <Area type="monotone" dataKey="pas" name="P. sistólica" stroke="#f43f5e" strokeWidth={2}
                        fill="url(#gPas)" dot={false} activeDot={{ r: 4 }} />
                      <Area type="monotone" dataKey="fc" name="Frec. cardíaca" stroke="#6366f1" strokeWidth={2}
                        fill="url(#gFc)" dot={false} activeDot={{ r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : !showVitalsForm && (
            <EmptyState icon={FaHeartPulse} text="Sin mediciones registradas" />
          )}
        </CollapsibleCard>

        {/* ══ BOTTOM ROW: Antecedentes · Notas · Archivos ════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Antecedentes */}
          <CollapsibleCard
            icon={FaNotesMedical} iconBg="bg-teal-50" iconColor="text-teal-500"
            title="Antecedentes" defaultOpen={false}
          >
            <BackgroundView background={p.clinical_background} patientId={p.id} onDone={() => fetchPatient(id)} />
          </CollapsibleCard>

          {/* Notas clínicas */}
          <CollapsibleCard
            icon={FaFileMedical} iconBg="bg-indigo-50" iconColor="text-indigo-500"
            title="Notas clínicas" badge={notes.length} defaultOpen={notes.length > 0}
          >
            {notes.length === 0
              ? <EmptyState icon={FaFileMedical} text="Sin notas clínicas" />
              : <div className="space-y-2">
                  {notes.map(n => (
                    <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-400 mb-1">{formatFechaHora(n.created_at)}</p>
                      <div className="text-sm text-slate-700 prose prose-sm max-w-none line-clamp-3"
                        dangerouslySetInnerHTML={{ __html: n.contenido }} />
                    </div>
                  ))}
                </div>}
          </CollapsibleCard>

          {/* Archivos */}
          <CollapsibleCard
            icon={FaPaperclip} iconBg="bg-slate-100" iconColor="text-slate-500"
            title="Archivos adjuntos" badge={files.length} defaultOpen={files.length > 0}
          >
            {files.length === 0
              ? <EmptyState icon={FaPaperclip} text="Sin archivos adjuntos" />
              : <div className="grid grid-cols-2 gap-2">
                  {files.map(f => (
                    <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer"
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary-200 hover:bg-primary-50 transition-all group text-center">
                      <FaPaperclip className="w-5 h-5 text-slate-400 group-hover:text-primary-500 mx-auto mb-1" />
                      <p className="text-xs text-slate-600 truncate">{f.nombre}</p>
                    </a>
                  ))}
                </div>}
          </CollapsibleCard>

        </div>

        {/* ══ DATOS DEL PACIENTE ══════════════════════════════════════ */}
        <CollapsibleCard
          icon={FaUserDoctor} iconBg="bg-slate-100" iconColor="text-slate-500"
          title="Datos del paciente" defaultOpen={false}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { label: 'Tipo de sangre', value: p.tipo_sangre, highlight: 'text-red-600 font-bold text-base' },
              { label: 'CURP', value: p.curp, mono: true },
              { label: 'Teléfono', value: p.telefono },
              { label: 'Correo electrónico', value: p.email },
              { label: 'Dirección', value: p.direccion },
              { label: 'Fecha de nacimiento', value: p.fecha_nacimiento ? formatFecha(p.fecha_nacimiento) : null },
              { label: 'Sexo', value: sexLabel[p.sexo] || p.sexo },
              { label: 'Edad', value: edad ? `${edad} años` : null },
            ].filter(d => d.value).map(({ label, value, highlight, mono }) => (
              <div key={label}>
                <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                <p className={cn('text-sm', highlight || 'text-slate-700', mono && 'font-mono')}>{value}</p>
              </div>
            ))}
          </div>
        </CollapsibleCard>

      </div>

      {/* ── Modals ──────────────────────────────────────────────── */}
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

/* ─── VitalsForm ────────────────────────────────────────────────── */
function VitalsForm({ patientId, onDone }) {
  const { addVitalSigns } = usePatientsStore()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    peso_kg:'', talla_cm:'', temperatura:'', frec_cardiaca:'',
    frec_respiratoria:'', presion_sistolica:'', presion_diastolica:'',
    saturacion_o2:'', porc_grasa:'', masa_muscular:''
  })
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))
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

  const fields = [
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
  ]

  return (
    <form onSubmit={handleSubmit} className="mb-4 p-4 bg-rose-50 rounded-xl border border-rose-100 space-y-3">
      <p className="text-sm font-semibold text-rose-700 flex items-center gap-2">
        <FaHeartPulse className="w-4 h-4" /> Nueva medición de signos vitales
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {fields.map(({ k, label, ph }) => (
          <div key={k}>
            <label className="text-xs text-slate-500 mb-1 block">{label}</label>
            <input type="number" step="0.1" className="input text-sm py-2" placeholder={ph}
              value={f[k]} onChange={e => set(k, e.target.value)} />
          </div>
        ))}
        {imc && (
          <div>
            <label className="text-xs text-slate-500 mb-1 block">IMC (calculado)</label>
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

/* ─── MedForm ───────────────────────────────────────────────────── */
function MedForm({ patientId, onDone }) {
  const { addMedication } = usePatientsStore()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ nombre:'', dosis:'', frecuencia:'', via:'', notas:'' })
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await addMedication({ ...f, patient_id: patientId, activo: true })
    setSaving(false)
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 p-4 bg-purple-50 rounded-xl border border-purple-100 space-y-3">
      <p className="text-sm font-semibold text-purple-700 flex items-center gap-2">
        <FaPills className="w-4 h-4" /> Nuevo medicamento
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-slate-500 mb-1 block">Nombre *</label>
          <input className="input text-sm py-2" placeholder="Metformina 850mg"
            value={f.nombre} onChange={e => set('nombre', e.target.value)} required />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Dosis</label>
          <input className="input text-sm py-2" placeholder="850mg" value={f.dosis} onChange={e => set('dosis', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Frecuencia</label>
          <input className="input text-sm py-2" placeholder="Cada 12 hrs" value={f.frecuencia} onChange={e => set('frecuencia', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Vía</label>
          <select className="input text-sm py-2" value={f.via} onChange={e => set('via', e.target.value)}>
            <option value="">—</option>
            {['Oral','IV','IM','SC','Tópica','Inhalatoria','Sublingual'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Notas</label>
          <input className="input text-sm py-2" placeholder="Con alimentos..." value={f.notas} onChange={e => set('notas', e.target.value)} />
        </div>
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

/* ─── VaxForm ───────────────────────────────────────────────────── */
function VaxForm({ patientId, onDone }) {
  const { addVaccine } = usePatientsStore()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ nombre:'', fecha_aplicacion:'', lote:'', laboratorio:'', dosis_numero:'', proxima_dosis:'' })
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await addVaccine({ ...f, patient_id: patientId })
    setSaving(false)
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-3">
      <p className="text-sm font-semibold text-amber-700 flex items-center gap-2">
        <MdVaccines className="w-4 h-4" /> Nueva vacuna
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-slate-500 mb-1 block">Vacuna *</label>
          <select className="input text-sm py-2" value={f.nombre} onChange={e => set('nombre', e.target.value)} required>
            <option value="">Seleccionar...</option>
            {['COVID-19','Influenza','Hepatitis A','Hepatitis B','Tétanos','Neumococo','VPH','Sarampión/Rubéola','Varicela','Otra'].map(v => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Fecha aplicación</label>
          <input type="date" className="input text-sm py-2" value={f.fecha_aplicacion} onChange={e => set('fecha_aplicacion', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Próxima dosis</label>
          <input type="date" className="input text-sm py-2" value={f.proxima_dosis} onChange={e => set('proxima_dosis', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Lote</label>
          <input className="input text-sm py-2" value={f.lote} onChange={e => set('lote', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Laboratorio</label>
          <input className="input text-sm py-2" value={f.laboratorio} onChange={e => set('laboratorio', e.target.value)} />
        </div>
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

/* ─── ProblemForm ───────────────────────────────────────────────── */
function ProblemForm({ patientId, onDone }) {
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ cie10_codigo:'', cie10_descripcion:'', estado:'activo', notas:'' })
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('patient_problems').insert([{ ...f, patient_id: patientId }])
    setSaving(false)
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 p-4 bg-red-50 rounded-xl border border-red-100 space-y-3">
      <p className="text-sm font-semibold text-red-600 flex items-center gap-2">
        <FaClipboardList className="w-4 h-4" /> Nuevo problema / diagnóstico
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Código CIE-10</label>
          <input className="input text-sm py-2 font-mono" placeholder="E11.9"
            value={f.cie10_codigo} onChange={e => set('cie10_codigo', e.target.value.toUpperCase())} />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Estado</label>
          <select className="input text-sm py-2" value={f.estado} onChange={e => set('estado', e.target.value)}>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="resuelto">Resuelto</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-slate-500 mb-1 block">Descripción *</label>
          <input className="input text-sm py-2" placeholder="Diabetes mellitus tipo 2..."
            value={f.cie10_descripcion} onChange={e => set('cie10_descripcion', e.target.value)} required />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-slate-500 mb-1 block">Notas</label>
          <input className="input text-sm py-2" placeholder="Observaciones..."
            value={f.notas} onChange={e => set('notas', e.target.value)} />
        </div>
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

/* ─── ProblemsView ──────────────────────────────────────────────── */
function ProblemsView({ problems, onRefresh }) {
  const STATUS = {
    activo:   { label:'Activo',   cls:'bg-red-100 text-red-700' },
    inactivo: { label:'Inactivo', cls:'bg-slate-100 text-slate-500' },
    resuelto: { label:'Resuelto', cls:'bg-green-100 text-green-700' },
  }
  const changeStatus = async (id, estado) => {
    await supabase.from('patient_problems').update({ estado }).eq('id', id)
    onRefresh()
  }
  return (
    <div className="space-y-2">
      {problems.map(prob => {
        const s = STATUS[prob.estado] || STATUS.activo
        return (
          <div key={prob.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            {prob.cie10_codigo && (
              <span className="text-xs font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600 flex-shrink-0">
                {prob.cie10_codigo}
              </span>
            )}
            <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{prob.cie10_descripcion}</span>
            <select value={prob.estado} onChange={e => changeStatus(prob.id, e.target.value)}
              className={cn('text-xs px-2 py-1 rounded-full font-semibold border-0 focus:outline-none cursor-pointer flex-shrink-0', s.cls)}>
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

/* ─── MedsView ──────────────────────────────────────────────────── */
function MedsView({ meds, onToggle }) {
  const active = meds.filter(m => m.activo)
  const inactive = meds.filter(m => !m.activo)
  return (
    <div className="space-y-2">
      {active.map(m => (
        <div key={m.id} className="flex items-start gap-2.5 p-2.5 bg-purple-50 rounded-xl border border-purple-100">
          <FaPills className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">{m.nombre}</p>
            <p className="text-xs text-slate-500">{[m.dosis, m.frecuencia, m.via].filter(Boolean).join(' · ')}</p>
          </div>
          <button onClick={() => onToggle(m)} title="Desactivar"
            className="flex-shrink-0 text-slate-300 hover:text-red-400 transition-colors mt-0.5">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      ))}
      {inactive.length > 0 && (
        <details className="group">
          <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 list-none flex items-center gap-1 mt-1">
            <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
            {inactive.length} inactivo(s)
          </summary>
          <div className="mt-2 space-y-1 opacity-50">
            {inactive.map(m => (
              <div key={m.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50">
                <FaPills className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-500 line-through flex-1">{m.nombre}</span>
                <button onClick={() => onToggle(m)} className="text-slate-300 hover:text-green-500 transition-colors">
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

/* ─── VaccinesView ──────────────────────────────────────────────── */
function VaccinesView({ vaccines }) {
  const hoy = new Date()
  return (
    <div className="space-y-2">
      {vaccines.map(v => {
        const pending = v.proxima_dosis && new Date(v.proxima_dosis) <= hoy
        return (
          <div key={v.id} className={cn(
            'flex items-center gap-2.5 p-2.5 rounded-xl border',
            pending ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'
          )}>
            <MdVaccines className={cn('w-4 h-4 flex-shrink-0', pending ? 'text-amber-500' : 'text-slate-400')} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">{v.nombre}</p>
              <p className="text-xs text-slate-400">
                {v.fecha_aplicacion ? `Aplicada: ${formatFecha(v.fecha_aplicacion)}` : ''}
                {v.dosis_numero ? ` · Dosis ${v.dosis_numero}` : ''}
              </p>
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

/* ─── BackgroundView ────────────────────────────────────────────── */
function BackgroundView({ background, patientId, onDone }) {
  const FIELDS = [
    { k: 'alergias',               label: 'Alergias' },
    { k: 'antec_patologicos',      label: 'Patológicos' },
    { k: 'antec_no_patologicos',   label: 'No patológicos' },
    { k: 'antec_familiares',       label: 'Heredofamiliares' },
    { k: 'antec_gineco_obstetricos', label: 'Gineco-obstétricos' },
    { k: 'antec_perinatales',      label: 'Perinatales' },
    { k: 'antec_postnatales',      label: 'Postnatales' },
    { k: 'antec_psiquiatricos',    label: 'Psiquiátricos' },
  ]
  const { upsertBackground } = usePatientsStore()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState(background || {})

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
          : <button onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-xs text-primary-600 font-semibold hover:underline">
              <Edit2 className="w-3 h-3" /> Editar
            </button>}
      </div>
      <div className="space-y-3">
        {FIELDS.map(({ k, label }) => (
          <div key={k}>
            <label className="text-xs font-semibold text-slate-500 block mb-1">{label}</label>
            {editing
              ? <textarea rows={2} className="input text-sm resize-none w-full"
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
