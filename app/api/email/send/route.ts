import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { queueEmail } from '@/lib/email'

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

    await queueEmail({
      to,
      recipientName,
      subject,
      template,
      data: data || {},
      relatedType,
      relatedId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error queuing email:', error)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
  }
}
