import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
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

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Clientes</h1>
          <p>Expedientes y KYC por cliente</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Nuevo cliente
        </Button>
      </header>

      {loading ? (
        <p className="loading">Cargando...</p>
      ) : clients.length === 0 ? (
        <div className="empty-card">
          <h2>Sin clientes aún</h2>
          <p>Crea tu primer cliente para empezar a dar seguimiento.</p>
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Nuevo cliente
          </Button>
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>RFC</th>
                <th>Industria</th>
                <th>Riesgo</th>
                <th>Registro</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
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
                  <td>
                    <Badge variant={riskVariant[client.risk_level]}>
                      {RISK_LABELS[client.risk_level]}
                    </Badge>
                  </td>
                  <td>{formatDate(client.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={refetch}
      />
    </div>
  )
}
