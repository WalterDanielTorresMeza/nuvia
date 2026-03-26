import { useState } from 'react'
import { usePatientsStore } from '../../store/patientsStore'
import { Plus, Calendar, ChevronRight, CheckCircle, Clock } from 'lucide-react'
import { cn } from '../../utils'
import ConsultationModal from './ConsultationModal'

export default function ConsultationsTab({ patient }) {
  const { fetchPatient } = usePatientsStore()
  const [openConsult, setOpenConsult] = useState(null) // null | 'new' | consultation object
  const consultations = [...(patient.consultations || [])].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

  const handleSaved = () => { fetchPatient(patient.id) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-700">Historial de consultas</h2>
        <button onClick={() => setOpenConsult('new')} className="btn-primary">
          <Plus className="w-4 h-4" /> Nueva consulta
        </button>
      </div>

      {consultations.length === 0 ? (
        <div className="card p-12 text-center">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">No hay consultas registradas</p>
          <p className="text-slate-400 text-xs mt-1">Inicia una nueva consulta para comenzar</p>
          <button onClick={() => setOpenConsult('new')} className="btn-primary mt-4 mx-auto">
            <Plus className="w-4 h-4" /> Iniciar consulta
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {consultations.map(c => (
            <button
              key={c.id}
              onClick={() => setOpenConsult(c)}
              className="w-full card p-4 flex items-center justify-between hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  c.estado === 'terminada' ? 'bg-green-50' : 'bg-blue-50')}>
                  {c.estado === 'terminada'
                    ? <CheckCircle className="w-5 h-5 text-green-500" />
                    : <Clock className="w-5 h-5 text-blue-500" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 text-sm">
                      {c.motivo || 'Consulta general'}
                    </span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                      c.estado === 'terminada' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                      {c.estado === 'terminada' ? 'Terminada' : 'Activa'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-slate-400">
                      {new Date(c.fecha).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    {c.diagnostico_cie10 && (
                      <span className="text-xs font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                        {c.diagnostico_cie10}
                      </span>
                    )}
                    {c.diagnostico && (
                      <span className="text-xs text-slate-400 line-clamp-1">{c.diagnostico}</span>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {openConsult !== null && (
        <ConsultationModal
          patient={patient}
          consultation={openConsult === 'new' ? null : openConsult}
          onClose={() => setOpenConsult(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
