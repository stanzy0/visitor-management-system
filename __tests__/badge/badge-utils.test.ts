import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isPreviewBadge, buildBadgeQrValue } from '@/lib/badge/badge-utils'
import type { VisitorBadge } from '@/lib/badge/badge-types'

vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => null,
}))

describe('isPreviewBadge', () => {
  it('should detect preview badge by id', () => {
    const badge = { id: 'preview', qr_token: 'some-token' } as VisitorBadge
    expect(isPreviewBadge(badge)).toBe(true)
  })

  it('should detect preview badge by qr_token', () => {
    const badge = { id: 'badge-123', qr_token: 'preview' } as VisitorBadge
    expect(isPreviewBadge(badge)).toBe(true)
  })

  it('should not detect real badge as preview', () => {
    const badge = { id: 'badge-123', qr_token: 'a1b2c3d4' } as VisitorBadge
    expect(isPreviewBadge(badge)).toBe(false)
  })
})

describe('buildBadgeQrValue', () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://visitor-management-system-alpha-neon.vercel.app'
    ;(process.env as any).NODE_ENV = 'test'
  })

  afterEach(() => {
    ;(process.env as any).NODE_ENV = originalNodeEnv
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
  })

  it('should return PREVIEW_MODE for preview badge', () => {
    const badge = { id: 'preview', qr_token: 'preview', badge_number: 'PREVIEW', badge_status: 'Active' } as VisitorBadge
    expect(buildBadgeQrValue(badge)).toBe('PREVIEW_MODE')
  })

  it('should generate portal URL for real badge', () => {
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

  it('should throw for empty qr_token on real badge', () => {
    const badge = {
      id: 'badge-123',
      qr_token: '',
      badge_number: 'BADGE-123',
      badge_status: 'Active',
    } as VisitorBadge
    expect(() => buildBadgeQrValue(badge)).toThrow('QR token is required')
  })
})
