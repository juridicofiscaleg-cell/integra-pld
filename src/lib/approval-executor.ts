import type { ApprovalActionType, UserRole } from './types'

/** Evita dependencia circular con api.ts usando import dinámico */
export async function executeApprovalAction(
  actionType: ApprovalActionType,
  payload: Record<string, unknown>,
  reviewerId?: string,
  requestedBy?: string,
): Promise<{ error?: string }> {
  const actorId = requestedBy ?? reviewerId
  const api = await import('./api')

  switch (actionType) {
    case 'approve_account':
      return api.approveAccountAccess(String(payload.profileId), payload.role as UserRole | undefined, reviewerId)

    case 'delete_client':
      return api.deleteClient(String(payload.clientId), reviewerId)

    case 'delete_expediente':
      return api.deleteExpediente(String(payload.expedienteId), reviewerId)

    case 'delete_kyc':
      return api.deleteKycRecord(String(payload.kycId), reviewerId)

    case 'delete_document':
      return api.deleteDocument(String(payload.docId), String(payload.storagePath ?? ''))

    case 'delete_operation':
      return api.deletePldOperation(String(payload.operationId))

    case 'delete_notice':
      return api.deleteUnusualNotice(String(payload.noticeId))

    case 'delete_compliance_officer':
      return api.deleteComplianceOfficer(String(payload.officerId))

    case 'delete_compliance_manual':
      return api.deleteComplianceManual(String(payload.manualId))

    case 'delete_training':
      return api.deleteTrainingSession(String(payload.trainingId))

    case 'delete_legal_resource':
      return api.deleteLegalResource(String(payload.resourceId), payload.storagePath as string | undefined)

    case 'export_client_bundle':
      return api.exportClientBundle(String(payload.clientId))

    case 'approve_kyc':
      return api.updateKycExtended(
        String(payload.kycId),
        payload.kycData as Parameters<typeof api.updateKycExtended>[1],
        reviewerId,
      )

    case 'create_client':
      return api.createClient(payload.clientData as Parameters<typeof api.createClient>[0], actorId).then((r) =>
        r.error ? { error: r.error } : {},
      )

    case 'update_client':
      return api.updateClient(
        String(payload.clientId),
        payload.clientData as Parameters<typeof api.updateClient>[1],
        actorId,
      )

    case 'create_expediente':
      return api.createExpediente(payload.expedienteData as Parameters<typeof api.createExpediente>[0], actorId).then(
        (r) => (r.error ? { error: r.error } : {}),
      )

    case 'update_expediente':
      return api.updateExpediente(
        String(payload.expedienteId),
        payload.expedienteData as Parameters<typeof api.updateExpediente>[1],
        actorId,
      )

    case 'create_kyc':
      return api.createKyc(payload.kycData as Parameters<typeof api.createKyc>[0], actorId).then((r) =>
        r.error ? { error: r.error } : {},
      )

    case 'update_kyc':
      return api.updateKycExtended(
        String(payload.kycId),
        payload.kycData as Parameters<typeof api.updateKycExtended>[1],
        actorId,
      )

    case 'renew_kyc':
      return api.renewKyc(String(payload.kycId), actorId).then((r) => (r.error ? { error: r.error } : {}))

    case 'upload_document':
      return api.finalizePendingDocument(payload, actorId)

    case 'replace_document':
      return api.replaceDocumentFromPending(payload, actorId)

    case 'create_operation':
      return api.createPldOperation(payload.operationData as Parameters<typeof api.createPldOperation>[0], actorId).then(
        (r) => (r.error ? { error: r.error } : {}),
      )

    case 'update_operation':
      return api.updatePldOperation(
        String(payload.operationId),
        payload.operationData as Parameters<typeof api.updatePldOperation>[1],
      )

    case 'create_notice':
      return api.createUnusualNotice(payload.noticeData as Parameters<typeof api.createUnusualNotice>[0], actorId).then(
        (r) => (r.error ? { error: r.error } : {}),
      )

    case 'update_notice':
      return api.updateUnusualNotice(
        String(payload.noticeId),
        payload.noticeData as Parameters<typeof api.updateUnusualNotice>[1],
      )

    case 'create_compliance_officer':
      return api.createComplianceOfficer(
        payload.officerData as Parameters<typeof api.createComplianceOfficer>[0],
        actorId,
      ).then((r) => (r.error ? { error: r.error } : {}))

    case 'update_compliance_officer':
      return api.updateComplianceOfficer(
        String(payload.officerId),
        payload.officerData as Parameters<typeof api.updateComplianceOfficer>[1],
      )

    case 'upload_compliance_manual':
      return api.finalizePendingComplianceManual(payload, actorId)

    case 'create_training':
      return api.createTrainingSession(
        payload.trainingData as Parameters<typeof api.createTrainingSession>[0],
        actorId,
      ).then((r) => (r.error ? { error: r.error } : {}))

    case 'update_training':
      return api.updateTrainingSession(
        String(payload.trainingId),
        payload.trainingData as Parameters<typeof api.updateTrainingSession>[1],
      )

    case 'upload_legal_resource':
      return api.finalizePendingLegalResource(payload, actorId)

    case 'update_risk_matrix':
      return api.saveClientRiskMatrix(
        String(payload.clientId),
        payload.factors as Parameters<typeof api.saveClientRiskMatrix>[1],
        actorId,
      )

    case 'advance_stage':
      return api.advanceStage(
        String(payload.expedienteId),
        Number(payload.stageIndex),
        actorId,
        payload.notes as string | undefined,
      )

    case 'update_stage_notes':
      return api.updateStageNotes(String(payload.stageId), String(payload.notes ?? ''), actorId)

    case 'create_alert':
      return api.createAlert(payload.alertData as Parameters<typeof api.createAlert>[0], actorId).then((r) =>
        r.error ? { error: r.error } : {},
      )

    case 'resolve_alert':
      return api.resolveAlert(String(payload.alertId))

    default:
      return { error: `Acción no soportada: ${actionType}` }
  }
}
