import { useAuth } from '../context/AuthContext'
import { createApprovalRequest } from '../lib/api'
import {
  canApproveKyc,
  canDelete,
  canExportBundle,
  needsApprovalForSensitive,
} from '../lib/permissions'
import type { ApprovalActionType } from '../lib/types'

type DirectResult = { error?: string }

export function useProtectedAction() {
  const { user, profile } = useAuth()
  const role = profile?.role

  function requiresApproval(actionType: ApprovalActionType): boolean {
    if (!needsApprovalForSensitive(role)) return false
    if (actionType === 'approve_kyc') return !canApproveKyc(role)
    if (actionType === 'export_client_bundle') return !canExportBundle(role)
    return !canDelete(role)
  }

  async function runSensitiveAction(params: {
    actionType: ApprovalActionType
    title: string
    description?: string
    clientId?: string
    payload: Record<string, unknown>
    direct: () => Promise<DirectResult>
  }): Promise<{ ok: boolean; pending?: boolean; error?: string }> {
    if (!requiresApproval(params.actionType)) {
      const result = await params.direct()
      if (result.error) return { ok: false, error: result.error }
      return { ok: true }
    }

    const result = await createApprovalRequest(
      {
        action_type: params.actionType,
        title: params.title,
        description: params.description,
        payload: params.payload,
        client_id: params.clientId,
      },
      user?.id,
    )

    if (result.error) return { ok: false, error: result.error }
    return { ok: true, pending: true }
  }

  return { runSensitiveAction, requiresApproval, role }
}
