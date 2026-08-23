'use client'

import { Eye, User, Building2, MapPin, Clock, Calendar } from 'lucide-react'

interface Visitor {
  id: string
  full_name: string
  visitor_organization?: string | null
  photo_url?: string | null
  phone?: string | null
  email?: string | null
}

interface Employee {
  id: string
  full_name: string
  department?: string | null
  office_location?: string | null
}

interface Visit {
  id: string
  purpose: string
  status: string
  scheduled_date?: string | null
  created_at?: string | null
  arrival_time?: string | null
  employee_id: string
  visitor: Visitor | null
  employee: Employee | null
}

interface VisitorApprovalCardProps {
  visit: Visit
  onReview: (visitId: string) => void
}

export default function VisitorApprovalCard({ visit, onReview }: VisitorApprovalCardProps) {
  const visitor = visit.visitor
  const employee = visit.employee

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
      <div className="flex items-start gap-4">
        {visitor?.photo_url ? (
          <img src={visitor.photo_url} alt={visitor.full_name} className="h-16 w-16 rounded-full object-cover border-2 border-white shadow-sm" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm">
            <User className="h-7 w-7" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-semibold text-gray-900">{visitor?.full_name || 'Unknown Visitor'}</p>
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Pending Approval</span>
          </div>

          <p className="mt-1 text-sm text-gray-600">{visit.purpose || 'No purpose provided'}</p>

          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
            {employee && (
              <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Host: {employee.full_name}</span>
            )}
            {employee?.department && (
              <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {employee.department}</span>
            )}
            {employee?.office_location && (
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {employee.office_location}</span>
            )}
            {visit.scheduled_date && (
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {visit.scheduled_date}</span>
            )}
            {visit.arrival_time && (
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {visit.arrival_time}</span>
            )}
          </div>

          <button
            onClick={() => onReview(visit.id)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Eye className="h-4 w-4" />
            Review
          </button>
        </div>
      </div>
    </div>
  )
}
