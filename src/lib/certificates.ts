import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js'
import type { CertificateContext } from './certificate-template'
import {
  buildCertificateHtml,
  defaultRecognitionLine,
  serializeCertificateData,
} from './certificate-template'
import { isSupabaseConfigured, supabase } from './supabase'

async function parseFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      if (body?.error) return String(body.error)
    } catch {
      /* ignore */
    }
    return error.message
  }
  if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Error al generar constancia'
}

export async function generateCertificateText(
  ctx: CertificateContext,
): Promise<{ text?: string; html?: string; source: 'ai' | 'template'; error?: string }> {
  const fallbackLine = defaultRecognitionLine(ctx)
  const fallbackStored = serializeCertificateData({ v: 2, recognitionLine: fallbackLine })
  const fallbackHtml = buildCertificateHtml(ctx, fallbackStored)

  if (!isSupabaseConfigured || !supabase) {
    return { text: fallbackStored, html: fallbackHtml, source: 'template' }
  }

  try {
    const { data, error } = await supabase.functions.invoke('generate-certificate', {
      body: {
        training: ctx.training,
        officer: ctx.officer,
        firm: ctx.firm,
      },
    })

    if (error) {
      const msg = await parseFunctionError(error)
      if (/OPENAI|no configurada|fallback/i.test(msg)) {
        return { text: fallbackStored, html: fallbackHtml, source: 'template' }
      }
      return { text: fallbackStored, html: fallbackHtml, source: 'template', error: msg }
    }

    const recognitionLine =
      typeof data?.recognitionLine === 'string' && data.recognitionLine.trim()
        ? data.recognitionLine.trim()
        : typeof data?.bodyText === 'string' && data.bodyText.trim()
          ? data.bodyText.trim().split('\n')[0].slice(0, 280)
          : fallbackLine

    const stored = serializeCertificateData({ v: 2, recognitionLine })
    const html = buildCertificateHtml(ctx, stored)
    return {
      text: stored,
      html,
      source: data?.source === 'ai' ? 'ai' : 'template',
    }
  } catch {
    return { text: fallbackStored, html: fallbackHtml, source: 'template' }
  }
}
