import type { MatterType, WorkflowStage } from './types'

export const DEFAULT_WORKFLOWS: Record<MatterType, WorkflowStage[]> = {
  pld: [
    { name: 'Diagnóstico inicial', description: 'Levantamiento de información' },
    { name: 'Análisis de riesgo', description: 'Identificación y evaluación de riesgos PLD' },
    { name: 'Matriz de riesgo', description: 'Elaboración de matriz' },
    { name: 'Plan de acción', description: 'Medidas correctivas y preventivas' },
    { name: 'Capacitación', description: 'Programa de capacitación PLD' },
    { name: 'Implementación', description: 'Puesta en marcha de controles' },
    { name: 'Seguimiento', description: 'Monitoreo y actualización' },
  ],
  kyc: [
    { name: 'Solicitud de documentos', description: 'Recopilación de documentación' },
    { name: 'Revisión inicial', description: 'Validación de documentos' },
    { name: 'Debida diligencia', description: 'Verificación de antecedentes' },
    { name: 'Análisis de riesgo', description: 'Scoring y clasificación' },
    { name: 'Aprobación', description: 'Dictamen final' },
    { name: 'Monitoreo', description: 'Seguimiento continuo' },
  ],
  consultoria: [
    { name: 'Consulta inicial', description: 'Primera reunión con el cliente' },
    { name: 'Investigación', description: 'Análisis del marco legal' },
    { name: 'Análisis', description: 'Evaluación de opciones' },
    { name: 'Dictamen / Borrador', description: 'Elaboración del entregable' },
    { name: 'Entrega', description: 'Presentación al cliente' },
    { name: 'Seguimiento', description: 'Post-entrega' },
  ],
  diagnostico_pld: [
    { name: 'Levantamiento', description: 'Recopilación de información operativa' },
    { name: 'Gap analysis', description: 'Brechas vs normativa vigente' },
    { name: 'Reporte de hallazgos', description: 'Documento de diagnóstico' },
    { name: 'Presentación', description: 'Entrega de resultados' },
    { name: 'Cierre', description: 'Plan de mejora acordado' },
  ],
  analisis_riesgo: [
    { name: 'Identificación', description: 'Factores de riesgo' },
    { name: 'Medición', description: 'Cuantificación del riesgo' },
    { name: 'Evaluación', description: 'Clasificación y priorización' },
    { name: 'Tratamiento', description: 'Medidas de mitigación' },
    { name: 'Monitoreo', description: 'Revisión periódica' },
  ],
}

export function getWorkflowStages(matterType: MatterType): WorkflowStage[] {
  return DEFAULT_WORKFLOWS[matterType] ?? []
}

export function getProgressPercent(currentIndex: number, totalStages: number): number {
  if (totalStages === 0) return 0
  return Math.round((currentIndex / totalStages) * 100)
}
