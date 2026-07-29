'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { logAuditAction } from '@/lib/client/audit'
import { Search, Plus, Edit, Trash2, X, Loader2 } from 'lucide-react'
import type { Employee, EmployeeFormData, Department, Position, OfficeLocation } from '@/lib/types/employee'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth-client'
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, getLookups } from '@/lib/client/employees'
import SearchableCombobox from '@/components/ui/SearchableCombobox'

const initialFormData: EmployeeFormData & { department_id?: string | null; position_id?: string | null; office_location_id?: string | null } = {
  full_name: '',
  email: '',
  phone: '',
  department: '',
  position: '',
  office_location: '',
  department_id: null,
  position_id: null,
  office_location_id: null,
}

const inputClasses = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
const searchInputClasses = "pl-9 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState<EmployeeFormData & { department_id?: string | null; position_id?: string | null; office_location_id?: string | null }>(initialFormData)
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [officeLocations, setOfficeLocations] = useState<OfficeLocation[]>([])
  const [loadingLookups, setLoadingLookups] = useState(true)
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const data = await getEmployees()
      setEmployees(data)
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to fetch employees')
    }
    setLoading(false)
  }

  const fetchLookups = async () => {
    setLoadingLookups(true)
    try {
      const data = await getLookups()
      setDepartments(data.departments)
      setPositions(data.positions)
      setOfficeLocations(data.office_locations)
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to fetch lookup data')
    }
    setLoadingLookups(false)
  }

  const setupRealtime = () => {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current)
    }

    realtimeChannel.current = supabase
      .channel('employees-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employees' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setEmployees(prev => [payload.new as Employee, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setEmployees(prev => prev.map(e => e.id === (payload.new as Employee).id ? payload.new as Employee : e))
          } else if (payload.eventType === 'DELETE') {
            setEmployees(prev => prev.filter(e => e.id !== (payload.old as Employee).id))
          }
        }
      )
      .subscribe()
  }

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      if (!PERMISSIONS[user.role]?.includes('employees')) {
        window.location.href = '/unauthorized'
        return
      }
      setAuthChecking(false)
      fetchEmployees()
      fetchLookups()
      setupRealtime()
    }
    checkAuth()

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const payload = {
      ...formData,
    }

    if (editingEmployee) {
      try {
        await updateEmployee(editingEmployee.id, payload)
        logAuditAction('Employee Updated', 'employee', editingEmployee.id, `${formData.full_name} updated - ${formData.position} in ${formData.department}`)
        showNotification('success', 'Employee updated successfully')
        fetchEmployees()
      } catch (err) {
        showNotification('error', err instanceof Error ? err.message : 'Failed to update employee')
      }
    } else {
      try {
        const newEmployee = await createEmployee(payload)
        logAuditAction('Employee Created', 'employee', newEmployee.id, `${formData.full_name} added - ${formData.position} in ${formData.department}`)
        showNotification('success', 'Employee added successfully')
        fetchEmployees()
      } catch (err) {
        showNotification('error', err instanceof Error ? err.message : 'Failed to create employee')
      }
    }

    setSubmitting(false)
    setModalOpen(false)
    setEditingEmployee(null)
    setFormData(initialFormData)
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData({
      full_name: employee.full_name,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      position: employee.position,
      office_location: employee.office_location,
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return

    const employeeToDelete = employees.find((emp) => emp.id === id)

    try {
      await deleteEmployee(id)
      logAuditAction('Employee Deleted', 'employee', id, `${employeeToDelete?.full_name || id} deleted - was ${employeeToDelete?.position} in ${employeeToDelete?.department}`)
      showNotification('success', 'Employee deleted successfully')
      fetchEmployees()
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to delete employee')
    }
  }

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openAddModal = () => {
    setEditingEmployee(null)
    setFormData(initialFormData)
    setModalOpen(true)
  }

  const handleDepartmentChange = (deptId: string) => {
    const dept = departments.find(d => d.id === deptId)
    setFormData((prev) => ({
      ...prev,
      department_id: deptId,
      department: dept?.name || '',
      office_location_id: null,
      office_location: '',
    }))
  }

  const handlePositionChange = (posId: string) => {
    const pos = positions.find(p => p.id === posId)
    setFormData((prev) => ({
      ...prev,
      position_id: posId,
      position: pos?.title || '',
    }))
  }

  const handleOfficeLocationChange = (locId: string) => {
    const loc = officeLocations.find(l => l.id === locId)
    setFormData((prev) => ({
      ...prev,
      office_location_id: locId,
      office_location: loc?.display_name || loc?.name || '',
    }))
  }

  const filteredOfficeLocations = formData.department_id
    ? officeLocations.filter(l => l.department === formData.department)
    : officeLocations

  if (authChecking) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={searchInputClasses}
              />
            </div>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Employee
            </button>
          </div>
        </div>

        {notification && (
          <div
            className={`rounded-lg p-4 text-sm ${
              notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {notification.message}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 font-semibold text-gray-700">Full Name</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Email</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Phone</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Department</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Position</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{employee.full_name}</td>
                      <td className="px-4 py-3 text-gray-600">{employee.email}</td>
                      <td className="px-4 py-3 text-gray-600">{employee.phone || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{employee.department || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{employee.position || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(employee)}
                            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                            aria-label="Edit employee"
                          >
                            <Edit className="h-4 w-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(employee.id)}
                            className="p-1 rounded-md hover:bg-red-50 transition-colors"
                            aria-label="Delete employee"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!loading && filteredEmployees.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-gray-500">
                {searchTerm ? 'No employees match your search' : 'No employees found'}
              </p>
            </div>
          )}
        </div>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
              <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingEmployee ? 'Edit Employee' : 'Add Employee'}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-md hover:bg-gray-100"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-4">
                  <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      id="full_name"
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                      placeholder="Enter full name"
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      placeholder="Enter email"
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Enter phone number"
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                    <SearchableCombobox
                      options={departments.map((d) => ({ value: d.id, label: d.name }))}
                      value={formData.department_id || ''}
                      onChange={handleDepartmentChange}
                      placeholder="Select department..."
                      searchPlaceholder="Search departments..."
                      noResultsText="No departments found"
                      loading={loadingLookups}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Office Location *</label>
                    <SearchableCombobox
                      options={filteredOfficeLocations.map((l) => ({ value: l.id, label: l.display_name || l.name }))}
                      value={formData.office_location_id || ''}
                      onChange={handleOfficeLocationChange}
                      placeholder={formData.department_id ? 'Select office location...' : 'Select a department first...'}
                      searchPlaceholder="Search office locations..."
                      noResultsText={formData.department_id ? 'No office locations found for this department' : 'Select a department first'}
                      disabled={!formData.department_id}
                      loading={loadingLookups}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position *</label>
                    <SearchableCombobox
                      options={positions.map((p) => ({ value: p.id, label: p.title }))}
                      value={formData.position_id || ''}
                      onChange={handlePositionChange}
                      placeholder="Select position..."
                      searchPlaceholder="Search positions..."
                      noResultsText="No positions found"
                      loading={loadingLookups}
                      required
                    />
                  </div>
                </div>
                <div className="flex-shrink-0 flex justify-end gap-3 p-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingEmployee ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
