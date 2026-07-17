import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Payload {
  training: {
    title: string
    topic: string
    session_date: string
    duration_hours?: number
    modality?: string
    instructor?: string
    location?: string
    participants?: string
    notes?: string
  }
  officer: { name?: string; email?: string; rfc?: string }
  firm: { name?: string; rfc?: string; address?: string }
}

function formatDateMx(iso: string): string {
  try {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    return `${d} de ${months[m - 1]} de ${y}`
  } catch {
    return iso
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const payload = (await req.json()) as Payload
    const apiKey = Deno.env.get('OPENAI_API_KEY')

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY no configurada', fallback: true }),
        { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const prompt = `Genera UNA sola oración formal en español mexicano para un diploma de reconocimiento PLD/FT.

Capacitación: ${payload.training.title}
Tema: ${payload.training.topic}
Fecha: ${formatDateMx(payload.training.session_date)}
Despacho: ${payload.firm?.name || 'despacho jurídico'}
Notas del curso: ${payload.training.notes || 'ninguna'}

Reglas estrictas:
- Exactamente UNA oración (máximo 35 palabras)
- Tono elegante, jurídico y profesional
- Debe mencionar el cumplimiento en materia PLD/FT o LFPIORPI
- NO incluir nombre de participantes, firmas, fechas ni encabezados
- NO usar comillas, markdown ni viñetas
- Solo devuelve la oración, nada más`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Redactas una sola línea de reconocimiento para diplomas legales PLD/FT en México. Respuesta: solo la oración.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 120,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return new Response(
        JSON.stringify({ error: `OpenAI: ${res.status} ${errText.slice(0, 200)}`, fallback: true }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const json = await res.json()
    let recognitionLine = json.choices?.[0]?.message?.content?.trim() ?? ''
    recognitionLine = recognitionLine.replace(/^["'«»]+|["'«»]+$/g, '').replace(/\s+/g, ' ')

    if (!recognitionLine) {
      return new Response(
        JSON.stringify({ error: 'Respuesta vacía de OpenAI', fallback: true }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ recognitionLine, source: 'ai' }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Error interno', fallback: true }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
