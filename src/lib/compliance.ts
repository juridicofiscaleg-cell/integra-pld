import { differenceInDays, parseISO } from 'date-fns'
import type { Alert, Client, Expediente, KycRecord, PldOperation, UnusualNotice } from './types'
import { calcMatrixRiskLevel, type RiskMatrixFactors } from './risk-matrix'

export type ComplianceStatus = 'verde' | 'amarillo' | 'rojo'

export interface ComplianceSummary {
  status: ComplianceStatus
  label: string
  issues: string[]
}

export function getClientCompliance(
  client: Client,
  kycList: KycRecord[],
  expedientes: Expediente[],
  alerts: Alert[],
  operations: PldOperation[] = [],
  notices: UnusualNotice[] = [],
): ComplianceSummary {
  const issues: string[] = []
  const latestKyc = kycList
    .filter((k) => k.client_id === client.id)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]

  if (!latestKyc) issues.push('Sin KYC registrado')
  else {
    if (latestKyc.status === 'vencido') issues.push('KYC vencido')
    else if (latestKyc.expires_at) {
      const days = differenceInDays(parseISO(latestKyc.expires_at), new Date())
      if (days <= 30 && days >= 0) issues.push(`KYC vence en ${days} días`)
    }
    if (latestKyc.pep && latestKyc.status !== 'aprobado') issues.push('PEP pendiente de aprobación')
    if (latestKyc.sanctions_results && Object.values(latestKyc.sanctions_results).some((r) => r.match)) {
      issues.push('Coincidencia en listas')
    }
  }

  const matrix = (client.risk_matrix ?? {}) as unknown as RiskMatrixFactors
  const matrixLevel = client.matrix_risk_level ?? (Object.keys(matrix).length ? calcMatrixRiskLevel(matrix) : null)
  if (matrixLevel === 'alto' || matrixLevel === 'critico') issues.push(`Matriz de riesgo ${matrixLevel}`)

  const clientOps = operations.filter((o) => o.client_id === client.id)
  const unusualUnreported = clientOps.filter((o) => o.unusual && !o.reported)
  if (unusualUnreported.length > 0) issues.push(`${unusualUnreported.length} op. inusual(es) sin reportar`)

  const draftNotices = notices.filter((n) => n.client_id === client.id && n.status === 'borrador')
  if (draftNotices.length > 0) issues.push(`${draftNotices.length} aviso(s) en borrador`)

  const activeExp = expedientes.filter((e) => e.client_id === client.id && e.status === 'activo')
  const staleExp = activeExp.filter((e) => differenceInDays(new Date(), parseISO(e.updated_at)) > 7)
  if (staleExp.length > 0) issues.push(`${staleExp.length} expediente(s) sin movimiento +7 días`)

  const clientAlerts = alerts.filter((a) => a.client_id === client.id && !a.resolved)
  if (clientAlerts.length > 0) issues.push(`${clientAlerts.length} alerta(s) pendiente(s)`)

  let status: ComplianceStatus = 'verde'
  if (issues.some((i) => /vencido|Coincidencia|critico|sin reportar/.test(i))) status = 'rojo'
  else if (issues.length > 0) status = 'amarillo'

  const label = status === 'verde' ? 'En orden' : status === 'amarillo' ? 'Revisar' : 'Atención urgente'
  return { status, label, issues }
}
