/** Umbrales orientativos por actividad vulnerable (LFPIORPI / criterios SAT). Montos en MXN. */
export interface ActivityThreshold {
  activity: string
  relevantAmount: number
  unusualAmount: number
  notice24hAmount: number
  description: string
}

export const SAT_THRESHOLDS: ActivityThreshold[] = [
  { activity: 'Bienes raíces', relevantAmount: 8_000_000, unusualAmount: 3_000_000, notice24hAmount: 16_000_000, description: 'Compraventa, arrendamiento, desarrollo' },
  { activity: 'Préstamos', relevantAmount: 500_000, unusualAmount: 250_000, notice24hAmount: 1_000_000, description: 'Préstamos y créditos' },
  { activity: 'Metales y joyas', relevantAmount: 1_000_000, unusualAmount: 500_000, notice24hAmount: 2_000_000, description: 'Comercialización de metales preciosos' },
  { activity: 'Vehículos', relevantAmount: 2_000_000, unusualAmount: 800_000, notice24hAmount: 4_000_000, description: 'Vehículos nuevos o usados' },
  { activity: 'Blindaje', relevantAmount: 500_000, unusualAmount: 200_000, notice24hAmount: 1_000_000, description: 'Servicios de blindaje' },
  { activity: 'Servicios profesionales', relevantAmount: 3_000_000, unusualAmount: 1_000_000, notice24hAmount: 6_000_000, description: 'Asesoría, consultoría, intermediación' },
  { activity: 'Inversiones', relevantAmount: 2_000_000, unusualAmount: 800_000, notice24hAmount: 4_000_000, description: 'Administración de recursos' },
  { activity: 'Otra actividad vulnerable', relevantAmount: 1_500_000, unusualAmount: 600_000, notice24hAmount: 3_000_000, description: 'Umbral genérico conservador' },
]

const ACTIVITY_CODE_HINTS: Record<string, string> = {
  '522110': 'Préstamos',
  '522112': 'Préstamos',
  '531': 'Bienes raíces',
  '5311': 'Bienes raíces',
  '5312': 'Bienes raíces',
  '5313': 'Bienes raíces',
  '5411': 'Servicios profesionales',
  '541110': 'Servicios profesionales',
  '541199': 'Servicios profesionales',
  '523': 'Inversiones',
  '5239': 'Inversiones',
  '441': 'Vehículos',
  '4411': 'Vehículos',
  '4412': 'Vehículos',
  '339910': 'Metales y joyas',
  '561622': 'Blindaje',
}

function resolveIndustry(industry?: string, activityCode?: string): string | undefined {
  if (activityCode) {
    const code = activityCode.trim()
    const direct = ACTIVITY_CODE_HINTS[code]
    if (direct) return direct
    const prefix = Object.entries(ACTIVITY_CODE_HINTS).find(([k]) => code.startsWith(k))
    if (prefix) return prefix[1]
  }
  return industry
}

export function getThresholdForActivity(industry?: string, activityCode?: string): ActivityThreshold {
  const resolved = resolveIndustry(industry, activityCode)
  if (!resolved) return SAT_THRESHOLDS[SAT_THRESHOLDS.length - 1]
  const match = SAT_THRESHOLDS.find((t) =>
    resolved.toLowerCase().includes(t.activity.toLowerCase().slice(0, 8)) ||
    t.activity.toLowerCase().includes(resolved.toLowerCase().slice(0, 6)),
  )
  return match ?? SAT_THRESHOLDS[SAT_THRESHOLDS.length - 1]
}

export function classifyOperation(
  amount: number | undefined,
  industry?: string,
  activityCode?: string,
): { noticeType: 'relevante' | 'inusual' | '24h' | null; label: string } {
  if (!amount || amount <= 0) return { noticeType: null, label: 'Sin monto — evaluar manualmente' }
  const t = getThresholdForActivity(industry, activityCode)
  if (amount >= t.notice24hAmount) return { noticeType: '24h', label: `Supera umbral 24h ($${t.notice24hAmount.toLocaleString('es-MX')} MXN)` }
  if (amount >= t.relevantAmount) return { noticeType: 'relevante', label: `Operación relevante (≥ $${t.relevantAmount.toLocaleString('es-MX')})` }
  if (amount >= t.unusualAmount) return { noticeType: 'inusual', label: `Posible inusual (≥ $${t.unusualAmount.toLocaleString('es-MX')})` }
  return { noticeType: null, label: 'Por debajo de umbrales orientativos' }
}

export function buildNoticeNarrative(params: {
  clientName: string
  operationType: string
  amount?: number
  currency?: string
  operationDate: string
  description?: string
  noticeType: string
}): string {
  return `AVISO DE OPERACIÓN ${params.noticeType.toUpperCase()}

Cliente: ${params.clientName}
Fecha de la operación: ${params.operationDate}
Tipo: ${params.operationType}
${params.amount ? `Monto: $${params.amount.toLocaleString('es-MX')} ${params.currency ?? 'MXN'}` : ''}

DESCRIPCIÓN DE LOS HECHOS:
${params.description ?? '[Describir circunstancias de modo, tiempo y lugar]'}

ANÁLISIS:
[Explicar por qué la operación resulta inusual/relevante conforme a criterios internos y LFPIORPI Art. 21]

PERSONAS INVOLUCRADAS:
[Cliente, beneficiario controlador, contrapartes]

Elaborado en Integra PLD — ${new Date().toLocaleDateString('es-MX')}`
}
