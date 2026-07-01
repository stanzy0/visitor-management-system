import { supabase } from '@/lib/supabase'
import { EmailPayload, EmailLogRow } from './types'

const RESEND_API_URL = 'https://api.resend.com/emails'
const MAX_RETRIES = 3
const RETRY_DELAYS = [60000, 300000, 900000]

function getResendApiKey(): string | undefined {
  if (typeof window === 'undefined') {
    return process.env.RESEND_API_KEY
  }
  return undefined
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = getResendApiKey()
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured. Email not sent.')
    await logEmail({
      ...payload,
      status: 'failed',
      error_message: 'RESEND_API_KEY not configured',
      retry_count: 0,
    })
    return false
  }

  const html = renderTemplate(payload.template, payload.data)

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@visitor-management.local',
        to: payload.to,
        subject: payload.subject,
        html,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Resend API error: ${response.status} - ${errorText}`)
    }

    await logEmail({
      ...payload,
      status: 'sent',
      retry_count: 0,
    })
    return true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await logEmail({
      ...payload,
      status: 'failed',
      error_message: errorMessage,
      retry_count: 0,
    })
    return false
  }
}

export async function queueEmail(payload: EmailPayload): Promise<void> {
  const log: EmailLogRow = {
    recipient_email: payload.to,
    recipient_name: payload.recipientName,
    subject: payload.subject,
    template: payload.template,
    status: 'pending',
    related_type: payload.relatedType,
    related_id: payload.relatedId,
    retry_count: 0,
  }

  const { data, error } = await supabase
    .from('email_logs')
    .insert(log)
    .select()
    .single()

  if (error || !data) {
    console.error('Failed to queue email:', error)
    return
  }

  await attemptSend(data.id)
}

async function attemptSend(logId: string): Promise<void> {
  const { data: log } = await supabase
    .from('email_logs')
    .select('*')
    .eq('id', logId)
    .single()

  if (!log || log.status === 'sent' || log.retry_count >= MAX_RETRIES) {
    if (log?.status !== 'sent' && log?.retry_count >= MAX_RETRIES) {
      await supabase
        .from('email_logs')
        .update({ status: 'failed' })
        .eq('id', logId)
    }
    return
  }

  const success = await sendEmail({
    to: log.recipient_email,
    recipientName: log.recipient_name || undefined,
    subject: log.subject,
    template: log.template as any,
    data: {},
    relatedType: log.related_type || undefined,
    relatedId: log.related_id || undefined,
  })

  if (success) {
    await supabase
      .from('email_logs')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        retry_count: log.retry_count,
      })
      .eq('id', logId)
  } else {
    const nextRetry = log.retry_count + 1
    const update: any = { retry_count: nextRetry }
    
    if (nextRetry >= MAX_RETRIES) {
      update.status = 'failed'
    }

    await supabase
      .from('email_logs')
      .update(update)
      .eq('id', logId)

    if (nextRetry < MAX_RETRIES) {
      const delay = RETRY_DELAYS[nextRetry - 1] || 900000
      setTimeout(() => attemptSend(logId), delay)
    }
  }
}

export async function getPendingEmails(): Promise<EmailLogRow[]> {
  const { data } = await supabase
    .from('email_logs')
    .select('*')
    .eq('status', 'pending')
    .lt('retry_count', MAX_RETRIES)
    .order('created_at', { ascending: true })

  return (data as EmailLogRow[]) || []
}

export async function retryFailedEmails(): Promise<void> {
  const { data: failed } = await supabase
    .from('email_logs')
    .select('*')
    .eq('status', 'failed')
    .lt('retry_count', MAX_RETRIES)
    .order('created_at', { ascending: true })
    .limit(50)

  for (const log of (failed as EmailLogRow[]) || []) {
    await attemptSend(log.id!)
  }
}

async function logEmail(payload: Partial<EmailPayload> & { status: string; error_message?: string; retry_count: number }): Promise<void> {
  const log: EmailLogRow = {
    recipient_email: payload.to,
    recipient_name: payload.recipientName,
    subject: payload.subject || '',
    template: payload.template || 'welcome_user',
    status: payload.status as any,
    error_message: payload.error_message,
    related_type: payload.relatedType,
    related_id: payload.relatedId,
    retry_count: payload.retry_count,
  }

  const { data: user } = await supabase.auth.getUser()
  if (user.user) {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('user_id', user.user.id)
      .single()
    log.sent_by = roleData?.user_id
  }

  await supabase.from('email_logs').insert(log)
}

function renderTemplate(template: EmailTemplate, data: Record<string, any>): string {
  const orgName = data.orgName || 'Visitor Management System'
  const orgEmail = data.orgEmail || 'support@visitor-management.local'
  const orgPhone = data.orgPhone || ''
  const orgAddress = data.orgAddress || ''
  const year = new Date().getFullYear()

  const baseStyles = `
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .header { background-color: #2563eb; padding: 24px; text-align: center; }
      .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
      .content { padding: 32px 24px; }
      .footer { background-color: #f9fafb; padding: 16px 24px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
      .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; }
      .info-box { background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 16px 0; border-radius: 4px; }
      .warning-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 4px; }
      .danger-box { background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0; border-radius: 4px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
      th { background-color: #f9fafb; font-weight: 500; }
    </style>
  `

  const header = `
    <div class="header">
      <h1>${orgName}</h1>
    </div>
  `

  const footer = `
    <div class="footer">
      <p>${orgName} | ${orgAddress} | ${orgPhone} | ${orgEmail}</p>
      <p style="margin-top: 8px;">© ${year} ${orgName}. All rights reserved.</p>
      <p style="margin-top: 4px;">This is an automated message. Please do not reply to this email.</p>
    </div>
  `

  const content = getTemplateContent(template, data, orgName)

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        ${header}
        <div class="content">
          ${content}
        </div>
        ${footer}
      </div>
    </body>
    </html>
  `
}

function getTemplateContent(template: EmailTemplate, data: Record<string, any>, orgName: string): string {
  const visitorName = data.visitorName || 'Visitor'
  const hostName = data.hostName || 'Host'
  const purpose = data.purpose || 'Visit'
  const date = data.date || new Date().toLocaleDateString()
  const time = data.time || new Date().toLocaleTimeString()
  const badgeNumber = data.badgeNumber || 'N/A'
  const location = data.location || 'Reception'

  switch (template) {
    case 'appointment_created':
      return `
        <h2 style="margin-top: 0;">Appointment Created</h2>
        <p>Dear ${visitorName},</p>
        <p>Your appointment has been created successfully.</p>
        <div class="info-box">
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
          <p><strong>Host:</strong> ${hostName}</p>
          <p><strong>Purpose:</strong> ${purpose}</p>
          <p><strong>Location:</strong> ${location}</p>
        </div>
        <p>Please arrive 10 minutes before your scheduled time.</p>
      `

    case 'appointment_approved':
      return `
        <h2 style="margin-top: 0;">Appointment Approved</h2>
        <p>Dear ${visitorName},</p>
        <p>Your appointment has been approved.</p>
        <div class="info-box">
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
          <p><strong>Host:</strong> ${hostName}</p>
          <p><strong>Purpose:</strong> ${purpose}</p>
          <p><strong>Location:</strong> ${location}</p>
        </div>
        <p>We look forward to seeing you.</p>
      `

    case 'appointment_rejected':
      return `
        <h2 style="margin-top: 0;">Appointment Update</h2>
        <p>Dear ${visitorName},</p>
        <p>We regret to inform you that your appointment could not be approved at this time.</p>
        <div class="warning-box">
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Host:</strong> ${hostName}</p>
          <p><strong>Purpose:</strong> ${purpose}</p>
        </div>
        <p>Please contact us to reschedule or for further assistance.</p>
      `

    case 'appointment_cancelled':
      return `
        <h2 style="margin-top: 0;">Appointment Cancelled</h2>
        <p>Dear ${visitorName},</p>
        <p>Your appointment has been cancelled.</p>
        <div class="warning-box">
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Host:</strong> ${hostName}</p>
          <p><strong>Purpose:</strong> ${purpose}</p>
        </div>
        <p>If you did not request this cancellation, please contact us immediately.</p>
      `

    case 'appointment_rescheduled':
      return `
        <h2 style="margin-top: 0;">Appointment Rescheduled</h2>
        <p>Dear ${visitorName},</p>
        <p>Your appointment has been rescheduled.</p>
        <div class="info-box">
          <p><strong>New Date:</strong> ${date}</p>
          <p><strong>New Time:</strong> ${time}</p>
          <p><strong>Host:</strong> ${hostName}</p>
          <p><strong>Purpose:</strong> ${purpose}</p>
        </div>
      `

    case 'visitor_checked_in':
      return `
        <h2 style="margin-top: 0;">Visitor Checked In</h2>
        <p>Dear ${visitorName},</p>
        <p>You have successfully checked in at ${orgName}.</p>
        <div class="info-box">
          <p><strong>Check-in Time:</strong> ${time}</p>
          <p><strong>Host:</strong> ${hostName}</p>
          <p><strong>Purpose:</strong> ${purpose}</p>
          <p><strong>Badge Number:</strong> ${badgeNumber}</p>
        </div>
        <p>Please proceed to ${location}.</p>
      `

    case 'visitor_checked_out':
      return `
        <h2 style="margin-top: 0;">Visit Completed</h2>
        <p>Dear ${visitorName},</p>
        <p>Your visit has been completed. Thank you for visiting ${orgName}.</p>
        <div class="info-box">
          <p><strong>Check-out Time:</strong> ${time}</p>
          <p><strong>Duration:</strong> ${data.duration || 'N/A'}</p>
          <p><strong>Host:</strong> ${hostName}</p>
        </div>
        <p>We hope to see you again soon.</p>
      `

    case 'visitor_arrival':
      return `
        <h2 style="margin-top: 0;">Visitor Arrived</h2>
        <p>Dear ${hostName},</p>
        <p>A visitor has arrived to see you.</p>
        <div class="info-box">
          <p><strong>Visitor:</strong> ${visitorName}</p>
          <p><strong>Organization:</strong> ${data.organization || 'N/A'}</p>
          <p><strong>Purpose:</strong> ${purpose}</p>
          <p><strong>Badge Number:</strong> ${badgeNumber}</p>
          <p><strong>Time:</strong> ${time}</p>
          <p><strong>Location:</strong> ${location}</p>
        </div>
      `

    case 'qr_badge':
      return `
        <h2 style="margin-top: 0;">Your Visitor Badge</h2>
        <p>Dear ${visitorName},</p>
        <p>Your visitor badge has been generated. Please present the QR code at the reception.</p>
        <div class="info-box" style="text-align: center;">
          <img src="${data.qrCodeUrl || '#'}" alt="QR Badge" style="max-width: 200px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px;" />
          <p style="margin-top: 8px;"><strong>Badge Number:</strong> ${badgeNumber}</p>
          <p><strong>Host:</strong> ${hostName}</p>
          <p><strong>Office:</strong> ${location}</p>
        </div>
      `

    case 'visitor_reminder':
      return `
        <h2 style="margin-top: 0;">Appointment Reminder</h2>
        <p>Dear ${visitorName},</p>
        <p>This is a reminder about your upcoming appointment.</p>
        <div class="info-box">
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
          <p><strong>Host:</strong> ${hostName}</p>
          <p><strong>Purpose:</strong> ${purpose}</p>
          <p><strong>Location:</strong> ${location}</p>
        </div>
      `

    case 'host_reminder':
      return `
        <h2 style="margin-top: 0;">Visitor Appointment Reminder</h2>
        <p>Dear ${hostName},</p>
        <p>You have an upcoming visitor appointment.</p>
        <div class="info-box">
          <p><strong>Visitor:</strong> ${visitorName}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Expected Time:</strong> ${time}</p>
          <p><strong>Purpose:</strong> ${purpose}</p>
        </div>
      `

    case 'emergency_broadcast':
      return `
        <h2 style="margin-top: 0; color: #dc2626;">EMERGENCY: ${data.emergencyType || 'Alert'}</h2>
        <div class="danger-box">
          <p><strong>Message:</strong> ${data.message || 'Please follow emergency procedures immediately.'}</p>
          ${data.instructions ? `<p><strong>Instructions:</strong> ${data.instructions}</p>` : ''}
          <p><strong>Issued at:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>Please proceed to the nearest emergency exit and assemble at the designated meeting point.</p>
      `

    case 'password_reset':
      return `
        <h2 style="margin-top: 0;">Password Reset Request</h2>
        <p>Dear ${visitorName},</p>
        <p>We received a request to reset your password.</p>
        <div class="info-box">
          <p>Click the button below to reset your password:</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${data.resetUrl || '#'}" class="button">Reset Password</a>
          </p>
          <p style="font-size: 12px; color: #6b7280;">This link will expire in 1 hour.</p>
        </div>
        <p>If you did not request this, please ignore this email.</p>
      `

    case 'account_created':
      return `
        <h2 style="margin-top: 0;">Account Created</h2>
        <p>Dear ${visitorName},</p>
        <p>Your account has been created in ${orgName}.</p>
        <div class="info-box">
          <p><strong>Email:</strong> ${data.email || 'N/A'}</p>
          <p><strong>Role:</strong> ${data.role || 'User'}</p>
        </div>
        <p>Please log in using your credentials.</p>
      `

    case 'welcome_user':
      return `
        <h2 style="margin-top: 0;">Welcome to ${orgName}</h2>
        <p>Dear ${visitorName},</p>
        <p>Welcome to ${orgName}! We are excited to have you with us.</p>
        <div class="info-box">
          <p>If you have any questions, please contact us at ${orgEmail} or ${orgPhone}.</p>
        </div>
      `

    default:
      return `<h2 style="margin-top: 0;">${template.replace(/_/g, ' ').toUpperCase()}</h2><p>${data.message || 'Notification from ' + orgName}</p>`
  }
}
