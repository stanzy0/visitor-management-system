import type { Employee, EmployeeFormData, Department, Position, OfficeLocation } from '@/lib/types/employee'
import { getAuthHeaders } from '@/lib/client/api'

export async function getEmployees(): Promise<Employee[]> {
  const res = await fetch('/api/employees', {
    headers: await getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch employees')
  const { data } = await res.json()
  return data as Employee[]
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const res = await fetch(`/api/employees/${id}`, {
    headers: await getAuthHeaders(),
  })
  if (!res.ok) return null
  const { data } = await res.json()
  return data as Employee
}

export async function createEmployee(employeeData: EmployeeFormData): Promise<Employee> {
  const res = await fetch('/api/employees', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(employeeData),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to create employee')
  }
  const { data } = await res.json()
  return data as Employee
}

export async function updateEmployee(id: string, employeeData: Partial<EmployeeFormData>): Promise<Employee> {
  const res = await fetch(`/api/employees/${id}`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(employeeData),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to update employee')
  }
  const { data } = await res.json()
  return data as Employee
}

export async function deleteEmployee(id: string): Promise<void> {
  const res = await fetch(`/api/employees/${id}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to delete employee')
  }
}

export async function getLookups(): Promise<{ departments: Department[]; positions: Position[]; office_locations: (OfficeLocation & { display_name?: string })[] }> {
  const res = await fetch('/api/employees/lookups', {
    headers: await getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch lookups')
  return res.json()
}
