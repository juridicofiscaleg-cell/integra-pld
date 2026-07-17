import { isSupabaseConfigured, supabase } from './supabase'
import type {
  AlertType,
  BeneficialOwner,
  Client,
  ClientType,
  Document,
  ExpedienteStatus,
  KycChecklist,
  KycStatus,
  MatterType,
  NoticeStatus,
  NoticeType,
  PepQuestionnaire,
  Priority,
  RiskLevel,
  SanctionsResults,
} from './types'
import { buildNoticeNarrative } from './sat-thresholds'
import { kycExpiryForRisk } from './kyc-periodicity'
import { calcMatrixRiskLevel, type RiskMatrixFactors } from './risk-matrix'
import { KYC_CHECKLIST_ITEMS } from './types'
import { getWorkflowStages } from './workflows'
import { formatSupabaseMigrationError } from './supabase-errors'
import { executeApprovalAction } from './approval-executor'
import { notifyLawyers, createNotification, openMailto } from './notifications'
import { format, parseISO, differenceInDays } from 'date-fns'

function calcChecklistCompletion(checklist: KycChecklist): number {
  const total = KYC_CHECKLIST_ITEMS.length
  const done = KYC_CHECKLIST_ITEMS.filter((item) => checklist[item.key]).length
  return Math.round((done / total) * 100)
}

function calcRiskScore(checklist: KycChecklist): number {
  return calcChecklistCompletion(checklist)
}

function defaultKycExpiry(risk: RiskLevel = 'medio'): string {
  return kycExpiryForRisk(risk)
}

export async function createClient(
  data: {
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
    risk_level: RiskLevel
    notes?: string
  },
  userId?: string,
): Promise<{ client?: Client; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Supabase no configurado' }
  }

  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      name: data.name.trim(),
      client_type: data.client_type,
      rfc: data.rfc?.trim() || null,
      curp: data.curp?.trim() || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
      industry: data.industry?.trim() || null,
      activity_code: data.activity_code?.trim() || null,
      nationality: data.nationality?.trim() || 'México',
      legal_representative: data.legal_representative?.trim() || null,
      vulnerable_activity: data.vulnerable_activity ?? false,
      risk_level: data.risk_level,
      notes: data.notes?.trim() || null,
      created_by: userId ?? null,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  await supabase.from('activity_log').insert({
    client_id: client.id,
    user_id: userId ?? null,
    action: 'cliente_creado',
    description: `Registró cliente "${data.name.trim()}"`,
  })

  return { client }
}

export async function updateClient(
  clientId: string,
  data: {
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
    risk_level: RiskLevel
    notes?: string
  },
  userId?: string,
): Promise<{ error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Supabase no configurado' }
  }

  const { error } = await supabase
    .from('clients')
    .update({
      name: data.name.trim(),
      client_type: data.client_type,
      rfc: data.rfc?.trim() || null,
      curp: data.curp?.trim() || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
      industry: data.industry?.trim() || null,
      activity_code: data.activity_code?.trim() || null,
      nationality: data.nationality?.trim() || 'México',
      legal_representative: data.legal_representative?.trim() || null,
      vulnerable_activity: data.vulnerable_activity ?? false,
      risk_level: data.risk_level,
      notes: data.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  if (error) return { error: error.message }

  await supabase.from('activity_log').insert({
    client_id: clientId,
    user_id: userId ?? null,
    action: 'cliente_actualizado',
    description: `Actualizó datos de "${data.name.trim()}"`,
  })

  return {}
}

export async function createExpediente(
  data: {
    client_id: string
    title: string
    matter_type: MatterType
    description?: string
    priority: Priority
    assigned_to?: string
  },
  userId?: string,
): Promise<{ expedienteId?: string; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Supabase no configurado' }
  }

  const stages = getWorkflowStages(data.matter_type)

  const { data: expediente, error: expError } = await supabase
    .from('expedientes')
    .insert({
      client_id: data.client_id,
      title: data.title.trim(),
      matter_type: data.matter_type,
      description: data.description?.trim() || null,
      priority: data.priority,
      assigned_to: data.assigned_to || null,
      status: 'activo',
      current_stage_index: 0,
      created_by: userId ?? null,
    })
    .select('id, client_id')
    .single()

  if (expError || !expediente) {
    return { error: expError?.message ?? 'No se pudo crear el expediente' }
  }

  const stageRows = stages.map((stage, index) => ({
    expediente_id: expediente.id,
    stage_index: index,
    name: stage.name,
    status: index === 0 ? 'en_progreso' : 'pendiente',
    started_at: index === 0 ? new Date().toISOString() : null,
  }))

  if (stageRows.length > 0) {
    const { error: stagesError } = await supabase.from('expediente_stages').insert(stageRows)
    if (stagesError) return { error: stagesError.message }
  }

  await supabase.from('activity_log').insert({
    expediente_id: expediente.id,
    client_id: expediente.client_id,
    user_id: userId ?? null,
    action: 'expediente_creado',
    description: `Creó expediente "${data.title.trim()}"`,
  })

  return { expedienteId: expediente.id }
}

export async function createKyc(
  data: {
    client_id: string
    expediente_id?: string
    checklist: KycChecklist
    pep: boolean
    sanctions_check: boolean
    beneficial_owner?: string
    beneficial_owners?: BeneficialOwner[]
    pep_questionnaire?: PepQuestionnaire
    review_notes?: string
    status?: KycStatus
    expires_at?: string
    client_risk_level?: RiskLevel
  },
  userId?: string,
): Promise<{ kycId?: string; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Supabase no configurado' }
  }

  const risk_score = calcRiskScore(data.checklist)
  const checklist_completion = risk_score
  const expires_at = data.expires_at ?? defaultKycExpiry(data.client_risk_level ?? 'medio')

  const { data: kyc, error } = await supabase
    .from('kyc_records')
    .insert({
      client_id: data.client_id,
      expediente_id: data.expediente_id || null,
      status: data.status ?? 'pendiente',
      risk_score,
      checklist_completion,
      checklist: data.checklist,
      pep: data.pep,
      sanctions_check: data.sanctions_check,
      beneficial_owner: data.beneficial_owner?.trim() || null,
      beneficial_owners: data.beneficial_owners ?? [],
      pep_questionnaire: data.pep_questionnaire ?? {},
      review_notes: data.review_notes?.trim() || null,
      expires_at,
      created_by: userId ?? null,
    })
    .select('id, client_id')
    .single()

  if (error || !kyc) return { error: error?.message ?? 'No se pudo crear el KYC' }

  await supabase.from('activity_log').insert({
    client_id: kyc.client_id,
    expediente_id: data.expediente_id || null,
    user_id: userId ?? null,
    action: 'kyc_creado',
    description: 'Creó registro KYC / debida diligencia',
  })

  await syncKycAlerts(userId)

  return { kycId: kyc.id }
}

export async function updateKyc(
  kycId: string,
  data: {
    checklist: KycChecklist
    status: KycStatus
    pep: boolean
    sanctions_check: boolean
    beneficial_owner?: string
    review_notes?: string
    expires_at?: string
    sanctions_results?: SanctionsResults
  },
  userId?: string,
): Promise<{ error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Supabase no configurado' }
  }

  const risk_score = calcRiskScore(data.checklist)
  const now = new Date().toISOString()

  const updatePayload: Record<string, unknown> = {
    checklist: data.checklist,
    status: data.status,
    risk_score,
    checklist_completion: risk_score,
    pep: data.pep,
    sanctions_check: data.sanctions_check,
    beneficial_owner: data.beneficial_owner?.trim() || null,
    review_notes: data.review_notes?.trim() || null,
    reviewed_by: userId ?? null,
    reviewed_at: now,
    updated_at: now,
  }

  if (data.expires_at) updatePayload.expires_at = data.expires_at
  if (data.sanctions_results) updatePayload.sanctions_results = data.sanctions_results

  const { error } = await supabase.from('kyc_records').update(updatePayload).eq('id', kycId)

  if (error) return { error: error.message }

  await syncKycAlerts(userId)
  return {}
}

export async function advanceStage(
  expedienteId: string,
  stageIndex: number,
  userId?: string,
  notes?: string,
): Promise<{ error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Supabase no configurado' }
  }

  const now = new Date().toISOString()

  const { error: completeError } = await supabase
    .from('expediente_stages')
    .update({
      status: 'completada',
      completed_at: now,
      completed_by: userId ?? null,
      ...(notes?.trim() ? { notes: notes.trim() } : {}),
    })
    .eq('expediente_id', expedienteId)
    .eq('stage_index', stageIndex)

  if (completeError) return { error: completeError.message }

  const nextIndex = stageIndex + 1

  const { data: nextStage } = await supabase
    .from('expediente_stages')
    .select('id')
    .eq('expediente_id', expedienteId)
    .eq('stage_index', nextIndex)
    .maybeSingle()

  if (nextStage) {
    await supabase
      .from('expediente_stages')
      .update({ status: 'en_progreso', started_at: now })
      .eq('expediente_id', expedienteId)
      .eq('stage_index', nextIndex)
  }

  const { data: exp } = await supabase
    .from('expedientes')
    .select('title, client_id')
    .eq('id', expedienteId)
    .single()

  await supabase
    .from('expedientes')
    .update({
      current_stage_index: nextStage ? nextIndex : stageIndex,
      updated_at: now,
      ...(nextStage ? {} : { status: 'cerrado', closed_at: now }),
    })
    .eq('id', expedienteId)

  const { data: stage } = await supabase
    .from('expediente_stages')
    .select('name')
    .eq('expediente_id', expedienteId)
    .eq('stage_index', stageIndex)
    .single()

  await supabase.from('activity_log').insert({
    expediente_id: expedienteId,
    client_id: exp?.client_id,
    user_id: userId ?? null,
    action: 'etapa_completada',
    description: `Completó etapa "${stage?.name ?? stageIndex + 1}"`,
  })

  return {}
}

export async function uploadDocument(
  file: File,
  meta: {
    expediente_id?: string
    client_id?: string
    kyc_id?: string
    doc_type: string
    legal_resource_id?: string
  },
  userId?: string,
): Promise<{ document?: Document; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Supabase no configurado' }
  }

  const folder = meta.expediente_id ?? meta.client_id ?? meta.kyc_id ?? 'general'
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${folder}/${Date.now()}_${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('documentos')
    .upload(storagePath, file, { upsert: false })

  if (uploadError) return { error: uploadError.message }

  const { data: doc, error: dbError } = await supabase
    .from('documents')
    .insert({
      name: file.name,
      doc_type: meta.doc_type,
      storage_path: storagePath,
      file_size: file.size,
      expediente_id: meta.expediente_id ?? null,
      client_id: meta.client_id ?? null,
      kyc_id: meta.kyc_id ?? null,
      legal_resource_id: meta.legal_resource_id ?? null,
      uploaded_by: userId ?? null,
    })
    .select()
    .single()

  if (dbError) return { error: dbError.message }

  if (meta.expediente_id) {
    await supabase.from('activity_log').insert({
      expediente_id: meta.expediente_id,
      client_id: meta.client_id,
      user_id: userId ?? null,
      action: 'documento_subido',
      description: `Subió documento "${file.name}"`,
    })
  }

  return { document: doc }
}

export { getDocumentUrl, getComplianceManualUrl, getLegalResourceUrl } from './storage-urls'

export async function deleteDocument(docId: string, storagePath: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }

  if (storagePath && storagePath !== 'undefined') {
    const { error: storageError } = await supabase.storage.from('documentos').remove([storagePath])
    if (storageError) console.warn('Storage remove:', storageError.message)
  }

  const { data, error } = await supabase.from('documents').delete().eq('id', docId).select('id').maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { error: 'No se pudo eliminar el documento (permisos o registro inexistente).' }
  return {}
}

export async function uploadToPendingStorage(
  file: File,
  userId: string,
  bucket: 'documentos' | 'cumplimiento' | 'plantillas' = 'documentos',
): Promise<{ pendingPath?: string; error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const pendingPath = `pendientes/${userId}/${Date.now()}_${safeName}`
  const { error } = await supabase.storage.from(bucket).upload(pendingPath, file, { upsert: false })
  if (error) return { error: error.message }
  return { pendingPath }
}

export async function finalizePendingDocument(
  payload: Record<string, unknown>,
  userId?: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const pendingPath = String(payload.pendingStoragePath ?? '')
  const fileName = String(payload.fileName ?? 'documento')
  const fileSize = Number(payload.fileSize ?? 0)
  const meta = payload.meta as {
    expediente_id?: string
    client_id?: string
    kyc_id?: string
    doc_type: string
    legal_resource_id?: string
  }

  const folder = meta.expediente_id ?? meta.client_id ?? meta.kyc_id ?? 'general'
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${folder}/${Date.now()}_${safeName}`

  const { data: blob, error: dlErr } = await supabase.storage.from('documentos').download(pendingPath)
  if (dlErr || !blob) return { error: dlErr?.message ?? 'Archivo pendiente no encontrado' }

  const { error: upErr } = await supabase.storage.from('documentos').upload(storagePath, blob, { upsert: false })
  if (upErr) return { error: upErr.message }

  const { error: dbError } = await supabase.from('documents').insert({
    name: fileName,
    doc_type: meta.doc_type,
    storage_path: storagePath,
    file_size: fileSize || blob.size,
    expediente_id: meta.expediente_id ?? null,
    client_id: meta.client_id ?? null,
    kyc_id: meta.kyc_id ?? null,
    legal_resource_id: meta.legal_resource_id ?? null,
    uploaded_by: userId ?? null,
  })

  await supabase.storage.from('documentos').remove([pendingPath])
  if (dbError) return { error: dbError.message }
  return {}
}

export async function replaceDocumentFromPending(
  payload: Record<string, unknown>,
  userId?: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const docId = String(payload.docId)
  const oldStoragePath = String(payload.oldStoragePath ?? '')
  const pendingPath = String(payload.pendingStoragePath ?? '')
  const fileName = String(payload.fileName ?? 'documento')
  const fileSize = Number(payload.fileSize ?? 0)

  const { data: blob, error: dlErr } = await supabase.storage.from('documentos').download(pendingPath)
  if (dlErr || !blob) return { error: dlErr?.message ?? 'Archivo pendiente no encontrado' }

  const { data: existing } = await supabase.from('documents').select('*').eq('id', docId).single()
  if (!existing) return { error: 'Documento no encontrado' }

  if (oldStoragePath) {
    await supabase.storage.from('documentos').remove([oldStoragePath])
  }

  const folder = existing.expediente_id ?? existing.client_id ?? existing.kyc_id ?? 'general'
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${folder}/${Date.now()}_${safeName}`

  const { error: upErr } = await supabase.storage.from('documentos').upload(storagePath, blob, { upsert: false })
  if (upErr) return { error: upErr.message }

  const { error } = await supabase
    .from('documents')
    .update({
      name: fileName,
      storage_path: storagePath,
      file_size: fileSize || blob.size,
      uploaded_by: userId ?? null,
      uploaded_at: new Date().toISOString(),
    })
    .eq('id', docId)

  await supabase.storage.from('documentos').remove([pendingPath])
  if (error) return { error: error.message }
  return {}
}

export async function finalizePendingComplianceManual(
  payload: Record<string, unknown>,
  userId?: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const pendingPath = String(payload.pendingStoragePath ?? '')
  const fileName = String(payload.fileName ?? 'manual.pdf')
  const meta = payload.meta as {
    client_id: string
    title: string
    version: string
    description?: string
    effective_date: string
  }

  const { data: blob, error: dlErr } = await supabase.storage.from('cumplimiento').download(pendingPath)
  if (dlErr || !blob) return { error: dlErr?.message ?? 'Archivo no encontrado' }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `manuales/${meta.client_id}/${Date.now()}_${safeName}`
  const { error: upErr } = await supabase.storage.from('cumplimiento').upload(storagePath, blob, { upsert: false })
  if (upErr) return { error: upErr.message }

  await supabase
    .from('compliance_manuals')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('client_id', meta.client_id)
    .eq('is_active', true)

  const { error } = await supabase.from('compliance_manuals').insert({
    client_id: meta.client_id,
    title: meta.title.trim(),
    version: meta.version.trim(),
    description: meta.description?.trim() || null,
    storage_path: storagePath,
    file_name: fileName,
    effective_date: meta.effective_date,
    is_active: true,
    uploaded_by: userId ?? null,
  })

  await supabase.storage.from('cumplimiento').remove([pendingPath])
  if (error) return { error: formatSupabaseMigrationError(error.message) }
  return {}
}

export async function finalizePendingLegalResource(
  payload: Record<string, unknown>,
  userId?: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const pendingPath = String(payload.pendingStoragePath ?? '')
  const fileName = String(payload.fileName ?? 'recurso')
  const meta = payload.meta as {
    title: string
    category: string
    description?: string
    is_template?: boolean
  }

  const bucket = 'plantillas'
  const { data: blob, error: dlErr } = await supabase.storage.from(bucket).download(pendingPath)
  if (dlErr || !blob) return { error: dlErr?.message ?? 'Archivo no encontrado' }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${meta.category}/${Date.now()}_${safeName}`
  const { error: upErr } = await supabase.storage.from(bucket).upload(storagePath, blob, { upsert: false })
  if (upErr) return { error: upErr.message }

  const { error } = await supabase.from('legal_resources').insert({
    title: meta.title.trim(),
    category: meta.category,
    description: meta.description?.trim() || null,
    storage_path: storagePath,
    file_name: fileName,
    is_template: meta.is_template ?? false,
    uploaded_by: userId ?? null,
  })

  await supabase.storage.from('plantillas').remove([pendingPath])
  if (error) return { error: error.message }
  return {}
}

export async function approveAccountAccess(
  profileId: string,
  role?: import('./types').UserRole,
  reviewerId?: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { data, error } = await supabase
    .from('profiles')
    .update({
      account_status: 'activo',
      role: role ?? 'asistente',
    })
    .eq('id', profileId)
    .select('id')
    .maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { error: 'No se pudo activar la cuenta' }
  await supabase.from('activity_log').insert({
    user_id: reviewerId ?? null,
    action: 'cuenta_aprobada',
    description: `Autorizó acceso de nuevo usuario (${profileId})`,
  })
  await createNotification({
    userId: profileId,
    title: 'Acceso autorizado',
    body: 'Tu cuenta fue activada. Ya puedes usar Integra PLD.',
    link: '/',
    kind: 'success',
  })
  const { data: prof } = await supabase.from('profiles').select('email').eq('id', profileId).maybeSingle()
  if (prof?.email) openMailto(prof.email, 'Acceso autorizado a Integra PLD', 'Tu cuenta fue activada.')
  return {}
}

export async function rejectAccountAccess(profileId: string, reviewerId?: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { error } = await supabase.from('profiles').update({ account_status: 'rechazado' }).eq('id', profileId)
  if (error) return { error: error.message }
  await supabase.from('activity_log').insert({
    user_id: reviewerId ?? null,
    action: 'cuenta_rechazada',
    description: `Rechazó acceso de nuevo usuario (${profileId})`,
  })
  return {}
}

export async function ensureAccountApprovalRequest(profile: import('./types').Profile): Promise<void> {
  if (!supabase || profile.account_status !== 'pendiente') return
  const { data: existing } = await supabase
    .from('approval_requests')
    .select('id, payload')
    .eq('action_type', 'approve_account')
    .eq('status', 'pendiente')
  const already = (existing ?? []).some(
    (r) => (r.payload as Record<string, unknown>)?.profileId === profile.id,
  )
  if (already) return
  await createApprovalRequest(
    {
      action_type: 'approve_account',
      title: `Nueva cuenta: ${profile.full_name}`,
      description: profile.email,
      payload: { profileId: profile.id, email: profile.email, fullName: profile.full_name },
    },
    profile.id,
  )
}

export async function resolveAlert(alertId: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { error } = await supabase.from('alerts').update({ resolved: true }).eq('id', alertId)
  if (error) return { error: error.message }
  return {}
}

export async function resolveAllAlerts(): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { error } = await supabase.from('alerts').update({ resolved: true }).eq('resolved', false)
  if (error) return { error: error.message }
  return {}
}

/** Crea alertas automáticas para KYC próximos a vencer o vencidos. */
export async function syncKycAlerts(userId?: string): Promise<void> {
  if (!supabase) return

  const { data: kycList } = await supabase
    .from('kyc_records')
    .select('id, client_id, expires_at, status, clients(name)')
    .not('expires_at', 'is', null)
    .in('status', ['pendiente', 'en_revision', 'aprobado'])

  if (!kycList?.length) return

  const { data: existing } = await supabase
    .from('alerts')
    .select('id, message')
    .eq('alert_type', 'kyc')
    .eq('resolved', false)

  const existingKycIds = new Set(
    (existing ?? [])
      .map((a) => a.message?.match(/kyc:([a-f0-9-]+)/)?.[1])
      .filter(Boolean),
  )

  const today = new Date()

  for (const kyc of kycList) {
    if (!kyc.expires_at || existingKycIds.has(kyc.id)) continue

    const daysLeft = differenceInDays(parseISO(kyc.expires_at), today)
    const clientName = (kyc.clients as { name?: string } | null)?.name ?? 'Cliente'

    if (daysLeft < 0) {
      await supabase.from('kyc_records').update({ status: 'vencido' }).eq('id', kyc.id)
      await supabase.from('alerts').insert({
        client_id: kyc.client_id,
        title: `KYC vencido — ${clientName}`,
        message: `kyc:${kyc.id} — Debida diligencia vencida el ${format(parseISO(kyc.expires_at), 'dd/MM/yyyy')}`,
        alert_type: 'kyc',
        due_date: kyc.expires_at.slice(0, 10),
        created_by: userId ?? null,
      })
    } else if (daysLeft <= 30) {
      await supabase.from('alerts').insert({
        client_id: kyc.client_id,
        title: `KYC por vencer — ${clientName}`,
        message: `kyc:${kyc.id} — Vence en ${daysLeft} días (${format(parseISO(kyc.expires_at), 'dd/MM/yyyy')})`,
        alert_type: 'kyc',
        due_date: kyc.expires_at.slice(0, 10),
        created_by: userId ?? null,
      })
    }
  }
}

export async function saveSanctionsResults(
  kycId: string,
  results: SanctionsResults,
  checklist: KycChecklist,
  userId?: string,
): Promise<{ error?: string }> {
  const allClear = Object.values(results).every((r) => !r.match)
  const updatedChecklist: KycChecklist = {
    ...checklist,
    ofac_verificado: !results.ofac?.match,
    sat_69b_verificado: !results.sat_69b?.match,
    un_list_verificado: !results.un?.match,
    lista_negra_verificada: allClear,
  }

  if (!supabase) return { error: 'Supabase no configurado' }

  const { error } = await supabase
    .from('kyc_records')
    .update({
      sanctions_results: results,
      sanctions_check: allClear,
      checklist: updatedChecklist,
      risk_score: calcRiskScore(updatedChecklist),
      checklist_completion: calcRiskScore(updatedChecklist),
      updated_at: new Date().toISOString(),
    })
    .eq('id', kycId)

  if (error) return { error: error.message }

  const { data: kyc } = await supabase.from('kyc_records').select('client_id').eq('id', kycId).single()
  if (kyc) {
    await supabase.from('activity_log').insert({
      client_id: kyc.client_id,
      user_id: userId ?? null,
      action: 'sanciones_verificadas',
      description: allClear
        ? 'Verificación de listas sin coincidencias'
        : 'Verificación de listas con coincidencias — revisar',
    })
  }

  return {}
}

export async function revertStage(
  expedienteId: string,
  stageIndex: number,
  userId?: string,
): Promise<{ error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Supabase no configurado' }
  }

  const { data: stage } = await supabase
    .from('expediente_stages')
    .select('status, name')
    .eq('expediente_id', expedienteId)
    .eq('stage_index', stageIndex)
    .single()

  if (!stage || stage.status !== 'completada') {
    return { error: 'Solo puedes deshacer etapas completadas.' }
  }

  await supabase
    .from('expediente_stages')
    .update({ status: 'en_progreso', completed_at: null, completed_by: null })
    .eq('expediente_id', expedienteId)
    .eq('stage_index', stageIndex)

  const nextIndex = stageIndex + 1
  const { data: nextStage } = await supabase
    .from('expediente_stages')
    .select('status')
    .eq('expediente_id', expedienteId)
    .eq('stage_index', nextIndex)
    .maybeSingle()

  if (nextStage && nextStage.status !== 'pendiente') {
    await supabase
      .from('expediente_stages')
      .update({ status: 'pendiente', started_at: null })
      .eq('expediente_id', expedienteId)
      .eq('stage_index', nextIndex)
  }

  const { data: exp } = await supabase
    .from('expedientes')
    .select('client_id')
    .eq('id', expedienteId)
    .single()

  await supabase
    .from('expedientes')
    .update({
      current_stage_index: stageIndex,
      status: 'activo',
      closed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', expedienteId)

  await supabase.from('activity_log').insert({
    expediente_id: expedienteId,
    client_id: exp?.client_id,
    user_id: userId ?? null,
    action: 'etapa_revertida',
    description: `Deshizo completado de "${stage.name}"`,
  })

  return {}
}

export async function deleteClient(clientId: string, userId?: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { data: client } = await supabase.from('clients').select('name').eq('id', clientId).single()
  const { error } = await supabase.from('clients').delete().eq('id', clientId)
  if (error) return { error: error.message }
  await supabase.from('activity_log').insert({
    client_id: clientId,
    user_id: userId ?? null,
    action: 'cliente_eliminado',
    description: `Eliminó cliente "${client?.name ?? clientId}"`,
  })
  return {}
}

export async function deleteExpediente(expedienteId: string, userId?: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { data: exp } = await supabase.from('expedientes').select('title, client_id').eq('id', expedienteId).single()
  const { error } = await supabase.from('expedientes').delete().eq('id', expedienteId)
  if (error) return { error: error.message }
  await supabase.from('activity_log').insert({
    expediente_id: expedienteId,
    client_id: exp?.client_id,
    user_id: userId ?? null,
    action: 'expediente_eliminado',
    description: `Eliminó expediente "${exp?.title ?? expedienteId}"`,
  })
  return {}
}

export async function deleteKycRecord(kycId: string, userId?: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { data: kyc } = await supabase.from('kyc_records').select('client_id').eq('id', kycId).single()
  const { error } = await supabase.from('kyc_records').delete().eq('id', kycId)
  if (error) return { error: error.message }
  await supabase.from('activity_log').insert({
    client_id: kyc?.client_id,
    user_id: userId ?? null,
    action: 'kyc_eliminado',
    description: 'Eliminó registro KYC',
  })
  return {}
}

export async function replaceDocument(
  docId: string,
  oldStoragePath: string,
  file: File,
  userId?: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }

  const { data: existing } = await supabase.from('documents').select('*').eq('id', docId).single()
  if (!existing) return { error: 'Documento no encontrado' }

  await supabase.storage.from('documentos').remove([oldStoragePath])

  const folder = existing.expediente_id ?? existing.client_id ?? existing.kyc_id ?? 'general'
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${folder}/${Date.now()}_${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('documentos')
    .upload(storagePath, file, { upsert: false })

  if (uploadError) return { error: uploadError.message }

  const { error } = await supabase
    .from('documents')
    .update({
      name: file.name,
      storage_path: storagePath,
      file_size: file.size,
      uploaded_by: userId ?? null,
      uploaded_at: new Date().toISOString(),
    })
    .eq('id', docId)

  if (error) return { error: error.message }

  await supabase.from('activity_log').insert({
    expediente_id: existing.expediente_id,
    client_id: existing.client_id,
    user_id: userId ?? null,
    action: 'documento_reemplazado',
    description: `Reemplazó documento "${file.name}"`,
  })

  return {}
}

export async function uploadLegalResource(
  file: File,
  meta: {
    title: string
    category: string
    description?: string
    article_ref?: string
    is_template?: boolean
  },
  userId?: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${meta.category}/${Date.now()}_${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('plantillas')
    .upload(storagePath, file, { upsert: false })

  if (uploadError) return { error: uploadError.message }

  const { error } = await supabase.from('legal_resources').insert({
    title: meta.title.trim(),
    category: meta.category,
    description: meta.description?.trim() || null,
    article_ref: meta.article_ref?.trim() || null,
    storage_path: storagePath,
    file_name: file.name,
    file_size: file.size,
    is_template: meta.is_template ?? false,
    uploaded_by: userId ?? null,
  })

  if (error) return { error: error.message }
  return {}
}

export async function deleteLegalResource(id: string, storagePath?: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  if (storagePath) await supabase.storage.from('plantillas').remove([storagePath])
  const { error } = await supabase.from('legal_resources').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function updateExpediente(
  expedienteId: string,
  data: {
    title: string
    description?: string
    status: ExpedienteStatus
    priority: Priority
    assigned_to?: string
  },
  userId?: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('expedientes')
    .update({
      title: data.title.trim(),
      description: data.description?.trim() || null,
      status: data.status,
      priority: data.priority,
      assigned_to: data.assigned_to || null,
      updated_at: now,
      ...(data.status === 'cerrado' || data.status === 'archivado'
        ? { closed_at: now }
        : { closed_at: null }),
    })
    .eq('id', expedienteId)

  if (error) return { error: error.message }

  const { data: exp } = await supabase.from('expedientes').select('client_id').eq('id', expedienteId).single()
  await supabase.from('activity_log').insert({
    expediente_id: expedienteId,
    client_id: exp?.client_id,
    user_id: userId ?? null,
    action: 'expediente_actualizado',
    description: `Actualizó expediente "${data.title.trim()}"`,
  })
  return {}
}

export async function updateStageNotes(
  stageId: string,
  notes: string,
  _userId?: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { error } = await supabase.from('expediente_stages').update({ notes: notes.trim() || null }).eq('id', stageId)
  if (error) return { error: error.message }
  return {}
}

export async function createAlert(
  data: {
    title: string
    message?: string
    alert_type: AlertType
    due_date?: string
    client_id?: string
    expediente_id?: string
    assigned_to?: string
  },
  userId?: string,
): Promise<{ alertId?: string; error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }

  const { data: alert, error } = await supabase
    .from('alerts')
    .insert({
      title: data.title.trim(),
      message: data.message?.trim() || null,
      alert_type: data.alert_type,
      due_date: data.due_date || null,
      client_id: data.client_id || null,
      expediente_id: data.expediente_id || null,
      assigned_to: data.assigned_to || null,
      created_by: userId ?? null,
      resolved: false,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await supabase.from('activity_log').insert({
    client_id: data.client_id,
    expediente_id: data.expediente_id,
    user_id: userId ?? null,
    action: 'alerta_creada',
    description: `Creó alerta: "${data.title.trim()}"`,
  })

  return { alertId: alert.id }
}

export async function saveClientRiskMatrix(
  clientId: string,
  matrix: RiskMatrixFactors,
  userId?: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }

  const matrixWithMeta = {
    ...matrix,
    assessed_at: new Date().toISOString(),
    assessed_by: userId,
  }
  const matrix_risk_level = calcMatrixRiskLevel(matrixWithMeta)

  const { error } = await supabase
    .from('clients')
    .update({
      risk_matrix: matrixWithMeta,
      matrix_risk_level,
      risk_level: matrix_risk_level,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  if (error) return { error: error.message }

  const { data: approvedKyc } = await supabase
    .from('kyc_records')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'aprobado')

  const newExpiry = defaultKycExpiry(matrix_risk_level)
  for (const k of approvedKyc ?? []) {
    await supabase.from('kyc_records').update({ expires_at: newExpiry, updated_at: new Date().toISOString() }).eq('id', k.id)
  }

  await supabase.from('activity_log').insert({
    client_id: clientId,
    user_id: userId ?? null,
    action: 'matriz_riesgo',
    description: `Actualizó matriz de riesgo — nivel ${matrix_risk_level}`,
    metadata: { matrix_risk_level },
  })
  return {}
}

export async function updateKycExtended(
  kycId: string,
  data: {
    checklist: KycChecklist
    status: KycStatus
    pep: boolean
    sanctions_check: boolean
    beneficial_owner?: string
    beneficial_owners?: BeneficialOwner[]
    pep_questionnaire?: PepQuestionnaire
    review_notes?: string
    expires_at?: string
    sanctions_results?: SanctionsResults
  },
  userId?: string,
): Promise<{ error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { error: 'Supabase no configurado' }

  const now = new Date().toISOString()

  let checklist = data.checklist
  let sanctions_check = data.sanctions_check
  if (data.sanctions_results) {
    const allClear = Object.values(data.sanctions_results).every((r) => !r.match)
    checklist = {
      ...checklist,
      ofac_verificado: !data.sanctions_results.ofac?.match,
      sat_69b_verificado: !data.sanctions_results.sat_69b?.match,
      un_list_verificado: !data.sanctions_results.un?.match,
      lista_negra_verificada: allClear,
    }
    sanctions_check = allClear
  }

  const { error } = await supabase
    .from('kyc_records')
    .update({
      checklist,
      status: data.status,
      risk_score: calcRiskScore(checklist),
      checklist_completion: calcRiskScore(checklist),
      pep: data.pep,
      sanctions_check,
      beneficial_owner: data.beneficial_owner?.trim() || null,
      beneficial_owners: data.beneficial_owners ?? [],
      pep_questionnaire: data.pep_questionnaire ?? {},
      review_notes: data.review_notes?.trim() || null,
      reviewed_by: userId ?? null,
      reviewed_at: now,
      updated_at: now,
      ...(data.expires_at ? { expires_at: data.expires_at } : {}),
      ...(data.sanctions_results ? { sanctions_results: data.sanctions_results } : {}),
    })
    .eq('id', kycId)

  if (error) return { error: error.message }
  await syncKycAlerts(userId)
  return {}
}

export async function renewKyc(
  oldKycId: string,
  userId?: string,
): Promise<{ kycId?: string; error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }

  const { data: old } = await supabase.from('kyc_records').select('*').eq('id', oldKycId).single()
  if (!old) return { error: 'KYC no encontrado' }

  const { data: client } = await supabase
    .from('clients')
    .select('risk_level, matrix_risk_level')
    .eq('id', old.client_id)
    .single()
  const risk = (client?.matrix_risk_level ?? client?.risk_level ?? 'medio') as RiskLevel

  const emptyChecklist: KycChecklist = {}
  const { data: kyc, error } = await supabase
    .from('kyc_records')
    .insert({
      client_id: old.client_id,
      expediente_id: old.expediente_id,
      status: 'pendiente',
      risk_score: 0,
      checklist_completion: 0,
      checklist: emptyChecklist,
      pep: old.pep,
      sanctions_check: false,
      beneficial_owner: old.beneficial_owner,
      beneficial_owners: old.beneficial_owners ?? [],
      pep_questionnaire: old.pep_questionnaire ?? {},
      renewal_of: oldKycId,
      expires_at: defaultKycExpiry(risk),
      created_by: userId ?? null,
    })
    .select('id, client_id')
    .single()

  if (error || !kyc) return { error: error?.message ?? 'No se pudo renovar KYC' }

  await supabase.from('activity_log').insert({
    client_id: kyc.client_id,
    user_id: userId ?? null,
    action: 'kyc_renovado',
    description: 'Inició renovación de debida diligencia',
  })
  await syncKycAlerts(userId)
  return { kycId: kyc.id }
}

export async function createPldOperation(
  data: {
    client_id: string
    expediente_id?: string
    operation_date: string
    operation_type: string
    amount?: number
    currency?: string
    description?: string
    unusual?: boolean
    auto_create_notice?: boolean
    notice_type?: NoticeType
    client_industry?: string
  },
  userId?: string,
): Promise<{ operationId?: string; noticeId?: string; error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }

  const { data: op, error } = await supabase
    .from('pld_operations')
    .insert({
      client_id: data.client_id,
      expediente_id: data.expediente_id || null,
      operation_date: data.operation_date,
      operation_type: data.operation_type,
      amount: data.amount ?? null,
      currency: data.currency ?? 'MXN',
      description: data.description?.trim() || null,
      unusual: data.unusual ?? false,
      created_by: userId ?? null,
    })
    .select('id, client_id')
    .single()

  if (error) return { error: error.message }

  await supabase.from('activity_log').insert({
    client_id: op.client_id,
    expediente_id: data.expediente_id,
    user_id: userId ?? null,
    action: 'operacion_registrada',
    description: `Registró operación: ${data.operation_type}`,
  })

  let noticeId: string | undefined
  if (data.unusual && data.auto_create_notice) {
    const { data: client } = await supabase.from('clients').select('name').eq('id', data.client_id).single()
    const noticeType = data.notice_type ?? 'inusual'
    const narrative = buildNoticeNarrative({
      clientName: client?.name ?? 'Cliente',
      operationType: data.operation_type,
      amount: data.amount,
      currency: data.currency,
      operationDate: data.operation_date,
      description: data.description,
      noticeType: noticeType,
    })
    const noticeResult = await createUnusualNotice(
      {
        client_id: data.client_id,
        operation_id: op.id,
        notice_type: noticeType,
        title: `Aviso ${noticeType} — ${data.operation_type}`,
        narrative,
        amount: data.amount,
        detected_at: data.operation_date,
      },
      userId,
    )
    noticeId = noticeResult.noticeId
  }

  return { operationId: op.id, noticeId }
}

export async function updatePldOperation(
  operationId: string,
  data: {
    operation_date: string
    operation_type: string
    amount?: number
    currency?: string
    description?: string
    unusual?: boolean
    reported?: boolean
    report_date?: string
  },
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { error } = await supabase
    .from('pld_operations')
    .update({
      ...data,
      description: data.description?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', operationId)
  if (error) return { error: error.message }
  return {}
}

export async function deletePldOperation(operationId: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { error } = await supabase.from('pld_operations').delete().eq('id', operationId)
  if (error) return { error: error.message }
  return {}
}

export async function createUnusualNotice(
  data: {
    client_id: string
    operation_id?: string
    notice_type: NoticeType
    title: string
    narrative?: string
    amount?: number
    detected_at: string
    assigned_to?: string
  },
  userId?: string,
): Promise<{ noticeId?: string; error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }

  const { data: notice, error } = await supabase
    .from('unusual_notices')
    .insert({
      client_id: data.client_id,
      operation_id: data.operation_id || null,
      notice_type: data.notice_type,
      status: 'borrador',
      title: data.title.trim(),
      narrative: data.narrative?.trim() || null,
      amount: data.amount ?? null,
      detected_at: data.detected_at,
      assigned_to: data.assigned_to || null,
      created_by: userId ?? null,
    })
    .select('id, client_id')
    .single()

  if (error) return { error: error.message }

  await supabase.from('activity_log').insert({
    client_id: notice.client_id,
    user_id: userId ?? null,
    action: 'aviso_creado',
    description: `Creó aviso ${data.notice_type}: "${data.title.trim()}"`,
  })
  return { noticeId: notice.id }
}

export async function updateUnusualNotice(
  noticeId: string,
  data: {
    notice_type: NoticeType
    status: NoticeStatus
    title: string
    narrative?: string
    amount?: number
    detected_at: string
    submitted_at?: string
    assigned_to?: string
  },
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { error } = await supabase
    .from('unusual_notices')
    .update({
      ...data,
      title: data.title.trim(),
      narrative: data.narrative?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noticeId)
  if (error) return { error: error.message }
  return {}
}

export function notifyAssigneeEmail(email: string, subject: string, body: string): void {
  const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.open(url, '_blank')
}

export async function markOperationReported(
  operationId: string,
  reportDate?: string,
  userId?: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const date = reportDate ?? new Date().toISOString().slice(0, 10)
  const { error } = await supabase
    .from('pld_operations')
    .update({ reported: true, report_date: date, updated_at: new Date().toISOString() })
    .eq('id', operationId)
  if (error) return { error: error.message }
  await supabase.from('activity_log').insert({
    user_id: userId ?? null,
    action: 'operacion_reportada',
    description: `Marcó operación como reportada (${date})`,
  })
  return {}
}

export async function saveExpedienteDiagnosis(
  expedienteId: string,
  checklist: import('./types').DiagnosisItemRef[],
  userId?: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { error } = await supabase
    .from('expedientes')
    .update({ diagnosis_checklist: checklist, updated_at: new Date().toISOString() })
    .eq('id', expedienteId)
  if (error) return { error: error.message }
  await supabase.from('activity_log').insert({
    expediente_id: expedienteId,
    user_id: userId ?? null,
    action: 'diagnostico_actualizado',
    description: 'Actualizó checklist de diagnóstico PLD',
  })
  return {}
}

export async function addExpedienteComment(
  expedienteId: string,
  body: string,
  userId?: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { error } = await supabase.from('expediente_comments').insert({
    expediente_id: expedienteId,
    user_id: userId ?? null,
    body: body.trim(),
  })
  if (error) return { error: error.message }
  return {}
}

export async function deleteExpedienteComment(commentId: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { error } = await supabase.from('expediente_comments').delete().eq('id', commentId)
  if (error) return { error: error.message }
  return {}
}

export async function fetchComplianceOfficers(): Promise<{ officers: import('./types').ClientComplianceOfficer[]; error?: string }> {
  if (!supabase) {
    try {
      const raw = localStorage.getItem('integra_client_officers')
      if (raw) return { officers: JSON.parse(raw) as import('./types').ClientComplianceOfficer[] }
    } catch {
      /* ignore */
    }
    return { officers: [] }
  }
  const { data, error } = await supabase
    .from('client_compliance_officers')
    .select('*, clients(*)')
    .order('updated_at', { ascending: false })
  if (error) return { officers: [], error: formatSupabaseMigrationError(error.message) }
  return { officers: data ?? [] }
}

export async function createComplianceOfficer(
  data: {
    client_id: string
    name: string
    email?: string
    phone?: string
    rfc?: string
    appointed_at?: string
    ended_at?: string
    is_active?: boolean
    notes?: string
  },
  userId?: string,
): Promise<{ id?: string; error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const isActive = data.is_active ?? true
  if (isActive) {
    await supabase
      .from('client_compliance_officers')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('client_id', data.client_id)
      .eq('is_active', true)
  }
  const { data: row, error } = await supabase
    .from('client_compliance_officers')
    .insert({
      client_id: data.client_id,
      name: data.name.trim(),
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      rfc: data.rfc?.trim() || null,
      appointed_at: data.appointed_at || null,
      ended_at: data.ended_at || null,
      is_active: isActive,
      notes: data.notes?.trim() || null,
      created_by: userId ?? null,
    })
    .select('id')
    .single()
  if (error) return { error: formatSupabaseMigrationError(error.message) }
  return { id: row?.id }
}

export async function updateComplianceOfficer(
  id: string,
  data: Partial<{
    name: string
    email: string
    phone: string
    rfc: string
    appointed_at: string
    ended_at: string
    is_active: boolean
    notes: string
  }>,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  if (data.is_active === true) {
    const { data: current } = await supabase.from('client_compliance_officers').select('client_id').eq('id', id).single()
    if (current?.client_id) {
      await supabase
        .from('client_compliance_officers')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('client_id', current.client_id)
        .eq('is_active', true)
        .neq('id', id)
    }
  }
  const { error } = await supabase
    .from('client_compliance_officers')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: formatSupabaseMigrationError(error.message) }
  return {}
}

export async function deleteComplianceOfficer(id: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { error } = await supabase.from('client_compliance_officers').delete().eq('id', id)
  if (error) return { error: formatSupabaseMigrationError(error.message) }
  return {}
}

export async function getFirmProfile(): Promise<{ firm?: import('./types').FirmProfile; error?: string }> {
  if (!supabase) {
    try {
      const raw = localStorage.getItem('integra_firm_profile')
      if (raw) return { firm: JSON.parse(raw) as import('./types').FirmProfile }
    } catch {
      /* ignore */
    }
    return { firm: { name: '' } }
  }
  const { data, error } = await supabase
    .from('firm_settings')
    .select('value')
    .eq('key', 'firm_profile')
    .maybeSingle()
  if (error) return { firm: { name: '' }, error: error.message }
  return { firm: (data?.value ?? { name: '' }) as import('./types').FirmProfile }
}

export async function saveFirmProfile(firm: import('./types').FirmProfile): Promise<{ error?: string }> {
  if (!supabase) {
    try {
      localStorage.setItem('integra_firm_profile', JSON.stringify(firm))
      return {}
    } catch {
      return { error: 'Supabase no configurado' }
    }
  }
  const { error } = await supabase
    .from('firm_settings')
    .upsert(
      { key: 'firm_profile', value: firm, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
  if (error) return { error: error.message }
  return {}
}

export async function createTrainingSession(
  data: {
    title: string
    session_date: string
    topic: string
    client_id?: string
    officer_id?: string
    participants?: string
    duration_hours?: number
    instructor?: string
    location?: string
    modality?: string
    notes?: string
  },
  userId?: string,
): Promise<{ id?: string; error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { data: row, error } = await supabase
    .from('training_sessions')
    .insert({
      ...data,
      client_id: data.client_id || null,
      officer_id: data.officer_id || null,
      participants: data.participants?.trim() || null,
      notes: data.notes?.trim() || null,
      instructor: data.instructor?.trim() || null,
      location: data.location?.trim() || null,
      modality: data.modality || 'presencial',
      created_by: userId ?? null,
    })
    .select('id')
    .single()
  if (error) return { error: error.message }
  return { id: row?.id }
}

export async function updateTrainingSession(
  id: string,
  data: Partial<{
    title: string
    session_date: string
    topic: string
    client_id: string
    officer_id: string
    participants: string
    duration_hours: number
    instructor: string
    location: string
    modality: string
    notes: string
  }>,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { error } = await supabase.from('training_sessions').update(data).eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function deleteTrainingSession(id: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { error } = await supabase.from('training_sessions').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function saveTrainingCertificate(
  id: string,
  certificateText: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { error } = await supabase
    .from('training_sessions')
    .update({
      certificate_text: certificateText,
      certificate_generated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function fetchComplianceManuals(): Promise<{ manuals: import('./types').ComplianceManual[]; error?: string }> {
  if (!supabase) return { manuals: [] }
  const { data, error } = await supabase
    .from('compliance_manuals')
    .select('*, clients(*)')
    .order('effective_date', { ascending: false })
  if (error) return { manuals: [], error: formatSupabaseMigrationError(error.message) }
  return { manuals: data ?? [] }
}

export async function uploadComplianceManual(
  file: File,
  meta: { client_id: string; title: string; version: string; description?: string; effective_date: string },
  userId?: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  if (!meta.client_id) return { error: 'Selecciona el cliente al que pertenece el manual.' }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `manuales/${meta.client_id}/${Date.now()}_${safeName}`
  const { error: upErr } = await supabase.storage.from('cumplimiento').upload(storagePath, file)
  if (upErr) return { error: upErr.message }
  await supabase
    .from('compliance_manuals')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('client_id', meta.client_id)
    .eq('is_active', true)
  const { error } = await supabase.from('compliance_manuals').insert({
    client_id: meta.client_id,
    title: meta.title.trim(),
    version: meta.version.trim(),
    description: meta.description?.trim() || null,
    storage_path: storagePath,
    file_name: file.name,
    effective_date: meta.effective_date,
    is_active: true,
    uploaded_by: userId ?? null,
  })
  if (error) return { error: formatSupabaseMigrationError(error.message) }
  return {}
}

export async function deleteComplianceManual(id: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { error } = await supabase.from('compliance_manuals').delete().eq('id', id)
  if (error) return { error: formatSupabaseMigrationError(error.message) }
  return {}
}

export async function deleteUnusualNotice(noticeId: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { error } = await supabase.from('unusual_notices').delete().eq('id', noticeId)
  if (error) return { error: error.message }
  return {}
}

export async function uploadTrainingEvidence(
  trainingId: string,
  file: File,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `capacitaciones/${trainingId}/${Date.now()}_${safeName}`
  const { error: upErr } = await supabase.storage.from('cumplimiento').upload(storagePath, file)
  if (upErr) return { error: upErr.message }
  const { error } = await supabase
    .from('training_sessions')
    .update({ evidence_path: storagePath, updated_at: new Date().toISOString() })
    .eq('id', trainingId)
  if (error) return { error: error.message }
  return {}
}

export async function getTrainingEvidenceUrl(storagePath: string): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.storage.from('cumplimiento').createSignedUrl(storagePath, 3600)
  return data?.signedUrl ?? null
}

export async function exportClientBundle(clientId: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const [client, kyc, docs, ops, notices, officers, manuals, trainings, expedientes] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).single(),
    supabase.from('kyc_records').select('*').eq('client_id', clientId),
    supabase.from('documents').select('*').eq('client_id', clientId),
    supabase.from('pld_operations').select('*').eq('client_id', clientId),
    supabase.from('unusual_notices').select('*').eq('client_id', clientId),
    supabase.from('client_compliance_officers').select('*').eq('client_id', clientId),
    supabase.from('compliance_manuals').select('*').eq('client_id', clientId),
    supabase.from('training_sessions').select('*').eq('client_id', clientId),
    supabase.from('expedientes').select('*').eq('client_id', clientId),
  ])
  const bundle = {
    exported_at: new Date().toISOString(),
    client: client.data,
    kyc: kyc.data,
    documents: docs.data,
    operations: ops.data,
    notices: notices.data,
    compliance_officers: officers.data,
    compliance_manuals: manuals.data,
    training_sessions: trainings.data,
    expedientes: expedientes.data,
  }
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `expediente-pld-${client.data?.name?.replace(/\s+/g, '_') ?? clientId}-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  return {}
}

const APPROVALS_STORAGE_KEY = 'integra_approval_requests'

function readLocalApprovals(): import('./types').ApprovalRequest[] {
  try {
    const raw = localStorage.getItem(APPROVALS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as import('./types').ApprovalRequest[]) : []
  } catch {
    return []
  }
}

function writeLocalApprovals(list: import('./types').ApprovalRequest[]) {
  localStorage.setItem(APPROVALS_STORAGE_KEY, JSON.stringify(list))
}

export async function fetchApprovalRequests(): Promise<{
  requests: import('./types').ApprovalRequest[]
  error?: string
}> {
  if (!supabase) {
    return { requests: readLocalApprovals().sort((a, b) => b.created_at.localeCompare(a.created_at)) }
  }
  const { data, error } = await supabase
    .from('approval_requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return { requests: [], error: formatSupabaseMigrationError(error.message, 'migration-approvals.sql') }
  return { requests: (data ?? []) as import('./types').ApprovalRequest[] }
}

export async function createApprovalRequest(
  data: {
    action_type: import('./types').ApprovalActionType
    title: string
    description?: string
    payload: Record<string, unknown>
    client_id?: string
  },
  userId?: string,
): Promise<{ id?: string; error?: string }> {
  const row = {
    id: crypto.randomUUID(),
    action_type: data.action_type,
    title: data.title.trim(),
    description: data.description?.trim() || null,
    payload: data.payload,
    client_id: data.client_id || null,
    status: 'pendiente' as const,
    requested_by: userId ?? null,
    created_at: new Date().toISOString(),
  }

  if (!supabase) {
    const list = readLocalApprovals()
    list.unshift(row as import('./types').ApprovalRequest)
    writeLocalApprovals(list)
    return { id: row.id }
  }

  const { data: created, error } = await supabase
    .from('approval_requests')
    .insert({
      action_type: row.action_type,
      title: row.title,
      description: row.description,
      payload: row.payload,
      client_id: row.client_id,
      requested_by: row.requested_by,
    })
    .select('id')
    .single()

  if (error) return { error: formatSupabaseMigrationError(error.message, 'migration-approvals.sql') }

  await supabase.from('activity_log').insert({
    client_id: data.client_id,
    user_id: userId ?? null,
    action: 'autorizacion_solicitada',
    description: `Solicitó autorización: ${row.title}`,
  })

  void notifyLawyers({
    title: `Nueva autorización: ${row.title}`,
    body: data.description ?? 'Revisa en Autorizaciones',
    link: '/autorizaciones',
    kind: 'approval',
  })

  return { id: created?.id }
}

export async function reviewApprovalRequest(
  id: string,
  decision: 'aprobada' | 'rechazada',
  reviewNotes?: string,
  reviewerId?: string,
): Promise<{ error?: string }> {
  const now = new Date().toISOString()

  if (!supabase) {
    const list = readLocalApprovals()
    const idx = list.findIndex((r) => r.id === id)
    if (idx < 0) return { error: 'Solicitud no encontrada' }
    const req = list[idx]
    if (req.status !== 'pendiente') return { error: 'La solicitud ya fue revisada' }
    if (decision === 'rechazada' && req.action_type === 'approve_account') {
      const reject = await rejectAccountAccess(String(req.payload.profileId), reviewerId)
      if (reject.error) return reject
    }
    if (decision === 'aprobada') {
      const exec = await executeApprovalAction(req.action_type, req.payload, reviewerId, req.requested_by)
      if (exec.error) return exec
    }
    list[idx] = {
      ...req,
      status: decision,
      reviewed_by: reviewerId,
      review_notes: reviewNotes?.trim() || undefined,
      reviewed_at: now,
    }
    writeLocalApprovals(list)
    return {}
  }

  const { data: req, error: fetchErr } = await supabase
    .from('approval_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !req) return { error: fetchErr?.message ?? 'Solicitud no encontrada' }
  if (req.status !== 'pendiente') return { error: 'La solicitud ya fue revisada' }

  if (decision === 'rechazada' && req.action_type === 'approve_account') {
    const reject = await rejectAccountAccess(String((req.payload as Record<string, unknown>).profileId), reviewerId)
    if (reject.error) return reject
  }

  if (decision === 'aprobada') {
    const exec = await executeApprovalAction(
      req.action_type as import('./types').ApprovalActionType,
      req.payload as Record<string, unknown>,
      reviewerId,
      req.requested_by ?? undefined,
    )
    if (exec.error) return exec
  }

  const { data: updated, error } = await supabase
    .from('approval_requests')
    .update({
      status: decision,
      reviewed_by: reviewerId ?? null,
      review_notes: reviewNotes?.trim() || null,
      reviewed_at: now,
    })
    .eq('id', id)
    .eq('status', 'pendiente')
    .select('id')
    .maybeSingle()

  if (error) return { error: error.message }
  if (!updated) return { error: 'No se pudo actualizar la solicitud. Verifica permisos en Supabase.' }

  await supabase.from('activity_log').insert({
    client_id: req.client_id,
    user_id: reviewerId ?? null,
    action: decision === 'aprobada' ? 'autorizacion_aprobada' : 'autorizacion_rechazada',
    description: `${decision === 'aprobada' ? 'Aprobó' : 'Rechazó'} solicitud: ${req.title}`,
  })

  if (req.requested_by) {
    const msg =
      decision === 'aprobada'
        ? `Tu solicitud fue aprobada: ${req.title}`
        : `Tu solicitud fue rechazada: ${req.title}${reviewNotes ? ` — ${reviewNotes}` : ''}`
    await createNotification({
      userId: req.requested_by,
      title: decision === 'aprobada' ? 'Autorización aprobada' : 'Autorización rechazada',
      body: msg,
      link: '/autorizaciones',
      kind: decision === 'aprobada' ? 'success' : 'warning',
    })
    const { data: requester } = await supabase.from('profiles').select('email').eq('id', req.requested_by).maybeSingle()
    if (requester?.email) openMailto(requester.email, msg, 'Revisa Integra PLD → Autorizaciones')
  }

  return {}
}

export async function updateProfileRole(
  profileId: string,
  role: import('./types').UserRole,
  userId?: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }

  const { data: rpcData, error: rpcError } = await supabase.rpc('update_team_member_role', {
    target_id: profileId,
    new_role: role,
  })

  if (!rpcError && rpcData) {
    await supabase.from('activity_log').insert({
      user_id: userId ?? null,
      action: 'rol_actualizado',
      description: `Actualizó rol de usuario a ${role}`,
    })
    return {}
  }

  // Fallback si la RPC aún no está desplegada (migration-fix-team-roles.sql)
  const rpcMissing =
    rpcError?.message?.includes('update_team_member_role') ||
    rpcError?.code === 'PGRST202'

  if (!rpcMissing) {
    return { error: rpcError?.message ?? 'No se pudo actualizar el rol' }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', profileId)
    .select('id, role')
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) {
    return {
      error:
        'No se guardó el cambio. Ejecuta supabase/migration-fix-team-roles.sql en el SQL Editor de Supabase e intenta de nuevo.',
    }
  }

  await supabase.from('activity_log').insert({
    user_id: userId ?? null,
    action: 'rol_actualizado',
    description: `Actualizó rol de usuario a ${role}`,
  })
  return {}
}

export { exportClientBundleZip } from './bundle-export'

export async function createClientPortalToken(
  clientId: string,
  label: string,
  daysValid: number,
  userId?: string,
): Promise<{ token?: string; url?: string; error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const expires = new Date()
  expires.setDate(expires.getDate() + daysValid)
  const { data, error } = await supabase
    .from('client_portal_tokens')
    .insert({
      client_id: clientId,
      label: label.trim() || 'Subida de documentos',
      expires_at: expires.toISOString(),
      created_by: userId ?? null,
    })
    .select('token')
    .single()
  if (error) return { error: error.message }
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, '')
  return { token: data.token, url: `${base}/portal/${data.token}` }
}

export async function getPortalClient(token: string): Promise<{
  client?: import('./types').Client
  expired?: boolean
  error?: string
}> {
  if (!supabase) return { error: 'Supabase no configurado' }
  const { data: row, error } = await supabase
    .from('client_portal_tokens')
    .select('*, clients(*)')
    .eq('token', token)
    .maybeSingle()
  if (error || !row) return { error: 'Enlace no válido' }
  if (new Date(row.expires_at) < new Date()) return { expired: true }
  return { client: row.clients as import('./types').Client }
}

export async function uploadViaPortal(
  token: string,
  file: File,
  docType: string,
): Promise<{ error?: string }> {
  const portal = await getPortalClient(token)
  if (portal.error || portal.expired || !portal.client) {
    return { error: portal.expired ? 'Enlace expirado' : portal.error ?? 'Enlace inválido' }
  }
  return uploadDocument(file, { client_id: portal.client.id, doc_type: docType }).then((r) =>
    r.error ? { error: r.error } : {},
  )
}
