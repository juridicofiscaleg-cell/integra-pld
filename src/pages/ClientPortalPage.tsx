import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Upload } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { getPortalClient, uploadViaPortal } from '../lib/api'
import { DOC_TYPE_OPTIONS } from '../lib/document-templates'
import type { Client } from '../lib/types'

export function ClientPortalPage() {
  const { token } = useParams<{ token: string }>()
  const fileRef = useRef<HTMLInputElement>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [expired, setExpired] = useState(false)
  const [error, setError] = useState('')
  const [docType, setDocType] = useState<string>(DOC_TYPE_OPTIONS[0])
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!token) return
    getPortalClient(token).then((r) => {
      if (r.expired) setExpired(true)
      else if (r.error) setError(r.error)
      else if (r.client) setClient(r.client)
    })
  }, [token])

  async function handleUpload(file: File) {
    if (!token) return
    setUploading(true)
    setError('')
    setSuccess('')
    const result = await uploadViaPortal(token, file, docType)
    setUploading(false)
    if (result.error) setError(result.error)
    else setSuccess('Documento recibido. Gracias.')
  }

  if (expired) {
    return (
      <div className="login-page">
        <div className="login-card card"><h1>Enlace expirado</h1><p>Solicita un nuevo enlace a tu despacho.</p></div>
      </div>
    )
  }

  if (error && !client) {
    return (
      <div className="login-page">
        <div className="login-card card"><h1>Enlace no válido</h1><p>{error}</p></div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card card" style={{ maxWidth: 480 }}>
        <h1>Portal del cliente</h1>
        <p>Sube documentación para <strong>{client?.name}</strong></p>
        <Select label="Tipo de documento" value={docType} onChange={(e) => setDocType(e.target.value)}>
          {DOC_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <input ref={fileRef} type="file" hidden onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
        <Button disabled={uploading} onClick={() => fileRef.current?.click()}>
          <Upload size={16} /> {uploading ? 'Subiendo...' : 'Seleccionar archivo'}
        </Button>
        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}
        <p className="cell-sub">Integra PLD — canal seguro del despacho</p>
      </div>
    </div>
  )
}
