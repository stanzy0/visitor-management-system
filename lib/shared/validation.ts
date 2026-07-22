export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidPhone(phone: string): boolean {
  return /^[\d\s\-+()]{7,20}$/.test(phone)
}

export function isFutureDate(dateStr: string): boolean {
  const date = new Date(dateStr)
  return date > new Date()
}
