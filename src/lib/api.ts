import { isSupabaseConfigured, supabase } from './supabase'
import type {
  Client,
  ClientType,
  Document,
  KycChecklist,
  KycStatus,
  MatterType,
  Priority,
  RiskLevel,
} from './types'
import { KYC_CHECKLIST_ITEMS } from './types'
import { getWorkflowStages } from './workflows'

function calcRiskScore(checklist: KycChecklist): number {
  const total = KYC_CHECKLIST_ITEMS.length
  const done = KYC_CHECKLIST_ITEMS.filter((item) => checklist[item.key]).length
  return Math.round((done / total) * 100)
}

export async function createClient(
  data: {
    name: string
    client_type: ClientType
    rfc?: string
    email?: string
    phone?: string
    industry?: string
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
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      industry: data.industry?.trim() || null,
      risk_level: data.risk_level,
      notes: data.notes?.trim() || null,
      created_by: userId ?? null,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { client }
}

export async function createExpediente(
  data: {
    client_id: string
    title: string
    matter_type: MatterType
    description?: string
    priority: Priority
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
    review_notes?: string
    status?: KycStatus
  },
  userId?: string,
): Promise<{ kycId?: string; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Supabase no configurado' }
  }

  const risk_score = calcRiskScore(data.checklist)

  const { data: kyc, error } = await supabase
    .from('kyc_records')
    .insert({
      client_id: data.client_id,
      expediente_id: data.expediente_id || null,
      status: data.status ?? 'pendiente',
      risk_score,
      checklist: data.checklist,
      pep: data.pep,
      sanctions_check: data.sanctions_check,
      beneficial_owner: data.beneficial_owner?.trim() || null,
      review_notes: data.review_notes?.trim() || null,
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
  },
  userId?: string,
): Promise<{ error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Supabase no configurado' }
  }

  const risk_score = calcRiskScore(data.checklist)

  const { error } = await supabase
    .from('kyc_records')
    .update({
      checklist: data.checklist,
      status: data.status,
      risk_score,
      pep: data.pep,
      sanctions_check: data.sanctions_check,
      beneficial_owner: data.beneficial_owner?.trim() || null,
      review_notes: data.review_notes?.trim() || null,
      reviewed_by: userId ?? null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', kycId)

  if (error) return { error: error.message }
  return {}
}

export async function advanceStage(
  expedienteId: string,
  stageIndex: number,
  userId?: string,
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

export async function getDocumentUrl(storagePath: string): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.storage
    .from('documentos')
    .createSignedUrl(storagePath, 3600)
  return data?.signedUrl ?? null
}

export async function deleteDocument(docId: string, storagePath: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase no configurado' }

  await supabase.storage.from('documentos').remove([storagePath])
  const { error } = await supabase.from('documents').delete().eq('id', docId)
  if (error) return { error: error.message }
  return {}
}
