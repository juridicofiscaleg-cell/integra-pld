import { useRef, useState } from 'react'
import { Download, FileText, Trash2, Upload } from 'lucide-react'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { deleteDocument, getDocumentUrl, uploadDocument } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useDocuments } from '../../hooks/useData'
import { formatDate } from '../../lib/utils'

interface DocumentsPanelProps {
  expedienteId?: string
  clientId?: string
  kycId?: string
}

import { DOC_TYPE_OPTIONS, DOCUMENT_TEMPLATES } from '../../lib/document-templates'

export function DocumentsPanel({ expedienteId, clientId, kycId }: DocumentsPanelProps) {
  const { user, profile } = useAuth()
  const canDelete = profile?.role !== 'asistente'
  const { documents, loading, refetch } = useDocuments({ expedienteId, clientId, kycId })
  const fileRef = useRef<HTMLInputElement>(null)
  const [docType, setDocType] = useState<string>(DOC_TYPE_OPTIONS[0])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload(file: File) {
    setUploading(true)
    setError('')
    const result = await uploadDocument(
      file,
      { expediente_id: expedienteId, client_id: clientId, kyc_id: kycId, doc_type: docType },
      user?.id,
    )
    setUploading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    refetch()
  }

  async function handleDownload(storagePath: string) {
    const url = await getDocumentUrl(storagePath)
    if (url) window.open(url, '_blank')
  }

  async function handleDelete(docId: string, storagePath: string) {
    if (!confirm('¿Eliminar este documento?')) return
    const result = await deleteDocument(docId, storagePath)
    if (result.error) setError(result.error)
    else refetch()
  }

  return (
    <div className="documents-panel">
      <div className="doc-upload-row">
        <Select label="Tipo de documento" value={docType} onChange={(e) => setDocType(e.target.value)}>
          {DOC_TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
        <span className="doc-template-hint">
          {DOCUMENT_TEMPLATES.find((t) => t.type === docType)?.description}
        </span>
        <input
          ref={fileRef}
          type="file"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file)
            e.target.value = ''
          }}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={16} />
          {uploading ? 'Subiendo...' : 'Subir archivo'}
        </Button>
      </div>

      {error && <p className="form-error">{error}</p>}

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
              {canDelete && (
                <button type="button" className="icon-btn danger" onClick={() => handleDelete(doc.id, doc.storage_path)} title="Eliminar">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
