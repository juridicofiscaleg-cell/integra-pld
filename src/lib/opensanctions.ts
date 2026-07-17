import type { ClientType, SanctionsResult } from './types'

const API_BASE = 'https://api.opensanctions.org'

interface MatchQuery {
  schema: 'Person' | 'Company' | 'LegalEntity'
  properties: Record<string, string[]>
}

async function matchCollection(
  collection: string,
  query: MatchQuery,
  apiKey: string,
): Promise<{ score: number; name: string; topics: string[]; datasets: string[] }[]> {
  const res = await fetch(`${API_BASE}/match/${collection}?limit=5`, {
    method: 'POST',
    headers: {
      Authorization: `ApiKey ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ queries: { q1: query } }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenSanctions (${collection}): ${res.status} — ${text.slice(0, 120)}`)
  }

  const data = await res.json()
  const results = data.responses?.q1?.results ?? []

  return results.map((r: {
    score: number
    properties?: { name?: string[]; topics?: string[] }
    datasets?: string[]
  }) => ({
    score: r.score ?? 0,
    name: r.properties?.name?.[0] ?? 'Sin nombre',
    topics: r.properties?.topics ?? [],
    datasets: r.datasets ?? [],
  }))
}

function buildQuery(name: string, clientType: ClientType, rfc?: string): MatchQuery {
  const schema = clientType === 'persona_fisica' ? 'Person' : 'Company'
  const properties: Record<string, string[]> = { name: [name.trim()] }
  if (rfc) properties.registrationNumber = [rfc.trim().toUpperCase()]
  if (clientType === 'persona_moral') properties.country = ['mx']
  return { schema, properties }
}

function resultFromMatch(
  list: SanctionsResult['list'],
  label: string,
  matches: { score: number; name: string; topics: string[]; datasets: string[] }[],
  threshold = 0.75,
): SanctionsResult {
  const now = new Date().toISOString()
  const top = matches.filter((m) => m.score >= threshold)

  if (top.length === 0) {
    return {
      list,
      label,
      checked_at: now,
      match: false,
      details: `Sin coincidencias relevantes (umbral ${Math.round(threshold * 100)}%).`,
      source: 'opensanctions',
    }
  }

  const best = top[0]
  return {
    list,
    label,
    checked_at: now,
    match: true,
    score: Math.round(best.score * 100),
    matched_name: best.name,
    topics: best.topics,
    datasets: best.datasets,
    details: `Coincidencia: "${best.name}" (${Math.round(best.score * 100)}%). Temas: ${best.topics.join(', ') || 'N/A'}.`,
    source: 'opensanctions',
  }
}

export async function runOpenSanctionsCheck(
  clientName: string,
  clientType: ClientType,
  rfc?: string,
  apiKey?: string,
): Promise<SanctionsResult[]> {
  if (!apiKey?.trim()) {
    throw new Error('API key de OpenSanctions no configurada')
  }

  const query = buildQuery(clientName, clientType, rfc)

  const [sanctions, peps] = await Promise.all([
    matchCollection('sanctions', query, apiKey),
    matchCollection('peps', query, apiKey),
  ])

  const satMatches = sanctions.filter(
    (m) =>
      m.datasets.some((d) => d.includes('mx') || d.includes('sat') || d.includes('69')) ||
      m.topics.some((t) => t.includes('crime') || t.includes('debarment')),
  )

  return [
    resultFromMatch('ofac', 'Sanciones internacionales (OFAC/UN)', sanctions),
    resultFromMatch('sat_69b', 'SAT / Listas México (69-B y afines)', satMatches.length ? satMatches : sanctions, 0.8),
    resultFromMatch('un', 'PEP — Personas políticamente expuestas', peps, 0.7),
  ]
}

export function isOpenSanctionsConfigured(): boolean {
  return Boolean(import.meta.env.VITE_OPENSANCTIONS_API_KEY?.trim())
}
