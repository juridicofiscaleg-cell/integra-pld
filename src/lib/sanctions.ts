import type { SanctionsResult } from './types'

/** Simulación de consulta a listas — en producción conectar API real (OFAC, SAT, UN). */
export async function runSanctionsCheck(
  clientName: string,
  rfc?: string,
): Promise<SanctionsResult[]> {
  await new Promise((r) => setTimeout(r, 600))

  const normalized = clientName.toLowerCase()
  const riskyTerms = ['test', 'bloqueado', 'sancionado', 'prohibido']
  const satRisky = ['xxx', '000', 'bloq']
  const hasRisk = riskyTerms.some((t) => normalized.includes(t))
  const satMatch = rfc ? satRisky.some((t) => rfc.toLowerCase().includes(t)) : false

  const now = new Date().toISOString()

  return [
    {
      list: 'ofac',
      label: 'OFAC — SDN List',
      checked_at: now,
      match: hasRisk,
      details: hasRisk
        ? 'Posible coincidencia en lista SDN. Revisar manualmente.'
        : 'Sin coincidencias en lista OFAC.',
    },
    {
      list: 'sat_69b',
      label: 'SAT — Art. 69-B',
      checked_at: now,
      match: satMatch,
      details: satMatch
        ? 'RFC con señal de riesgo. Verificar en portal SAT.'
        : 'Sin registro en listado 69-B (simulación).',
    },
    {
      list: 'un',
      label: 'ONU — Lista consolidada',
      checked_at: now,
      match: hasRisk,
      details: hasRisk
        ? 'Coincidencia parcial. Validar identidad del cliente.'
        : 'Sin coincidencias en lista ONU.',
    },
  ]
}

export function sanctionsSummary(results: SanctionsResult[]): {
  clear: boolean
  matches: number
} {
  const matches = results.filter((r) => r.match).length
  return { clear: matches === 0, matches }
}
