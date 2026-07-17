import { addMonths, addYears } from 'date-fns'
import type { RiskLevel } from './types'

/** Periodicidad de renovación KYC según nivel de riesgo (práctica LFPIORPI). */
export function kycExpiryForRisk(risk: RiskLevel, from = new Date()): string {
  switch (risk) {
    case 'bajo':
      return addYears(from, 3).toISOString()
    case 'medio':
      return addYears(from, 2).toISOString()
    case 'alto':
      return addYears(from, 1).toISOString()
    case 'critico':
      return addMonths(from, 6).toISOString()
    default:
      return addYears(from, 1).toISOString()
  }
}

export const KYC_PERIODICITY_LABELS: Record<RiskLevel, string> = {
  bajo: '3 años',
  medio: '2 años',
  alto: '1 año',
  critico: '6 meses',
}
