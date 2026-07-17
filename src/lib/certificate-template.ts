import type { ComplianceOfficer, FirmProfile, TrainingSession } from './types'
import { formatDate } from './utils'

export interface CertificateContext {
  training: TrainingSession
  officer: ComplianceOfficer
  firm: FirmProfile
}

export interface CertificateStoredData {
  v: 2
  recognitionLine: string
}

const DEFAULT_RECOGNITION =
  'Por haber completado satisfactoriamente la capacitación en materia de Prevención de Lavado de Dinero y Financiamiento al Terrorismo, conforme a la LFPIORPI.'

export function parseParticipants(raw?: string): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(/[\n,;]+/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export function parseCertificateData(raw?: string | null): CertificateStoredData {
  if (!raw?.trim()) return { v: 2, recognitionLine: DEFAULT_RECOGNITION }
  try {
    const parsed = JSON.parse(raw) as Partial<CertificateStoredData>
    if (parsed.v === 2 && typeof parsed.recognitionLine === 'string') {
      return { v: 2, recognitionLine: parsed.recognitionLine.trim() || DEFAULT_RECOGNITION }
    }
  } catch {
    /* texto legado */
  }
  return { v: 2, recognitionLine: raw.trim() }
}

export function serializeCertificateData(data: CertificateStoredData): string {
  return JSON.stringify({ v: 2, recognitionLine: data.recognitionLine.trim() || DEFAULT_RECOGNITION })
}

export function defaultRecognitionLine(_ctx: CertificateContext): string {
  return DEFAULT_RECOGNITION
}

function modalityLabel(modality?: string): string {
  const map: Record<string, string> = {
    presencial: 'Presencial',
    virtual: 'Virtual',
    hibrido: 'Híbrido',
  }
  return modality ? (map[modality] ?? modality) : 'Presencial'
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function diplomaStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Great+Vibes&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4 portrait; margin: 12mm; }
    body { background: #ece8e4; font-family: 'Cormorant Garamond', Georgia, serif; color: #1f1a17; }
    .diploma-page {
      width: 100%;
      max-width: 794px;
      min-height: 1080px;
      margin: 0 auto;
      padding: 28px;
      page-break-after: always;
      break-after: page;
    }
    .diploma-page:last-child { page-break-after: auto; break-after: auto; }
    .diploma-frame {
      position: relative;
      min-height: 1020px;
      padding: 48px 52px 40px;
      background: linear-gradient(180deg, #fffdfa 0%, #faf6f0 100%);
      border: 3px solid #7b2d3e;
      box-shadow: inset 0 0 0 6px #f5ebe8, inset 0 0 0 9px #7b2d3e;
    }
    .corner { position: absolute; width: 56px; height: 56px; border-color: #c9a227; border-style: solid; opacity: 0.85; }
    .corner-tl { top: 18px; left: 18px; border-width: 3px 0 0 3px; }
    .corner-tr { top: 18px; right: 18px; border-width: 3px 3px 0 0; }
    .corner-bl { bottom: 18px; left: 18px; border-width: 0 0 3px 3px; }
    .corner-br { bottom: 18px; right: 18px; border-width: 0 3px 3px 0; }
    .seal {
      width: 72px; height: 72px; margin: 0 auto 20px;
      border-radius: 50%;
      border: 2px solid #c9a227;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.62rem; font-weight: 700; letter-spacing: 0.08em;
      color: #7b2d3e; text-align: center; line-height: 1.2;
      background: radial-gradient(circle at 30% 30%, #fff 0%, #f5ebe8 100%);
    }
    .firm-name {
      text-align: center; font-size: 1.15rem; font-weight: 700;
      letter-spacing: 0.14em; text-transform: uppercase; color: #7b2d3e;
      margin-bottom: 6px;
    }
    .firm-meta { text-align: center; font-size: 0.82rem; color: #5c534d; margin-bottom: 28px; }
    .doc-type {
      text-align: center; font-size: 0.95rem; letter-spacing: 0.28em;
      text-transform: uppercase; color: #8a7f76; margin-bottom: 8px;
    }
    .doc-title {
      text-align: center; font-size: 2rem; font-weight: 700;
      letter-spacing: 0.06em; color: #2c2420; margin-bottom: 28px;
    }
    .award-line {
      text-align: center; font-size: 1rem; letter-spacing: 0.12em;
      text-transform: uppercase; color: #6b625c; margin-bottom: 12px;
    }
    .recipient {
      text-align: center; font-family: 'Great Vibes', cursive;
      font-size: 3rem; line-height: 1.15; color: #7b2d3e;
      margin: 8px 0 24px; min-height: 3.4rem;
    }
    .lead {
      text-align: center; font-size: 1.05rem; color: #3d3632; margin-bottom: 10px;
    }
    .course-title {
      text-align: center; font-size: 1.45rem; font-weight: 700;
      color: #2c2420; margin-bottom: 8px; padding: 0 12px;
    }
    .course-topic {
      text-align: center; font-size: 1rem; font-style: italic;
      color: #5c534d; margin-bottom: 18px;
    }
    .recognition {
      text-align: center; font-size: 1.08rem; font-style: italic;
      color: #3d3632; max-width: 620px; margin: 0 auto 28px; line-height: 1.55;
      padding: 14px 20px; border-top: 1px solid #e0d5cf; border-bottom: 1px solid #e0d5cf;
    }
    .details {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px;
      max-width: 560px; margin: 0 auto 36px; font-size: 0.95rem;
    }
    .details dt { color: #8a7f76; font-weight: 600; text-transform: uppercase; font-size: 0.72rem; letter-spacing: 0.08em; }
    .details dd { color: #2c2420; margin: 0 0 8px; font-weight: 600; }
    .signatures {
      display: flex; justify-content: space-between; gap: 40px;
      max-width: 620px; margin: 0 auto; padding-top: 8px;
    }
    .sig {
      flex: 1; text-align: center; border-top: 1.5px solid #2c2420;
      padding-top: 10px; font-size: 0.88rem;
    }
    .sig strong { display: block; font-size: 0.95rem; margin-bottom: 4px; }
    .sig span { color: #6b625c; font-size: 0.78rem; letter-spacing: 0.04em; text-transform: uppercase; }
    .footer {
      text-align: center; margin-top: 28px; font-size: 0.72rem;
      color: #9a9088; letter-spacing: 0.06em;
    }
    @media print {
      body { background: #fff; }
      .diploma-page { padding: 0; max-width: none; }
    }
  `
}

export function buildDiplomaHtml(
  ctx: CertificateContext,
  participantName: string,
  recognitionLine?: string,
): string {
  const line = recognitionLine?.trim() || DEFAULT_RECOGNITION
  const firmName = ctx.firm.name?.trim() || 'Despacho Jurídico'
  const firmMeta = [ctx.firm.rfc ? `RFC ${ctx.firm.rfc}` : '', ctx.firm.address ?? '']
    .filter(Boolean)
    .join(' · ')

  return `
    <div class="diploma-page">
      <div class="diploma-frame">
        <div class="corner corner-tl"></div>
        <div class="corner corner-tr"></div>
        <div class="corner corner-bl"></div>
        <div class="corner corner-br"></div>

        <div class="seal">PLD / FT</div>
        <div class="firm-name">${escapeHtml(firmName)}</div>
        ${firmMeta ? `<div class="firm-meta">${escapeHtml(firmMeta)}</div>` : '<div class="firm-meta">&nbsp;</div>'}

        <div class="doc-type">Reconocimiento oficial</div>
        <div class="doc-title">Constancia de Capacitación</div>

        <div class="award-line">Otorgamos el presente reconocimiento a</div>
        <div class="recipient">${escapeHtml(participantName)}</div>

        <p class="lead">Por haber completado satisfactoriamente la capacitación:</p>
        <div class="course-title">${escapeHtml(ctx.training.title)}</div>
        <div class="course-topic">${escapeHtml(ctx.training.topic)}</div>

        <div class="recognition">${escapeHtml(line)}</div>

        <dl class="details">
          <dt>Fecha</dt><dd>${escapeHtml(formatDate(ctx.training.session_date))}</dd>
          ${ctx.training.duration_hours != null ? `<dt>Duración</dt><dd>${ctx.training.duration_hours} hora(s)</dd>` : ''}
          <dt>Modalidad</dt><dd>${escapeHtml(modalityLabel(ctx.training.modality))}</dd>
          ${ctx.training.instructor ? `<dt>Instructor</dt><dd>${escapeHtml(ctx.training.instructor)}</dd>` : ''}
          ${ctx.training.location ? `<dt>Lugar</dt><dd>${escapeHtml(ctx.training.location)}</dd>` : ''}
        </dl>

        <div class="signatures">
          <div class="sig">
            <strong>${escapeHtml(ctx.officer.name || 'Oficial de cumplimiento')}</strong>
            <span>Oficial de Cumplimiento PLD/FT</span>
          </div>
          <div class="sig">
            <strong>${escapeHtml(firmName)}</strong>
            <span>Sujeto obligado</span>
          </div>
        </div>

        <div class="footer">
          Documento emitido conforme a los Arts. 52–54 LFPIORPI · Integra PLD
        </div>
      </div>
    </div>
  `
}

export function buildCertificateHtml(ctx: CertificateContext, stored?: string | null): string {
  const { recognitionLine } = parseCertificateData(stored)
  const participants = parseParticipants(ctx.training.participants)
  const names = participants.length > 0 ? participants : ['Personal del despacho']

  const pages = names.map((name) => buildDiplomaHtml(ctx, name, recognitionLine)).join('\n')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Constancia — ${escapeHtml(ctx.training.title)}</title>
  <style>${diplomaStyles()}</style>
</head>
<body>
${pages}
</body>
</html>`
}

/** @deprecated use defaultRecognitionLine */
export function defaultCertificateBody(ctx: CertificateContext): string {
  return serializeCertificateData({ v: 2, recognitionLine: defaultRecognitionLine(ctx) })
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
  setTimeout(() => win.print(), 500)
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

export function buildSingleParticipantCertificateHtml(
  ctx: CertificateContext,
  participantName: string,
  stored?: string | null,
): string {
  const { recognitionLine } = parseCertificateData(stored)
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Constancia — ${escapeHtml(participantName)}</title>
  <style>${diplomaStyles()}</style>
</head>
<body>
${buildDiplomaHtml(ctx, participantName, recognitionLine)}
</body>
</html>`
}
