'use client'

import type { VisitorFormData } from '@/lib/types/visitor'

interface Step4Props {
  host_employee_id?: string
  purpose?: string
  expected_duration?: number
  onChange: (field: keyof VisitorFormData, value: string | number) => void
}

export default function Step4VisitInfo({ host_employee_id = '', purpose = '', expected_duration = 0, onChange }: Step4Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Visit Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Host Employee</label>
          <input type="text" value={host_employee_id} onChange={(e) => onChange('host_employee_id', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expected Duration (minutes)</label>
          <input type="number" value={expected_duration || ''} onChange={(e) => onChange('expected_duration', Number(e.target.value))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
          <textarea value={purpose} onChange={(e) => onChange('purpose', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        </div>
      </div>
    </div>
  )
}
