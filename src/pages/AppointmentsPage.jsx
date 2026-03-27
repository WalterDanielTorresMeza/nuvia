import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { usePatientsStore } from '../store/patientsStore'
import { useAuthStore } from '../store/authStore'
import { useAppointmentsStore } from '../store/appointmentsStore'
import { useClinicStore } from '../store/clinicStore'
import NewAppointmentModal from '../components/appointments/NewAppointmentModal'
import {
  Plus, Loader2, Calendar, X,
  ChevronRight, ChevronLeft, LayoutList, CalendarDays,
  Building2,
} from 'lucide-react'
import { FaStethoscope, FaVideo, FaTriangleExclamation } from 'react-icons/fa6'
import { cn } from '../utils'

/* ─── Constants ─── */
const ESTADOS = ['programada','confirmada','completada','cancelada','no_asistio']
const ESTADO_STYLE = {
  programada: { cls: 'bg-blue-100 text-blue-700',  label: 'Programada' },
  confirmada: { cls: 'bg-green-100 text-green-700', label: 'Confirmada' },
  completada: { cls: 'bg-slate-100 text-slate-600', label: 'Completada' },
  cancelada:  { cls: 'bg-red-100 text-red-600',     label: 'Cancelada'  },
  no_asistio: { cls: 'bg-amber-100 text-amber-700', label: 'No asistió' },
}
const TIPO_ICON = {
  presencial:    <FaStethoscope className="w-3.5 h-3.5" />,
  videoconsulta: <FaVideo className="w-3.5 h-3.5" />,
  urgencia:      <FaTriangleExclamation className="w-3.5 h-3.5" />,
}
const TIPO_DOT = {
  presencial:    'bg-sky-400',
  videoconsulta: 'bg-violet-400',
  urgencia:      'bg-red-400',
}
const TIPO_BORDER = {
  presencial:    'border-l-sky-400',
  videoconsulta: 'border-l-violet-400',
  urgencia:      'border-l-red-400',
}
const FILTERS = [
  { val: 'hoy',        label: 'Hoy'        },
  { val: 'semana',     label: 'Esta semana' },
  { val: 'mes',        label: 'Este mes'    },
  { val: 'proximas',   label: 'Próximas'   },
  { val: 'pendientes', label: 'Pendientes' },
  { val: 'todas',      label: 'Todas'       },
]
const WEEK_DAYS  = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']


/* ─── Month Calendar ─── */
function MonthCalendar({ year, month, apts, selectedDay, onSelectDay, onPrev, onNext }) {
  const today    = new Date()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInM  = new Date(year, month + 1, 0).getDate()
  const offset   = (firstDay + 6) % 7

  const cells = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInM }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const aptsByDay = {}
  apts.forEach(a => {
    const d = new Date(a.fecha_hora)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const k = d.getDate()
      if (!aptsByDay[k]) aptsByDay[k] = []
      aptsByDay[k].push(a)
    }
  })

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <button onClick={onPrev} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        </button>
        <h2 className="font-bold text-slate-800">{MONTH_NAMES[month]} {year}</h2>
        <button onClick={onNext} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="px-3 pt-3 pb-2">
        <div className="grid grid-cols-7 mb-1">
          {WEEK_DAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1 uppercase tracking-wider">{d}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day, di) => {
              if (!day) return <div key={di} className="h-12" />
              const isToday    = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
              const isSelected = selectedDay === day
              const dayApts    = aptsByDay[day] || []

              return (
                <button key={di} onClick={() => onSelectDay(isSelected ? null : day)}
                  className={cn(
                    'h-12 mx-0.5 mb-0.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all',
                    isSelected ? 'bg-primary-600 shadow-md shadow-primary-200/50'
                    : isToday  ? 'ring-2 ring-primary-300 ring-inset bg-primary-50'
                    : 'hover:bg-slate-50'
                  )}>
                  <span className={cn('text-sm font-semibold leading-none',
                    isSelected ? 'text-white' : isToday ? 'text-primary-700' : dayApts.length ? 'text-slate-800' : 'text-slate-400')}>
                    {day}
                  </span>
                  {dayApts.length > 0 && (
                    <div className="flex gap-0.5 items-center">
                      {dayApts.slice(0,3).map((a,i) => (
                        <span key={i} className={cn('w-1 h-1 rounded-full', isSelected ? 'bg-white/70' : TIPO_DOT[a.tipo] || 'bg-slate-400')} />
                      ))}
                      {dayApts.length > 3 && <span className={cn('text-[8px]', isSelected ? 'text-white/60' : 'text-slate-400')}>+</span>}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex gap-4 justify-center px-4 py-2.5 bg-slate-50/80 border-t border-slate-100">
        {[['presencial','bg-sky-400','Presencial'],['videoconsulta','bg-violet-400','Video'],['urgencia','bg-red-400','Urgencia']].map(([t,c,l]) => (
          <span key={t} className="flex items-center gap-1 text-[10px] text-slate-400">
            <span className={cn('w-1.5 h-1.5 rounded-full', c)} />{l}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ─── Appointment row (shared) ─── */
function AptRow({ apt, onNavigate, onUpdateEstado, clinics }) {
  const st      = ESTADO_STYLE[apt.estado] || ESTADO_STYLE.programada
  const hora    = new Date(apt.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const horaFin = new Date(new Date(apt.fecha_hora).getTime() + apt.duracion_min * 60000)
    .toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const clinic  = clinics.find(c => c.id === apt.clinic_id)

  return (
    <div className={cn(
      'bg-white rounded-2xl border border-slate-200 border-l-4 p-4 flex items-center gap-4',
      'hover:shadow-sm hover:border-r-primary-200 hover:border-t-primary-200 hover:border-b-primary-200 transition-all group',
      TIPO_BORDER[apt.tipo] || 'border-l-slate-200'
    )}>
      <div className="flex-shrink-0 text-center w-14">
        <p className="text-base font-bold text-slate-800">{hora}</p>
        <p className="text-xs text-slate-400">{horaFin}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{apt.duracion_min}m</p>
      </div>
      <div className="w-px h-12 bg-slate-100 flex-shrink-0" />
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onNavigate(apt.patient_id)}>
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-semibold text-slate-800 text-sm group-hover:text-primary-700 transition-colors">
            {apt.patients?.nombre} {apt.patients?.apellidos}
          </span>
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', st.cls)}>{st.label}</span>
          <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
            {TIPO_ICON[apt.tipo]}<span className="capitalize">{apt.tipo}</span>
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {apt.motivo && <p className="text-xs text-slate-500 truncate max-w-xs">{apt.motivo}</p>}
          {clinic && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: clinic.color }} />
              {clinic.nombre}
            </span>
          )}
        </div>
      </div>
      <button onClick={() => onNavigate(apt.patient_id)}
        className="flex-shrink-0 p-1.5 text-slate-300 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors">
        <ChevronRight className="w-4 h-4" />
      </button>
      <select value={apt.estado} onChange={e => onUpdateEstado(apt.id, e.target.value)}
        onClick={e => e.stopPropagation()}
        className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-600 flex-shrink-0 focus:outline-none focus:border-primary-300">
        {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_STYLE[e]?.label || e}</option>)}
      </select>
    </div>
  )
}

/* ══════════════════════════════════════════════ */
export default function AppointmentsPage() {
  const navigate = useNavigate()
  const { patients, fetchPatients }                                = usePatientsStore()
  const { doctor }                                                 = useAuthStore()
  const { appointments, loading, fetchAppointments, updateEstado } = useAppointmentsStore()
  const { clinics, activeClinic, fetchClinics, setActiveClinic }   = useClinicStore()

  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter]       = useState('todas')
  const [view, setView]           = useState('calendario')

  const now = new Date()
  const [calYear,    setCalYear]    = useState(now.getFullYear())
  const [calMonth,   setCalMonth]   = useState(now.getMonth())
  const [calApts,    setCalApts]    = useState([])
  const [calLoading, setCalLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => {
    if (patients.length === 0) fetchPatients()
    if (doctor?.id) fetchClinics(doctor.id)
  }, [doctor?.id])

  useEffect(() => { fetchAppointments(filter) }, [filter])

  useEffect(() => {
    if (view === 'calendario') fetchCalMonth()
  }, [view, calYear, calMonth])

  const fetchCalMonth = async () => {
    if (calApts.length === 0) setCalLoading(true)
    const start = new Date(calYear, calMonth, 1)
    const end   = new Date(calYear, calMonth + 1, 0, 23, 59, 59)
    const { data } = await supabase
      .from('appointments')
      .select('*, patients(nombre, apellidos)')
      .gte('fecha_hora', start.toISOString())
      .lte('fecha_hora', end.toISOString())
      .order('fecha_hora')
    setCalApts(data || [])
    setCalLoading(false)
  }

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) } else setCalMonth(m => m - 1)
    setSelectedDay(null)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) } else setCalMonth(m => m + 1)
    setSelectedDay(null)
  }

  const filteredApts = useMemo(() => {
    if (!activeClinic) return appointments
    return appointments.filter(a => a.clinic_id === activeClinic.id)
  }, [appointments, activeClinic])

  const filteredCalApts = useMemo(() => {
    if (!activeClinic) return calApts
    return calApts.filter(a => a.clinic_id === activeClinic.id)
  }, [calApts, activeClinic])

  const dayApts = useMemo(() => {
    if (!selectedDay) return []
    return filteredCalApts
      .filter(a => {
        const d = new Date(a.fecha_hora)
        return d.getFullYear() === calYear && d.getMonth() === calMonth && d.getDate() === selectedDay
      })
      .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))
  }, [filteredCalApts, selectedDay, calYear, calMonth])

  const grouped = filteredApts.reduce((acc, apt) => {
    const key = new Date(apt.fecha_hora).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!acc[key]) acc[key] = []
    acc[key].push(apt)
    return acc
  }, {})

  const onSaved = () => {
    fetchAppointments(filter)
    if (view === 'calendario') { setCalApts([]); fetchCalMonth() }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agenda</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {loading ? 'Actualizando...' : `${filteredApts.length} cita${filteredApts.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1">
            <button onClick={() => setView('lista')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                view === 'lista' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              <LayoutList className="w-3.5 h-3.5" /> Lista
            </button>
            <button onClick={() => setView('calendario')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                view === 'calendario' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              <CalendarDays className="w-3.5 h-3.5" /> Calendario
            </button>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Nueva cita
          </button>
        </div>
      </div>

      {/* Clinic filter bar */}
      {clinics.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <button onClick={() => setActiveClinic(null)}
            className={cn('px-3 py-1.5 text-xs rounded-xl font-semibold border transition-all',
              !activeClinic ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}>
            Todos
          </button>
          {clinics.map(c => (
            <button key={c.id} onClick={() => setActiveClinic(activeClinic?.id === c.id ? null : c)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl font-semibold border transition-all',
                activeClinic?.id === c.id ? 'text-white border-transparent shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}
              style={activeClinic?.id === c.id ? { background: c.color } : {}}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
              {c.nombre}
            </button>
          ))}
        </div>
      )}

      {/* ── CALENDAR VIEW ── */}
      {view === 'calendario' && (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5">
          <div>
            {calLoading ? (
              <div className="bg-white rounded-2xl border border-slate-200 h-80 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
              </div>
            ) : (
              <MonthCalendar year={calYear} month={calMonth} apts={filteredCalApts}
                selectedDay={selectedDay} onSelectDay={setSelectedDay}
                onPrev={prevMonth} onNext={nextMonth} />
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {!selectedDay ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                <CalendarDays className="w-10 h-10 text-slate-200 mb-3" />
                <p className="text-slate-500 font-medium text-sm">Selecciona un día</p>
                <p className="text-slate-400 text-xs mt-1.5 max-w-xs">Haz clic en una fecha del calendario para ver las citas de ese día</p>
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 capitalize text-sm">
                      {new Date(calYear, calMonth, selectedDay).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{dayApts.length} cita{dayApts.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowModal(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Agregar
                    </button>
                    <button onClick={() => setSelectedDay(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>
                <div className="p-4 space-y-2 max-h-[520px] overflow-y-auto">
                  {dayApts.length === 0 ? (
                    <div className="py-12 text-center">
                      <Calendar className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">Sin citas este día</p>
                    </div>
                  ) : (
                    dayApts.map(apt => (
                      <AptRow key={apt.id} apt={apt} clinics={clinics}
                        onNavigate={id => navigate(`/pacientes/${id}`)}
                        onUpdateEstado={updateEstado} />
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === 'lista' && (
        <>
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map(({ val, label }) => (
              <button key={val} onClick={() => setFilter(val)}
                className={cn('px-4 py-2 text-sm rounded-xl font-medium transition-colors',
                  filter === val ? 'bg-primary-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
                {label}
              </button>
            ))}
          </div>

          {loading && appointments.length === 0 ? (
            <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
          ) : filteredApts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-slate-600 font-medium">No hay citas para este período</p>
              <p className="text-slate-400 text-sm mt-1">Crea una nueva cita con el botón de arriba</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([date, apts]) => (
                <div key={date}>
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 capitalize">{date}</h2>
                  <div className="space-y-2">
                    {apts.map(apt => (
                      <AptRow key={apt.id} apt={apt} clinics={clinics}
                        onNavigate={id => navigate(`/pacientes/${id}`)}
                        onUpdateEstado={updateEstado} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showModal && (
        <NewAppointmentModal
          patients={patients} doctorId={doctor?.id}
          existingAppointments={appointments}
          clinics={clinics} activeClinic={activeClinic}
          onClose={() => setShowModal(false)}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}

