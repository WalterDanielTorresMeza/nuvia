import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function calcIMC(pesoKg, tallaCm) {
  if (!pesoKg || !tallaCm) return null
  const tallaM = tallaCm / 100
  return (pesoKg / (tallaM * tallaM)).toFixed(1)
}

export function clasificarIMC(imc) {
  if (!imc) return null
  const val = parseFloat(imc)
  if (val < 18.5) return { label: 'Bajo peso', color: 'badge-blue' }
  if (val < 25)   return { label: 'Normal', color: 'badge-green' }
  if (val < 30)   return { label: 'Sobrepeso', color: 'badge-amber' }
  return { label: 'Obesidad', color: 'badge-red' }
}

export function calcEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null
  const hoy = new Date()
  const nac = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad
}

export function formatFecha(fecha) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

export function formatFechaHora(fecha) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}
