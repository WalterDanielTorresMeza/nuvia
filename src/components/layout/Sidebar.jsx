import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  Stethoscope, Users, Calendar, Video, FileText,
  BarChart3, Settings, LogOut, Menu, X, Package, ShoppingCart,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../utils'

const navItems = [
  { to: '/dashboard',     icon: BarChart3,  label: 'Dashboard' },
  { to: '/pacientes',     icon: Users,      label: 'Pacientes' },
  { to: '/agenda',        icon: Calendar,   label: 'Agenda' },
  { to: '/consultas',     icon: Video,      label: 'Videoconsultas' },
  { to: '/inventario',    icon: Package,       label: 'Inventario' },
  { to: '/ventas',        icon: ShoppingCart, label: 'Punto de Venta' },
  { to: '/reportes',      icon: FileText,     label: 'Reportes' },
  { to: '/configuracion', icon: Settings,   label: 'Configuración' },
]

export default function Sidebar() {
  const { doctor, logout } = useAuthStore()
  const navigate           = useNavigate()
  const [open, setOpen]    = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const initials = [doctor?.nombre?.[0], doctor?.apellidos?.[0]].filter(Boolean).join('').toUpperCase() || 'DR'

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-slate-800 rounded-xl shadow-lg border border-slate-700"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 h-full w-64 flex flex-col z-40 transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )} style={{ background: '#0f172a' }}>

        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-500 via-primary-400 to-violet-500" />

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)' }}>
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight tracking-tight">Nuvia</p>
            <p className="text-slate-500 text-[11px] mt-0.5">Gestión Médica</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-3">Principal</p>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                isActive
                  ? 'text-sky-300'
                  : 'text-slate-400 hover:text-white'
              )}
              style={({ isActive }) => isActive
                ? { background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.2)' }
                : { border: '1px solid transparent' }
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('w-4 h-4 flex-shrink-0 transition-colors', isActive ? 'text-sky-400' : 'group-hover:text-white')} />
                  <span>{label}</span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: doctor + logout */}
        <div className="px-3 pb-4 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl"
               style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                 style={{ background: 'linear-gradient(135deg, #0ea5e9, #7c3aed)' }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                Dr. {doctor?.nombre} {doctor?.apellidos}
              </p>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{doctor?.especialidad || 'Médico General'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-slate-500 hover:text-red-400 rounded-xl transition-all"
            style={{ border: '1px solid transparent' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
