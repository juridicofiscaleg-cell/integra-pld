function escapeCsv(value: string | number | boolean | undefined | null): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const lines = [headers.join(','), ...rows.map((r) => r.map(escapeCsv).join(','))]
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportClientsCsv(
  clients: Array<{
    name: string
    client_type: string
    rfc?: string
    curp?: string
    email?: string
    phone?: string
    industry?: string
    vulnerable_activity?: boolean
    risk_level: string
    nationality?: string
    created_at: string
  }>,
) {
  downloadCsv(
    `integra-pld-clientes-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Nombre', 'Tipo', 'RFC', 'CURP', 'Email', 'Teléfono', 'Giro', 'Act. vulnerable', 'Riesgo', 'Nacionalidad', 'Registro'],
    clients.map((c) => [
      c.name,
      c.client_type,
      c.rfc ?? '',
      c.curp ?? '',
      c.email ?? '',
      c.phone ?? '',
      c.industry ?? '',
      c.vulnerable_activity ? 'Sí' : 'No',
      c.risk_level,
      c.nationality ?? '',
      c.created_at.slice(0, 10),
    ]),
  )
}

export function exportExpedientesCsv(
  expedientes: Array<{
    title: string
    matter_type: string
    status: string
    priority: string
    current_stage_index: number
    clients?: { name: string }
    opened_at: string
  }>,
) {
  downloadCsv(
    `integra-pld-expedientes-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Título', 'Cliente', 'Tipo', 'Estado', 'Prioridad', 'Etapa actual', 'Apertura'],
    expedientes.map((e) => [
      e.title,
      e.clients?.name ?? '',
      e.matter_type,
      e.status,
      e.priority,
      String(e.current_stage_index + 1),
      e.opened_at.slice(0, 10),
    ]),
  )
}

export function exportKycCsv(
  records: Array<{
    clients?: { name: string }
    status: string
    risk_score: number
    pep: boolean
    sanctions_check: boolean
    expires_at?: string
    created_at: string
  }>,
) {
  downloadCsv(
    `integra-pld-kyc-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Cliente', 'Estado', 'Score', 'PEP', 'Listas verificadas', 'Vencimiento', 'Creado'],
    records.map((k) => [
      k.clients?.name ?? '',
      k.status,
      String(k.risk_score),
      k.pep ? 'Sí' : 'No',
      k.sanctions_check ? 'Sí' : 'No',
      k.expires_at?.slice(0, 10) ?? '',
      k.created_at.slice(0, 10),
    ]),
  )
}

export function exportActivityCsv(
  activity: Array<{
    description: string
    action: string
    created_at: string
    profiles?: { full_name: string }
  }>,
) {
  downloadCsv(
    `integra-pld-bitacora-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Fecha', 'Acción', 'Descripción', 'Usuario'],
    activity.map((a) => [
      a.created_at.slice(0, 19).replace('T', ' '),
      a.action,
      a.description,
      a.profiles?.full_name ?? '',
    ]),
  )
}

export function exportOperationsCsv(
  operations: Array<{
    operation_date: string
    clients?: { name: string }
    operation_type: string
    amount?: number
    currency: string
    unusual: boolean
    reported: boolean
    report_date?: string
  }>,
) {
  downloadCsv(
    `integra-pld-operaciones-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Fecha', 'Cliente', 'Tipo', 'Monto', 'Moneda', 'Inusual', 'Reportada', 'Fecha reporte'],
    operations.map((o) => [
      o.operation_date,
      o.clients?.name ?? '',
      o.operation_type,
      o.amount?.toString() ?? '',
      o.currency,
      o.unusual ? 'Sí' : 'No',
      o.reported ? 'Sí' : 'No',
      o.report_date ?? '',
    ]),
  )
}

export function exportNoticesCsv(
  notices: Array<{
    detected_at: string
    clients?: { name: string }
    notice_type: string
    status: string
    title: string
    amount?: number
    submitted_at?: string
  }>,
) {
  downloadCsv(
    `integra-pld-avisos-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Detección', 'Cliente', 'Tipo', 'Estado', 'Título', 'Monto', 'Presentado'],
    notices.map((n) => [
      n.detected_at,
      n.clients?.name ?? '',
      n.notice_type,
      n.status,
      n.title,
      n.amount?.toString() ?? '',
      n.submitted_at ?? '',
    ]),
  )
}

export function exportTrainingsCsv(
  sessions: Array<{
    title: string
    session_date: string
    topic: string
    participants?: string
    duration_hours?: number
    instructor?: string
    location?: string
    modality?: string
    certificate_generated_at?: string
  }>,
) {
  downloadCsv(
    `integra-pld-capacitaciones-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Título', 'Fecha', 'Tema', 'Participantes', 'Horas', 'Instructor', 'Lugar', 'Modalidad', 'Constancia'],
    sessions.map((s) => [
      s.title,
      s.session_date,
      s.topic,
      s.participants ?? '',
      s.duration_hours != null ? String(s.duration_hours) : '',
      s.instructor ?? '',
      s.location ?? '',
      s.modality ?? '',
      s.certificate_generated_at ? 'Sí' : 'No',
    ]),
  )
}

export function printReport(
  stats: Record<string, number>,
  clients: unknown[],
  expedientes: unknown[],
  kycRecords: unknown[],
) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`
    <html><head><title>Reporte Integra PLD</title>
    <style>body{font-family:sans-serif;padding:2rem}h1{color:#7b2d3e}table{border-collapse:collapse;width:100%;margin-top:1rem}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5e8eb}</style>
    </head><body>
    <h1>Integra PLD — Reporte de cumplimiento</h1>
    <p>Generado: ${new Date().toLocaleString('es-MX')}</p>
    <h2>Resumen</h2>
    <ul>
      ${Object.entries(stats).map(([k, v]) => `<li>${k}: ${v}</li>`).join('')}
    </ul>
    <p>Clientes: ${clients.length} · Expedientes: ${expedientes.length} · KYC: ${kycRecords.length}</p>
    </body></html>
  `)
  w.document.close()
  w.print()
}
