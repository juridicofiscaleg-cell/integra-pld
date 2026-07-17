import { differenceInHours, parseISO, subMonths } from 'date-fns'
import { supabase } from './supabase'

/** Sincroniza alertas automáticas PLD (24h, capacitación, manual, oficial, ops) — KYC vía syncKycAlerts */
export async function syncAllPldAlerts(userId?: string): Promise<void> {
  if (!supabase) return

  const { data: existing } = await supabase
    .from('alerts')
    .select('id, message')
    .eq('resolved', false)

  const hasMarker = (marker: string) => (existing ?? []).some((a) => a.message?.includes(marker))

  const today = new Date()
  const yearAgo = subMonths(today, 12)

  // Avisos 24h urgentes
  const { data: notices24h } = await supabase
    .from('unusual_notices')
    .select('id, client_id, title, detected_at, clients(name)')
    .eq('notice_type', '24h')
    .eq('status', 'borrador')

  for (const n of notices24h ?? []) {
    const marker = `notice24h:${n.id}`
    if (hasMarker(marker)) continue
    const hours = differenceInHours(today, parseISO(n.detected_at))
    if (hours >= 12) {
      const clientName = (n.clients as { name?: string } | null)?.name ?? 'Cliente'
      await supabase.from('alerts').insert({
        client_id: n.client_id,
        title: `Aviso 24h urgente — ${clientName}`,
        message: `${marker} — ${hours}h desde detección. Presentar ante SAT.`,
        alert_type: 'vencimiento',
        due_date: n.detected_at.slice(0, 10),
        created_by: userId ?? null,
      })
    }
  }

  // Operaciones inusuales sin reportar
  const { data: unreported } = await supabase
    .from('pld_operations')
    .select('id, client_id, operation_date, clients(name)')
    .eq('unusual', true)
    .eq('reported', false)

  for (const op of unreported ?? []) {
    const marker = `op_unreported:${op.id}`
    if (hasMarker(marker)) continue
    const clientName = (op.clients as { name?: string } | null)?.name ?? 'Cliente'
    await supabase.from('alerts').insert({
      client_id: op.client_id,
      title: `Operación inusual sin aviso — ${clientName}`,
      message: `${marker} — Registrar aviso PLD.`,
      alert_type: 'general',
      due_date: op.operation_date,
      created_by: userId ?? null,
    })
  }

  // Capacitación anual faltante (clientes vulnerables)
  const { data: vulnerable } = await supabase
    .from('clients')
    .select('id, name')
    .eq('vulnerable_activity', true)

  const { data: trainings } = await supabase
    .from('training_sessions')
    .select('client_id, session_date')

  for (const c of vulnerable ?? []) {
    const marker = `training_missing:${c.id}`
    if (hasMarker(marker)) continue
    const recent = (trainings ?? []).some(
      (t) => t.client_id === c.id && parseISO(t.session_date) >= yearAgo,
    )
    if (!recent) {
      await supabase.from('alerts').insert({
        client_id: c.id,
        title: `Capacitación PLD pendiente — ${c.name}`,
        message: `${marker} — Sin capacitación en los últimos 12 meses (Art. 54).`,
        alert_type: 'vencimiento',
        created_by: userId ?? null,
      })
    }
  }

  // Manual PLD activo faltante
  const { data: manuals } = await supabase
    .from('compliance_manuals')
    .select('client_id')
    .eq('is_active', true)

  const clientsWithManual = new Set((manuals ?? []).map((m) => m.client_id))

  for (const c of vulnerable ?? []) {
    const marker = `manual_missing:${c.id}`
    if (hasMarker(marker) || clientsWithManual.has(c.id)) continue
    await supabase.from('alerts').insert({
      client_id: c.id,
      title: `Manual PLD faltante — ${c.name}`,
      message: `${marker} — Subir manual de cumplimiento activo (Art. 53).`,
      alert_type: 'documento',
      created_by: userId ?? null,
    })
  }

  // Oficial de cumplimiento faltante
  const { data: officers } = await supabase
    .from('client_compliance_officers')
    .select('client_id')
    .eq('is_active', true)

  const clientsWithOfficer = new Set((officers ?? []).map((o) => o.client_id))

  for (const c of vulnerable ?? []) {
    const marker = `officer_missing:${c.id}`
    if (hasMarker(marker) || clientsWithOfficer.has(c.id)) continue
    await supabase.from('alerts').insert({
      client_id: c.id,
      title: `Oficial de cumplimiento faltante — ${c.name}`,
      message: `${marker} — Designar oficial (Art. 52).`,
      alert_type: 'general',
      created_by: userId ?? null,
    })
  }
}
