import type { ClientType, RiskLevel } from './types'

export interface RiskMatrixFactors {
  client_type_risk: number
  activity_risk: number
  country_risk: number
  product_risk: number
  channel_risk: number
  pep_risk: number
  amount_risk: number
  notes?: string
  assessed_at?: string
  assessed_by?: string
}

export const RISK_FACTOR_LABELS: { key: keyof RiskMatrixFactors; label: string; hint: string }[] = [
  { key: 'client_type_risk', label: 'Tipo de cliente', hint: 'PF=1, PM=2, extranjero=3' },
  { key: 'activity_risk', label: 'Actividad / giro', hint: 'No vulnerable=1, vulnerable=3' },
  { key: 'country_risk', label: 'País / jurisdicción', hint: 'México=1, extranjero bajo=2, alto=3' },
  { key: 'product_risk', label: 'Producto / servicio', hint: 'Bajo=1, medio=2, alto=3' },
  { key: 'channel_risk', label: 'Canal de vinculación', hint: 'Presencial=1, remoto=2, terceros=3' },
  { key: 'pep_risk', label: 'PEP / vinculados', hint: 'No=1, indirecto=2, directo=3' },
  { key: 'amount_risk', label: 'Montos / operaciones', hint: 'Bajo=1, medio=2, alto=3' },
]

export function defaultRiskMatrix(clientType: ClientType, vulnerable: boolean): RiskMatrixFactors {
  return {
    client_type_risk: clientType === 'persona_fisica' ? 1 : 2,
    activity_risk: vulnerable ? 3 : 1,
    country_risk: 1,
    product_risk: 2,
    channel_risk: 1,
    pep_risk: 1,
    amount_risk: 1,
  }
}

export function calcMatrixScore(factors: RiskMatrixFactors): number {
  const keys = RISK_FACTOR_LABELS.map((f) => f.key)
  const values = keys.map((k) => Number(factors[k] ?? 1)).filter((v) => v >= 1 && v <= 3)
  if (values.length === 0) return 0
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  return Math.round((avg / 3) * 100)
}

export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'critico'
  if (score >= 55) return 'alto'
  if (score >= 35) return 'medio'
  return 'bajo'
}

export function calcMatrixRiskLevel(factors: RiskMatrixFactors): RiskLevel {
  return scoreToRiskLevel(calcMatrixScore(factors))
}
