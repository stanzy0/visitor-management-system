export interface AppointmentReport {
  completionRate: number
  noShows: number
  averageWaitingMinutes: number
  peakHours: { hour: string; count: number }[]
  byDepartment: { department: string; count: number }[]
}

export function buildAppointmentReport(appointments: {
  status: string
  appointment_time: string
  appointment_date: string
  employee?: { department: string }
}[]): AppointmentReport {
  const total = appointments.length
  const completed = appointments.filter((a) => a.status === 'Completed').length
  const noShows = appointments.filter((a) => a.status === 'No Show').length
  const completionRate = total > 0 ? (completed / total) * 100 : 0

  const byDepartment = new Map<string, number>()
  const hourCounts = new Map<string, number>()

  appointments.forEach((apt) => {
    const dept = apt.employee?.department || 'Unknown'
    byDepartment.set(dept, (byDepartment.get(dept) || 0) + 1)

    const hour = apt.appointment_time.split(':')[0] || '00'
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1)
  })

  const peakHours = Array.from(hourCounts.entries())
    .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
    .sort((a, b) => b.count - a.count)

  return {
    completionRate,
    noShows,
    averageWaitingMinutes: 0,
    peakHours,
    byDepartment: Array.from(byDepartment.entries()).map(([department, count]) => ({ department, count })),
  }
}
