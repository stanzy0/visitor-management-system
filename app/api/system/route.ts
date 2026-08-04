import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import {
  getSystemKpis,
  getDatabaseHealth,
  getBackgroundJobs,
  getStorageMonitoring,
  getPerformanceMetrics,
  getSystemErrors,
  getSystemLogs,
  getSystemHealthScore,
  markErrorResolved,
  runJobNow,
  deleteOrphanedFiles,
} from '@/lib/server/system-monitoring'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section') || 'dashboard'

    switch (section) {
      case 'dashboard': {
        const [kpis, healthScore] = await Promise.all([
          getSystemKpis(),
          getSystemHealthScore(),
        ])
        return NextResponse.json({ success: true, data: { kpis, healthScore } })
      }
      case 'database': {
        const dbHealth = await getDatabaseHealth()
        return NextResponse.json({ success: true, data: dbHealth })
      }
      case 'jobs': {
        const jobs = await getBackgroundJobs()
        return NextResponse.json({ success: true, data: jobs })
      }
      case 'storage': {
        const storage = await getStorageMonitoring()
        return NextResponse.json({ success: true, data: storage })
      }
      case 'performance': {
        const metricName = searchParams.get('metric') || undefined
        const metrics = await getPerformanceMetrics(metricName)
        return NextResponse.json({ success: true, data: metrics })
      }
      case 'errors': {
        const resolved = searchParams.get('resolved')
        const errors = await getSystemErrors(resolved === 'true' ? true : resolved === 'false' ? false : undefined)
        return NextResponse.json({ success: true, data: errors })
      }
      case 'logs': {
        const module = searchParams.get('module') || undefined
        const severity = searchParams.get('severity') || undefined
        const user_email = searchParams.get('user_email') || undefined
        const date_from = searchParams.get('date_from') || undefined
        const date_to = searchParams.get('date_to') || undefined
        const action = searchParams.get('action') || undefined
        const limit = parseInt(searchParams.get('limit') || '100')
        const logs = await getSystemLogs({ module, severity, user_email, date_from, date_to, action, limit })
        return NextResponse.json({ success: true, data: logs })
      }
      default:
        return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }
  } catch (err) {
    console.error('System monitoring fetch error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'mark_error_resolved': {
        const { error_id } = body
        if (!error_id) {
          return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
        }
        const success = await markErrorResolved(error_id, null)
        return NextResponse.json({ success })
      }
      case 'run_job': {
        const { job_name } = body
        if (!job_name) {
          return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
        }
        const success = await runJobNow(job_name)
        return NextResponse.json({ success })
      }
      case 'delete_orphaned_files': {
        const { bucket_name } = body
        if (!bucket_name) {
          return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
        }
        const deleted = await deleteOrphanedFiles(bucket_name)
        return NextResponse.json({ success: true, deleted })
      }
      case 'export_report': {
        const { report_type } = body
        return NextResponse.json({ success: true, message: `${report_type} report exported` })
      }
      default:
        return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }
  } catch (err) {
    console.error('System monitoring action error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
