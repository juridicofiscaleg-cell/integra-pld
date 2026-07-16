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
  email?: string
  phone?: string
  address?: string
  industry?: string
  notes?: string
  risk_level: RiskLevel
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
}

export interface KycRecord {
  id: string
  client_id: string
  expediente_id?: string
  status: KycStatus
  risk_score: number
  checklist: KycChecklist
  pep: boolean
  sanctions_check: boolean
  beneficial_owner?: string
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

export const KYC_CHECKLIST_ITEMS: { key: keyof KycChecklist; label: string }[] = [
  { key: 'identificacion', label: 'Identificación oficial' },
  { key: 'comprobante_domicilio', label: 'Comprobante de domicilio' },
  { key: 'acta_constitutiva', label: 'Acta constitutiva' },
  { key: 'poder_notarial', label: 'Poder notarial' },
  { key: 'beneficiario_controlador', label: 'Beneficiario controlador' },
  { key: 'constancia_fiscal', label: 'Constancia de situación fiscal' },
  { key: 'declaracion_origen_recursos', label: 'Declaración origen de recursos' },
  { key: 'lista_negra_verificada', label: 'Verificación listas negras' },
]
