export interface LfpiorpiArticle {
  id: string
  article: string
  title: string
  summary: string
  tags: string[]
}

/** Referencia LFPIORPI — artículos clave para consulta rápida en el despacho. */
export const LFPIORPI_ARTICLES: LfpiorpiArticle[] = [
  {
    id: 'art-1',
    article: 'Art. 1',
    title: 'Objeto de la Ley',
    summary: 'Combater la comisión de delitos a través de mecanismos para identificar actos u operaciones con recursos de procedencia ilícita.',
    tags: ['general', 'objeto'],
  },
  {
    id: 'art-2',
    article: 'Art. 2',
    title: 'Sujetos obligados',
    summary: 'Personas físicas y morales que realizan actividades vulnerables señaladas en el artículo 17.',
    tags: ['sujetos', 'obligados'],
  },
  {
    id: 'art-17',
    article: 'Art. 17',
    title: 'Actividades vulnerables',
    summary: 'Catálogo de actividades: juegos, préstamos, inversión, inmobiliario, metales, vehículos, blindaje, donativos, servicios profesionales, etc.',
    tags: ['actividades', 'vulnerables'],
  },
  {
    id: 'art-18',
    article: 'Art. 18',
    title: 'Identificación del cliente',
    summary: 'Obligación de identificar a clientes y usuarios, recabar datos y documentación de soporte.',
    tags: ['kyc', 'identificación'],
  },
  {
    id: 'art-18-bis',
    article: 'Art. 18 Bis',
    title: 'Expediente de identificación',
    summary: 'Integrar y conservar expediente con documentos, datos de identificación y actualizaciones periódicas.',
    tags: ['kyc', 'expediente'],
  },
  {
    id: 'art-19',
    article: 'Art. 19',
    title: 'Beneficiario controlador',
    summary: 'Identificar al beneficiario controlador en personas morales y fideicomisos cuando aplique.',
    tags: ['kyc', 'beneficiario'],
  },
  {
    id: 'art-21',
    article: 'Art. 21',
    title: 'Avisos al SAT',
    summary: 'Presentar avisos por operaciones que superen umbrales y operaciones relevantes, inusuales o preocupantes.',
    tags: ['avisos', 'sat', 'operaciones'],
  },
  {
    id: 'art-52',
    article: 'Art. 52',
    title: 'Manual de cumplimiento',
    summary: 'Elaborar manual con políticas, procedimientos y controles internos de PLD/FT.',
    tags: ['manual', 'cumplimiento'],
  },
  {
    id: 'art-53',
    article: 'Art. 53',
    title: 'Oficial de cumplimiento',
    summary: 'Designar oficial de cumplimiento con funciones de vigilancia, reporte y capacitación.',
    tags: ['oficial', 'cumplimiento'],
  },
  {
    id: 'art-54',
    article: 'Art. 54',
    title: 'Capacitación',
    summary: 'Programa de capacitación periódica al personal en materia de PLD/FT.',
    tags: ['capacitación'],
  },
  {
    id: 'art-55',
    article: 'Art. 55',
    title: 'Medidas de seguridad',
    summary: 'Implementar medidas para resguardo de información y documentación de clientes.',
    tags: ['seguridad', 'datos'],
  },
  {
    id: 'art-69-b',
    article: 'Art. 69-B CFF',
    title: 'Operaciones simuladas (EFOS)',
    summary: 'Publicación de contribuyentes que emiten comprobantes de operaciones simuladas — verificar en listado SAT.',
    tags: ['sat', '69-b', 'listas'],
  },
]

export const LEGAL_CATEGORIES = {
  lfpiorpi: 'LFPIORPI',
  formato: 'Formato / Anexo',
  guia: 'Guía interna',
  plantilla: 'Plantilla editable',
  otro: 'Otro',
} as const
