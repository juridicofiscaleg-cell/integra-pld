import type { Client, ClientComplianceOfficer, ComplianceOfficer, FirmProfile } from './types'

export function clientAsFirm(client?: Client | null): FirmProfile {
  if (!client) return { name: 'Sujeto obligado' }
  return {
    name: client.name,
    rfc: client.rfc,
    address: client.address,
  }
}

export function officerRecordAsOfficer(record?: ClientComplianceOfficer | null): ComplianceOfficer {
  if (!record) return { name: 'Oficial de cumplimiento', email: '' }
  return {
    name: record.name,
    email: record.email ?? '',
    phone: record.phone,
    rfc: record.rfc,
    appointed_at: record.appointed_at,
  }
}

export function resolveCertificateContext(
  session: { clients?: Client; officers?: ClientComplianceOfficer },
  clients: Client[],
  officers: ClientComplianceOfficer[],
): { officer: ComplianceOfficer; firm: FirmProfile } {
  const client = session.clients ?? clients.find((c) => c.id === (session as { client_id?: string }).client_id)
  const officerRec =
    session.officers ??
    officers.find((o) => o.id === (session as { officer_id?: string }).officer_id) ??
    officers.find((o) => o.client_id === client?.id && o.is_active)

  return {
    firm: clientAsFirm(client),
    officer: officerRecordAsOfficer(officerRec),
  }
}
