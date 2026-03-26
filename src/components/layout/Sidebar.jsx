import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  Stethoscope, Users, Calendar, Video, FileText,
  BarChart3, Settings, LogOut, Menu, X, Receipt
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../utils'

const navItems = [
  { to: '/dashboard',    icon: BarChart3,  label: 'Dashboard' },
  { to: '/pacientes',    icon: Users,      label: 'Pacientes' },
  { to: '/agenda',       icon: Calendar,   label: 'Agenda' },
  { to: '/consultas',    icon: Video,      label: 'Videoconsultas' },
  { to: '/facturacion',  icon: Receipt,    label: 'Facturación' },
  { to: '/reportes',     icon: FileText,   label: 'Reportes' },
  { to: '/configuracion',icon: Settings,   label: 'Configuración' },
]

export default function Sidebar() {
  const { doctor, logout } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-slate-200"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay mobile */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 flex flex-col z-40 transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-800 text-sm leading-tight">Nuvia</div>
            <div className="text-xs text-slate-400">Gestión Médica</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Doctor info + logout */}
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-700 font-semibold text-sm">
                {doctor?.nombre?.[0]?.toUpperCase() || 'D'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 truncate">
                Dr. {doctor?.nombre} {doctor?.apellidos}
              </div>
              <div className="text-xs text-slate-400 truncate">{doctor?.especialidad || 'Médico'}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
