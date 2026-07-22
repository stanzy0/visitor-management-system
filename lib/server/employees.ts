import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Employee, EmployeeFormData } from '@/lib/types/employee'

export async function getEmployees(): Promise<Employee[]> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('*')
    .order('full_name', { ascending: true })

  if (error) throw new Error(error.message)
  return (data || []) as Employee[]
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as Employee
}

export async function createEmployee(data: EmployeeFormData): Promise<Employee> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data: employee, error } = await supabaseAdmin
    .from('employees')
    .insert(data)
    .select()
    .single()

  if (error || !employee) {
    throw new Error(error?.message || 'Failed to create employee')
  }

  return employee as Employee
}

export async function updateEmployee(id: string, data: Partial<EmployeeFormData>): Promise<Employee> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data: employee, error } = await supabaseAdmin
    .from('employees')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error || !employee) {
    throw new Error(error?.message || 'Failed to update employee')
  }

  return employee as Employee
}

export async function deleteEmployee(id: string): Promise<void> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { error } = await supabaseAdmin
    .from('employees')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}
