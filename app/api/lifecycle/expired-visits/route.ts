import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { processExpiredVisits } from '@/lib/server/lifecycle'

export async function POST(request: NextRequest) {
  const authResult = await requireRole(['Admin', 'Commandant', 'Director', 'Security', 'Operations'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const results = await processExpiredVisits()
    return NextResponse.json({ success: true, data: results, count: results.length })
  } catch (err) {
    console.error('Expired visits processing error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['Admin', 'Commandant', 'Director', 'Security', 'Operations'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const results = await processExpiredVisits()
    return NextResponse.json({ success: true, data: results, count: results.length })
  } catch (err) {
    console.error('Expired visits processing error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
