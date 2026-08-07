export interface QrPayload {
  type?: string
  visitId?: string
  visit_id?: string
  registrationNumber?: string
  qr_token?: string
  token?: string
  reg?: string
  gate_pass?: string
}

export interface ParsedQrResult {
  kind: 'portal' | 'visit' | 'registration' | 'invitation' | 'vehicle' | 'unknown'
  value: string
  payload: QrPayload | null
}

export function parseQrPayload(decodedText: string): ParsedQrResult {
  const trimmed = decodedText.trim()

  try {
    const parsed = JSON.parse(trimmed) as QrPayload
    if (parsed.type === 'visitor-pass' || parsed.visitId || parsed.visit_id) {
      return { kind: 'visit', value: parsed.visitId || parsed.visit_id || '', payload: parsed }
    }
    if (parsed.type === 'public-visitor' || parsed.registrationNumber) {
      return { kind: 'registration', value: parsed.registrationNumber || '', payload: parsed }
    }
    if (parsed.type === 'invitation' || parsed.token) {
      return { kind: 'invitation', value: parsed.token || '', payload: parsed }
    }
    if (parsed.type === 'vehicle' || parsed.reg || parsed.gate_pass) {
      return { kind: 'vehicle', value: parsed.reg || parsed.gate_pass || '', payload: parsed }
    }
    if (parsed.qr_token) {
      return { kind: 'portal', value: parsed.qr_token, payload: parsed }
    }
  } catch {
    // Not JSON — treat as URL or raw text
  }

  try {
    const url = new URL(trimmed)
    const pathParts = url.pathname.split('/').filter(Boolean)

    const visitIndex = pathParts.indexOf('visit')
    if (visitIndex !== -1 && visitIndex + 1 < pathParts.length) {
      return { kind: 'visit', value: decodeURIComponent(pathParts[visitIndex + 1]), payload: null }
    }

    const portalIndex = pathParts.indexOf('portal')
    if (portalIndex !== -1 && portalIndex + 1 < pathParts.length) {
      return { kind: 'portal', value: decodeURIComponent(pathParts[portalIndex + 1]), payload: null }
    }

    if (pathParts.length > 0) {
      return { kind: 'unknown', value: decodeURIComponent(pathParts[pathParts.length - 1]), payload: null }
    }
  } catch {
    // Not a URL — use raw text as-is
  }

  return { kind: 'unknown', value: trimmed, payload: null }
}
