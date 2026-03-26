import { useState, useEffect, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Loader2, Save, Plus, Trash2, BookOpen, ChevronDown, ChevronUp
} from 'lucide-react'
import { cn } from '../../utils'

function Toolbar({ editor }) {
  if (!editor) return null
  const btn = (action, active, title, children) => (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); action() }}
      title={title}
      className={cn(
        'p-1.5 rounded-md text-sm transition-colors',
        active ? 'bg-primary-100 text-primary-700' : 'text-slate-600 hover:bg-slate-100'
      )}
    >
      {children}
    </button>
  )
  return (
    <div className="flex items-center gap-0.5 px-3 py-2 border-b border-slate-200 flex-wrap">
      {btn(() => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), 'Negrita', <Bold className="w-4 h-4" />)}
      {btn(() => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), 'Cursiva', <Italic className="w-4 h-4" />)}
      {btn(() => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'), 'Subrayado', <UnderlineIcon className="w-4 h-4" />)}
      <div className="w-px h-5 bg-slate-200 mx-1" />
      {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }), 'Título', <span className="text-xs font-bold">H2</span>)}
      {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive('heading', { level: 3 }), 'Subtítulo', <span className="text-xs font-bold">H3</span>)}
      <div className="w-px h-5 bg-slate-200 mx-1" />
      {btn(() => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'), 'Lista', <List className="w-4 h-4" />)}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), 'Lista numerada', <ListOrdered className="w-4 h-4" />)}
      <div className="w-px h-5 bg-slate-200 mx-1" />
      {btn(() => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'), 'Cita', <span className="text-xs font-mono px-1">"</span>)}
      {btn(() => editor.chain().focus().setHorizontalRule().run(), false, 'Línea separadora', <span className="text-xs">—</span>)}
    </div>
  )
}

export default function ClinicalNotesTab({ patient }) {
  const { doctor } = useAuthStore()
  const [notes, setNotes] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [expandedNote, setExpandedNote] = useState(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: 'Empieza a escribir la nota clínica...' }),
    ],
    content: '',
    editorProps: {
      attributes: { class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3 text-slate-700' }
    },
  })

  const fetchData = async () => {
    setLoading(true)
    const [{ data: notesData }, { data: tmplData }] = await Promise.all([
      supabase.from('clinical_notes').select('*').eq('patient_id', patient.id).order('created_at', { ascending: false }),
      supabase.from('note_templates').select('*').eq('doctor_id', doctor?.id).order('nombre'),
    ])
    setNotes(notesData || [])
    setTemplates(tmplData || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [patient.id])

  const handleSave = async () => {
    const content = editor?.getHTML()
    if (!content || content === '<p></p>') return
    setSaving(true)
    await supabase.from('clinical_notes').insert([{
      patient_id: patient.id,
      doctor_id: doctor?.id,
      contenido: content,
    }])
    editor?.commands.clearContent()
    setSaving(false)
    fetchData()
  }

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return
    const content = editor?.getHTML()
    if (!content || content === '<p></p>') return
    setSavingTemplate(true)
    await supabase.from('note_templates').insert([{
      doctor_id: doctor?.id,
      nombre: templateName,
      contenido: content,
    }])
    setSavingTemplate(false)
    setTemplateName('')
    setShowTemplateForm(false)
    fetchData()
  }

  const applyTemplate = (tmpl) => {
    editor?.commands.setContent(tmpl.contenido)
    setShowTemplates(false)
  }

  const deleteTemplate = async (id) => {
    await supabase.from('note_templates').delete().eq('id', id)
    fetchData()
  }

  const deleteNote = async (id) => {
    await supabase.from('clinical_notes').delete().eq('id', id)
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-700">Notas de Historia Clínica</h2>
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="btn-secondary flex items-center gap-2"
        >
          <BookOpen className="w-4 h-4" />
          Plantillas
          {templates.length > 0 && (
            <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full font-semibold">{templates.length}</span>
          )}
        </button>
      </div>

      {/* Panel de plantillas */}
      {showTemplates && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Plantillas guardadas</h3>
            <button onClick={() => setShowTemplateForm(!showTemplateForm)} className="text-xs text-primary-600 hover:underline">
              + Guardar nota actual como plantilla
            </button>
          </div>
          {showTemplateForm && (
            <div className="flex gap-2">
              <input
                className="input flex-1 text-sm"
                placeholder="Nombre de la plantilla..."
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
              />
              <button onClick={handleSaveTemplate} disabled={savingTemplate} className="btn-primary text-sm">
                {savingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar'}
              </button>
            </div>
          )}
          {templates.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-3">No tienes plantillas guardadas</p>
          ) : (
            <div className="space-y-1">
              {templates.map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 group">
                  <button onClick={() => applyTemplate(t)} className="text-sm text-slate-700 hover:text-primary-600 flex-1 text-left">
                    {t.nombre}
                  </button>
                  <button onClick={() => deleteTemplate(t.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Editor */}
      <div className="card overflow-hidden">
        <Toolbar editor={editor} />
        <EditorContent editor={editor} />
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={() => setShowTemplateForm(!showTemplateForm)}
            className="text-xs text-slate-500 hover:text-primary-600 transition-colors"
          >
            + Agregar como plantilla
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar nota
          </button>
        </div>
      </div>

      {/* Historial de notas */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
      ) : notes.length === 0 ? (
        <div className="card p-10 text-center">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No hay notas clínicas registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-600">Notas anteriores</h3>
          {notes.map(note => (
            <div key={note.id} className="card overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
                onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-primary-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-700">Nota clínica</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {new Date(note.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); deleteNote(note.id) }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {expandedNote === note.id
                    ? <ChevronUp className="w-4 h-4 text-slate-400" />
                    : <ChevronDown className="w-4 h-4 text-slate-400" />
                  }
                </div>
              </button>
              {expandedNote === note.id && (
                <div
                  className="border-t border-slate-100 p-4 prose prose-sm max-w-none text-slate-700"
                  dangerouslySetInnerHTML={{ __html: note.contenido }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
