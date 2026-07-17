import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Plus, Trash2, Upload } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { FilterBar } from '../ui/FilterBar'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { deleteComplianceManual, getComplianceManualUrl, uploadComplianceManual } from '../../lib/api'
import type { Client, ComplianceManual } from '../../lib/types'
import { formatDate } from '../../lib/utils'

interface ClientManualsSectionProps {
  manuals: ComplianceManual[]
  clients: Client[]
  loading: boolean
  canDelete: boolean
  canEdit?: boolean
  initialClientId?: string
  openUploadForm?: boolean
  onUploadFormOpened?: () => void
  userId?: string
  onRefetch: () => void
  pageError?: string
}

export function ClientManualsSection({
  manuals,
  clients,
  loading,
  canDelete,
  canEdit = true,
  initialClientId,
  openUploadForm,
  onUploadFormOpened,
  userId,
  onRefetch,
  pageError,
}: ClientManualsSectionProps) {
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ComplianceManual | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [clientId, setClientId] = useState('')
  const [title, setTitle] = useState('Manual PLD')
  const [version, setVersion] = useState('1.0')
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10))
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (openUploadForm) {
      setUploadOpen(true)
      if (initialClientId) setClientId(initialClientId)
      onUploadFormOpened?.()
    }
  }, [openUploadForm, initialClientId, onUploadFormOpened])

  const filtered = useMemo(() => {
    return manuals.filter((m) => {
      const q = search.toLowerCase()
      const haystack = [m.title, m.version, m.file_name, m.clients?.name].join(' ').toLowerCase()
      if (search && !haystack.includes(q)) return false
      if (clientFilter && m.client_id !== clientFilter) return false
      if (statusFilter === 'active' && !m.is_active) return false
      if (statusFilter === 'history' && m.is_active) return false
      return true
    })
  }, [manuals, search, clientFilter, statusFilter])

  const clientOptions = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name)),
    [clients],
  )

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    const fileInput = document.getElementById('manual-file-input') as HTMLInputElement | null
    const file = fileInput?.files?.[0]
    if (!clientId) {
      setUploadError('Selecciona el cliente.')
      return
    }
    if (!file) {
      setUploadError('Selecciona un archivo PDF o Word.')
      return
    }
    setUploading(true)
    setUploadError('')
    const result = await uploadComplianceManual(
      file,
      { client_id: clientId, title, version, effective_date: effectiveDate },
      userId,
    )
    setUploading(false)
    if (result.error) {
      setUploadError(result.error)
      return
    }
    setUploadOpen(false)
    setClientId('')
    if (fileInput) fileInput.value = ''
    onRefetch()
  }

  return (
    <section className="card card-wide">
      <div className="client-ops-header">
        <div>
          <h2>Manuales PLD por cliente</h2>
          <p className="card-desc">{filtered.length} registro(s) · Art. 53 LFPIORPI · historial de versiones</p>
        </div>
        {canEdit && (
          <Button onClick={() => { setUploadError(''); setUploadOpen(true) }}>
            <Plus size={14} /> Subir manual
          </Button>
        )}
      </div>

      {pageError && <p className="form-error compliance-banner">{pageError}</p>}

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar manual, cliente o versión..."
        filters={[
          {
            label: 'Estado',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'all', label: 'Todos' },
              { value: 'active', label: 'Vigentes' },
              { value: 'history', label: 'Anteriores' },
            ],
          },
          {
            label: 'Cliente',
            value: clientFilter,
            onChange: setClientFilter,
            options: [{ value: '', label: 'Todos' }, ...clientOptions.map((c) => ({ value: c.id, label: c.name }))],
          },
        ]}
      />

      {loading ? (
        <p className="loading">Cargando manuales...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h3>Sin manuales registrados</h3>
          <p>Sube el manual PLD de cada cliente sujeto obligado.</p>
          <Button onClick={() => setUploadOpen(true)}><Upload size={16} /> Subir primer manual</Button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Manual</th>
                <th>Versión</th>
                <th>Vigencia</th>
                <th>Archivo</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td>
                    {m.client_id ? (
                      <Link to={`/clientes/${m.client_id}`}><strong>{m.clients?.name ?? '—'}</strong></Link>
                    ) : '—'}
                  </td>
                  <td><strong>{m.title}</strong></td>
                  <td>v{m.version}</td>
                  <td>{formatDate(m.effective_date)}</td>
                  <td><span className="cell-sub">{m.file_name ?? '—'}</span></td>
                  <td>
                    {m.is_active ? <Badge variant="success">Vigente</Badge> : <Badge variant="muted">Anterior</Badge>}
                  </td>
                  <td className="row-actions">
                    {m.storage_path && (
                      <Button size="sm" variant="ghost" onClick={async () => {
                        const url = await getComplianceManualUrl(m.storage_path!)
                        if (url) window.open(url, '_blank')
                      }}>
                        <Download size={14} />
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(m)}>
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Subir manual PLD">
        <form className="form-stack" onSubmit={handleUpload}>
          <Select label="Cliente *" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
            <option value="">Seleccionar cliente...</option>
            {clientOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <div className="form-row">
            <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Input label="Versión" value={version} onChange={(e) => setVersion(e.target.value)} required />
          </div>
          <Input label="Vigente desde" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} required />
          <div className="form-field">
            <label htmlFor="manual-file-input">Archivo (PDF, Word) *</label>
            <input id="manual-file-input" type="file" accept=".pdf,.doc,.docx" />
          </div>
          <p className="card-desc">Al subir una nueva versión, la anterior del mismo cliente queda como histórica.</p>
          {uploadError && <p className="form-error">{uploadError}</p>}
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setUploadOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={uploading}>{uploading ? 'Subiendo...' : 'Guardar manual'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar manual"
        message={`¿Eliminar ${deleteTarget?.title} v${deleteTarget?.version}?`}
        confirmLabel="Eliminar"
        danger
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return
          setDeleting(true)
          await deleteComplianceManual(deleteTarget.id)
          setDeleting(false)
          setDeleteTarget(null)
          onRefetch()
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  )
}
