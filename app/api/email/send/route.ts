import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { sendEmail } from '@/lib/server/email'
import type { EmailTemplate } from '@/lib/email/types'

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { to, recipientName, subject, template, data, relatedType, relatedId } = body

    if (!to || !subject || !template) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    const result = await sendEmail({
      to,
      recipientName,
      subject,
      template: template as EmailTemplate,
      data: data || {},
      relatedType,
      relatedId,
    })

    return NextResponse.json({ success: result.success, error: result.success ? undefined : result.error })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
  }
}