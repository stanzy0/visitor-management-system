export function safeDate(value: string | null | undefined | Date): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return isNaN(date.getTime()) ? null : date
}

export function safeDateString(
  value: string | null | undefined | Date,
  fallback = '—'
): string {
  const date = safeDate(value)
  if (!date) return fallback
  try {
    return date.toLocaleString()
  } catch {
    return fallback
  }
}

export function safeDateLocaleString(
  value: string | null | undefined | Date,
  options?: Intl.DateTimeFormatOptions,
  fallback = '—'
): string {
  const date = safeDate(value)
  if (!date) return fallback
  try {
    return date.toLocaleString(undefined, options)
  } catch {
    return fallback
  }
}

export function safeDateLocaleDateString(
  value: string | null | undefined | Date,
  fallback = '—'
): string {
  const date = safeDate(value)
  if (!date) return fallback
  try {
    return date.toLocaleDateString()
  } catch {
    return fallback
  }
}

export function safeDateLocaleTimeString(
  value: string | null | undefined | Date,
  options?: Intl.DateTimeFormatOptions,
  fallback = '—'
): string {
  const date = safeDate(value)
  if (!date) return fallback
  try {
    return date.toLocaleTimeString(undefined, options)
  } catch {
    return fallback
  }
}
