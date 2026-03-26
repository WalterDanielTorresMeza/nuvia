import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePatientsStore } from '../store/patientsStore'
import { Plus, Search, Loader2, SlidersHorizontal, Users, X } from 'lucide-react'
import { FaUserDoctor, FaMars, FaVenus, FaDroplet } from 'react-icons/fa6'
import { calcEdad, formatFecha, cn } from '../utils'
import NewPatientModal from '../components/patients/NewPatientModal'

/* ── Blood type colors ── */
const BLOOD_COLORS = {
  'A+':  { bg: 'bg-blue-500',   text: 'text-white' },
  'A-':  { bg: 'bg-blue-400',   text: 'text-white' },
  'B+':  { bg: 'bg-emerald-500', text: 'text-white' },
  'B-':  { bg: 'bg-emerald-400', text: 'text-white' },
  'AB+': { bg: 'bg-purple-500',  text: 'text-white' },
  'AB-': { bg: 'bg-purple-400',  text: 'text-white' },
  'O+':  { bg: 'bg-red-500',     text: 'text-white' },
  'O-':  { bg: 'bg-red-400',     text: 'text-white' },
}

/* ── Avatar gradient per letter ── */
const AVATAR_GRADIENTS = [
  'from-sky-400 to-blue-600',
  'from-violet-400 to-purple-600',
  'from-emerald-400 to-teal-600',
  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500',
  'from-cyan-400 to-sky-600',
  'from-fuchsia-400 to-pink-600',
  'from-lime-400 to-green-600',
]

function avatarGradient(name = '') {
  const code = (name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[code]
}

/* ── Stat card ── */
function StatPill({ icon: Icon, label, value, color = 'text-slate-700', bg = 'bg-white' }) {
  return (
    <div className={cn('flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-slate-200', bg)}>
      <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
        <Icon className={cn('w-4 h-4', color)} />
      </div>
      <div>
        <p className="text-xs text-slate-400 leading-tight">{label}</p>
        <p className={cn('text-lg font-bold leading-tight', color)}>{value}</p>
      </div>
    </div>
  )
}

/* ── Patient card ── */
function PatientCard({ patient, onClick }) {
  const edad = calcEdad(patient.fecha_nacimiento)
  const blood = BLOOD_COLORS[patient.tipo_sangre]
  const grad = avatarGradient(patient.nombre)
  const sexLabel = patient.sexo === 'M' ? 'Masculino' : patient.sexo === 'F' ? 'Femenino' : patient.sexo

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200 hover:border-primary-300 hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
    >
      {/* Card top strip */}
      <div className={cn('h-2 w-full bg-gradient-to-r', grad)} />

      <div className="p-5">
        {/* Avatar + blood type */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            'w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-sm',
            grad
          )}>
            <span className="text-white font-bold text-lg leading-none">
              {patient.nombre?.[0]}{patient.apellidos?.[0]}
            </span>
          </div>
          {patient.tipo_sangre && blood && (
            <div className={cn('flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold', blood.bg, blood.text)}>
              <FaDroplet className="w-2.5 h-2.5" />
              {patient.tipo_sangre}
            </div>
          )}
        </div>

        {/* Name */}
        <h3 className="font-bold text-slate-800 text-base leading-tight truncate group-hover:text-primary-700 transition-colors">
          {patient.nombre} {patient.apellidos}
        </h3>

        {/* Age + sex */}
        <div className="flex items-center gap-2 mt-1.5 mb-4">
          <div className="flex items-center gap-1">
            {patient.sexo === 'M'
              ? <FaMars className="w-3 h-3 text-blue-400" />
              : patient.sexo === 'F'
              ? <FaVenus className="w-3 h-3 text-pink-400" />
              : null}
            <span className="text-xs text-slate-500">{sexLabel}</span>
          </div>
          {edad != null && (
            <>
              <span className="text-slate-200">·</span>
              <span className="text-xs text-slate-500">{edad} años</span>
            </>
          )}
          {patient.fecha_nacimiento && (
            <>
              <span className="text-slate-200">·</span>
              <span className="text-xs text-slate-400">{formatFecha(patient.fecha_nacimiento)}</span>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-100 mb-4" />

        {/* Contact info */}
        <div className="space-y-1.5">
          {patient.telefono && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-14 flex-shrink-0">Teléfono</span>
              <span className="text-xs text-slate-600 font-medium">{patient.telefono}</span>
            </div>
          )}
          {patient.email && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-14 flex-shrink-0">Correo</span>
              <span className="text-xs text-slate-600 truncate">{patient.email}</span>
            </div>
          )}
          {patient.curp && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-14 flex-shrink-0">CURP</span>
              <span className="text-xs font-mono text-slate-500 truncate">{patient.curp}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          Registrado {formatFecha(patient.created_at)}
        </span>
        <span className="text-xs font-semibold text-primary-600 group-hover:text-primary-700 transition-colors">
          Ver expediente →
        </span>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════ */
export default function PatientsPage() {
  const { patients, fetchPatients, loading } = usePatientsStore()
  const [search, setSearch]       = useState('')
  const [filterSex, setFilterSex] = useState('') // '' | 'M' | 'F'
  const [showModal, setShowModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { fetchPatients() }, [])

  const filtered = patients.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      p.nombre?.toLowerCase().includes(q) ||
      p.apellidos?.toLowerCase().includes(q) ||
      p.curp?.toLowerCase().includes(q) ||
      p.telefono?.includes(q) ||
      p.email?.toLowerCase().includes(q)
    const matchSex = !filterSex || p.sexo === filterSex
    return matchSearch && matchSex
  })

  const totalM = patients.filter(p => p.sexo === 'M').length
  const totalF = patients.filter(p => p.sexo === 'F').length

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pacientes</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {loading ? 'Cargando...' : `${patients.length} pacientes registrados`}
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nuevo paciente
        </button>
      </div>

      {/* ── Stats ── */}
      {!loading && patients.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatPill icon={Users} label="Total pacientes" value={patients.length} color="text-primary-600" />
          <StatPill icon={FaMars} label="Masculino" value={totalM} color="text-blue-500" />
          <StatPill icon={FaVenus} label="Femenino" value={totalF} color="text-pink-500" />
        </div>
      )}

      {/* ── Search + Filters ── */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, CURP, teléfono..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-primary-300 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button onClick={() => setShowFilters(f => !f)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-medium transition-colors',
            showFilters || filterSex
              ? 'bg-primary-50 border-primary-300 text-primary-700'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          )}>
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
          {filterSex && <span className="w-1.5 h-1.5 bg-primary-500 rounded-full" />}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-2xl">
          <span className="text-xs text-slate-500 font-medium mr-1">Sexo:</span>
          {[
            { val: '', label: 'Todos' },
            { val: 'M', label: 'Masculino' },
            { val: 'F', label: 'Femenino' },
          ].map(opt => (
            <button key={opt.val} onClick={() => setFilterSex(opt.val)}
              className={cn(
                'px-3 py-1 rounded-xl text-xs font-semibold transition-colors',
                filterSex === opt.val
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      {loading && patients.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>

      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <FaUserDoctor className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-600 font-medium">
            {search || filterSex ? 'Sin resultados para esa búsqueda' : 'No hay pacientes registrados'}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            {search || filterSex ? 'Intenta con otros términos o quita los filtros' : 'Agrega tu primer paciente para comenzar'}
          </p>
          {!search && !filterSex && (
            <button onClick={() => setShowModal(true)}
              className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl text-sm font-semibold transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Agregar primer paciente
            </button>
          )}
        </div>

      ) : (
        <div>
          {(search || filterSex) && (
            <p className="text-xs text-slate-400 mb-4">{filtered.length} resultado(s)</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(patient => (
              <PatientCard
                key={patient.id}
                patient={patient}
                onClick={() => navigate(`/pacientes/${patient.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {showModal && <NewPatientModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
