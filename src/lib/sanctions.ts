import type { ClientType, Expediente, ExpedienteStage, SanctionsResult } from './types'
import { isOpenSanctionsConfigured, runOpenSanctionsCheck } from './opensanctions'

async function runSimulatedCheck(
  clientName: string,
  rfc?: string,
): Promise<SanctionsResult[]> {
  await new Promise((r) => setTimeout(r, 400))
  const normalized = clientName.toLowerCase()
  const riskyTerms = ['test', 'bloqueado', 'sancionado', 'prohibido']
  const satRisky = ['xxx', '000', 'bloq']
  const hasRisk = riskyTerms.some((t) => normalized.includes(t))
  const satMatch = rfc ? satRisky.some((t) => rfc.toLowerCase().includes(t)) : false
  const now = new Date().toISOString()

  return [
    {
      list: 'ofac',
      label: 'Sanciones internacionales (OFAC/UN)',
      checked_at: now,
      match: hasRisk,
      source: 'simulación',
      details: hasRisk
        ? 'Posible coincidencia (modo simulación). Configura VITE_OPENSANCTIONS_API_KEY.'
        : 'Sin coincidencias (simulación).',
    },
    {
      list: 'sat_69b',
      label: 'SAT — Art. 69-B',
      checked_at: now,
      match: satMatch,
      source: 'simulación',
      details: satMatch
        ? 'RFC con señal de riesgo (simulación).'
        : 'Sin registro en 69-B (simulación).',
    },
    {
      list: 'un',
      label: 'PEP — Personas políticamente expuestas',
      checked_at: now,
      match: hasRisk,
      source: 'simulación',
      details: hasRisk
        ? 'Posible PEP (simulación).'
        : 'Sin coincidencias PEP (simulación).',
    },
  ]
}

export async function runSanctionsCheck(
  clientName: string,
  clientType: ClientType,
  rfc?: string,
): Promise<SanctionsResult[]> {
  const apiKey = import.meta.env.VITE_OPENSANCTIONS_API_KEY as string | undefined

  if (isOpenSanctionsConfigured() && apiKey) {
    try {
      return await runOpenSanctionsCheck(clientName, clientType, rfc, apiKey)
    } catch (err) {
      console.error('OpenSanctions error:', err)
      const simulated = await runSimulatedCheck(clientName, rfc)
      simulated[0].details = `Error API: ${err instanceof Error ? err.message : 'desconocido'}. Resultado parcial en simulación.`
      return simulated
    }
  }

  return runSimulatedCheck(clientName, rfc)
}

export function sanctionsSummary(results: SanctionsResult[]): {
  clear: boolean
  matches: number
  source: string
} {
  const matches = results.filter((r) => r.match).length
  const source = results[0]?.source ?? 'desconocido'
  return { clear: matches === 0, matches, source }
}

export function buildClientUpdateEmail(
  clientName: string,
  expediente: Expediente,
  stages: ExpedienteStage[],
): { subject: string; body: string } {
  const current = stages[expediente.current_stage_index]
  const completed = stages.filter((s) => s.status === 'completada').length
  const total = stages.length
  const pct = total ? Math.round((completed / total) * 100) : 0

  const subject = `Actualización de su asunto — ${expediente.title}`
  const body = `Estimado(a) ${clientName},

Le compartimos el avance de su asunto "${expediente.title}":

• Etapa actual: ${current?.name ?? 'En proceso'}
• Progreso general: ${pct}% (${completed} de ${total} etapas)
• Estado: ${expediente.status}
• Última actualización: ${new Date(expediente.updated_at).toLocaleDateString('es-MX', { dateStyle: 'long' })}

${expediente.description ? `Descripción: ${expediente.description}\n` : ''}
Quedamos atentos a cualquier duda.

Atentamente,
Integra PLD — Despacho de cumplimiento PLD/FT`

  return { subject, body }
}
