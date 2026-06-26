'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { logAuditAction } from '@/lib/audit'
import { Search, Plus, Edit, Trash2, X, Loader2 } from 'lucide-react'

interface Employee {
  id: string
  full_name: string
  email: string
  phone: string
  department: string
  position: string
  created_at: string
}

interface EmployeeFormData {
  full_name: string
  email: string
  phone: string
  department: string
  position: string
}

const initialFormData: EmployeeFormData = {
  full_name: '',
  email: '',
  phone: '',
  department: '',
  position: '',
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState<EmployeeFormData>(initialFormData)
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setAuthChecking(false)
      fetchEmployees()
    }
    checkAuth()
  }, [])

  const fetchEmployees = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('employees').select('*').order('created_at', { ascending: false })

    if (error) {
      showNotification('error', error.message)
    } else {
      setEmployees(data || [])
    }
    setLoading(false)
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    if (editingEmployee) {
      const { error } = await supabase
        .from('employees')
        .update(formData)
        .eq('id', editingEmployee.id)

      if (error) {
        showNotification('error', error.message)
      } else {
        logAuditAction('Employee Updated', 'employee', editingEmployee.id, `${formData.full_name} updated - ${formData.position} in ${formData.department}`)
        showNotification('success', 'Employee updated successfully')
        fetchEmployees()
      }
    } else {
      const { error, data: insertData } = await supabase.from('employees').insert([formData]).select()

      if (error) {
        showNotification('error', error.message)
      } else {
        logAuditAction('Employee Created', 'employee', insertData?.[0]?.id || null, `${formData.full_name} added - ${formData.position} in ${formData.department}`)
        showNotification('success', 'Employee added successfully')
        fetchEmployees()
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
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return

    const employeeToDelete = employees.find((emp) => emp.id === id)

    const { error } = await supabase.from('employees').delete().eq('id', id)

    if (error) {
      showNotification('error', error.message)
    } else {
      logAuditAction('Employee Deleted', 'employee', id, `${employeeToDelete?.full_name || id} deleted - was ${employeeToDelete?.position} in ${employeeToDelete?.department}`)
      showNotification('success', 'Employee deleted successfully')
      fetchEmployees()
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

  return (
    <div className="min-h-screen bg-gray-50">
      {authChecking ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
          {/* Header */}
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
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
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

          {/* Notification */}
          {notification && (
            <div
              className={`rounded-lg p-4 text-sm ${
                notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {notification.message}
            </div>
          )}

          {/* Employee Table */}
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

          {/* Modal */}
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
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                        Department
                      </label>
                      <input
                        id="department"
                        type="text"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                        Position
                      </label>
                      <input
                        id="position"
                        type="text"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
      )}
    </div>
  )
}