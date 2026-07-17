import { useRef, useState } from 'react'
import { Camera, Download, FileText, RefreshCw, Trash2, Upload } from 'lucide-react'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { deleteDocument, getDocumentUrl, getLegalResourceUrl, replaceDocument, uploadDocument } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useDocuments, useLegalResources } from '../../hooks/useData'
import { useProtectedAction } from '../../hooks/useProtectedAction'
import { canDelete, needsApprovalForSensitive } from '../../lib/permissions'
import { DOC_TYPE_OPTIONS, DOCUMENT_TEMPLATES } from '../../lib/document-templates'
import { formatDate } from '../../lib/utils'

interface DocumentsPanelProps {
  expedienteId?: string
  clientId?: string
  kycId?: string
}

export function DocumentsPanel({ expedienteId, clientId, kycId }: DocumentsPanelProps) {
  const { user, profile } = useAuth()
  const { runSensitiveAction, requiresApproval } = useProtectedAction()
  const mayDelete = canDelete(profile?.role) || needsApprovalForSensitive(profile?.role)
  const { documents, loading, refetch } = useDocuments({ expedienteId, clientId, kycId })
  const { resources } = useLegalResources()
  const templates = resources.filter((r) => r.is_template && r.storage_path)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const [docType, setDocType] = useState<string>(DOC_TYPE_OPTIONS[0])
  const [templateId, setTemplateId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [replacingId, setReplacingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function handleUpload(file: File) {
    setUploading(true)
    setError('')
    setInfo('')
    const result = await uploadDocument(
      file,
      {
        expediente_id: expedienteId,
        client_id: clientId,
        kyc_id: kycId,
        doc_type: docType,
        legal_resource_id: templateId || undefined,
      },
      user?.id,
    )
    setUploading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setInfo('Documento subido correctamente.')
    refetch()
  }

  async function handleReplace(docId: string, storagePath: string, file: File) {
    setUploading(true)
    setError('')
    const result = await replaceDocument(docId, storagePath, file, user?.id)
    setUploading(false)
    setReplacingId(null)
    if (result.error) setError(result.error)
    else refetch()
  }

  async function handleDownload(storagePath: string) {
    const url = await getDocumentUrl(storagePath)
    if (url) window.open(url, '_blank')
  }

  async function handleDelete(docId: string, storagePath: string, name: string) {
    if (!confirm(requiresApproval('delete_document') ? '¿Solicitar autorización para eliminar este documento?' : '¿Eliminar este documento?')) return
    setError('')
    setInfo('')
    const result = await runSensitiveAction({
      actionType: 'delete_document',
      title: `Eliminar documento: ${name}`,
      clientId,
      payload: { docId, storagePath },
      direct: () => deleteDocument(docId, storagePath),
    })
    if (result.error) setError(result.error)
    else if (result.pending) setInfo('Solicitud enviada. El abogado la revisará en Autorizaciones.')
    else {
      setInfo('Documento eliminado.')
      refetch()
    }
  }

  async function handleDownloadTemplate() {
    const tpl = templates.find((t) => t.id === templateId)
    if (!tpl?.storage_path) return
    const url = await getLegalResourceUrl(tpl.storage_path)
    if (url) window.open(url, '_blank')
  }

  return (
    <div className="documents-panel">
      <div className="doc-upload-row">
        <Select label="Tipo de documento" value={docType} onChange={(e) => setDocType(e.target.value)}>
          {DOC_TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
        {templates.length > 0 && (
          <>
            <Select label="Plantilla biblioteca" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">Sin plantilla</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </Select>
            {templateId && (
              <Button type="button" variant="secondary" onClick={handleDownloadTemplate}>
                <Download size={16} /> Descargar plantilla
              </Button>
            )}
          </>
        )}
        <span className="doc-template-hint">
          {DOCUMENT_TEMPLATES.find((t) => t.type === docType)?.description}
        </span>
        <input
          ref={fileRef}
          type="file"
          hidden
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file)
            e.target.value = ''
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          hidden
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file)
            e.target.value = ''
          }}
        />
        <input
          ref={replaceRef}
          type="file"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            const docId = replaceRef.current?.dataset.docId
            const path = replaceRef.current?.dataset.storagePath
            if (file && docId && path) handleReplace(docId, path, file)
            e.target.value = ''
          }}
        />
        <Button type="button" variant="secondary" disabled={uploading} onClick={() => cameraRef.current?.click()}>
          <Camera size={16} />
          Foto
        </Button>
        <Button type="button" variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>
          <Upload size={16} />
          {uploading ? 'Subiendo...' : 'Subir archivo'}
        </Button>
      </div>

      {error && <p className="form-error">{error}</p>}
      {info && <p className="form-success">{info}</p>}

      {loading ? (
        <p className="loading">Cargando documentos...</p>
      ) : documents.length === 0 ? (
        <p className="empty-state">Sin documentos aún</p>
      ) : (
        <div className="doc-list">
          {documents.map((doc) => (
            <div key={doc.id} className="doc-row">
              <FileText size={18} />
              <div className="doc-info">
                <strong>{doc.name}</strong>
                <span>{doc.doc_type} · {formatDate(doc.uploaded_at)}</span>
              </div>
              <button type="button" className="icon-btn" onClick={() => handleDownload(doc.storage_path)} title="Descargar">
                <Download size={16} />
              </button>
              {mayDelete && (
                <>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Reemplazar"
                    disabled={uploading && replacingId === doc.id}
                    onClick={() => {
                      setReplacingId(doc.id)
                      if (replaceRef.current) {
                        replaceRef.current.dataset.docId = doc.id
                        replaceRef.current.dataset.storagePath = doc.storage_path
                        replaceRef.current.click()
                      }
                    }}
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button type="button" className="icon-btn danger" onClick={() => handleDelete(doc.id, doc.storage_path, doc.name)} title="Eliminar">
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
