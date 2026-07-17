import type { Client, RiskLevel } from './types'

export function effectiveRiskLevel(client: Client): RiskLevel {
  return client.matrix_risk_level ?? client.risk_level
}
