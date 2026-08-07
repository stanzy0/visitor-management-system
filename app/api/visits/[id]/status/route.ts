import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateVisitQRCode } from '@/lib/qrcode'
import { createVisitStatusNotification, getVisitDetails } from '@/lib/server/notifications'
import { logAuditAction } from '@/lib/server/audit'
import type { Visit } from '@/lib/types/visit'

export async function POST(request: NextRequest) {
  const authResult = await requireRole(['Admin', 'Receptionist', 'Security'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, message: 'Visit ID required', error: '' }, { status: 400 })
    }

    const body = await request.json()
    const { status, visitorName: clientVisitorName, hostName: clientHostName, hostUserId: clientHostUserId } = body
    const newStatus = status || 'approved'

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: 'Service role key not configured', error: '' }, { status: 500 })
    }

    const updates: Record<string, unknown> = { status: newStatus }
    const currentTime = new Date().toISOString()
    if (newStatus === 'checked_in') updates.check_in_time = currentTime
    if (newStatus === 'checked_out') updates.check_out_time = currentTime

    const { data: updatedVisit, error } = await supabaseAdmin
      .from('visits')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        visitor:visitors!inner(full_name, visitor_organization),
        employee:employees(full_name, user_id)
      `)
      .single()

    if (error) {
      return NextResponse.json({ success: false, message: error.message, error: 'Update failed' }, { status: 500 })
    }

    if (!updatedVisit) {
      return NextResponse.json({ success: false, message: 'Visit not found', error: '' }, { status: 404 })
    }

    const visitorName = updatedVisit.visitor?.full_name || clientVisitorName || 'Unknown Visitor'
    const hostName = updatedVisit.employee?.full_name || clientHostName || 'Unknown Host'
    const hostUserId = updatedVisit.employee?.user_id || clientHostUserId || null

    await logAuditAction('Visit Status Changed', 'visit', id, `${visitorName}'s visit ${newStatus}`)

    if (newStatus === 'approved') {
      const qrCodeDataUrl = await generateVisitQRCode(id)
      await supabaseAdmin.from('visits').update({ qr_code: qrCodeDataUrl }).eq('id', id)
    }

    const displayTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    await createVisitStatusNotification(
      newStatus,
      visitorName,
      hostName,
      id,
      hostUserId,
      newStatus === 'checked_in' ? displayTime : null
    )

    return NextResponse.json({ success: true, data: updatedVisit })
  } catch (err) {
    console.error('Visit status update error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
