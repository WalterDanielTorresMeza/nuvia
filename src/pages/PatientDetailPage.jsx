import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePatientsStore } from '../store/patientsStore'
import { ArrowLeft, Loader2, User, Activity, Pill, Syringe, FileText, Calendar, Salad, Edit2 } from 'lucide-react'
import { calcEdad, formatFecha, cn } from '../utils'
import VitalSignsTab from '../components/patients/VitalSignsTab'
import BackgroundTab from '../components/patients/BackgroundTab'
import MedicationsTab from '../components/patients/MedicationsTab'
import VaccinesTab from '../components/patients/VaccinesTab'
import ConsultationsTab from '../components/patients/ConsultationsTab'
import DietTab from '../components/patients/DietTab'
import EditPatientModal from '../components/patients/EditPatientModal'

const TABS = [
  { id: 'signos',        label: 'Signos vitales',   icon: Activity },
  { id: 'antecedentes',  label: 'Antecedentes',      icon: FileText },
  { id: 'medicamentos',  label: 'Medicamentos',      icon: Pill },
  { id: 'vacunas',       label: 'Vacunas',           icon: Syringe },
  { id: 'consultas',     label: 'Consultas',         icon: Calendar },
  { id: 'nutricion',     label: 'Nutrición',         icon: Salad },
]

export default function PatientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { fetchPatient, currentPatient, loading } = usePatientsStore()
  const [activeTab, setActiveTab] = useState('signos')
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => { fetchPatient(id) }, [id])

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
    </div>
  )

  if (!currentPatient) return (
    <div className="text-center py-32 text-slate-500">Paciente no encontrado</div>
  )

  const p = currentPatient
  const edad = calcEdad(p.fecha_nacimiento)
  const sexoLabel = { M: 'Masculino', F: 'Femenino', Otro: 'Otro' }
  const sexoColor = { M: 'badge-blue', F: 'badge-green', Otro: 'badge-gray' }

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate('/pacientes')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Regresar a pacientes
      </button>

      {/* Patient header card */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              {p.foto_url ? (
                <img src={p.foto_url} alt="" className="w-16 h-16 rounded-2xl object-cover" />
              ) : (
                <span className="text-primary-700 font-bold text-xl">
                  {p.nombre?.[0]}{p.apellidos?.[0]}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-800">
                  {p.nombre} {p.apellidos}
                </h1>
                <span className={sexoColor[p.sexo] || 'badge-gray'}>
                  {sexoLabel[p.sexo] || p.sexo}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 flex-wrap">
                {edad && (
                  <span className="text-sm text-slate-500">{edad} años · {formatFecha(p.fecha_nacimiento)}</span>
                )}
                {p.tipo_sangre && (
                  <span className="text-sm font-semibold text-red-600">
                    Tipo {p.tipo_sangre}
                  </span>
                )}
                {p.curp && (
                  <span className="text-xs font-mono text-slate-400">{p.curp}</span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 flex-wrap">
                {p.telefono && <span className="text-sm text-slate-500">📱 {p.telefono}</span>}
                {p.email && <span className="text-sm text-slate-500">✉️ {p.email}</span>}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowEdit(true)}
            className="btn-secondary flex-shrink-0"
          >
            <Edit2 className="w-4 h-4" /> Editar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-0 overflow-x-auto">
          {TABS.map(({ id: tabId, label, icon: Icon }) => (
            <button
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tabId
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'signos'       && <VitalSignsTab patient={p} />}
        {activeTab === 'antecedentes' && <BackgroundTab patient={p} />}
        {activeTab === 'medicamentos' && <MedicationsTab patient={p} />}
        {activeTab === 'vacunas'      && <VaccinesTab patient={p} />}
        {activeTab === 'consultas'    && <ConsultationsTab patient={p} />}
        {activeTab === 'nutricion'    && <DietTab patient={p} />}
      </div>

      {showEdit && <EditPatientModal patient={p} onClose={() => setShowEdit(false)} />}
    </div>
  )
}
