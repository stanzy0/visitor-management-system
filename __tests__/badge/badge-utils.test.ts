import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { buildBadgeQrValue } from '@/lib/badge/badge-utils'
import type { VisitorBadge } from '@/lib/badge/badge-types'

vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => null,
}))

describe('buildBadgeQrValue', () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://visitor-management-system-alpha-neon.vercel.app'
    ;(process.env as unknown as Record<string, string>).NODE_ENV = 'test'
  })

  afterEach(() => {
    ;(process.env as unknown as Record<string, string>).NODE_ENV = originalNodeEnv
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
  })

  it('should generate portal URL for badge', () => {
    const badge = {
      id: 'badge-123',
      qr_token: 'a1b2c3d4',
      badge_number: 'BADGE-123',
      badge_status: 'Active',
    } as VisitorBadge
    const result = buildBadgeQrValue(badge)
    expect(result).toContain('/portal/a1b2c3d4')
    expect(result).toContain('https://')
  })

  it('should throw for empty qr_token', () => {
    const badge = {
      id: 'badge-123',
      qr_token: '',
      badge_number: 'BADGE-123',
      badge_status: 'Active',
    } as VisitorBadge
    expect(() => buildBadgeQrValue(badge)).toThrow('QR token is required')
  })
})
