import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js'
import type { CertificateContext } from './certificate-template'
import { buildCertificateHtml, defaultCertificateBody } from './certificate-template'
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
  const templateBody = defaultCertificateBody(ctx)
  const templateHtml = buildCertificateHtml(ctx, templateBody)

  if (!isSupabaseConfigured || !supabase) {
    return { text: templateBody, html: templateHtml, source: 'template' }
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
        return { text: templateBody, html: templateHtml, source: 'template' }
      }
      return { text: templateBody, html: templateHtml, source: 'template', error: msg }
    }

    const bodyText = typeof data?.bodyText === 'string' ? data.bodyText : templateBody
    const html = buildCertificateHtml(ctx, bodyText)
    return {
      text: bodyText,
      html,
      source: data?.source === 'ai' ? 'ai' : 'template',
    }
  } catch {
    return { text: templateBody, html: templateHtml, source: 'template' }
  }
}
