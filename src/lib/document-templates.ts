export const DOCUMENT_TEMPLATES = [
  { type: 'Identificación oficial', description: 'INE, pasaporte o cédula profesional vigente' },
  { type: 'Comprobante de domicilio', description: 'No mayor a 3 meses' },
  { type: 'Acta constitutiva', description: 'Persona moral — con poderes del representante' },
  { type: 'Constancia de situación fiscal', description: 'RFC y domicilio fiscal' },
  { type: 'Declaración origen de recursos', description: 'Formato firmado por el cliente' },
  { type: 'Beneficiario controlador', description: 'Identificación y estructura accionaria' },
  { type: 'Matriz de riesgo PLD', description: 'Evaluación de factores de riesgo' },
  { type: 'Manual de cumplimiento PLD', description: 'Programa de cumplimiento vigente' },
  { type: 'Dictamen / Reporte PLD', description: 'Entregable de consultoría o diagnóstico' },
  { type: 'Contrato de servicios', description: 'Acuerdo con el cliente' },
  { type: 'Otro', description: 'Documento general' },
] as const

export const DOC_TYPE_OPTIONS = DOCUMENT_TEMPLATES.map((t) => t.type)
