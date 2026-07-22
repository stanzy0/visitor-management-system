'use client'

import { ActivityItem } from '@/hooks/useDashboardData'
import { Users, UserCheck, LogOut, Printer, ShieldCheck, ShieldAlert, UserPlus, Building2, Clock, CheckCircle, XCircle } from 'lucide-react'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'Visitor Registered': Users,
  'Visit Approved': CheckCircle,
  'Visitor Checked In': UserCheck,
  'Visitor Checked Out': LogOut,
  'Badge Generated': Printer,
  'Badge Printed': Printer,
  'Badge Cancelled': XCircle,
  'Employee Added': UserPlus,
  'Office Location Updated': Building2,
}

const actionLabels: Record<string, string> = {
  visitor_created: 'Visitor Registered',
  visit_approved: 'Visit Approved',
  visitor_checked_in: 'Visitor Checked In',
  visitor_checked_out: 'Visitor Checked Out',
  badge_generated: 'Badge Generated',
  badge_printed: 'Badge Printed',
  badge_cancelled: 'Badge Cancelled',
  employee_created: 'Employee Added',
  office_location_updated: 'Office Location Updated',
}

function formatTime(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const diff = (now.getTime() - date.getTime()) / 1000
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return date.toLocaleDateString()
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  maxItems?: number
}

export default function ActivityFeed({ activities, maxItems = 20 }: ActivityFeedProps) {
  const display = activities.slice(0, maxItems)

  if (display.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Live Activity Feed
          </h3>
        </div>
        <div className="p-8 text-center text-gray-500">No recent activity</div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Live Activity Feed
        </h3>
      </div>
      <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
        {display.map((item) => {
          const label = actionLabels[item.action] || item.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          const Icon = iconMap[item.action] || ShieldAlert
          return (
            <div key={item.id} className="p-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
              <div className="mt-0.5 p-2 rounded-lg bg-blue-50 text-blue-600">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
                <p className="text-xs text-gray-500 truncate">{item.details}</p>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">{formatTime(item.created_at)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
