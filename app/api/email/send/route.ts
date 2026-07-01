import { NextResponse } from 'next/server'
import { queueEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { to, recipientName, subject, template, data, relatedType, relatedId } = body

    if (!to || !subject || !template) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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
    return NextResponse.json({ error: 'Failed to queue email' }, { status: 500 })
  }
}
