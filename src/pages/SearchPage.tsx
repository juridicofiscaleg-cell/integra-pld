import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input } from '../components/ui/Input'
import { useSearch } from '../hooks/useData'
import { MATTER_TYPE_LABELS } from '../lib/types'

export function SearchPage() {
  const [query, setQuery] = useState('')
  const { results, loading } = useSearch(query)

  const hasResults =
    results.clients.length > 0 ||
    results.expedientes.length > 0 ||
    results.kyc.length > 0

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Buscar</h1>
          <p>Clientes, expedientes y registros KYC</p>
        </div>
      </header>

      <div className="search-box">
        <Search size={20} />
        <Input
          placeholder="Buscar por nombre, asunto, RFC..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && <p className="loading">Buscando...</p>}

      {query && !loading && !hasResults && (
        <p className="empty-state">Sin resultados para "{query}"</p>
      )}

      {hasResults && (
        <div className="search-results">
          {results.clients.length > 0 && (
            <section className="card">
              <h2>Clientes ({results.clients.length})</h2>
              {results.clients.map((c) => (
                <Link key={c.id} to={`/clientes/${c.id}`} className="search-result-item">
                  {c.name}
                </Link>
              ))}
            </section>
          )}

          {results.expedientes.length > 0 && (
            <section className="card">
              <h2>Expedientes ({results.expedientes.length})</h2>
              {results.expedientes.map((e) => (
                <Link key={e.id} to={`/expedientes/${e.id}`} className="search-result-item">
                  <strong>{e.title}</strong>
                  <span>{e.clients?.name} · {MATTER_TYPE_LABELS[e.matter_type]}</span>
                </Link>
              ))}
            </section>
          )}

          {results.kyc.length > 0 && (
            <section className="card">
              <h2>KYC ({results.kyc.length})</h2>
              {results.kyc.map((k) => (
                <Link key={k.id} to={`/clientes/${k.client_id}`} className="search-result-item">
                  {k.clients?.name} — Score {k.risk_score}
                </Link>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
