'use client'

import { QRCodeSVG } from 'qrcode.react'

interface VehicleGatePassProps {
  vehicle: {
    gate_pass_number: string
    registration_number: string
    vehicle_type: string
    vehicle_make: string | null
    vehicle_model: string | null
    visitor: {
      full_name: string
      visitor_organization: string | null
    } | null
    employee: {
      full_name: string
      department: string | null
      office_location: string | null
    } | null
  }
  onClose: () => void
}

export default function VehicleGatePass({ vehicle, onClose }: VehicleGatePassProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl p-6">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Vehicle Gate Pass</h2>
        </div>
        
        <div className="border border-gray-300 rounded-lg p-4 mb-4">
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-gray-500">Gate Pass #</p>
              <p className="font-mono font-bold text-lg">{vehicle.gate_pass_number}</p>
            </div>
            <div>
              <p className="text-gray-500">Visitor</p>
              <p className="font-medium">{vehicle.visitor?.full_name || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Vehicle</p>
              <p className="font-medium">{vehicle.vehicle_make || ''} {vehicle.vehicle_model || ''} ({vehicle.vehicle_type})</p>
            </div>
            <div>
              <p className="text-gray-500">Registration Number</p>
              <p className="font-medium">{vehicle.registration_number}</p>
            </div>
            <div>
              <p className="text-gray-500">Host</p>
              <p className="font-medium">{vehicle.employee?.full_name || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Department</p>
              <p className="font-medium">{vehicle.employee?.department || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Office Location</p>
              <p className="font-medium">{vehicle.employee?.office_location || '—'}</p>
            </div>
          </div>
          
          <div className="flex justify-center mt-4">
            <QRCodeSVG 
              value={JSON.stringify({
                gate_pass: vehicle.gate_pass_number,
                reg: vehicle.registration_number,
                visitor: vehicle.visitor?.full_name
              })} 
              size={128}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Print
          </button>
        </div>
      </div>
    </div>
  )
}