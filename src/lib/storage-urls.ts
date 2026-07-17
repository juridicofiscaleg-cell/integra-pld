import { supabase } from './supabase'

export async function getDocumentUrl(storagePath: string): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.storage.from('documentos').createSignedUrl(storagePath, 3600)
  return data?.signedUrl ?? null
}

export async function getComplianceManualUrl(storagePath: string): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.storage.from('cumplimiento').createSignedUrl(storagePath, 3600)
  return data?.signedUrl ?? null
}

export async function getLegalResourceUrl(storagePath: string): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.storage.from('plantillas').createSignedUrl(storagePath, 3600)
  return data?.signedUrl ?? null
}
