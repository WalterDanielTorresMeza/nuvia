import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { calcEdad } from '../utils'
import {
  Video, PhoneOff, Copy, Check, Loader2, ChevronRight,
  Clock, CalendarDays, Wifi, ExternalLink,
  PanelRightClose, PanelRightOpen, AlertCircle,
} from 'lucide-react'
import { FaDroplet, FaMars, FaVenus } from 'react-icons/fa6'
import { cn } from '../utils'

/* ── Room URL deterministic from appointment id ── */
function getRoomUrl(id) {
  return `https://meet.jit.si/NuviaConsulta-${id.replace(/-/g, '').slice(0, 16)}`
}

/* ── Countdown helper ── */
function useCountdown(fechaHora) {
  const [label, setLabel]   = useState('')
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    const calc = () => {
      const diff = new Date(fechaHora) - new Date()
      if (diff < -3600000) { setLabel('Finalizada'); setUrgent(false); return }
      if (diff < 0)        { setLabel('En curso ●'); setUrgent(true);  return }
      const mins = Math.floor(diff / 60000)
      if (mins < 1)  { setLabel('Ahora mismo');          setUrgent(true);  return }
      if (mins < 60) { setLabel(`En ${mins} min`);        setUrgent(mins <= 15); return }
      const hrs = Math.floor(mins / 60)
      const rm  = mins % 60
      if (hrs < 24) { setLabel(`En ${hrs}h ${rm > 0 ? rm + 'min' : ''}`); setUrgent(false); return }
      const days = Math.floor(hrs / 24)
      setLabel(`En ${days} día${days > 1 ? 's' : ''}`)
      setUrgent(false)
    }
    calc()
    const t = setInterval(calc, 30000)
    return () => clearInterval(t)
  }, [fechaHora])

  return { label, urgent }
}

/* ── Blood type colors ── */
const BLOOD_COLORS = {
  'A+':  'bg-blue-500',  'A-':  'bg-blue-400',
  'B+':  'bg-emerald-500','B-':  'bg-emerald-400',
  'AB+': 'bg-purple-500', 'AB-': 'bg-purple-400',
  'O+':  'bg-red-500',   'O-':  'bg-red-400',
}

/* ── Single appointment card ── */
function VideoCard({ apt, onStart, onCopy, copied }) {
  const navigate         = useNavigate()
  const { label, urgent } = useCountdown(apt.fecha_hora)
  const hora = new Date(apt.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const fecha = new Date(apt.fecha_hora).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  const p    = apt.patients || {}
  const edad = calcEdad(p.fecha_nacimiento)

  return (
    <div className={cn(
      'bg-white rounded-2xl border transition-all overflow-hidden',
      urgent
        ? 'border-blue-300 shadow-md shadow-blue-100 ring-1 ring-blue-200'
        : 'border-slate-200 hover:shadow-sm'
    )}>
      {/* Top accent strip */}
      <div className={cn('h-1 w-full', urgent ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gradient-to-r from-slate-200 to-slate-100')} />

      <div className="p-5">
        <div className="flex items-start gap-4">

          {/* Avatar */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-blue-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-sm">
            {p.nombre?.[0]}{p.apellidos?.[0]}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h3 className="font-bold text-slate-800 text-sm leading-tight">
                  {p.nombre} {p.apellidos}
                </h3>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {p.sexo === 'M' ? <FaMars className="w-3 h-3 text-blue-400" /> : p.sexo === 'F' ? <FaVenus className="w-3 h-3 text-pink-400" /> : null}
                  {edad != null && <span className="text-xs text-slate-400">{edad} años</span>}
                  {p.tipo_sangre && (
                    <span className={cn('flex items-center gap-0.5 text-xs text-white px-1.5 py-0.5 rounded-md font-semibold', BLOOD_COLORS[p.tipo_sangre] || 'bg-slate-400')}>
                      <FaDroplet className="w-2 h-2" />{p.tipo_sangre}
                    </span>
                  )}
                </div>
              </div>

              {/* Countdown badge */}
              <span className={cn(
                'text-xs font-semibold px-2.5 py-1 rounded-xl flex-shrink-0',
                urgent
                  ? 'bg-blue-600 text-white animate-pulse'
                  : 'bg-slate-100 text-slate-600'
              )}>
                {label}
              </span>
            </div>

            {/* Date/time */}
            <div className="flex items-center gap-1.5 mt-2">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 capitalize">{fecha}</span>
              <span className="text-slate-200">·</span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 font-medium">{hora}</span>
            </div>

            {apt.motivo && (
              <p className="text-xs text-slate-400 mt-1 truncate">📋 {apt.motivo}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onStart(apt)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
              urgent
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            )}
          >
            <Video className="w-4 h-4" />
            {urgent ? 'Unirse ahora' : 'Iniciar consulta'}
          </button>

          <button
            onClick={() => onCopy(apt)}
            title="Copiar enlace para el paciente"
            className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 hover:border-primary-300 hover:bg-primary-50 rounded-xl text-xs text-slate-500 hover:text-primary-600 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado' : 'Enlace'}
          </button>

          <button
            onClick={() => navigate(`/pacientes/${apt.patient_id}`)}
            title="Ver expediente"
            className="px-3 py-2.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Video call modal (embedded Jitsi + patient sidebar) ── */
function VideoCallModal({ apt, onClose }) {
  const [sidebar, setSidebar] = useState(true)
  const p              = apt.patients || {}
  const edad           = calcEdad(p.fecha_nacimiento)
  const roomUrl        = getRoomUrl(apt.id)
  const hora = new Date(apt.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
          <span className="text-white font-semibold text-sm">
            Videoconsulta — {p.nombre} {p.apellidos}
          </span>
          <span className="text-slate-400 text-xs">{hora}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={roomUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg text-xs transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir en nueva pestaña
          </a>
          <button
            onClick={() => setSidebar(s => !s)}
            className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
            title={sidebar ? 'Ocultar panel del paciente' : 'Mostrar panel del paciente'}
          >
            {sidebar ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            Terminar
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Jitsi iframe */}
        <div className="flex-1 bg-black relative">
          <iframe
            title="videoconsulta"
            src={`${roomUrl}#userInfo.displayName="Dr. ${p.nombre ? '' : ''}Médico"&config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false`}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full h-full border-0"
          />
        </div>

        {/* Patient sidebar */}
        {sidebar && (
          <div className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-y-auto flex-shrink-0">

            {/* Patient header */}
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {p.nombre?.[0]}{p.apellidos?.[0]}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{p.nombre} {p.apellidos}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {p.sexo === 'M' ? <FaMars className="w-3 h-3 text-blue-400" /> : p.sexo === 'F' ? <FaVenus className="w-3 h-3 text-pink-400" /> : null}
                    {edad != null && <span className="text-xs text-slate-400">{edad} años</span>}
                    {p.tipo_sangre && (
                      <span className={cn('flex items-center gap-0.5 text-xs text-white px-1.5 py-0.5 rounded-md font-bold', BLOOD_COLORS[p.tipo_sangre] || 'bg-slate-400')}>
                        <FaDroplet className="w-2 h-2" />{p.tipo_sangre}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {p.telefono && (
                <p className="text-xs text-slate-500">📱 {p.telefono}</p>
              )}
              {apt.motivo && (
                <div className="mt-3 px-3 py-2 bg-blue-50 rounded-xl">
                  <p className="text-xs font-semibold text-blue-700">Motivo</p>
                  <p className="text-xs text-blue-600 mt-0.5">{apt.motivo}</p>
                </div>
              )}
            </div>

            {/* Quick instructions for patient link */}
            <div className="p-4 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-2">Enlace para el paciente</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={getRoomUrl(apt.id)}
                  className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 font-mono truncate"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(getRoomUrl(apt.id))}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Comparte este enlace con tu paciente para que pueda unirse.
              </p>
            </div>

            {/* Notes area */}
            <div className="p-4 border-b border-slate-100 flex-1">
              <p className="text-xs font-semibold text-slate-500 mb-2">Notas rápidas</p>
              <textarea
                placeholder="Escribe notas durante la consulta..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 placeholder:text-slate-400 resize-none focus:outline-none focus:border-primary-300 min-h-[140px]"
              />
            </div>

            {/* Link to full profile */}
            <div className="p-4">
              <button
                onClick={() => window.open(`/pacientes/${apt.patient_id}`, '_blank')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Ver expediente completo
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════ */
export default function ConsultationsVideoPage() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading]   = useState(true)
  const [activeCall, setActiveCall] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => { fetchVideo() }, [])

  const fetchVideo = async () => {
    if (appointments.length === 0) setLoading(true)
    try {
      const { data } = await supabase
        .from('appointments')
        .select('*, patients(id, nombre, apellidos, telefono, fecha_nacimiento, tipo_sangre, sexo)')
        .eq('tipo', 'videoconsulta')
        .in('estado', ['programada', 'confirmada'])
        .order('fecha_hora')
      setAppointments(data || [])
    } finally {
      setLoading(false)
    }
  }

  const copyLink = (apt) => {
    navigator.clipboard.writeText(getRoomUrl(apt.id))
    setCopiedId(apt.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Group appointments — every appointment must land in exactly one bucket
  const now     = new Date()
  const ago1h   = new Date(now.getTime() - 3600000)
  const ahead1h = new Date(now.getTime() + 3600000)
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  const weekEnd  = new Date(now.getTime() + 7 * 86400000)

  const pending  = appointments.filter(a => new Date(a.fecha_hora) < ago1h)           // past > 1h, still open
  const imminent = appointments.filter(a => {
    const d = new Date(a.fecha_hora)
    return d >= ago1h && d <= ahead1h
  })
  const todayRest = appointments.filter(a => {
    const d = new Date(a.fecha_hora)
    return d > ahead1h && d <= todayEnd
  })
  const thisWeek = appointments.filter(a => {
    const d = new Date(a.fecha_hora)
    return d > todayEnd && d <= weekEnd
  })
  const later = appointments.filter(a => new Date(a.fecha_hora) > weekEnd)

  // Stats
  const totalToday = appointments.filter(a => {
    const d = new Date(a.fecha_hora)
    return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && d <= todayEnd
  }).length
  const totalWeek = appointments.filter(a => {
    const d = new Date(a.fecha_hora)
    return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && d <= weekEnd
  }).length

  const Section = ({ title, items, color = 'text-slate-500' }) => items.length === 0 ? null : (
    <div>
      <h2 className={cn('text-xs font-bold uppercase tracking-wider mb-3', color)}>{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map(apt => (
          <VideoCard
            key={apt.id}
            apt={apt}
            onStart={setActiveCall}
            onCopy={copyLink}
            copied={copiedId === apt.id}
          />
        ))}
      </div>
    </div>
  )

  return (
    <>
      <div className="space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Videoconsultas</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {loading ? 'Cargando...' : `${appointments.length} consulta${appointments.length !== 1 ? 's' : ''} programada${appointments.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Stats */}
          {!loading && (
            <div className="flex gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl">
                <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Video className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 leading-none">Hoy</p>
                  <p className="text-lg font-bold text-slate-700 leading-tight">{totalToday}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl">
                <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 leading-none">Esta semana</p>
                  <p className="text-lg font-bold text-slate-700 leading-tight">{totalWeek}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl">
                <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center">
                  <Wifi className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 leading-none">Total</p>
                  <p className="text-lg font-bold text-slate-700 leading-tight">{appointments.length}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-2xl">
          <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700">
            <span className="font-semibold">¿Cómo funciona?</span> Las videoconsultas usan una sala segura generada automáticamente.
            Comparte el enlace con tu paciente desde la tarjeta. No requiere instalar nada — funciona directo en el navegador.
          </div>
        </div>

        {/* Content */}
        {loading && appointments.length === 0 ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>

        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-blue-300" />
            </div>
            <p className="text-slate-700 font-semibold">No hay videoconsultas programadas</p>
            <p className="text-slate-400 text-sm mt-1">
              Agenda una cita de tipo <span className="font-medium text-slate-500">Videoconsulta</span> en la sección de Agenda
            </p>
            <a
              href="/agenda"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl text-sm font-semibold transition-colors"
            >
              <CalendarDays className="w-4 h-4" />
              Ir a Agenda
            </a>
          </div>

        ) : (
          <div className="space-y-8">
            <Section title="⚡ En curso o pronto (±1 hora)" items={imminent}  color="text-blue-600" />
            <Section title="📅 Más tarde hoy"               items={todayRest} color="text-slate-600" />
            <Section title="📆 Esta semana"                 items={thisWeek}  color="text-slate-500" />
            <Section title="🗓 Más adelante"                items={later}     color="text-slate-400" />
            <Section title="⏳ Pendientes de cerrar"        items={pending}   color="text-amber-600" />
          </div>
        )}
      </div>

      {/* Video call fullscreen modal */}
      {activeCall && (
        <VideoCallModal
          apt={activeCall}
          onClose={() => setActiveCall(null)}
        />
      )}
    </>
  )
}
