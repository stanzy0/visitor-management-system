import { queueEmail, sendEmail as sendEmailDirect } from '@/lib/email'
import type { EmailTemplate } from '@/lib/email/types'
import { renderEmailTemplate } from '@/lib/email/templates'

export interface SendEmailParams {
  to: string
  recipientName?: string
  subject: string
  template: EmailTemplate
  data: Record<string, string | number | boolean | undefined>
  relatedType?: string
  relatedId?: string
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  try {
    const html = renderEmailTemplate(params.template, params.data)

    const headers = new Headers()
    headers.set('Authorization', `Bearer ${process.env.RESEND_API_KEY}`)
    headers.set('Content-Type', 'application/json')

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@visitor-management.local',
        to: params.to,
        subject: params.subject,
        html,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Resend API error: ${response.status} - ${errorText}`)
    }

    return true
  } catch (error) {
    console.error('Failed to send email:', error)
    return false
  }
}

export async function sendEmailQueued(params: SendEmailParams): Promise<void> {
  await queueEmail(params)
}

export async function sendEmailWithLogging(params: SendEmailParams): Promise<boolean> {
  const success = await sendEmail(params)

   if (!success) {
     await queueEmail({
      ...params,
    })
  }

  return success
}
