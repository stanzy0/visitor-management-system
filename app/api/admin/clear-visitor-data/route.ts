import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAuditAction } from '@/lib/server/audit'

const VISITOR_ACTIVITY_TABLES = [
  'badge_scan_logs',
  'badge_history',
  'visitor_invitations',
  'visitor_badges',
  'property_history',
  'property_items',
  'document_verifications',
  'visitor_documents',
  'visitor_portal_tokens',
  'lifecycle_events',
  'incident_timeline',
  'incidents',
  'gate_activities',
  'security_decisions',
  'security_alerts',
  'roll_call_entries',
  'emergency_sessions',
  'vehicles',
  'vehicle_blacklist',
  'visitor_watchlist',
  'watchlist',
  'visits',
  'visitors',
]

const STORAGE_BUCKETS = ['visitor-documents', 'visitor-photos']

function logDiagnostic(message: string, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    component: 'CLEAR-VISITOR-DATA',
    ...data,
  }
  console.log(`[${entry.component}] ${message}`, JSON.stringify(entry))
}

async function countTable(table: string): Promise<number> {
  const start = Date.now()
  try {
    const { count, error } = await supabaseAdmin.from(table).select('*', { count: 'exact', head: true })
    if (error) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205') {
        logDiagnostic(`COUNT SKIPPED (table not found): ${table}`, {
          table,
          elapsedMs: Date.now() - start,
          errorCode: error.code,
          errorMessage: error.message,
        })
        return 0
      }
      logDiagnostic(`COUNT FAILED: ${table}`, {
        table,
        elapsedMs: Date.now() - start,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
      })
      throw error
    }
    logDiagnostic(`COUNT SUCCESS: ${table}`, { table, count, elapsedMs: Date.now() - start })
    return count || 0
  } catch (err: any) {
    if (err?.code === 'PGRST204' || err?.code === 'PGRST205') {
      logDiagnostic(`COUNT EXCEPTION (table not found): ${table}`, {
        table,
        elapsedMs: Date.now() - start,
        error: err?.message || String(err),
        code: err?.code,
      })
      return 0
    }
    logDiagnostic(`COUNT EXCEPTION: ${table}`, {
      table,
      elapsedMs: Date.now() - start,
      error: err?.message || String(err),
      code: err?.code,
    })
    throw err
  }
}

async function deleteAllFrom(table: string): Promise<number> {
  const start = Date.now()
  try {
    const { count, error } = await supabaseAdmin.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205') {
        logDiagnostic(`DELETE SKIPPED (table not found): ${table}`, {
          table,
          elapsedMs: Date.now() - start,
          errorCode: error.code,
          errorMessage: error.message,
        })
        return 0
      }
      logDiagnostic(`DELETE FAILED: ${table}`, {
        table,
        elapsedMs: Date.now() - start,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
      })
      throw error
    }
    logDiagnostic(`DELETE SUCCESS: ${table}`, { table, count, elapsedMs: Date.now() - start })
    return count || 0
  } catch (err: any) {
    if (err?.code === 'PGRST204' || err?.code === 'PGRST205') {
      logDiagnostic(`DELETE EXCEPTION (table not found): ${table}`, {
        table,
        elapsedMs: Date.now() - start,
        error: err?.message || String(err),
        code: err?.code,
      })
      return 0
    }
    logDiagnostic(`DELETE EXCEPTION: ${table}`, {
      table,
      elapsedMs: Date.now() - start,
      error: err?.message || String(err),
      code: err?.code,
    })
    throw err
  }
}

async function listStorageFiles(bucket: string, prefix = ''): Promise<string[]> {
  const allFiles: string[] = []
  const stack = [prefix]

  while (stack.length > 0) {
    const currentPrefix = stack.pop() as string
    const start = Date.now()
    try {
      const { data, error } = await supabaseAdmin.storage.from(bucket).list(currentPrefix, { limit: 1000 })
      if (error) {
        logDiagnostic(`STORAGE LIST FAILED: ${bucket}`, {
          bucket,
          prefix: currentPrefix,
          elapsedMs: Date.now() - start,
          errorMessage: error.message,
        })
        continue
      }
      logDiagnostic(`STORAGE LIST: ${bucket}`, {
        bucket,
        prefix: currentPrefix,
        itemCount: data?.length || 0,
        elapsedMs: Date.now() - start,
      })

      if (!data || data.length === 0) continue

      for (const item of data) {
        const path = currentPrefix ? `${currentPrefix}/${item.name}` : item.name
        if (item.name.endsWith('/')) {
          stack.push(path)
        } else {
          allFiles.push(path)
        }
      }
    } catch (err: any) {
      logDiagnostic(`STORAGE LIST EXCEPTION: ${bucket}`, {
        bucket,
        prefix: currentPrefix,
        elapsedMs: Date.now() - start,
        error: err?.message || String(err),
      })
    }
  }

  return allFiles
}

async function clearStorageBucket(bucket: string): Promise<number> {
  const start = Date.now()
  logDiagnostic(`STORAGE CLEAR START: ${bucket}`, { bucket })
  try {
    const files = await listStorageBucket(bucket)
    if (files.length === 0) {
      logDiagnostic(`STORAGE CLEAR EMPTY: ${bucket}`, { bucket, elapsedMs: Date.now() - start })
      return 0
    }

    const batchSize = 100
    let deleted = 0

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize)
      const batchStart = Date.now()
      try {
        const { error } = await supabaseAdmin.storage.from(bucket).remove(batch)
        if (error) {
          logDiagnostic(`STORAGE REMOVE FAILED: ${bucket}`, {
            bucket,
            batchSize: batch.length,
            elapsedMs: Date.now() - batchStart,
            errorMessage: error.message,
          })
        } else {
          deleted += batch.length
          logDiagnostic(`STORAGE REMOVE SUCCESS: ${bucket}`, {
            bucket,
            batchSize: batch.length,
            elapsedMs: Date.now() - batchStart,
          })
        }
      } catch (err: any) {
        logDiagnostic(`STORAGE REMOVE EXCEPTION: ${bucket}`, {
          bucket,
          batchSize: batch.length,
          elapsedMs: Date.now() - batchStart,
          error: err?.message || String(err),
        })
      }
    }

    logDiagnostic(`STORAGE CLEAR DONE: ${bucket}`, { bucket, deleted, total: files.length, elapsedMs: Date.now() - start })
    return deleted
  } catch (err: any) {
    logDiagnostic(`STORAGE CLEAR EXCEPTION: ${bucket}`, {
      bucket,
      elapsedMs: Date.now() - start,
      error: err?.message || String(err),
    })
    throw err
  }
}

// Alias for backward compatibility with existing code
async function listStorageBucket(bucket: string): Promise<string[]> {
  return listStorageFiles(bucket)
}

export async function POST(request: NextRequest) {
  const requestStart = Date.now()
  logDiagnostic('REQUEST START', { method: request.method, url: request.url })

  try {
    const adminResult = await requireAdmin()
    logDiagnostic('AUTH CHECK', { authorized: adminResult.authorized, status: adminResult.status })
    if (!adminResult.authorized) {
      return NextResponse.json({ success: false, message: adminResult.error, error: adminResult.error }, { status: adminResult.status })
    }

    const counts: Record<string, number> = {}

    logDiagnostic('COUNT PHASE START')
    for (const table of VISITOR_ACTIVITY_TABLES) {
      counts[table] = await countTable(table)
    }
    logDiagnostic('COUNT PHASE DONE', { totalElapsedMs: Date.now() - requestStart })

    const visitorIds = new Set<string>()
    const { data: visitorRows } = await supabaseAdmin.from('visitors').select('id')
    visitorRows?.forEach((v: { id: string }) => visitorIds.add(v.id))
    counts.visitor_id_count = visitorIds.size
    logDiagnostic('VISITOR IDS FETCHED', { count: visitorIds.size })

    logDiagnostic('STORAGE CLEANUP START')
    for (const bucket of STORAGE_BUCKETS) {
      counts[`storage_${bucket}`] = await clearStorageBucket(bucket)
    }
    logDiagnostic('STORAGE CLEANUP DONE', { totalElapsedMs: Date.now() - requestStart })

    logDiagnostic('DELETE PHASE START')
    for (const table of VISITOR_ACTIVITY_TABLES) {
      await deleteAllFrom(table)
    }
    logDiagnostic('DELETE PHASE DONE', { totalElapsedMs: Date.now() - requestStart })

    logDiagnostic('NOTIFICATIONS CLEANUP START')
    const { data: visitorNotifications } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .or(
        'type.eq.visitor,' +
        'type.eq.watchlist_match,' +
        'type.eq.watchlist_added,' +
        'type.eq.watchlist_updated,' +
        'type.eq.watchlist_override,' +
        'title.ilike.%Visitor%,' +
        'title.ilike.%Visit%,' +
        'title.ilike.%Registration%,' +
        'title.ilike.%Badge%,' +
        'title.ilike.%Check In%,' +
        'title.ilike.%Check Out%,' +
        'title.ilike.%Approval%,' +
        'title.ilike.%Rejection%,' +
        'title.ilike.%Document%,' +
        'title.ilike.%QR%,' +
        'title.ilike.%Gate%,' +
        'title.ilike.%Invitation%,' +
        'title.ilike.%PA to%,' +
        'message.ilike.%Visitor%,' +
        'message.ilike.%Visit%,' +
        'message.ilike.%Registration%,' +
        'message.ilike.%Badge%'
      )

    const notificationIds = (visitorNotifications || []).map((n: { id: string }) => n.id)
    counts.notifications = notificationIds.length
    logDiagnostic('NOTIFICATIONS SELECTED', { count: notificationIds.length })

    if (notificationIds.length > 0) {
      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .delete()
        .in('id', notificationIds)

      if (notifError) {
        logDiagnostic('NOTIFICATIONS DELETE FAILED', { error: notifError.message, code: notifError.code })
      } else {
        logDiagnostic('NOTIFICATIONS DELETE SUCCESS', { count: notificationIds.length })
      }
    }
    logDiagnostic('NOTIFICATIONS CLEANUP DONE')

    logDiagnostic('EMAIL LOGS CLEANUP START')
    const { data: emailLogs } = await supabaseAdmin
      .from('email_logs')
      .select('id')
      .or(
        'related_type.eq.visitor,' +
        'related_type.eq.visit,' +
        'related_type.eq.visitor_document,' +
        'related_type.eq.visitor_badge,' +
        'related_type.eq.visitor_invitation,' +
        'related_type.eq.vehicle'
      )

    const emailLogIds = (emailLogs || []).map((l: { id: string }) => l.id)
    counts.email_logs = emailLogIds.length
    logDiagnostic('EMAIL LOGS SELECTED', { count: emailLogIds.length })

    if (emailLogIds.length > 0) {
      const { error: emailError } = await supabaseAdmin
        .from('email_logs')
        .delete()
        .in('id', emailLogIds)

      if (emailError) {
        logDiagnostic('EMAIL LOGS DELETE FAILED', { error: emailError.message, code: emailError.code })
      } else {
        logDiagnostic('EMAIL LOGS DELETE SUCCESS', { count: emailLogIds.length })
      }
    }
    logDiagnostic('EMAIL LOGS CLEANUP DONE')

    await logAuditAction(
      'All Visitor & Operational Data Cleared',
      'system',
      null,
      `Admin ${adminResult.userEmail} cleared visitor data. ` +
        `Visitors: ${counts.visitors || 0}, Visits: ${counts.visits || 0}, ` +
        `Badges: ${counts.visitor_badges || 0}, Notifications: ${counts.notifications || 0}, ` +
        `Email Logs: ${counts.email_logs || 0}`
    )

    logDiagnostic('REQUEST COMPLETE', { totalElapsedMs: Date.now() - requestStart })

    return NextResponse.json({
      success: true,
      data: {
        cleared: counts,
        message: 'Visitor and operational data cleared successfully',
      },
    })
  } catch (err: any) {
    logDiagnostic('REQUEST FAILED', {
      totalElapsedMs: Date.now() - requestStart,
      error: err?.message || String(err),
      code: err?.code,
      details: err?.details,
      hint: err?.hint,
    })
    return NextResponse.json({ success: false, message: 'Visitor data could not be cleared.', error: 'A database operation failed.' }, { status: 500 })
  }
}
