import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const API_BASE = 'https://api.opensanctions.org'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MatchQuery {
  schema: string
  properties: Record<string, string[]>
}

async function matchCollection(
  collection: string,
  query: MatchQuery,
  apiKey: string,
): Promise<Array<{ score: number; name: string; topics: string[]; datasets: string[] }>> {
  const res = await fetch(`${API_BASE}/match/${collection}?limit=10`, {
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
    const props = (r.properties ?? {}) as Record<string, string[]>
    return {
      score: (r.score as number) ?? 0,
      name: props.name?.[0] ?? 'Sin nombre',
      topics: props.topics ?? [],
      datasets: (r.datasets as string[]) ?? [],
    }
  })
}

function buildQuery(name: string, clientType: string, rfc?: string): MatchQuery {
  const schema = clientType === 'persona_fisica' ? 'Person' : 'Company'
  const properties: Record<string, string[]> = { name: [name.trim()] }
  if (rfc) properties.registrationNumber = [rfc.trim().toUpperCase()]
  if (clientType === 'persona_moral') properties.country = ['mx']
  return { schema, properties }
}

function resultFromMatch(
  list: string,
  label: string,
  matches: Array<{ score: number; name: string; topics: string[]; datasets: string[] }>,
  threshold = 0.55,
) {
  const now = new Date().toISOString()
  const top = matches.filter((m) => m.score >= threshold)

  if (top.length === 0) {
    const best = matches[0]
    return {
      list,
      label,
      checked_at: now,
      match: false,
      score: best ? Math.round(best.score * 100) : 0,
      details: best
        ? `Mejor candidato: "${best.name}" (${Math.round(best.score * 100)}%) — bajo umbral ${Math.round(threshold * 100)}%.`
        : `Sin candidatos en ${label}.`,
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
    details: `⚠ Coincidencia: "${best.name}" (${Math.round(best.score * 100)}%). Temas: ${best.topics.join(', ') || 'N/A'}. Revisar manualmente.`,
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
        JSON.stringify({
          error: 'Falta OPENSANCTIONS_API_KEY en Supabase → Project Settings → Edge Functions → Secrets',
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

    const query = buildQuery(name, clientType ?? 'persona_fisica', rfc)

    const [defaultAll, sanctions, peps] = await Promise.all([
      matchCollection('default', query, apiKey),
      matchCollection('sanctions', query, apiKey),
      matchCollection('peps', query, apiKey),
    ])

    const allSanctions = [...defaultAll, ...sanctions].sort((a, b) => b.score - a.score)
    const satMatches = allSanctions.filter(
      (m) =>
        m.datasets.some((d) => /mx|sat|69|mexico/i.test(d)) ||
        m.topics.some((t) => /crime|debarment|sanction|wanted/i.test(t)),
    )

    const results = [
      resultFromMatch('ofac', 'Sanciones internacionales (OFAC/ONU/SDN)', allSanctions, 0.55),
      resultFromMatch(
        'sat_69b',
        'SAT / Listas México y delitos',
        satMatches.length ? satMatches : allSanctions,
        0.55,
      ),
      resultFromMatch('un', 'PEP — Personas políticamente expuestas', peps, 0.5),
    ]

    return new Response(JSON.stringify({ results }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
