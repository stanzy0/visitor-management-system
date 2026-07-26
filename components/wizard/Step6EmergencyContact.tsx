'use client'

import type { VisitorFormData } from '@/lib/types/visitor'

interface Step6Props {
  emergency_contact?: string
  onChange: (field: keyof VisitorFormData, value: string) => void
}

export default function Step6EmergencyContact({ emergency_contact = '', onChange }: Step6Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Emergency Contact</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input type="text" value={emergency_contact} onChange={(e) => onChange('emergency_contact', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        </div>
      </div>
    </div>
  )
}
