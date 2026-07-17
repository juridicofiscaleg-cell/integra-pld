export interface DiagnosisItem {
  id: string
  area: string
  label: string
  severity?: 'bajo' | 'medio' | 'alto'
  notes?: string
  resolved?: boolean
}

export const PLD_DIAGNOSIS_AREAS = [
  'Identificación de clientes',
  'Matriz de riesgo',
  'Manual PLD',
  'Capacitación',
  'Oficial de cumplimiento',
  'Avisos y reportes',
  'Listas y sanciones',
  'Conservación de documentos',
  'Controles internos',
  'Tecnología / sistemas',
] as const

export function defaultDiagnosisChecklist(): DiagnosisItem[] {
  return PLD_DIAGNOSIS_AREAS.map((area) => ({
    id: area.toLowerCase().replace(/\s+/g, '_'),
    area,
    label: `Evaluar: ${area}`,
    resolved: false,
  }))
}

export function diagnosisProgress(items: DiagnosisItem[]): number {
  if (items.length === 0) return 0
  const done = items.filter((i) => i.resolved).length
  return Math.round((done / items.length) * 100)
}
