import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateVisitQRCode } from '@/lib/qrcode'
import { createVisitStatusNotification } from '@/lib/server/notifications'
import { logAuditAction } from '@/lib/server/audit'
import { sendEmail } from '@/lib/server/email'

export type VisitStatus = 'pending' | 'approved' | 'rejected' | 'checked_in' | 'checked_out'

export const VALID_TRANSITIONS: Record<VisitStatus, VisitStatus[]> = {
  pending: ['approved', 'rejected'],
  approved: ['checked_in'],
  checked_in: ['checked_out'],
  checked_out: [],
  rejected: [],
}

export function isValidTransition(from: VisitStatus, to: VisitStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export class InvalidTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid status transition: ${from} -> ${to}`)
    this.name = 'InvalidTransitionError'
  }
}

interface ApplyVisitStatusOptions {
  rejectionReason?: string | null
  auditAction?: string
  auditDetails?: string
}

/**
 * Single source of truth for changing a visit's status.
 *
 * - Validates the transition server-side against VALID_TRANSITIONS.
 * - Stores rejection_reason on rejection (no duplicate columns).
 * - Generates the visitor QR code and sends the approval email on approve.
 * - Emits the appropriate audit event and status notification.
 *
 * Authorization (role + host assignment) is performed by the caller before
 * invoking this helper.
 */
export async function applyVisitStatusChange(
  visitId: string,
  newStatus: VisitStatus,
  options: ApplyVisitStatusOptions = {}
): Promise<Record<string, unknown>> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const { data: current, error: fetchError } = await supabaseAdmin
    .from('visits')
    .select('status, visitor_id, employee_id')
    .eq('id', visitId)
    .single()

  if (fetchError || !current) {
    throw new Error('Visit not found')
  }

  const from = current.status as VisitStatus
  if (!isValidTransition(from, newStatus)) {
    throw new InvalidTransitionError(from, newStatus)
  }

  const updates: Record<string, unknown> = { status: newStatus }
  const now = new Date().toISOString()
  if (newStatus === 'checked_in') updates.check_in_time = now
  if (newStatus === 'checked_out') updates.check_out_time = now
  if (newStatus === 'rejected') updates.rejection_reason = options.rejectionReason ?? null

  const { data: updatedVisit, error: updateError } = await supabaseAdmin
    .from('visits')
    .update(updates)
    .eq('id', visitId)
    .select(`
      *,
      visitor:visitors!inner(full_name, email, visitor_organization),
      employee:employees(full_name, user_id, office_location)
    `)
    .single()

  if (updateError || !updatedVisit) {
    throw new Error(updateError?.message || 'Failed to update visit')
  }

  const visitorName = (updatedVisit.visitor as { full_name?: string } | null)?.full_name || 'Unknown Visitor'
  const hostName = (updatedVisit.employee as { full_name?: string } | null)?.full_name || 'Unknown Host'
  const hostUserId = (updatedVisit.employee as { user_id?: string } | null)?.user_id || null

  const auditAction = options.auditAction || 'Visit Status Changed'
  const auditDetails = options.auditDetails || `${visitorName}'s visit ${newStatus}`
  await logAuditAction(auditAction, 'visit', visitId, auditDetails)

  if (newStatus === 'approved') {
    try {
      const qrCodeDataUrl = await generateVisitQRCode(visitId)
      await supabaseAdmin.from('visits').update({ qr_code: qrCodeDataUrl }).eq('id', visitId)
      updatedVisit.qr_code = qrCodeDataUrl
    } catch (err) {
      console.error('Approval QR generation failed:', err)
    }

    const visitorEmail = (updatedVisit.visitor as { email?: string } | null)?.email || ''
    if (visitorEmail) {
      try {
        await sendEmail({
          to: visitorEmail,
          recipientName: visitorName,
          subject: `Registration Approved - ${updatedVisit.registration_number || visitId}`,
          template: 'registration_approved',
          data: {
            visitorName,
            registrationNumber: updatedVisit.registration_number || '',
            date: (updatedVisit.visit_date as string | undefined) || now.split('T')[0],
            arrivalTime: (updatedVisit.arrival_time as string | undefined) || 'TBD',
            hostName,
            location: (updatedVisit.employee as { office_location?: string } | null)?.office_location || 'Reception',
            badgeNumber: 'N/A',
            qrCodeUrl: updatedVisit.qr_code || '',
          },
          relatedType: 'visit',
          relatedId: visitId,
        })
      } catch (err) {
        console.error('Approval email failed:', err)
      }
    }
  }

  const displayTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  await createVisitStatusNotification(
    newStatus,
    visitorName,
    hostName,
    visitId,
    hostUserId,
    newStatus === 'checked_in' ? displayTime : null
  )

  return updatedVisit as Record<string, unknown>
}
