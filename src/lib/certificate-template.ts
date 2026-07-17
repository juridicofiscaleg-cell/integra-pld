import type { ComplianceOfficer, FirmProfile, TrainingSession } from './types'
import { formatDate } from './utils'

export interface CertificateContext {
  training: TrainingSession
  officer: ComplianceOfficer
  firm: FirmProfile
}

export function parseParticipants(raw?: string): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(/[\n,;]+/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export function buildCertificateHtml(ctx: CertificateContext, bodyText?: string): string {
  const participants = parseParticipants(ctx.training.participants)
  const participantBlock = participants.length
    ? `<ul class="participants">${participants.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>`
    : '<p class="participants">Personal del despacho</p>'

  const narrative = bodyText?.trim() || defaultCertificateBody(ctx)

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Constancia — ${escapeHtml(ctx.training.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; max-width: 820px; margin: 0 auto; padding: 48px 56px; line-height: 1.65; }
    .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 24px; margin-bottom: 32px; }
    .header h1 { font-size: 1.35rem; letter-spacing: 0.04em; text-transform: uppercase; margin: 0 0 8px; color: #1e3a5f; }
    .header p { margin: 4px 0; font-size: 0.95rem; color: #444; }
    .title { text-align: center; font-size: 1.5rem; margin: 32px 0 24px; font-weight: bold; }
    .body { text-align: justify; font-size: 1.05rem; }
    .meta { margin: 28px 0; padding: 16px 20px; background: #f7f9fc; border-left: 4px solid #1e3a5f; font-size: 0.95rem; }
    .meta p { margin: 6px 0; }
    .participants { margin: 16px 0 16px 24px; }
    .signatures { margin-top: 64px; display: flex; justify-content: space-between; gap: 48px; }
    .sig { flex: 1; text-align: center; border-top: 1px solid #333; padding-top: 8px; font-size: 0.9rem; }
    .footer { margin-top: 48px; font-size: 0.8rem; color: #666; text-align: center; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(ctx.firm.name || 'Despacho Jurídico')}</h1>
    ${ctx.firm.rfc ? `<p>RFC: ${escapeHtml(ctx.firm.rfc)}</p>` : ''}
    ${ctx.firm.address ? `<p>${escapeHtml(ctx.firm.address)}</p>` : ''}
  </div>

  <div class="title">CONSTANCIA DE CAPACITACIÓN PLD/FT</div>

  <div class="body">
    ${narrative.split('\n\n').map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`).join('')}
  </div>

  <div class="meta">
    <p><strong>Capacitación:</strong> ${escapeHtml(ctx.training.title)}</p>
    <p><strong>Tema:</strong> ${escapeHtml(ctx.training.topic)}</p>
    <p><strong>Fecha:</strong> ${formatDate(ctx.training.session_date)}</p>
    ${ctx.training.duration_hours ? `<p><strong>Duración:</strong> ${ctx.training.duration_hours} hora(s)</p>` : ''}
    ${ctx.training.modality ? `<p><strong>Modalidad:</strong> ${escapeHtml(ctx.training.modality)}</p>` : ''}
    ${ctx.training.instructor ? `<p><strong>Instructor:</strong> ${escapeHtml(ctx.training.instructor)}</p>` : ''}
    ${ctx.training.location ? `<p><strong>Lugar:</strong> ${escapeHtml(ctx.training.location)}</p>` : ''}
    <p><strong>Participantes:</strong></p>
    ${participantBlock}
  </div>

  <div class="signatures">
    <div class="sig">
      <strong>${escapeHtml(ctx.officer.name || 'Oficial de cumplimiento')}</strong><br/>
      Oficial de Cumplimiento PLD/FT
    </div>
    <div class="sig">
      <strong>${escapeHtml(ctx.firm.name || 'Representante')}</strong><br/>
      Representante del sujeto obligado
    </div>
  </div>

  <div class="footer">
    Documento generado por Integra PLD · ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
    · Arts. 52–54 LFPIORPI
  </div>
</body>
</html>`
}

export function defaultCertificateBody(ctx: CertificateContext): string {
  const firm = ctx.firm.name || 'el despacho'
  const participants = parseParticipants(ctx.training.participants)
  const who = participants.length
    ? `a ${participants.join(', ')}`
    : 'al personal del despacho'

  return `Por medio de la presente se hace constar que, en cumplimiento de las obligaciones en materia de Prevención de Lavado de Dinero y Financiamiento al Terrorismo (PLD/FT) previstas en la Ley Federal para la Prevención e Identificación de Operaciones con Recursos de Procedencia Ilícita (LFPIORPI), ${firm} impartió la capacitación "${ctx.training.title}" con temática "${ctx.training.topic}", con fecha ${formatDate(ctx.training.session_date)}.

La sesión tuvo por objeto reforzar el conocimiento del marco normativo, políticas internas, señales de alerta, debida diligencia y procedimientos de reporte aplicables a las actividades vulnerables desempeñadas por el sujeto obligado.

Se extiende la presente constancia ${who}, quien(es) participó(aron) en la capacitación descrita.`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function openCertificatePrint(html: string): void {
  const win = window.open('', '_blank')
  if (!win) {
    alert('Permite ventanas emergentes para imprimir o descargar la constancia.')
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
}

export function downloadCertificateHtml(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
