import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const API_BASE = 'https://api.opensanctions.org'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MatchRow {
  score: number
  name: string
  topics: string[]
  datasets: string[]
}

interface MatchQuery {
  schema: string
  properties: Record<string, string[]>
}

const RISK_TOPICS = /sanction|crime|debarment|wanted|pep|role\.pep|poi|corp\.disqual|freeze/i

async function matchCollection(
  collection: string,
  query: MatchQuery,
  apiKey: string,
): Promise<MatchRow[]> {
  const res = await fetch(`${API_BASE}/match/${collection}?limit=15`, {
    method: 'POST',
    headers: {
      Authorization: `ApiKey ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      queries: { q1: query },
      thresholds: { q1: [0.5, 0.7, 0.9] },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenSanctions ${collection}: ${res.status} ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  const results = data.responses?.q1?.results ?? []

  return results.map((r: Record<string, unknown>) => {
    const props = (r.properties ?? {}) as Record<string, string[]>
    const topics = props.topics ?? []
    return {
      score: (r.score as number) ?? 0,
      name: props.name?.[0] ?? props.firstName?.[0] ?? 'Sin nombre',
      topics,
      datasets: (r.datasets as string[]) ?? [],
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
  apiKey: string,
): Promise<MatchRow[]> {
  const batches = await Promise.all(queries.map((q) => matchCollection(collection, q, apiKey)))
  const merged = batches.flat()
  const byName = new Map<string, MatchRow>()
  for (const row of merged) {
    const key = row.name.toLowerCase()
    const prev = byName.get(key)
    if (!prev || row.score > prev.score) byName.set(key, row)
  }
  return [...byName.values()].sort((a, b) => b.score - a.score)
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
    const apiKey = Deno.env.get('OPENSANCTIONS_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Falta OPENSANCTIONS_API_KEY en Supabase Secrets' }),
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

    const [defaultAll, sanctions, peps] = await Promise.all([
      searchAll('default', queries, apiKey),
      searchAll('sanctions', queries, apiKey),
      searchAll('peps', queries, apiKey),
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
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
