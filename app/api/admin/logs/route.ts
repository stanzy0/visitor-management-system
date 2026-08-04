import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { getSystemLogs } from '@/lib/server/admin'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level') || undefined
    const category = searchParams.get('category') || undefined
    const search = searchParams.get('search') || undefined

    const logs = await getSystemLogs({ level, category, search })

    if (searchParams.get('export') === 'csv') {
      const csvRows = [
        ['ID', 'Level', 'Category', 'Message', 'Details', 'Source', 'Created At'],
        ...logs.map((log) => [
          log.id,
          log.level,
          log.category,
          log.message,
          log.details || '',
          log.source || '',
          log.created_at,
        ]),
      ]

      const csvContent = csvRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')

      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=system-logs-${new Date().toISOString().split('T')[0]}.csv`,
        },
      })
    }

    return NextResponse.json({ success: true, data: logs })
  } catch (err) {
    console.error('Fetch logs error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
  }
}
