import {
  deleteClient,
  deleteComplianceManual,
  deleteComplianceOfficer,
  deleteDocument,
  deleteExpediente,
  deleteKycRecord,
  deleteLegalResource,
  deletePldOperation,
  deleteTrainingSession,
  deleteUnusualNotice,
  exportClientBundle,
  updateKycExtended,
} from './api'
import type { ApprovalActionType, KycStatus } from './types'

export async function executeApprovalAction(
  actionType: ApprovalActionType,
  payload: Record<string, unknown>,
  reviewerId?: string,
): Promise<{ error?: string }> {
  switch (actionType) {
    case 'delete_client':
      return deleteClient(String(payload.clientId), reviewerId)
    case 'delete_expediente':
      return deleteExpediente(String(payload.expedienteId), reviewerId)
    case 'delete_kyc':
      return deleteKycRecord(String(payload.kycId), reviewerId)
    case 'delete_document':
      return deleteDocument(String(payload.docId), String(payload.storagePath))
    case 'delete_operation':
      return deletePldOperation(String(payload.operationId))
    case 'delete_notice':
      return deleteUnusualNotice(String(payload.noticeId))
    case 'delete_compliance_officer':
      return deleteComplianceOfficer(String(payload.officerId))
    case 'delete_compliance_manual':
      return deleteComplianceManual(String(payload.manualId))
    case 'delete_training':
      return deleteTrainingSession(String(payload.trainingId))
    case 'delete_legal_resource':
      return deleteLegalResource(String(payload.resourceId), payload.storagePath as string | undefined)
    case 'export_client_bundle':
      return exportClientBundle(String(payload.clientId))
    case 'approve_kyc':
      return updateKycExtended(
        String(payload.kycId),
        payload.kycData as Parameters<typeof updateKycExtended>[1],
        reviewerId,
      )
    default:
      return { error: `Acción no soportada: ${actionType}` }
  }
}

export function isKycApprovalPayload(payload: Record<string, unknown>): boolean {
  return Boolean(payload.kycId && payload.kycData)
}

export function kycStatusFromPayload(payload: Record<string, unknown>): KycStatus | undefined {
  const data = payload.kycData as { status?: KycStatus } | undefined
  return data?.status
}
