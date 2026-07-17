import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Download } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { FilterBar } from '../components/ui/FilterBar'
import { useActivityLog, useClients } from '../hooks/useData'
import { exportActivityCsv } from '../lib/export'
import { canViewAuditLog } from '../lib/permissions'
import { useAuth } from '../context/AuthContext'
import { formatDateTime, formatRelative } from '../lib/utils'

export function ActivityLogPage() {
  const { profile } = useAuth()
  const { activity, loading } = useActivityLog()
  const { clients } = useClients()
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const actions = [...new Set(activity.map((a) => a.action))].sort()

  const filtered = activity.filter((a) => {
    if (search && !a.description.toLowerCase().includes(search.toLowerCase())) return false
    if (clientFilter && a.client_id !== clientFilter) return false
    if (actionFilter && a.action !== actionFilter) return false
    return true
  })

  if (!canViewAuditLog(profile?.role)) return <Navigate to="/" replace />

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Bitácora de actividad</h1>
          <p>Historial completo de acciones para auditoría y supervisión</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => exportActivityCsv(filtered)}
          disabled={filtered.length === 0}
        >
          <Download size={16} /> Exportar CSV
        </Button>
      </header>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar en descripción..."
        filters={[
          {
            label: 'Cliente',
            value: clientFilter,
            onChange: setClientFilter,
            options: [{ value: '', label: 'Todos' }, ...clients.map((c) => ({ value: c.id, label: c.name }))],
          },
          {
            label: 'Acción',
            value: actionFilter,
            onChange: setActionFilter,
            options: [{ value: '', label: 'Todas' }, ...actions.map((a) => ({ value: a, label: a.replace(/_/g, ' ') }))],
          },
        ]}
      />

      {loading ? (
        <p className="loading">Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-card"><p>Sin registros</p></div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Acción</th>
                <th>Descripción</th>
                <th>Usuario</th>
                <th>Cliente</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td title={formatDateTime(a.created_at)}>{formatRelative(a.created_at)}</td>
                  <td><code>{a.action}</code></td>
                  <td>{a.description}</td>
                  <td>{a.profiles?.full_name ?? '—'}</td>
                  <td>
                    {a.client_id ? (
                      <Link to={`/clientes/${a.client_id}`}>Ver cliente</Link>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
