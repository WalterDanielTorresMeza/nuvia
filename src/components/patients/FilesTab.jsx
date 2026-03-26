import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { Upload, Loader2, File, FileImage, FileText, Trash2, Download, Plus } from 'lucide-react'

const BUCKET = 'patient-files'

function fileIcon(type) {
  if (type?.startsWith('image/')) return FileImage
  return FileText
}

function fileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FilesTab({ patient }) {
  const { doctor } = useAuthStore()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const fetchFiles = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('patient_files')
      .select('*')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
    setFiles(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchFiles() }, [patient.id])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo no puede superar 10 MB')
      return
    }
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${doctor?.id}/${patient.id}/${Date.now()}.${ext}`

    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file)
    if (uploadErr) {
      setError('Error al subir el archivo. Verifica que el bucket "patient-files" existe en Supabase Storage.')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

    await supabase.from('patient_files').insert([{
      patient_id: patient.id,
      doctor_id: doctor?.id,
      nombre: file.name,
      tipo: file.type,
      tamano: file.size,
      storage_path: path,
      url: publicUrl,
    }])

    setUploading(false)
    e.target.value = ''
    fetchFiles()
  }

  const handleDelete = async (file) => {
    await supabase.storage.from(BUCKET).remove([file.storage_path])
    await supabase.from('patient_files').delete().eq('id', file.id)
    fetchFiles()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-700">Archivos del expediente</h2>
        <label className="btn-primary cursor-pointer">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {uploading ? 'Subiendo...' : 'Adjuntar archivo'}
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
        </label>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
      ) : files.length === 0 ? (
        <div className="card p-12 text-center border-2 border-dashed border-slate-200">
          <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">No hay archivos adjuntos</p>
          <p className="text-slate-400 text-xs mt-1">Sube laboratorios, radiografías, estudios o documentos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {files.map(f => {
            const Icon = fileIcon(f.tipo)
            const isImage = f.tipo?.startsWith('image/')
            return (
              <div key={f.id} className="card p-4 flex items-start gap-3 group">
                {isImage ? (
                  <img src={f.url} alt={f.nombre} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-slate-200" />
                ) : (
                  <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-primary-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{f.nombre}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{fileSize(f.tamano)}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(f.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={f.url} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => handleDelete(f)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
