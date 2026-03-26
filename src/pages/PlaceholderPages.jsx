import { Receipt, FileText, Settings, Construction } from 'lucide-react'

function ComingSoon({ icon: Icon, title, description, fase }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
      </div>
      <div className="card p-16 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-700 mb-2">{title}</h2>
        <p className="text-slate-500 text-sm max-w-sm mx-auto">{description}</p>
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg">
          <Construction className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-700 font-medium">En desarrollo — {fase}</span>
        </div>
      </div>
    </div>
  )
}

export function BillingPage() {
  return <ComingSoon
    icon={Receipt}
    title="Facturación"
    description="Módulo de facturación CFDI con integración al SAT vía Facturama. Genera facturas electrónicas, cancelaciones y descarga XML/PDF."
    fase="Fase 3"
  />
}

export function ReportsPage() {
  return <ComingSoon
    icon={FileText}
    title="Reportes"
    description="Reportes de pacientes, consultas, ingresos y más. Exportación a PDF y Excel."
    fase="Fase 3"
  />
}

export function ConfigPage() {
  return <ComingSoon
    icon={Settings}
    title="Configuración"
    description="Gestión de doctores, horarios, datos del consultorio y configuración del sistema."
    fase="Fase 2"
  />
}
