'use client'

import type { VisitorFormData } from '@/lib/types/visitor'

interface Step2Props {
  full_name?: string
  gender?: string
  phone?: string
  email?: string
  nationality?: string
  visitor_address?: string
  onChange: (field: keyof VisitorFormData, value: string) => void
}

export default function Step2PersonalInfo({ full_name = '', gender = '', phone = '', email = '', nationality = '', visitor_address = '', onChange }: Step2Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
          <input type="text" value={full_name} onChange={(e) => onChange('full_name', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
          <select value={gender} onChange={(e) => onChange('gender', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2">
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
          <input type="text" value={nationality} onChange={(e) => onChange('nationality', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
          <input type="tel" value={phone} onChange={(e) => onChange('phone', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input type="email" value={email} onChange={(e) => onChange('email', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input type="text" value={visitor_address} onChange={(e) => onChange('visitor_address', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        </div>
      </div>
    </div>
  )
}
