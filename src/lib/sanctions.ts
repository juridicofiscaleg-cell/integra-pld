import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js'
import type { ClientType, SanctionsResult } from './types'
import { isSupabaseConfigured, supabase } from './supabase'

async function parseFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      if (body?.error) return String(body.error)
    } catch {
      /* response body not json */
    }
    return error.message
  }
  if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Error desconocido al consultar listas'
}

async function runSimulatedCheck(_clientName: string, _rfc?: string): Promise<SanctionsResult[]> {
  await new Promise((r) => setTimeout(r, 300))
  const now = new Date().toISOString()
  return [
    {
      list: 'ofac',
      label: 'Sanciones internacionales',
      checked_at: now,
      match: false,
      source: 'simulación',
      details: 'Modo demo — no consulta listas reales. Conecta Supabase + Edge Function.',
    },
    {
      list: 'sat_69b',
      label: 'SAT — Art. 69-B',
      checked_at: now,
      match: false,
      source: 'simulación',
      details: 'Modo demo — no consulta listas reales.',
    },
    {
      list: 'un',
      label: 'PEP',
      checked_at: now,
      match: false,
      source: 'simulación',
      details: 'Modo demo — no consulta listas reales.',
    },
  ]
}

/** Consulta listas vía Supabase Edge Function (evita CORS del navegador). */
export async function runSanctionsCheck(
  clientName: string,
  clientType: ClientType,
  rfc?: string,
): Promise<SanctionsResult[]> {
  if (!isSupabaseConfigured || !supabase) {
    return runSimulatedCheck(clientName, rfc)
  }

  const { data, error } = await supabase.functions.invoke('sanctions-check', {
    body: { name: clientName, clientType, rfc },
  })

  if (error) {
    const detail = await parseFunctionError(error)
    throw new Error(detail)
  }

  if (data?.error) {
    throw new Error(String(data.error))
  }

  if (data?.results?.length) {
    return data.results as SanctionsResult[]
  }

  throw new Error(
    'Edge Function sin respuesta. En Supabase: despliega sanctions-check y agrega el secret OPENSANCTIONS_API_KEY.',
  )
}

export function isLiveSanctionsAvailable(): boolean {
  return isSupabaseConfigured
}

export function sanctionsSummary(results: SanctionsResult[]): {
  clear: boolean
  matches: number
  source: string
  isLive: boolean
} {
  const matches = results.filter((r) => r.match).length
  const source = results[0]?.source ?? 'desconocido'
  const isLive = source === 'opensanctions'
  return { clear: matches === 0, matches, source, isLive }
}

export function buildClientUpdateEmail(
  clientName: string,
  expediente: import('./types').Expediente,
  stages: import('./types').ExpedienteStage[],
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
