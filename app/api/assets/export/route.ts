import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { getPropertyItems } from '@/lib/server/property'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['Admin', 'Receptionist', 'Security'])
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'
    const visitId = searchParams.get('visitId') || undefined
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined

    const items = await getPropertyItems({ visitId, status, search })

    if (format === 'csv') {
      const headers = ['Property Number', 'Name', 'Category', 'Brand', 'Model', 'Serial Number', 'Color', 'Quantity', 'Condition', 'Status', 'Visitor', 'Employee', 'Remarks', 'Created At']
      const rows = [headers.join(',')]
      items.forEach((item) => {
        rows.push([
          item.property_number,
          item.name,
          item.category,
          item.brand || '',
          item.model || '',
          item.serial_number || '',
          item.color || '',
          item.quantity.toString(),
          item.condition,
          item.status,
          item.visitor?.full_name || '',
          item.employee?.full_name || '',
          item.remarks || '',
          item.created_at,
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      })
      const csv = rows.join('\n')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="property-items-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    return NextResponse.json({ success: true, data: items })
  } catch (err) {
    console.error('Export property items error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
  }
}
