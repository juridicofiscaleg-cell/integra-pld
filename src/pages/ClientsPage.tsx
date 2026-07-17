import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { FilterBar } from '../components/ui/FilterBar'
import { NewClientModal } from '../components/clients/NewClientModal'
import { useClients } from '../hooks/useData'
import { RISK_LABELS } from '../lib/types'
import { formatDate } from '../lib/utils'

const riskVariant = {
  bajo: 'success' as const,
  medio: 'warning' as const,
  alto: 'danger' as const,
  critico: 'danger' as const,
}

export function ClientsPage() {
  const { clients, loading, refetch } = useClients()
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [vulnFilter, setVulnFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const q = search.toLowerCase()
      if (q && !c.name.toLowerCase().includes(q) && !(c.rfc ?? '').toLowerCase().includes(q)) return false
      const risk = c.matrix_risk_level ?? c.risk_level
      if (riskFilter && risk !== riskFilter) return false
      if (vulnFilter === 'yes' && !c.vulnerable_activity) return false
      if (vulnFilter === 'no' && c.vulnerable_activity) return false
      if (typeFilter && c.client_type !== typeFilter) return false
      return true
    })
  }, [clients, search, riskFilter, vulnFilter, typeFilter])

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Clientes</h1>
          <p>{filtered.length} de {clients.length} clientes</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Nuevo cliente
        </Button>
      </header>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre o RFC..."
        filters={[
          {
            label: 'Riesgo',
            value: riskFilter,
            onChange: setRiskFilter,
            options: [
              { value: '', label: 'Todos' },
              ...Object.entries(RISK_LABELS).map(([k, v]) => ({ value: k, label: v })),
            ],
          },
          {
            label: 'Act. vulnerable',
            value: vulnFilter,
            onChange: setVulnFilter,
            options: [
              { value: '', label: 'Todos' },
              { value: 'yes', label: 'Sí' },
              { value: 'no', label: 'No' },
            ],
          },
          {
            label: 'Tipo',
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { value: '', label: 'Todos' },
              { value: 'persona_fisica', label: 'Persona física' },
              { value: 'persona_moral', label: 'Persona moral' },
            ],
          },
        ]}
      />

      {loading ? (
        <p className="loading">Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-card">
          <h2>Sin clientes</h2>
          <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Nuevo cliente</Button>
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>RFC</th>
                <th>Giro</th>
                <th>Act. vuln.</th>
                <th>Riesgo</th>
                <th>Registro</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => {
                const risk = client.matrix_risk_level ?? client.risk_level
                return (
                  <tr key={client.id}>
                    <td>
                      <Link to={`/clientes/${client.id}`} className="table-link">
                        <strong>{client.name}</strong>
                        {client.email && <span>{client.email}</span>}
                      </Link>
                    </td>
                    <td>{client.client_type === 'persona_fisica' ? 'Persona física' : 'Persona moral'}</td>
                    <td>{client.rfc ?? '—'}</td>
                    <td>{client.industry ?? '—'}</td>
                    <td>{client.vulnerable_activity ? 'Sí' : '—'}</td>
                    <td>
                      <Badge variant={riskVariant[risk]}>{RISK_LABELS[risk]}</Badge>
                    </td>
                    <td>{formatDate(client.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <NewClientModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={refetch} />
    </div>
  )
}
