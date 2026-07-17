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

    const firm = payload.firm?.name || 'el despacho'
    const participants = payload.training.participants?.trim() || 'personal del despacho'
    const prompt = `Redacta el cuerpo de una CONSTANCIA DE CAPACITACIÓN PLD/FT en español jurídico mexicano, formal y profesional.

Datos:
- Despacho/sujeto obligado: ${firm}
- Capacitación: ${payload.training.title}
- Tema: ${payload.training.topic}
- Fecha: ${formatDateMx(payload.training.session_date)}
- Duración: ${payload.training.duration_hours ?? 'no especificada'} horas
- Modalidad: ${payload.training.modality ?? 'presencial'}
- Instructor: ${payload.training.instructor ?? 'no especificado'}
- Lugar: ${payload.training.location ?? 'instalaciones del despacho'}
- Participantes: ${participants}
- Notas adicionales: ${payload.training.notes ?? 'ninguna'}
- Oficial de cumplimiento: ${payload.officer?.name ?? 'Oficial de cumplimiento PLD/FT'}

Requisitos:
- 2 a 4 párrafos en prosa continua (sin viñetas, sin markdown)
- Mencionar LFPIORPI y el propósito formativo en PLD/FT
- Indicar que se extiende constancia a los participantes
- No incluir encabezado, firmas ni datos de contacto (solo el cuerpo narrativo)
- Tono de despacho jurídico mexicano`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Eres un abogado experto en cumplimiento PLD/FT en México. Redactas constancias formales.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 900,
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
    const bodyText = json.choices?.[0]?.message?.content?.trim()

    if (!bodyText) {
      return new Response(
        JSON.stringify({ error: 'Respuesta vacía de OpenAI', fallback: true }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ bodyText, source: 'ai' }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Error interno', fallback: true }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
