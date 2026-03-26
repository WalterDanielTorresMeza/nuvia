import { useState } from 'react'
import { cn } from '../../utils'

const REGIONS = [
  { id: 'cabeza',          label: 'Cabeza',           x: 70,  y: 5,   w: 30, h: 22, rx: 14 },
  { id: 'cuello',          label: 'Cuello',           x: 78,  y: 27,  w: 14, h: 10, rx: 4  },
  { id: 'torax',           label: 'Tórax',            x: 58,  y: 37,  w: 54, h: 32, rx: 6  },
  { id: 'abdomen',         label: 'Abdomen',          x: 62,  y: 69,  w: 46, h: 22, rx: 6  },
  { id: 'pelvis',          label: 'Pelvis',           x: 64,  y: 91,  w: 42, h: 16, rx: 6  },
  { id: 'brazo_der',       label: 'Brazo derecho',    x: 28,  y: 37,  w: 28, h: 44, rx: 8  },
  { id: 'brazo_izq',       label: 'Brazo izquierdo',  x: 114, y: 37,  w: 28, h: 44, rx: 8  },
  { id: 'antebrazo_der',   label: 'Antebrazo der.',   x: 22,  y: 82,  w: 22, h: 32, rx: 8  },
  { id: 'antebrazo_izq',   label: 'Antebrazo izq.',   x: 126, y: 82,  w: 22, h: 32, rx: 8  },
  { id: 'mano_der',        label: 'Mano derecha',     x: 18,  y: 115, w: 22, h: 20, rx: 6  },
  { id: 'mano_izq',        label: 'Mano izquierda',   x: 130, y: 115, w: 22, h: 20, rx: 6  },
  { id: 'muslo_der',       label: 'Muslo derecho',    x: 60,  y: 108, w: 24, h: 36, rx: 8  },
  { id: 'muslo_izq',       label: 'Muslo izquierdo',  x: 86,  y: 108, w: 24, h: 36, rx: 8  },
  { id: 'pierna_der',      label: 'Pierna derecha',   x: 58,  y: 145, w: 22, h: 36, rx: 8  },
  { id: 'pierna_izq',      label: 'Pierna izquierda', x: 90,  y: 145, w: 22, h: 36, rx: 8  },
  { id: 'pie_der',         label: 'Pie derecho',      x: 54,  y: 182, w: 24, h: 14, rx: 5  },
  { id: 'pie_izq',         label: 'Pie izquierdo',    x: 92,  y: 182, w: 24, h: 14, rx: 5  },
]

export default function BodyMap({ value = {}, onChange }) {
  const [activeRegion, setActiveRegion] = useState(null)

  const toggleRegion = (id) => {
    const next = { ...value }
    if (next[id]) {
      delete next[id]
      if (activeRegion === id) setActiveRegion(null)
    } else {
      next[id] = { nota: '' }
      setActiveRegion(id)
    }
    onChange(next)
  }

  const updateNota = (id, nota) => {
    onChange({ ...value, [id]: { ...value[id], nota } })
  }

  const selected = Object.keys(value)
  const activeLabel = REGIONS.find(r => r.id === activeRegion)?.label

  return (
    <div className="flex gap-6">
      {/* Body SVG */}
      <div className="flex-shrink-0">
        <p className="text-xs text-slate-400 text-center mb-2">Clic para marcar zona</p>
        <svg viewBox="0 0 170 200" width="170" height="200" className="select-none">
          {/* Body outline */}
          <ellipse cx="85" cy="16" rx="16" ry="14" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="78" y="27" width="14" height="10" rx="4" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="58" y="37" width="54" height="32" rx="6" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="62" y="69" width="46" height="22" rx="6" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="64" y="91" width="42" height="16" rx="6" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="28" y="37" width="28" height="44" rx="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="114" y="37" width="28" height="44" rx="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="22" y="82" width="22" height="32" rx="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="126" y="82" width="22" height="32" rx="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="18" y="115" width="22" height="20" rx="6" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="130" y="115" width="22" height="20" rx="6" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="60" y="108" width="24" height="36" rx="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="86" y="108" width="24" height="36" rx="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="58" y="145" width="22" height="36" rx="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="90" y="145" width="22" height="36" rx="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="54" y="182" width="24" height="14" rx="5" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="92" y="182" width="24" height="14" rx="5" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />

          {/* Clickable regions */}
          {REGIONS.map(r => {
            const isSelected = !!value[r.id]
            const isActive = activeRegion === r.id
            const shape = r.id === 'cabeza'
              ? <ellipse key={r.id} cx={r.x + r.w / 2} cy={r.y + r.h / 2} rx={r.w / 2} ry={r.h / 2}
                  fill={isActive ? '#0ea5e9' : isSelected ? '#bae6fd' : 'transparent'}
                  stroke={isSelected ? '#0284c7' : 'transparent'}
                  strokeWidth="1.5" className="cursor-pointer"
                  onClick={() => { toggleRegion(r.id); setActiveRegion(r.id) }} />
              : <rect key={r.id} x={r.x} y={r.y} width={r.w} height={r.h} rx={r.rx}
                  fill={isActive ? '#0ea5e9' : isSelected ? '#bae6fd' : 'transparent'}
                  stroke={isSelected ? '#0284c7' : 'transparent'}
                  strokeWidth="1.5" className="cursor-pointer"
                  onClick={() => { toggleRegion(r.id); if (!isSelected || isActive) setActiveRegion(isSelected ? null : r.id) }} />
            return shape
          })}
        </svg>
      </div>

      {/* Region notes panel */}
      <div className="flex-1 space-y-2">
        {selected.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-slate-400 text-center">Selecciona una zona del cuerpo<br/>para agregar hallazgos</p>
          </div>
        ) : (
          selected.map(id => {
            const region = REGIONS.find(r => r.id === id)
            return (
              <div key={id} className={cn(
                'p-3 rounded-xl border transition-all',
                activeRegion === id ? 'border-primary-300 bg-primary-50' : 'border-slate-200 bg-white'
              )}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">{region?.label}</span>
                  <button
                    onClick={() => toggleRegion(id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >✕</button>
                </div>
                <textarea
                  rows={2}
                  placeholder="Hallazgos en esta zona..."
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary-400 resize-none"
                  value={value[id]?.nota || ''}
                  onChange={e => updateNota(id, e.target.value)}
                />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
