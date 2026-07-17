import JSZip from 'jszip'
import { supabase } from './supabase'
import { getDocumentUrl, getComplianceManualUrl } from './storage-urls'

function summaryHtml(clientName: string, bundle: Record<string, unknown>): string {
  const kyc = (bundle.kyc as unknown[])?.length ?? 0
  const docs = (bundle.documents as unknown[])?.length ?? 0
  const ops = (bundle.operations as unknown[])?.length ?? 0
  const notices = (bundle.notices as unknown[])?.length ?? 0
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Expediente PLD — ${clientName}</title>
<style>body{font-family:system-ui,sans-serif;margin:2rem;line-height:1.5}h1{font-size:1.25rem}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px;text-align:left}</style></head>
<body><h1>Expediente PLD — ${clientName}</h1>
<p>Generado: ${new Date().toLocaleString('es-MX')}</p>
<table><tr><th>Sección</th><th>Registros</th></tr>
<tr><td>KYC</td><td>${kyc}</td></tr>
<tr><td>Documentos</td><td>${docs}</td></tr>
<tr><td>Operaciones</td><td>${ops}</td></tr>
<tr><td>Avisos</td><td>${notices}</td></tr>
</table>
<p>Integra PLD — uso interno del despacho</p></body></html>`
}

export async function exportClientBundleZip(clientId: string): Promise<{ error?: string }> {
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

  if (!client.data) return { error: 'Cliente no encontrado' }

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

  const zip = new JSZip()
  const safeName = client.data.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  zip.file('resumen.html', summaryHtml(client.data.name, bundle))
  zip.file('datos.json', JSON.stringify(bundle, null, 2))

  const docsFolder = zip.folder('documentos')
  for (const doc of docs.data ?? []) {
    if (!doc.storage_path) continue
    const url = await getDocumentUrl(doc.storage_path)
    if (!url) continue
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      docsFolder?.file(doc.name || doc.storage_path.split('/').pop()!, blob)
    } catch {
      /* skip missing files */
    }
  }

  const manualsFolder = zip.folder('manuales')
  for (const m of manuals.data ?? []) {
    if (!m.storage_path) continue
    const url = await getComplianceManualUrl(m.storage_path)
    if (!url) continue
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      manualsFolder?.file(m.file_name || m.title, blob)
    } catch {
      /* skip */
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `expediente-pld-${safeName}-${new Date().toISOString().slice(0, 10)}.zip`
  a.click()
  URL.revokeObjectURL(url)
  return {}
}
