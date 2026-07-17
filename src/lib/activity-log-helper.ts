import { supabase } from './supabase'

export async function logActivity(params: {
  action: string
  description: string
  userId?: string
  clientId?: string
  expedienteId?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
}): Promise<void> {
  const metadata: Record<string, unknown> = {}
  if (params.before) metadata.before = params.before
  if (params.after) metadata.after = params.after

  if (!supabase) return

  await supabase.from('activity_log').insert({
    user_id: params.userId ?? null,
    client_id: params.clientId ?? null,
    expediente_id: params.expedienteId ?? null,
    action: params.action,
    description: params.description,
    metadata: Object.keys(metadata).length ? metadata : {},
  })
}

export function formatActivityDiff(metadata?: Record<string, unknown>): string[] {
  const before = metadata?.before as Record<string, unknown> | undefined
  const after = metadata?.after as Record<string, unknown> | undefined
  if (!before && !after) return []

  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])
  const lines: string[] = []
  for (const key of keys) {
    const b = before?.[key]
    const a = after?.[key]
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      lines.push(`${key}: ${String(b ?? '—')} → ${String(a ?? '—')}`)
    }
  }
  return lines
}
