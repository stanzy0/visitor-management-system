import { createAdminNotification, createReceptionistNotification, createSecurityNotification, createHostNotification } from '@/lib/server/notification-service'
import { supabaseAdmin } from '@/lib/supabase-admin'

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'visitor' | 'appointment' | 'employee' | 'system' | 'watchlist_match' | 'watchlist_added' | 'watchlist_updated' | 'watchlist_override'

export async function createVisitStatusNotification(
  status: string,
  visitorName: string,
  hostName: string,
  visitId: string,
  hostUserId?: string | null,
  checkInTime?: string | null
) {
  const promises: Promise<unknown>[] = []

  if (status === 'approved') {
    if (hostUserId) {
      promises.push(
        createHostNotification(
          hostUserId,
          'Visitor Approved',
          `${visitorName}'s visit has been approved.`,
          'visitor',
          'visit',
          visitId
        )
      )
    }
    promises.push(
      createAdminNotification(
        'Visit Approved',
        `${visitorName}'s visit has been approved.`,
        'visitor',
        'visit',
        visitId
      )
    )
    promises.push(
      createReceptionistNotification(
        'Visit Approved',
        `${visitorName}'s visit has been approved.`,
        'visitor',
        'visit',
        visitId
      )
    )
  } else if (status === 'rejected') {
    if (hostUserId) {
      promises.push(
        createHostNotification(
          hostUserId,
          'Visitor Rejected',
          `${visitorName}'s visit has been rejected.`,
          'visitor',
          'visit',
          visitId
        )
      )
    }
    promises.push(
      createAdminNotification(
        'Visit Rejected',
        `${visitorName}'s visit has been rejected.`,
        'visitor',
        'visit',
        visitId
      )
    )
    promises.push(
      createReceptionistNotification(
        'Visit Rejected',
        `${visitorName}'s visit has been rejected.`,
        'visitor',
        'visit',
        visitId
      )
    )
  } else if (status === 'checked_in') {
    if (hostUserId) {
      promises.push(
        createHostNotification(
          hostUserId,
          'Visitor Arrived',
          `${visitorName} has checked in at ${checkInTime || ''}.`,
          'visitor',
          'visit',
          visitId
        )
      )
    }
    promises.push(
      createAdminNotification(
        'Visitor Checked In',
        `${visitorName} has checked in.`,
        'visitor',
        'visit',
        visitId
      )
    )
    promises.push(
      createReceptionistNotification(
        'Visitor Checked In',
        `${visitorName} has checked in.`,
        'visitor',
        'visit',
        visitId
      )
    )
    promises.push(
      createSecurityNotification(
        'Visitor Checked In',
        `${visitorName} has checked in.`,
        'visitor',
        'visit',
        visitId
      )
    )
  } else if (status === 'checked_out') {
    if (hostUserId) {
      promises.push(
        createHostNotification(
          hostUserId,
          'Visitor Checked Out',
          `${visitorName} has checked out at ${checkInTime || ''}.`,
          'visitor',
          'visit',
          visitId
        )
      )
    }
    promises.push(
      createAdminNotification(
        'Visitor Checked Out',
        `${visitorName} has checked out.`,
        'visitor',
        'visit',
        visitId
      )
    )
    promises.push(
      createReceptionistNotification(
        'Visitor Checked Out',
        `${visitorName} has checked out.`,
        'visitor',
        'visit',
        visitId
      )
    )
  }

  await Promise.all(promises)
}

export async function createAppointmentNotification(
  action: 'created' | 'updated' | 'cancelled',
  appointmentId: string,
  appointmentNumber: string,
  visitorName: string,
  hostName: string,
  hostUserId?: string | null
) {
  const promises: Promise<unknown>[] = []

  if (action === 'created') {
    promises.push(
      createAdminNotification(
        'Appointment Created',
        `Appointment scheduled for ${visitorName} with ${hostName}.`,
        'appointment',
        'appointment',
        appointmentId
      )
    )
    promises.push(
      createReceptionistNotification(
        'Appointment Created',
        `Appointment scheduled for ${visitorName} with ${hostName}.`,
        'appointment',
        'appointment',
        appointmentId
      )
    )
    if (hostUserId) {
      promises.push(
        createHostNotification(
          hostUserId,
          'Appointment Created',
          `Appointment scheduled for ${visitorName}.`,
          'appointment',
          'appointment',
          appointmentId
        )
      )
    }
  } else if (action === 'updated') {
    promises.push(
      createAdminNotification(
        'Appointment Updated',
        `Appointment ${appointmentNumber} has been updated.`,
        'appointment',
        'appointment',
        appointmentId
      )
    )
    promises.push(
      createReceptionistNotification(
        'Appointment Updated',
        `Appointment ${appointmentNumber} has been updated.`,
        'appointment',
        'appointment',
        appointmentId
      )
    )
  } else if (action === 'cancelled') {
    promises.push(
      createAdminNotification(
        'Appointment Cancelled',
        `Appointment ${appointmentNumber} for ${visitorName} has been cancelled.`,
        'appointment',
        'appointment',
        appointmentId
      )
    )
    promises.push(
      createReceptionistNotification(
        'Appointment Cancelled',
        `Appointment ${appointmentNumber} for ${visitorName} has been cancelled.`,
        'appointment',
        'appointment',
        appointmentId
      )
    )
  }

  await Promise.all(promises)
}

export async function createHostAssistanceNotification(
  visitId: string,
  hostName: string,
  visitorName: string
) {
  await createReceptionistNotification(
    'Host Requested Assistance',
    `${hostName || 'Host'} needs assistance with visitor ${visitorName || 'Unknown'}.`,
    'system',
    'visit',
    visitId
  )
}

export async function createOfficeLocationNotification(
  action: 'created' | 'updated',
  locationId: string,
  locationName: string
) {
  if (action === 'updated') {
    await createAdminNotification(
      'Office Location Updated',
      `Office location ${locationName} has been updated.`,
      'system',
      'office_location',
      locationId
    )
  } else {
    await createAdminNotification(
      'Office Location Created',
      `Office location ${locationName} has been created.`,
      'system',
      'office_location',
      locationId
    )
  }
}

export async function createVisitorDeletedNotification(
  visitorId: string,
  visitorName: string
) {
  await createAdminNotification(
    'Visitor Deleted',
    `Visitor ${visitorName || 'Unknown'} has been deleted.`,
    'visitor',
    'visitor',
    visitorId
  )
}

export async function createWatchlistOverrideNotification(
  visitorName: string
) {
  await createAdminNotification(
    'Watchlist Override Approved',
    `${visitorName || 'Visitor'} was registered despite being on the watchlist.`,
    'watchlist_override',
    'visitor_watchlist',
    undefined
  )
}

export async function getVisitDetails(visitId: string): Promise<{ visitorName: string; hostName: string; hostUserId: string | null } | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('visits')
    .select(`
      *,
      visitor:visitors!inner(full_name),
      employee:employees(full_name, user_id)
    `)
    .eq('id', visitId)
    .single()

  if (error || !data) {
    console.error('Failed to fetch visit details for notification:', error)
    return null
  }

  return {
    visitorName: data.visitor?.full_name || 'Unknown Visitor',
    hostName: data.employee?.full_name || 'Unknown Host',
    hostUserId: data.employee?.user_id || null,
  }
}

export async function getVisitorName(visitorId: string): Promise<string | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('visitors')
    .select('full_name')
    .eq('id', visitorId)
    .single()

  if (error || !data) {
    return null
  }

  return data.full_name || null
}

export async function getEmployeeUserId(employeeId: string): Promise<string | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('user_id')
    .eq('id', employeeId)
    .single()

  if (error || !data) {
    return null
  }

  return data.user_id || null
}
