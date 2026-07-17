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
const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/
const LATIN_RE = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/

/** OpenSanctions devuelve alias en varios idiomas; preferimos latín/español para México. */
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

async function matchCollection(
  collection: string,
  query: MatchQuery,
  queryName: string,
  apiKey: string,
): Promise<MatchRow[]> {
  const res = await fetch(`${API_BASE}/match/${collection}?limit=15`, {
    method: 'POST',
    headers: {
      Authorization: `ApiKey ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ queries: { q1: query } }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenSanctions ${collection}: ${res.status} ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  const results = data.responses?.q1?.results ?? []

  return results.map((r: Record<string, unknown>) => {
    const props = (r.properties ?? {}) as Record<string, unknown>
    const topics = [
      ...asStringArray(props.topics),
      ...asStringArray(r.topics),
    ]
    return {
      score: (r.score as number) ?? 0,
      name: pickDisplayName(props, queryName),
      entityId: (r.id as string) ?? undefined,
      topics: [...new Set(topics)],
      datasets: Array.isArray(r.datasets) ? (r.datasets as string[]) : [],
    }
  })
}

function buildQueries(name: string, clientType: string, rfc?: string): MatchQuery[] {
  const trimmed = name.trim()
  const schema = clientType === 'persona_fisica' ? 'Person' : 'Company'
  const queries: MatchQuery[] = [
    { schema, properties: { name: [trimmed] } },
  ]

  if (clientType === 'persona_fisica') {
    const parts = trimmed.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      queries.push({
        schema: 'Person',
        properties: {
          firstName: [parts[0]],
          lastName: [parts.slice(1).join(' ')],
        },
      })
      queries.push({ schema: 'Person', properties: { lastName: [parts[parts.length - 1]] } })
    }
  }

  if (rfc) {
    queries.push({
      schema,
      properties: {
        name: [trimmed],
        registrationNumber: [rfc.trim().toUpperCase()],
      },
    })
  }

  if (clientType === 'persona_moral') {
    queries[0].properties.country = ['mx']
  }

  return queries
}

async function searchAll(
  collection: string,
  queries: MatchQuery[],
  queryName: string,
  apiKey: string,
): Promise<MatchRow[]> {
  const batches = await Promise.all(
    queries.map((q) => matchCollection(collection, q, queryName, apiKey)),
  )
  const merged = batches.flat()
  const byEntity = new Map<string, MatchRow>()
  for (const row of merged) {
    const key = row.entityId ?? row.name.toLowerCase()
    const prev = byEntity.get(key)
    if (!prev || row.score > prev.score) byEntity.set(key, row)
  }
  return [...byEntity.values()].sort((a, b) => b.score - a.score)
}

function isRiskMatch(row: MatchRow): boolean {
  return row.score >= 0.42 || row.topics.some((t) => RISK_TOPICS.test(t))
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

    const queries = buildQueries(name, clientType ?? 'persona_fisica', rfc)
    const queryName = name.trim()

    const [defaultAll, sanctions, peps] = await Promise.all([
      searchAll('default', queries, queryName, apiKey),
      searchAll('sanctions', queries, queryName, apiKey),
      searchAll('peps', queries, queryName, apiKey),
    ])

    const allSanctions = [...defaultAll, ...sanctions]
      .sort((a, b) => b.score - a.score)
      .filter((v, i, arr) => arr.findIndex((x) => x.name === v.name) === i)

    const satMatches = allSanctions.filter(
      (m) =>
        m.datasets.some((d) => /mx|sat|69|mexico/i.test(d)) ||
        m.topics.some((t) => RISK_TOPICS.test(t)),
    )

    const results = [
      resultFromMatches('ofac', 'Sanciones internacionales (OFAC/ONU/SDN)', allSanctions),
      resultFromMatches(
        'sat_69b',
        'SAT / Listas México y delitos',
        satMatches.length ? satMatches : allSanctions,
      ),
      resultFromMatches('un', 'PEP — Personas políticamente expuestas', peps, 0.38),
    ]

    return new Response(
      JSON.stringify({ results, queried_name: name.trim(), engine: 'opensanctions-live' }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('sanctions-check error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
