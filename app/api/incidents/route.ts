import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getIncidents, createIncident } from '@/lib/server/incidents'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['Admin', 'Security', 'Operations', 'Receptionist', 'Commandant']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filters = {
      search: searchParams.get('search') || '',
      category: (searchParams.get('category') || 'all') as any,
      severity: (searchParams.get('severity') || 'all') as any,
      status: (searchParams.get('status') || 'all') as any,
      dateFrom: searchParams.get('dateFrom') || '',
      dateTo: searchParams.get('dateTo') || '',
      assignedTo: searchParams.get('assignedTo') || '',
    }

    const incidents = await getIncidents(filters)

    return NextResponse.json({ success: true, data: incidents })
  } catch (err) {
    console.error('Incidents fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['Admin', 'Security', 'Operations', 'Receptionist']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, category, severity, visitor_id, visit_id, employee_id, assigned_to, location } = body

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
    }

    const incident = await createIncident(
      {
        title,
        description,
        category: category || 'Other',
        severity: severity || 'Medium',
        status: 'Open',
        visitor_id: visitor_id || null,
        visit_id: visit_id || null,
        employee_id: employee_id || null,
        assigned_to: assigned_to || null,
        location: location || null,
      },
      user.id
    )

    return NextResponse.json({ success: true, data: incident }, { status: 201 })
  } catch (err) {
    console.error('Incident creation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
