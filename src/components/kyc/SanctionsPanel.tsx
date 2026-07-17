import { useState } from 'react'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { Button } from '../ui/Button'
import { saveSanctionsResults, createKyc } from '../../lib/api'
import { isLiveSanctionsAvailable, runSanctionsCheck, sanctionsSummary } from '../../lib/sanctions'
import { useAuth } from '../../context/AuthContext'
import type { Client, KycRecord, SanctionsResults } from '../../lib/types'
import { formatDateTime } from '../../lib/utils'

interface SanctionsPanelProps {
  client: Client
  kyc?: KycRecord | null
  onUpdated: () => void
}

export function SanctionsPanel({ client, kyc, onUpdated }: SanctionsPanelProps) {
  const { user } = useAuth()
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [localResults, setLocalResults] = useState<SanctionsResults>({})
  const results = kyc?.sanctions_results ?? localResults

  const resultList = Object.values(results)
  const summary = resultList.length > 0 ? sanctionsSummary(resultList) : null

  async function handleCheck() {
    if (!client.name) return
    setChecking(true)
    setError('')

    try {
      const checkResults = await runSanctionsCheck(client.name, client.client_type, client.rfc)

      if (checkResults[0]?.source === 'simulación') {
        setError('Modo demo activo — no se consultaron listas reales.')
        setChecking(false)
        return
      }

      const sanctionsMap: SanctionsResults = Object.fromEntries(
        checkResults.map((r) => [r.list, r]),
      )

      let kycId = kyc?.id
      let checklist = kyc?.checklist ?? {}

      if (!kycId) {
        const created = await createKyc(
          {
            client_id: client.id,
            checklist: {},
            pep: false,
            sanctions_check: false,
            status: 'pendiente',
          },
          user?.id,
        )
        if (created.error || !created.kycId) {
          setError(created.error ?? 'No se pudo crear registro KYC.')
          setChecking(false)
          return
        }
        kycId = created.kycId
      }

      const result = await saveSanctionsResults(kycId, sanctionsMap, checklist, user?.id)
      if (result.error) {
        setError(result.error)
      } else {
        setLocalResults(sanctionsMap)
        onUpdated()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar listas')
    }

    setChecking(false)
  }

  return (
    <div className="sanctions-panel">
      <div className="sanctions-header">
        <h3><ShieldAlert size={18} /> Verificación de listas</h3>
        <Button type="button" variant="secondary" disabled={checking} onClick={handleCheck}>
          {checking ? 'Consultando...' : 'Ejecutar verificación'}
        </Button>
      </div>
      <p className="card-desc">
        {isLiveSanctionsAvailable()
          ? 'Consulta en vivo vía OpenSanctions. Si el cliente no tiene KYC, se crea uno automáticamente al verificar.'
          : 'Modo demo — conecta Supabase para consultas reales.'}
      </p>

      {error && <p className="form-error">{error}</p>}

      {summary && (
        <div className={`sanctions-summary ${summary.clear ? (summary.isLive ? 'clear' : 'review') : 'match'}`}>
          {summary.clear ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
          <span>
            {!summary.isLive && '⚠ Resultado anterior simulado — vuelve a ejecutar verificación. '}
            {summary.isLive && summary.clear
              ? `Consulta real OpenSanctions — sin alertas (${formatDateTime(resultList[0]?.checked_at)})`
              : summary.clear
                ? 'Sin coincidencias en las listas consultadas'
                : `${summary.matches} coincidencia(s) — revisión manual obligatoria`}
          </span>
        </div>
      )}

      {resultList.length > 0 ? (
        <div className="sanctions-results">
          {resultList.map((r) => (
            <div key={r.list} className={`sanctions-row ${r.match ? 'match' : r.score && r.score >= 35 ? 'review' : 'clear'}`}>
              <strong>{r.label}</strong>
              <span>
                {r.match ? '⚠ Coincidencia' : r.score && r.score >= 35 ? `⚡ Revisar (${r.score}%)` : '✓ Sin alerta'}
              </span>
              <p>{r.details}</p>
              {r.matched_name && <p><em>Coincide con: {r.matched_name}</em></p>}
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
