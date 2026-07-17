export type UserRole = 'admin' | 'abogado' | 'asistente'

export type ClientType = 'persona_fisica' | 'persona_moral'
export type RiskLevel = 'bajo' | 'medio' | 'alto' | 'critico'

export type MatterType =
  | 'pld'
  | 'kyc'
  | 'consultoria'
  | 'diagnostico_pld'
  | 'analisis_riesgo'

export type ExpedienteStatus = 'activo' | 'pausado' | 'cerrado' | 'archivado'
export type StageStatus = 'pendiente' | 'en_progreso' | 'completada' | 'bloqueada'
export type KycStatus = 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado' | 'vencido'
export type AlertType = 'vencimiento' | 'kyc' | 'etapa' | 'documento' | 'general'
export type Priority = 'baja' | 'media' | 'alta' | 'urgente'

export type NoticeType = 'inusual' | 'relevante' | '24h'

export interface DiagnosisItemRef {
  id: string
  area: string
  label: string
  severity?: 'bajo' | 'medio' | 'alto'
  notes?: string
  resolved?: boolean
}

export type NoticeStatus = 'borrador' | 'presentado' | 'archivado'

export interface BeneficialOwner {
  id: string
  name: string
  nationality?: string
  ownership_percent?: number
  is_pep?: boolean
  rfc?: string
  notes?: string
}

export interface PepQuestionnaire {
  is_pep: boolean
  position?: string
  institution?: string
  country?: string
  family_pep?: boolean
  family_relation?: string
  close_associate?: boolean
  associate_details?: string
  last_updated?: string
}

export interface PldOperation {
  id: string
  client_id: string
  expediente_id?: string
  operation_date: string
  operation_type: string
  amount?: number
  currency: string
  description?: string
  unusual: boolean
  reported: boolean
  report_date?: string
  created_by?: string
  created_at: string
  updated_at: string
  clients?: Client
  expedientes?: Expediente
}

export interface UnusualNotice {
  id: string
  client_id: string
  operation_id?: string
  notice_type: NoticeType
  status: NoticeStatus
  title: string
  narrative?: string
  amount?: number
  detected_at: string
  submitted_at?: string
  created_by?: string
  assigned_to?: string
  created_at: string
  updated_at: string
  clients?: Client
}

export interface ExpedienteComment {
  id: string
  expediente_id: string
  user_id?: string
  body: string
  created_at: string
  profiles?: Profile
}

export interface ComplianceManual {
  id: string
  title: string
  version: string
  description?: string
  storage_path?: string
  file_name?: string
  effective_date: string
  is_active: boolean
  uploaded_by?: string
  created_at: string
  updated_at: string
}

export interface TrainingSession {
  id: string
  title: string
  session_date: string
  topic: string
  participants?: string
  duration_hours?: number
  instructor?: string
  location?: string
  modality?: TrainingModality
  evidence_path?: string
  notes?: string
  certificate_text?: string
  certificate_generated_at?: string
  created_by?: string
  created_at: string
}

export type TrainingModality = 'presencial' | 'virtual' | 'hibrido'

export const TRAINING_MODALITY_LABELS: Record<TrainingModality, string> = {
  presencial: 'Presencial',
  virtual: 'Virtual',
  hibrido: 'Híbrido',
}

export interface FirmProfile {
  name: string
  rfc?: string
  address?: string
}

export interface ComplianceOfficer {
  name: string
  email: string
  appointed_at?: string
  rfc?: string
  phone?: string
}

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  created_at: string
}

export interface Client {
  id: string
  name: string
  client_type: ClientType
  rfc?: string
  curp?: string
  email?: string
  phone?: string
  address?: string
  industry?: string
  activity_code?: string
  nationality?: string
  legal_representative?: string
  vulnerable_activity?: boolean
  notes?: string
  risk_level: RiskLevel
  risk_matrix?: Record<string, unknown>
  matrix_risk_level?: RiskLevel
  created_by?: string
  created_at: string
  updated_at: string
}

export interface WorkflowStage {
  name: string
  description?: string
}

export interface WorkflowTemplate {
  id: string
  matter_type: MatterType
  label: string
  stages: WorkflowStage[]
  created_at: string
}

export interface Expediente {
  id: string
  client_id: string
  title: string
  matter_type: MatterType
  description?: string
  status: ExpedienteStatus
  current_stage_index: number
  priority: Priority
  assigned_to?: string
  diagnosis_checklist?: DiagnosisItemRef[]
  created_by?: string
  opened_at: string
  closed_at?: string
  updated_at: string
  clients?: Client
  profiles?: Profile
}

export interface ExpedienteStage {
  id: string
  expediente_id: string
  stage_index: number
  name: string
  status: StageStatus
  notes?: string
  started_at?: string
  completed_at?: string
  completed_by?: string
}

export interface KycChecklist {
  identificacion?: boolean
  comprobante_domicilio?: boolean
  acta_constitutiva?: boolean
  poder_notarial?: boolean
  beneficiario_controlador?: boolean
  constancia_fiscal?: boolean
  declaracion_origen_recursos?: boolean
  lista_negra_verificada?: boolean
  ofac_verificado?: boolean
  sat_69b_verificado?: boolean
  un_list_verificado?: boolean
}

export interface SanctionsResult {
  list: 'ofac' | 'sat_69b' | 'un'
  label: string
  checked_at: string
  match: boolean
  details?: string
  source?: 'opensanctions' | 'simulación'
  score?: number
  matched_name?: string
  topics?: string[]
  datasets?: string[]
}

export type SanctionsResults = Record<string, SanctionsResult>

export interface KycRecord {
  id: string
  client_id: string
  expediente_id?: string
  status: KycStatus
  risk_score: number
  checklist: KycChecklist
  pep: boolean
  sanctions_check: boolean
  sanctions_results?: SanctionsResults
  beneficial_owner?: string
  beneficial_owners?: BeneficialOwner[]
  pep_questionnaire?: PepQuestionnaire
  renewal_of?: string
  checklist_completion?: number
  review_notes?: string
  reviewed_by?: string
  reviewed_at?: string
  expires_at?: string
  created_by?: string
  created_at: string
  updated_at: string
  clients?: Client
}

export interface Document {
  id: string
  client_id?: string
  expediente_id?: string
  kyc_id?: string
  name: string
  doc_type: string
  storage_path: string
  file_size?: number
  uploaded_by?: string
  uploaded_at: string
  legal_resource_id?: string
}

export interface Alert {
  id: string
  expediente_id?: string
  client_id?: string
  title: string
  message?: string
  alert_type: AlertType
  due_date?: string
  resolved: boolean
  assigned_to?: string
  created_by?: string
  created_at: string
  clients?: Client
  expedientes?: Expediente
}

export interface ActivityLog {
  id: string
  expediente_id?: string
  client_id?: string
  user_id?: string
  action: string
  description: string
  metadata?: Record<string, unknown>
  created_at: string
  profiles?: Profile
}

export type LegalCategory = 'lfpiorpi' | 'formato' | 'guia' | 'plantilla' | 'otro'

export interface LegalResource {
  id: string
  title: string
  category: LegalCategory
  description?: string
  article_ref?: string
  storage_path?: string
  file_name?: string
  file_size?: number
  is_template: boolean
  uploaded_by?: string
  created_at: string
  updated_at: string
}

export const MATTER_TYPE_LABELS: Record<MatterType, string> = {
  pld: 'PLD/FT',
  kyc: 'KYC',
  consultoria: 'Consultoría',
  diagnostico_pld: 'Diagnóstico PLD',
  analisis_riesgo: 'Análisis de Riesgo',
}

export const STATUS_LABELS: Record<ExpedienteStatus, string> = {
  activo: 'Activo',
  pausado: 'Pausado',
  cerrado: 'Cerrado',
  archivado: 'Archivado',
}

export const KYC_STATUS_LABELS: Record<KycStatus, string> = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  vencido: 'Vencido',
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
  critico: 'Crítico',
}

export const NOTICE_TYPE_LABELS: Record<NoticeType, string> = {
  inusual: 'Operación inusual',
  relevante: 'Operación relevante',
  '24h': 'Aviso 24 horas',
}

export const NOTICE_STATUS_LABELS: Record<NoticeStatus, string> = {
  borrador: 'Borrador',
  presentado: 'Presentado',
  archivado: 'Archivado',
}

export const OPERATION_TYPES = [
  'Compra-venta',
  'Arrendamiento',
  'Préstamo',
  'Inversión',
  'Donación',
  'Servicios profesionales',
  'Transferencia',
  'Otro',
] as const

export const KYC_CHECKLIST_ITEMS: { key: keyof KycChecklist; label: string }[] = [
  { key: 'identificacion', label: 'Identificación oficial' },
  { key: 'comprobante_domicilio', label: 'Comprobante de domicilio' },
  { key: 'acta_constitutiva', label: 'Acta constitutiva' },
  { key: 'poder_notarial', label: 'Poder notarial' },
  { key: 'beneficiario_controlador', label: 'Beneficiario controlador' },
  { key: 'constancia_fiscal', label: 'Constancia de situación fiscal' },
  { key: 'declaracion_origen_recursos', label: 'Declaración origen de recursos' },
  { key: 'lista_negra_verificada', label: 'Verificación listas negras' },
  { key: 'ofac_verificado', label: 'OFAC verificado' },
  { key: 'sat_69b_verificado', label: 'SAT 69-B verificado' },
  { key: 'un_list_verificado', label: 'Lista ONU verificada' },
]

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  abogado: 'Abogado',
  asistente: 'Asistente',
}

export const VULNERABLE_ACTIVITIES = [
  'Juegos y sorteos',
  'Tarjetas de crédito',
  'Préstamos',
  'Inversiones',
  'Bienes raíces',
  'Metales y joyas',
  'Arte y antigüedades',
  'Vehículos',
  'Blindaje',
  'Donativos',
  'Servicios profesionales',
  'Otra actividad vulnerable',
] as const
