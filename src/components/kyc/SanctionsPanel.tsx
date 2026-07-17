import { useState } from 'react'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { Button } from '../ui/Button'
import { saveSanctionsResults } from '../../lib/api'
import { isOpenSanctionsConfigured } from '../../lib/opensanctions'
import { runSanctionsCheck, sanctionsSummary } from '../../lib/sanctions'
import { useAuth } from '../../context/AuthContext'
import type { Client, KycRecord, SanctionsResults } from '../../lib/types'
import { formatDateTime } from '../../lib/utils'

interface SanctionsPanelProps {
  kyc: KycRecord
  client?: Client
  onUpdated: () => void
}

export function SanctionsPanel({ kyc, client, onUpdated }: SanctionsPanelProps) {
  const { user } = useAuth()
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const results = kyc.sanctions_results ?? {}

  const resultList = Object.values(results)
  const summary = resultList.length > 0 ? sanctionsSummary(resultList) : null

  async function handleCheck() {
    if (!client?.name) return
    setChecking(true)
    setError('')

    const checkResults = await runSanctionsCheck(client.name, client.client_type, client.rfc)
    const sanctionsMap: SanctionsResults = Object.fromEntries(
      checkResults.map((r) => [r.list, r]),
    )

    const result = await saveSanctionsResults(kyc.id, sanctionsMap, kyc.checklist, user?.id)
    setChecking(false)

    if (result.error) {
      setError(result.error)
      return
    }

    onUpdated()
  }

  return (
    <div className="sanctions-panel">
      <div className="sanctions-header">
        <h3><ShieldAlert size={18} /> Verificación de listas</h3>
        <Button type="button" variant="secondary" disabled={checking || !client} onClick={handleCheck}>
          {checking ? 'Consultando...' : 'Ejecutar verificación'}
        </Button>
      </div>
      <p className="card-desc">
        {isOpenSanctionsConfigured()
          ? 'Consulta en vivo vía OpenSanctions (sanciones, PEP, listas México).'
          : 'Modo simulación. Agrega VITE_OPENSANCTIONS_API_KEY en .env y GitHub Secrets.'}
      </p>

      {error && <p className="form-error">{error}</p>}

      {summary && (
        <div className={`sanctions-summary ${summary.clear ? 'clear' : 'match'}`}>
          {summary.clear ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
          <span>
            {summary.clear
              ? 'Sin coincidencias en las listas consultadas'
              : `${summary.matches} coincidencia(s) — requiere revisión manual`}
          </span>
        </div>
      )}

      {resultList.length > 0 ? (
        <div className="sanctions-results">
          {resultList.map((r) => (
            <div key={r.list} className={`sanctions-row ${r.match ? 'match' : 'clear'}`}>
              <strong>{r.label}</strong>
              <span>{r.match ? '⚠ Coincidencia' : '✓ Limpio'}</span>
              <p>{r.details}</p>
              <small>Fuente: {r.source ?? 'N/A'} · Consultado: {formatDateTime(r.checked_at)}</small>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">Aún no se ha ejecutado verificación de listas.</p>
      )}
    </div>
  )
}
