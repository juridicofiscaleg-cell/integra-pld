export interface EmailTemplate {
  id: string
  label: string
  subject: string
  body: string
}

export const CLIENT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'kyc_docs',
    label: 'Solicitud documentos KYC',
    subject: 'Documentación pendiente — Debida diligencia',
    body: `Estimado(a) {cliente},

Para completar su expediente de identificación conforme a la LFPIORPI, requerimos la siguiente documentación:

• Identificación oficial vigente
• Comprobante de domicilio (no mayor a 3 meses)
• Constancia de situación fiscal
• [Acta constitutiva / poder, si aplica]

Favor de enviarla a la brevedad.

Atentamente,
Integra PLD`,
  },
  {
    id: 'kyc_renewal',
    label: 'Renovación KYC',
    subject: 'Renovación de debida diligencia',
    body: `Estimado(a) {cliente},

Su expediente de identificación (KYC) requiere renovación periódica. Solicitamos actualizar:

• Datos generales y de contacto
• Documentación de respaldo vigente
• Declaración de origen de recursos, si aplica

Quedamos atentos.

Atentamente,
Integra PLD`,
  },
  {
    id: 'pld_update',
    label: 'Actualización asunto PLD',
    subject: 'Actualización de su asunto — {expediente}',
    body: `Estimado(a) {cliente},

Le informamos el avance de su asunto "{expediente}":

• Etapa actual: {etapa}
• Próximos pasos: [completar]

Quedamos a sus órdenes.

Atentamente,
Integra PLD`,
  },
]

export function fillTemplate(template: string, vars: Record<string, string>): string {
  let out = template
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), v)
  }
  return out
}

export function openEmailDraft(to: string, subject: string, body: string): void {
  window.open(`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
}
