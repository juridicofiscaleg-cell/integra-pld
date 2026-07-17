import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const API_BASE = 'https://api.opensanctions.org'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MatchRow {
  score: number
  name: string
  entityId?: string
  topics: string[]
  datasets: string[]
}

interface MatchQuery {
  schema: string
  properties: Record<string, string[]>
}

const RISK_TOPICS = /sanction|crime|debarment|wanted|pep|role\.pep|poi|corp\.disqual|freeze/i
const PEP_TOPICS = /pep|role\.pep/i
const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/
const LATIN_RE = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/

function asStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((v): v is string => typeof v === 'string')
  if (typeof val === 'string' && val.trim()) return [val]
  return []
}

function pickDisplayName(props: Record<string, unknown>, queryName: string): string {
  const candidates: string[] = []
  for (const key of ['name', 'alias', 'weakAlias', 'previousName']) {
    candidates.push(...asStringArray(props[key]))
  }
  const firstNames = asStringArray(props.firstName)
  const lastNames = asStringArray(props.lastName)
  for (let i = 0; i < Math.min(firstNames.length, lastNames.length); i++) {
    candidates.push(`${firstNames[i]} ${lastNames[i]}`.trim())
  }

  const unique = [...new Set(candidates.map((s) => s.trim()).filter(Boolean))]
  if (unique.length === 0) return 'Sin nombre'

  const latin = unique.filter((n) => LATIN_RE.test(n) && !CJK_RE.test(n))
  const pool = latin.length > 0 ? latin : unique.filter((n) => !CJK_RE.test(n))
  const finalPool = pool.length > 0 ? pool : unique

  const qParts = queryName.toLowerCase().split(/\s+/).filter((p) => p.length > 2)
  finalPool.sort((a, b) => {
    const la = a.toLowerCase()
    const lb = b.toLowerCase()
    const hitsA = qParts.filter((p) => la.includes(p)).length
    const hitsB = qParts.filter((p) => lb.includes(p)).length
    if (hitsB !== hitsA) return hitsB - hitsA
    return a.length - b.length
  })

  return finalPool[0]
}

function parseOpenSanctionsError(status: number, text: string): Error {
  if (status === 429) {
    return new Error(
      'Cuota mensual de OpenSanctions agotada. Espera al próximo mes, solicita más límite en opensanctions.org/docs/api/, o configura otra API key en Supabase Secrets.',
    )
  }
  if (status === 401 || status === 403) {
    return new Error('API key de OpenSanctions inválida. Revisa OPENSANCTIONS_API_KEY en Supabase Secrets.')
  }
  return new Error(`OpenSanctions respondió ${status}: ${text.slice(0, 180)}`)
}

/** Una sola consulta por verificación para no agotar la cuota mensual. */
function buildPrimaryQuery(name: string, clientType: string, rfc?: string): MatchQuery {
  const trimmed = name.trim()
  const schema = clientType === 'persona_fisica' ? 'Person' : 'Company'
  const rfcVal = rfc?.trim().toUpperCase()

  if (clientType === 'persona_fisica') {
    const parts = trimmed.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      const properties: Record<string, string[]> = {
        firstName: [parts[0]],
        lastName: [parts.slice(1).join(' ')],
      }
      if (rfcVal) properties.registrationNumber = [rfcVal]
      return { schema: 'Person', properties }
    }
  }

  const properties: Record<string, string[]> = { name: [trimmed] }
  if (rfcVal) properties.registrationNumber = [rfcVal]
  if (clientType === 'persona_moral') properties.country = ['mx']
  return { schema, properties }
}

async function matchDefault(
  query: MatchQuery,
  queryName: string,
  apiKey: string,
): Promise<MatchRow[]> {
  const res = await fetch(`${API_BASE}/match/default?limit=20`, {
    method: 'POST',
    headers: {
      Authorization: `ApiKey ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ queries: { q1: query } }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw parseOpenSanctionsError(res.status, text)
  }

  const data = await res.json()
  const results = data.responses?.q1?.results ?? []

  return results.map((r: Record<string, unknown>) => {
    const props = (r.properties ?? {}) as Record<string, unknown>
    const topics = [...asStringArray(props.topics), ...asStringArray(r.topics)]
    return {
      score: (r.score as number) ?? 0,
      name: pickDisplayName(props, queryName),
      entityId: (r.id as string) ?? undefined,
      topics: [...new Set(topics)],
      datasets: Array.isArray(r.datasets) ? (r.datasets as string[]) : [],
    }
  }).sort((a, b) => b.score - a.score)
}

function isRiskMatch(row: MatchRow): boolean {
  return row.score >= 0.42 || row.topics.some((t) => RISK_TOPICS.test(t))
}

function isPepMatch(row: MatchRow): boolean {
  return row.topics.some((t) => PEP_TOPICS.test(t))
}

function isSatMatch(row: MatchRow): boolean {
  return (
    row.datasets.some((d) => /mx|sat|69|mexico/i.test(d)) ||
    row.topics.some((t) => RISK_TOPICS.test(t))
  )
}

function resultFromMatches(
  list: string,
  label: string,
  matches: MatchRow[],
  threshold = 0.42,
) {
  const now = new Date().toISOString()
  const best = matches[0]
  const flagged = matches.filter(isRiskMatch)
  const top = matches.filter((m) => m.score >= threshold)

  if (top.length === 0 && flagged.length === 0) {
    return {
      list,
      label,
      checked_at: now,
      match: false,
      score: best ? Math.round(best.score * 100) : 0,
      details: best
        ? `Sin alerta. Mejor candidato: "${best.name}" (${Math.round(best.score * 100)}%).`
        : `Sin candidatos en ${label}.`,
      source: 'opensanctions',
    }
  }

  const hit = top[0] ?? flagged[0]
  return {
    list,
    label,
    checked_at: now,
    match: true,
    score: Math.round(hit.score * 100),
    matched_name: hit.name,
    topics: hit.topics,
    datasets: hit.datasets,
    details: `⚠ Coincidencia: "${hit.name}" (${Math.round(hit.score * 100)}%). Temas: ${hit.topics.join(', ') || 'lista de riesgo'}. Revisar manualmente.`,
    source: 'opensanctions',
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const apiKey = Deno.env.get('OPENSANCTIONS_API_KEY')?.trim()
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'Falta OPENSANCTIONS_API_KEY. Ve a Supabase → Project Settings → Edge Functions → Secrets y agrégala.',
        }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const { name, clientType, rfc } = await req.json()
    if (!name?.trim()) {
      return new Response(JSON.stringify({ error: 'Nombre requerido' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const queryName = name.trim()
    const query = buildPrimaryQuery(name, clientType ?? 'persona_fisica', rfc)

    // Una sola llamada HTTP a OpenSanctions (antes eran hasta 12 por clic).
    const allMatches = await matchDefault(query, queryName, apiKey)

    const peps = allMatches.filter(isPepMatch)
    const satMatches = allMatches.filter(isSatMatch)
    const sanctions = allMatches.filter(
      (m) => m.topics.some((t) => RISK_TOPICS.test(t)) || m.score >= 0.35,
    )

    const results = [
      resultFromMatches(
        'ofac',
        'Sanciones internacionales (OFAC/ONU/SDN)',
        sanctions.length ? sanctions : allMatches,
      ),
      resultFromMatches(
        'sat_69b',
        'SAT / Listas México y delitos',
        satMatches.length ? satMatches : allMatches,
      ),
      resultFromMatches('un', 'PEP — Personas políticamente expuestas', peps.length ? peps : allMatches, 0.38),
    ]

    return new Response(
      JSON.stringify({ results, queried_name: queryName, engine: 'opensanctions-live' }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('sanctions-check error:', message)
    const status = /cuota mensual|rate limit/i.test(message) ? 429 : 500
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
