import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { FilterBar } from '../ui/FilterBar'
import { deleteComplianceOfficer } from '../../lib/api'
import type { Client, ClientComplianceOfficer } from '../../lib/types'
import { formatDate } from '../../lib/utils'
import { OfficerFormModal } from './OfficerFormModal'

interface ComplianceOfficersSectionProps {
  officers: ClientComplianceOfficer[]
  clients: Client[]
  loading: boolean
  canDelete: boolean
  userId?: string
  onRefetch: () => void
  pageError?: string
}

export function ComplianceOfficersSection({
  officers,
  clients,
  loading,
  canDelete,
  userId,
  onRefetch,
  pageError,
}: ComplianceOfficersSectionProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [clientFilter, setClientFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ClientComplianceOfficer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ClientComplianceOfficer | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = useMemo(() => {
    return officers.filter((o) => {
      const q = search.toLowerCase()
      const haystack = [o.name, o.email, o.rfc, o.clients?.name].join(' ').toLowerCase()
      if (search && !haystack.includes(q)) return false
      if (statusFilter === 'active' && !o.is_active) return false
      if (statusFilter === 'inactive' && o.is_active) return false
      if (clientFilter && o.client_id !== clientFilter) return false
      return true
    })
  }, [officers, search, statusFilter, clientFilter])

  const activeCount = officers.filter((o) => o.is_active).length
  const clientOptions = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name)),
    [clients],
  )

  return (
    <section className="card card-wide">
      <div className="client-ops-header">
        <div>
          <h2>Registro de oficiales de cumplimiento</h2>
          <p className="card-desc">
            {filtered.length} registro(s) · {activeCount} vigente(s) · Art. 52 LFPIORPI por cliente
          </p>
        </div>
        <Button onClick={() => { setEditTarget(null); setFormOpen(true) }}>
          <Plus size={14} /> Nuevo oficial
        </Button>
      </div>

      {pageError && <p className="form-error compliance-banner">{pageError}</p>}

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por oficial, cliente, RFC o email..."
        filters={[
          {
            label: 'Estado',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'all', label: 'Todos' },
              { value: 'active', label: 'Vigentes' },
              { value: 'inactive', label: 'Histórico' },
            ],
          },
          {
            label: 'Cliente',
            value: clientFilter,
            onChange: setClientFilter,
            options: [
              { value: '', label: 'Todos' },
              ...clientOptions.map((c) => ({ value: c.id, label: c.name })),
            ],
          },
        ]}
      />

      {loading ? (
        <p className="loading">Cargando oficiales...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h3>Sin oficiales registrados</h3>
          <p>Registra el oficial de cumplimiento de cada cliente sujeto obligado.</p>
          <Button onClick={() => setFormOpen(true)}><Plus size={16} /> Registrar primer oficial</Button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Oficial de cumplimiento</th>
                <th>Contacto</th>
                <th>Designación</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link to={`/clientes/${o.client_id}`}><strong>{o.clients?.name ?? '—'}</strong></Link>
                  </td>
                  <td>
                    <strong>{o.name}</strong>
                    {o.rfc && <span className="cell-sub">{o.rfc}</span>}
                  </td>
                  <td>
                    {o.email && <span className="cell-sub">{o.email}</span>}
                    {o.phone && <span className="cell-sub">{o.phone}</span>}
                  </td>
                  <td>{o.appointed_at ? formatDate(o.appointed_at) : '—'}</td>
                  <td>
                    {o.is_active
                      ? <Badge variant="success">Vigente</Badge>
                      : <Badge variant="muted">Histórico</Badge>}
                  </td>
                  <td className="row-actions">
                    <Button size="sm" variant="ghost" onClick={() => { setEditTarget(o); setFormOpen(true) }}>
                      <Pencil size={14} />
                    </Button>
                    {canDelete && (
                      <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(o)}>
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

      <OfficerFormModal
        open={formOpen}
        officer={editTarget}
        clients={clients}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
        onSaved={onRefetch}
        userId={userId}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar oficial"
        message={`¿Eliminar el registro de ${deleteTarget?.name}?`}
        confirmLabel="Eliminar"
        danger
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return
          setDeleting(true)
          await deleteComplianceOfficer(deleteTarget.id)
          setDeleting(false)
          setDeleteTarget(null)
          onRefetch()
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  )
}
