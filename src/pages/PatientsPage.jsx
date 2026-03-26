import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePatientsStore } from '../store/patientsStore'
import { Plus, Search, User, Phone, Calendar, ChevronRight, Loader2 } from 'lucide-react'
import { calcEdad, formatFecha } from '../utils'
import NewPatientModal from '../components/patients/NewPatientModal'

export default function PatientsPage() {
  const { patients, fetchPatients, loading } = usePatientsStore()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { fetchPatients() }, [])

  const filtered = patients.filter(p => {
    const q = search.toLowerCase()
    return (
      p.nombre?.toLowerCase().includes(q) ||
      p.apellidos?.toLowerCase().includes(q) ||
      p.curp?.toLowerCase().includes(q) ||
      p.telefono?.includes(q)
    )
  })

  const sexoColor = { M: 'badge-blue', F: 'badge-green', Otro: 'badge-gray' }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pacientes</h1>
          <p className="text-slate-500 text-sm mt-1">{patients.length} pacientes registrados</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Nuevo paciente
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, CURP, teléfono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">
            {search ? 'No se encontraron pacientes con ese criterio' : 'Aún no hay pacientes registrados'}
          </p>
          {!search && (
            <button onClick={() => setShowModal(true)} className="btn-primary mt-4 mx-auto">
              <Plus className="w-4 h-4" /> Agregar primer paciente
            </button>
          )}
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {filtered.map(patient => (
            <div
              key={patient.id}
              onClick={() => navigate(`/pacientes/${patient.id}`)}
              className="flex items-center gap-4 p-4 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              {/* Avatar */}
              <div className="w-11 h-11 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                {patient.foto_url ? (
                  <img src={patient.foto_url} alt="" className="w-11 h-11 rounded-full object-cover" />
                ) : (
                  <span className="text-primary-700 font-semibold text-sm">
                    {patient.nombre?.[0]}{patient.apellidos?.[0]}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800 text-sm">
                    {patient.nombre} {patient.apellidos}
                  </span>
                  <span className={sexoColor[patient.sexo] || 'badge-gray'}>
                    {patient.sexo === 'M' ? 'Masculino' : patient.sexo === 'F' ? 'Femenino' : patient.sexo}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-0.5">
                  {patient.fecha_nacimiento && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {calcEdad(patient.fecha_nacimiento)} años · {formatFecha(patient.fecha_nacimiento)}
                    </span>
                  )}
                  {patient.telefono && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Phone className="w-3 h-3" />
                      {patient.telefono}
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      {showModal && <NewPatientModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
