'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import type { AppointmentFormData } from '@/lib/types/appointment'

interface AppointmentFormProps {
  initialData?: Partial<AppointmentFormData>
  onSubmit: (data: AppointmentFormData) => void | Promise<void>
  onCancel: () => void
  loading?: boolean
  submitLabel?: string
}

export default function AppointmentForm({ initialData, onSubmit, onCancel, loading, submitLabel = 'Create Appointment' }: AppointmentFormProps) {
  const [visitors, setVisitors] = useState<Array<{ id: string; full_name: string; visitor_organization: string | null }>>([])
  const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; department: string; office_location: string }>>([])
  const [form, setForm] = useState<AppointmentFormData>({
    visitor_id: initialData?.visitor_id || '',
    employee_id: initialData?.employee_id || '',
    office_location: initialData?.office_location || '',
    appointment_date: initialData?.appointment_date || '',
    appointment_time: initialData?.appointment_time || '',
    expected_duration: initialData?.expected_duration || 30,
    purpose: initialData?.purpose || '',
    notes: initialData?.notes || '',
  })

  useEffect(() => {
    supabase.from('visitors').select('id, full_name, visitor_organization').order('full_name').then(({ data }) => {
      if (data) setVisitors(data)
    })
    supabase.from('employees').select('id, full_name, department, office_location').order('full_name').then(({ data }) => {
      if (data) setEmployees(data)
    })
  }, [])

  const selectedEmployee = employees.find((e) => e.id === form.employee_id)

  const updateForm = (field: keyof AppointmentFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(form)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] border border-gray-200/60 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden"
    >
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">{initialData ? 'Edit Appointment' : 'New Appointment'}</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {initialData ? 'Update appointment details' : 'Schedule a new visitor appointment'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Visitor *</label>
            <select
              value={form.visitor_id}
              onChange={(e) => updateForm('visitor_id', e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select visitor</option>
              {visitors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.full_name} {v.visitor_organization ? `(${v.visitor_organization})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Host Employee *</label>
            <select
              value={form.employee_id}
              onChange={(e) => updateForm('employee_id', e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} - {emp.department}
                </option>
              ))}
            </select>
          </div>

          {selectedEmployee && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                <input
                  type="text"
                  value={selectedEmployee.department}
                  readOnly
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Office Location</label>
                <input
                  type="text"
                  value={selectedEmployee.office_location}
                  readOnly
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Appointment Date *</label>
            <input
              type="date"
              value={form.appointment_date}
              onChange={(e) => updateForm('appointment_date', e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Appointment Time *</label>
            <input
              type="time"
              value={form.appointment_time}
              onChange={(e) => updateForm('appointment_time', e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Expected Duration (minutes)</label>
            <input
              type="number"
              value={form.expected_duration}
              onChange={(e) => updateForm('expected_duration', Number(e.target.value))}
              min={15}
              step={15}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Purpose *</label>
            <input
              type="text"
              value={form.purpose}
              onChange={(e) => updateForm('purpose', e.target.value)}
              required
              placeholder="Meeting purpose"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
          <textarea
            value={form.notes || ''}
            onChange={(e) => updateForm('notes', e.target.value)}
            rows={3}
            placeholder="Additional notes"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors min-h-[52px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 transition-colors min-h-[52px]"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitLabel}
          </button>
        </div>
      </form>
    </motion.div>
  )
}
