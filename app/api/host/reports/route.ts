import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { getHostReport } from '@/lib/server/host'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['Host Employee', 'Admin'])
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const employeeId = request.headers.get('x-employee-id') || 'default'
    const { searchParams } = new URL(request.url)
    const range = (searchParams.get('range') as 'today' | '7days' | '30days') || '30days'
    const exportFormat = searchParams.get('export')

    const report = await getHostReport(employeeId, range)

    if (exportFormat === 'pdf') {
      const doc = new jsPDF()
      doc.setFontSize(18)
      doc.text('Host Visitor Report', 14, 15)
      doc.setFontSize(11)
      doc.text(`Range: ${range === 'today' ? 'Today' : range === '7days' ? 'Last 7 Days' : 'Last 30 Days'}`, 14, 22)

      const tableData = report.visitorHistory.map(v => [
        v.visitor_name,
        v.purpose,
        v.status,
        v.check_in_time ? new Date(v.check_in_time).toLocaleString() : '—',
        v.check_out_time ? new Date(v.check_out_time).toLocaleString() : '—',
      ])

      autoTable(doc, {
        startY: 28,
        head: [['Visitor', 'Purpose', 'Status', 'Check In', 'Check Out']],
        body: tableData,
      })

      const pdfBuffer = doc.output('arraybuffer')
      return new Response(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=host-report-${range}.pdf`,
        },
      })
    }

    if (exportFormat === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(
        report.visitorHistory.map(v => ({
          Visitor: v.visitor_name,
          Purpose: v.purpose,
          Status: v.status,
          'Check In': v.check_in_time ? new Date(v.check_in_time).toLocaleString() : '',
          'Check Out': v.check_out_time ? new Date(v.check_out_time).toLocaleString() : '',
        }))
      )
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Visitors')
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const buffer = Buffer.from(excelBuffer)

      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename=host-report-${range}.xlsx`,
        },
      })
    }

    return NextResponse.json({ success: true, data: report })
  } catch (err) {
    console.error('Host reports error:', err)
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }
}
