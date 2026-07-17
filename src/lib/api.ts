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
  SanctionsResults,
} from './types'
import { KYC_CHECKLIST_ITEMS } from './types'
import { getWorkflowStages } from './workflows'
import { addYears, format, parseISO, differenceInDays } from 'date-fns'

function calcRiskScore(checklist: KycChecklist): number {
  const total = KYC_CHECKLIST_ITEMS.length
  const done = KYC_CHECKLIST_ITEMS.filter((item) => checklist[item.key]).length
  return Math.round((done / total) * 100)
}

function defaultKycExpiry(): string {
  return addYears(new Date(), 1).toISOString()
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
    expires_at?: string
  },
  userId?: string,
): Promise<{ kycId?: string; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Supabase no configurado' }
  }

  const risk_score = calcRiskScore(data.checklist)
  const expires_at = data.expires_at ?? defaultKycExpiry()

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

export async function getLegalResourceUrl(storagePath: string): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.storage.from('plantillas').createSignedUrl(storagePath, 3600)
  return data?.signedUrl ?? null
}
