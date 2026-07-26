'use client'

import type { VisitorType } from '@/components/wizard/VisitorRegistrationWizard'

interface Step1Props {
  visitorType: VisitorType
  onSelect: (type: VisitorType) => void
}

export default function Step1VisitorType({ visitorType, onSelect }: Step1Props) {
  const types: VisitorType[] = ['Visitor', 'Contractor', 'Vendor', 'Guest Lecturer', 'VIP', 'Delivery Personnel']

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Visitor Type</h3>
      <p className="text-sm text-gray-500">Select the type of visitor to help us tailor the registration process.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {types.map((type) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={`rounded-xl border-2 px-4 py-4 text-sm font-semibold transition-all ${
              visitorType === type ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  )
}
