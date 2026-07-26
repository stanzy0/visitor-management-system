'use client'

import type { VisitorFormData } from '@/lib/types/visitor'

interface Step3Props {
  data: Pick<VisitorFormData, 'doc_type' | 'doc_number' | 'expiry_date' | 'doc_front_url' | 'doc_back_url'>
  onChange: (field: keyof VisitorFormData, value: string) => void
}

export default function Step3Identification({ data, onChange }: Step3Props) {
  const { doc_type, doc_number, expiry_date, doc_front_url, doc_back_url } = data
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Identification</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
          <select value={doc_type} onChange={(e) => onChange('doc_type', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2">
            <option value="National ID">National ID</option>
            <option value="Passport">Passport</option>
            <option value="Driver License">Driver License</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Document Number</label>
          <input type="text" value={doc_number} onChange={(e) => onChange('doc_number', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
          <input type="date" value={expiry_date} onChange={(e) => onChange('expiry_date', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        </div>
        <div className="md:col-span-2">
          <p className="text-sm text-gray-500 mb-2">Upload scanned documents.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
              {doc_front_url ? <img src={doc_front_url} alt="Front" className="mx-auto h-32 object-cover rounded" /> : 'Front upload'}
            </div>
            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
              {doc_back_url ? <img src={doc_back_url} alt="Back" className="mx-auto h-32 object-cover rounded" /> : 'Back upload'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
