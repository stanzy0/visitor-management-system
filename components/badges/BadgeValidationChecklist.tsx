'use client'

import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import type { BadgePreviewVisit } from '@/lib/types/badge-preview'

interface BadgeValidationChecklistProps {
  visit: BadgePreviewVisit
}

export default function BadgeValidationChecklist({ visit }: BadgeValidationChecklistProps) {
  const checks = [
    {
      label: 'Visitor photo exists',
      passed: !!visit.visitor?.photo_url,
    },
    {
      label: 'Host employee assigned',
      passed: !!visit.employee,
    },
    {
      label: 'Office location assigned',
      passed: !!visit.office_location,
    },
    {
      label: 'Identification type provided',
      passed: !!visit.visitor?.doc_type,
    },
    {
      label: 'Identification number provided',
      passed: !!visit.visitor?.doc_number,
    },
    {
      label: 'Identification uploaded',
      passed: !!visit.visitor?.doc_front_url,
    },
    {
      label: 'Visitor name provided',
      passed: !!visit.visitor?.full_name,
    },
    {
      label: 'Visit purpose provided',
      passed: !!visit.purpose,
    },
    {
      label: 'Visit date provided',
      passed: !!visit.visit_date,
    },
  ]

  const missingItems = checks.filter(check => !check.passed).map(check => check.label)
  const isValid = missingItems.length === 0

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Validation Checklist</h3>
      <div className="space-y-2">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2">
            {check.passed ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            )}
            <span className={`text-sm ${check.passed ? 'text-gray-700' : 'text-red-700'}`}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
      {!isValid && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800">
            Please complete all required fields before approving. Missing: {missingItems.join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}
