import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import {
  getBackups,
  createBackup,
  deleteBackup,
  getDeployments,
  rollbackDeployment,
  getMaintenanceMode,
  setMaintenanceMode,
  getSystemInfo,
  saveSystemInfo,
  getConfigurationSnapshots,
  createConfigurationSnapshot,
  runHealthCheck,
} from '@/lib/server/deployment'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section') || 'dashboard'

    switch (section) {
      case 'dashboard': {
        const [backups, deployments, maintenance, systemInfo] = await Promise.all([
          getBackups(5),
          getDeployments(5),
          getMaintenanceMode(),
          getSystemInfo(),
        ])
        return NextResponse.json({ success: true, data: { backups, deployments, maintenance, systemInfo } })
      }
      case 'backups': {
        const backups = await getBackups(parseInt(searchParams.get('limit') || '50'))
        return NextResponse.json({ success: true, data: backups })
      }
      case 'deployments': {
        const deployments = await getDeployments(parseInt(searchParams.get('limit') || '50'))
        return NextResponse.json({ success: true, data: deployments })
      }
      case 'maintenance': {
        const maintenance = await getMaintenanceMode()
        return NextResponse.json({ success: true, data: maintenance })
      }
      case 'system-info': {
        const systemInfo = await getSystemInfo()
        return NextResponse.json({ success: true, data: systemInfo })
      }
      case 'configuration': {
        const snapshots = await getConfigurationSnapshots()
        return NextResponse.json({ success: true, data: snapshots })
      }
      default:
        return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
    }
  } catch (err) {
    console.error('Deployment fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'create_backup': {
        const { backup_type } = body
        if (!backup_type) {
          return NextResponse.json({ error: 'backup_type is required' }, { status: 400 })
        }
        const backup = await createBackup(backup_type, authResult.userEmail || null)
        return NextResponse.json({ success: !!backup, data: backup })
      }
      case 'delete_backup': {
        const { backup_id } = body
        if (!backup_id) {
          return NextResponse.json({ error: 'backup_id is required' }, { status: 400 })
        }
        const success = await deleteBackup(backup_id)
        return NextResponse.json({ success })
      }
      case 'rollback': {
        const { deployment_id } = body
        if (!deployment_id) {
          return NextResponse.json({ error: 'deployment_id is required' }, { status: 400 })
        }
        const success = await rollbackDeployment(deployment_id)
        return NextResponse.json({ success })
      }
      case 'set_maintenance': {
        const { enabled, message } = body
        const success = await setMaintenanceMode(enabled, message || null, authResult.userEmail || null)
        return NextResponse.json({ success })
      }
      case 'export_configuration': {
        const { name, configuration } = body
        if (!name || !configuration) {
          return NextResponse.json({ error: 'name and configuration are required' }, { status: 400 })
        }
        const snapshot = await createConfigurationSnapshot(name, configuration, authResult.userEmail || null)
        return NextResponse.json({ success: !!snapshot, data: snapshot })
      }
      case 'run_health_check': {
        const checks = await runHealthCheck()
        const passed = checks.filter(c => c.status === 'healthy').length
        const total = checks.length
        return NextResponse.json({ success: true, data: { checks, passed, total, score: total > 0 ? Math.round((passed / total) * 100) : 0 } })
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (err) {
    console.error('Deployment action error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
