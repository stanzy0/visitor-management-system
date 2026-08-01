import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const APP_VERSION = process.env.APP_VERSION || '1.0.0'

interface HealthCheck {
  database: boolean
  storage: boolean
  email: boolean
  environment: boolean
  timestamp: string
  version: string
  details?: Record<string, unknown>
}

export async function GET(request: NextRequest) {
  const health: HealthCheck = {
    database: false,
    storage: false,
    email: false,
    environment: false,
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
  }

  const details: Record<string, unknown> = {}

  const requiredEnvVars = [
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]
  const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key])
  health.environment = missingEnvVars.length === 0
  details.environment = {
    valid: health.environment,
    missing: missingEnvVars,
  }

  if (supabaseAdmin) {
    try {
      const { error: dbError } = await supabaseAdmin
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .limit(1)
      health.database = !dbError
      details.database = {
        connected: health.database,
        error: dbError?.message || null,
      }
    } catch (err) {
      health.database = false
      details.database = { connected: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }

    try {
      const { data: buckets, error: storageError } = await supabaseAdmin.storage.listBuckets()
      health.storage = !storageError && Array.isArray(buckets)
      details.storage = {
        accessible: health.storage,
        bucket_count: buckets?.length || 0,
        error: storageError?.message || null,
      }
    } catch (err) {
      health.storage = false
      details.storage = { accessible: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  } else {
    details.database = { connected: false, error: 'supabaseAdmin not initialized' }
    details.storage = { accessible: false, error: 'supabaseAdmin not initialized' }
  }

  const hasResendKey = !!process.env.RESEND_API_KEY
  health.email = hasResendKey
  details.email = {
    configured: health.email,
  }

  const allHealthy = health.database && health.storage && health.email && health.environment

  return NextResponse.json(
    {
      ...health,
      details,
    },
    { status: allHealthy ? 200 : 503 }
  )
}
