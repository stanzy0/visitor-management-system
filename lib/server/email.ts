import { supabaseAdmin } from '@/lib/supabase-admin'
import { renderEmailTemplate } from '@/lib/email/templates'
import type { EmailTemplate } from '@/lib/email/types'

const RESEND_API_URL = 'https://api.resend.com/emails'

interface EmailPayload {
  to: string
  recipientName?: string
  subject: string
  template: EmailTemplate
  data: Record<string, string | number | boolean | undefined>
  relatedType?: string
  relatedId?: string
}

async function sendEmailDirect(payload: EmailPayload): Promise<{ success: true } | { success: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY
  
  if (!apiKey) {
    console.error('[EMAIL] RESEND_API_KEY not configured')
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }

  console.log('[EMAIL] Sending email...')

  const html = renderEmailTemplate(payload.template, payload.data)

  const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'Visitor Management <onboarding@resend.dev>';

  try {
    console.log("[EMAIL] Sending to:", payload.to);
    console.log("[EMAIL] From:", fromEmail);
    console.log("[EMAIL] API Key exists:", !!process.env.RESEND_API_KEY);

    const headers = new Headers()
    headers.set('Authorization', `Bearer ${apiKey}`)
    headers.set('Content-Type', 'application/json')

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: fromEmail,
        to: payload.to,
        subject: payload.subject,
        html,
      }),
    })

    const text = await response.text()

    if (!response.ok) {
      console.error('[EMAIL] Email failed.')
      console.error('Reason:', text || 'Unknown error')
      return { success: false, error: text || 'Unknown Resend error' }
    }

    console.log('[EMAIL] Email delivered successfully.')
    return { success: true }
  } catch (error) {
    console.error('[EMAIL] Email failed.')
    console.error('Reason:', error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function logEmail(payload: EmailPayload): Promise<void> {
  if (!supabaseAdmin) {
    console.error('[EMAIL] Failed to log email: supabaseAdmin is null')
    return
  }

  const log = {
    recipient_email: payload.to,
    recipient_name: payload.recipientName,
    subject: payload.subject,
    template: payload.template,
    status: 'sent',
    related_type: payload.relatedType,
    related_id: payload.relatedId,
    retry_count: 0,
    sent_at: new Date().toISOString(),
  }

  const { error } = await supabaseAdmin
    .from('email_logs')
    .insert(log)
    .select()
    .single()

  if (error) {
    console.error('Failed to log email:', error)
  }
}

export async function sendEmail(params: {
  to: string
  recipientName?: string
  subject: string
  template: EmailTemplate
  data: Record<string, string | number | boolean | undefined>
  relatedType?: string
  relatedId?: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const result = await sendEmailDirect(params)
  
  if (result.success) {
    await logEmail(params)
  }
  
  return result
}