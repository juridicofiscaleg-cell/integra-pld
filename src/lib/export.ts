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
