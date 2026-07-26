import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { processExpiredVisits } from '@/lib/server/lifecycle'

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const results = await processExpiredVisits()
    return NextResponse.json({ success: true, data: results, count: results.length })
  } catch (err) {
    console.error('Expired visits processing error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to process expired visits' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const results = await processExpiredVisits()
    return NextResponse.json({ success: true, data: results, count: results.length })
  } catch (err) {
    console.error('Expired visits processing error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to process expired visits' }, { status: 500 })
  }
}
