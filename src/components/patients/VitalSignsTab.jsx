import { useState } from 'react'
import { usePatientsStore } from '../../store/patientsStore'
import { Plus, Loader2, Activity, TrendingUp } from 'lucide-react'
import { calcIMC, clasificarIMC, formatFechaHora } from '../../utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function VitalSignsTab({ patient }) {
  const { addVitalSigns, fetchPatient } = usePatientsStore()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const vitals = patient.vital_signs || []

  const [form, setForm] = useState({
    peso_kg: '', talla_cm: '', temperatura: '',
    frec_cardiaca: '', frec_respiratoria: '',
    porc_grasa: '', masa_muscular: '',
    presion_sistolica: '', presion_diastolica: '',
    saturacion_o2: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const imc = calcIMC(form.peso_kg, form.talla_cm)
  const imcInfo = clasificarIMC(imc)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const payload = { patient_id: patient.id }
    Object.entries(form).forEach(([k, v]) => { if (v !== '') payload[k] = parseFloat(v) || parseInt(v) || v })
    const { error } = await addVitalSigns(payload)
    setLoading(false)
    if (error) { setError(error); return }
    setShowForm(false)
    setForm({ peso_kg: '', talla_cm: '', temperatura: '', frec_cardiaca: '', frec_respiratoria: '', porc_grasa: '', masa_muscular: '', presion_sistolica: '', presion_diastolica: '', saturacion_o2: '' })
    fetchPatient(patient.id)
  }

  const latest = vitals[0]
  const chartData = [...vitals].reverse().map(v => ({
    fecha: new Date(v.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
    peso: v.peso_kg,
    imc: v.imc,
  }))

  const statCard = (label, value, unit, color = 'text-slate-800') => (
    <div className="bg-slate-50 rounded-xl p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>
        {value ?? '—'} <span className="text-sm font-normal text-slate-400">{unit}</span>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-700">Signos vitales</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" /> Registrar medición
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-6">
          <h3 className="font-medium text-slate-700 mb-4">Nueva medición</h3>
          {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="label">Peso (kg)</label>
                <input type="number" step="0.1" className="input" placeholder="70.5" value={form.peso_kg} onChange={e => set('peso_kg', e.target.value)} />
              </div>
              <div>
                <label className="label">Talla (cm)</label>
                <input type="number" step="0.1" className="input" placeholder="170" value={form.talla_cm} onChange={e => set('talla_cm', e.target.value)} />
              </div>
              <div>
                <label className="label">IMC (calculado)</label>
                <div className="input bg-slate-50 flex items-center gap-2">
                  <span className="font-semibold text-slate-700">{imc || '—'}</span>
                  {imcInfo && <span className={imcInfo.color}>{imcInfo.label}</span>}
                </div>
              </div>
              <div>
                <label className="label">Temperatura (°C)</label>
                <input type="number" step="0.1" className="input" placeholder="36.5" value={form.temperatura} onChange={e => set('temperatura', e.target.value)} />
              </div>
              <div>
                <label className="label">Frec. cardíaca (lpm)</label>
                <input type="number" className="input" placeholder="72" value={form.frec_cardiaca} onChange={e => set('frec_cardiaca', e.target.value)} />
              </div>
              <div>
                <label className="label">Frec. respiratoria (rpm)</label>
                <input type="number" className="input" placeholder="16" value={form.frec_respiratoria} onChange={e => set('frec_respiratoria', e.target.value)} />
              </div>
              <div>
                <label className="label">Presión sistólica (mmHg)</label>
                <input type="number" className="input" placeholder="120" value={form.presion_sistolica} onChange={e => set('presion_sistolica', e.target.value)} />
              </div>
              <div>
                <label className="label">Presión diastólica (mmHg)</label>
                <input type="number" className="input" placeholder="80" value={form.presion_diastolica} onChange={e => set('presion_diastolica', e.target.value)} />
              </div>
              <div>
                <label className="label">Saturación O₂ (%)</label>
                <input type="number" className="input" placeholder="98" value={form.saturacion_o2} onChange={e => set('saturacion_o2', e.target.value)} />
              </div>
              <div>
                <label className="label">% Grasa corporal</label>
                <input type="number" step="0.1" className="input" placeholder="20.5" value={form.porc_grasa} onChange={e => set('porc_grasa', e.target.value)} />
              </div>
              <div>
                <label className="label">Masa muscular (kg)</label>
                <input type="number" step="0.1" className="input" placeholder="35.0" value={form.masa_muscular} onChange={e => set('masa_muscular', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Guardando...' : 'Guardar medición'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Latest vitals summary */}
      {latest && (
        <div>
          <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
            <Activity className="w-3 h-3" /> Última medición: {formatFechaHora(latest.fecha)}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {statCard('Peso', latest.peso_kg, 'kg')}
            {statCard('Talla', latest.talla_cm, 'cm')}
            {statCard('IMC', latest.imc, '', latest.imc >= 30 ? 'text-red-600' : latest.imc >= 25 ? 'text-amber-600' : 'text-emerald-600')}
            {statCard('Temperatura', latest.temperatura, '°C', latest.temperatura >= 38 ? 'text-red-600' : 'text-slate-800')}
            {statCard('Frec. cardíaca', latest.frec_cardiaca, 'lpm')}
            {statCard('Frec. respiratoria', latest.frec_respiratoria, 'rpm')}
            {latest.presion_sistolica && statCard('Presión', `${latest.presion_sistolica}/${latest.presion_diastolica}`, 'mmHg')}
            {latest.saturacion_o2 && statCard('Saturación O₂', latest.saturacion_o2, '%', latest.saturacion_o2 < 95 ? 'text-red-600' : 'text-slate-800')}
            {latest.porc_grasa && statCard('% Grasa', latest.porc_grasa, '%')}
            {latest.masa_muscular && statCard('Masa muscular', latest.masa_muscular, 'kg')}
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <h3 className="font-medium text-slate-700">Evolución de peso e IMC</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Line type="monotone" dataKey="peso" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} name="Peso (kg)" />
              <Line type="monotone" dataKey="imc" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="IMC" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History table */}
      {vitals.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="font-medium text-slate-700 text-sm">Historial de mediciones</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  {['Fecha','Peso','Talla','IMC','Temp.','F.C.','F.R.','Presión','SpO2','% Grasa','M. Muscular'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vitals.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{formatFechaHora(v.fecha)}</td>
                    <td className="px-3 py-2">{v.peso_kg ?? '—'}</td>
                    <td className="px-3 py-2">{v.talla_cm ?? '—'}</td>
                    <td className="px-3 py-2 font-medium">{v.imc ?? '—'}</td>
                    <td className="px-3 py-2">{v.temperatura ?? '—'}</td>
                    <td className="px-3 py-2">{v.frec_cardiaca ?? '—'}</td>
                    <td className="px-3 py-2">{v.frec_respiratoria ?? '—'}</td>
                    <td className="px-3 py-2">{v.presion_sistolica ? `${v.presion_sistolica}/${v.presion_diastolica}` : '—'}</td>
                    <td className="px-3 py-2">{v.saturacion_o2 ?? '—'}</td>
                    <td className="px-3 py-2">{v.porc_grasa ?? '—'}</td>
                    <td className="px-3 py-2">{v.masa_muscular ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {vitals.length === 0 && !showForm && (
        <div className="card p-12 text-center">
          <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No hay mediciones registradas aún</p>
        </div>
      )}
    </div>
  )
}
