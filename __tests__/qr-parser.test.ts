import { describe, it, expect } from 'vitest'
import { parseQrPayload } from '@/lib/qr-parser'

describe('parseQrPayload', () => {
  it('parses portal URL', () => {
    const result = parseQrPayload('https://example.com/portal/abc123token')
    expect(result.kind).toBe('portal')
    expect(result.value).toBe('abc123token')
  })

  it('parses portal URL with encoded token', () => {
    const result = parseQrPayload('https://example.com/portal/a%2Fb+c')
    expect(result.kind).toBe('portal')
    expect(result.value).toBe('a/b+c')
  })

  it('parses visitor-pass JSON', () => {
    const result = parseQrPayload(JSON.stringify({ type: 'visitor-pass', visitId: 'visit-1' }))
    expect(result.kind).toBe('visit')
    expect(result.value).toBe('visit-1')
  })

  it('parses visitor-pass JSON with visit_id', () => {
    const result = parseQrPayload(JSON.stringify({ visit_id: 'visit-2' }))
    expect(result.kind).toBe('visit')
    expect(result.value).toBe('visit-2')
  })

  it('parses public-visitor JSON', () => {
    const result = parseQrPayload(JSON.stringify({ type: 'public-visitor', registrationNumber: 'REG-123' }))
    expect(result.kind).toBe('registration')
    expect(result.value).toBe('REG-123')
  })

  it('parses public-visitor JSON without visitId', () => {
    const result = parseQrPayload(JSON.stringify({ registrationNumber: 'REG-456' }))
    expect(result.kind).toBe('registration')
    expect(result.value).toBe('REG-456')
  })

  it('parses invitation JSON', () => {
    const result = parseQrPayload(JSON.stringify({ type: 'invitation', token: 'inv-token-1' }))
    expect(result.kind).toBe('invitation')
    expect(result.value).toBe('inv-token-1')
  })

  it('parses invitation JSON with bare token field', () => {
    const result = parseQrPayload(JSON.stringify({ token: 'inv-token-2' }))
    expect(result.kind).toBe('invitation')
    expect(result.value).toBe('inv-token-2')
  })

  it('parses vehicle JSON', () => {
    const result = parseQrPayload(JSON.stringify({ type: 'vehicle', reg: 'ABC-1234' }))
    expect(result.kind).toBe('vehicle')
    expect(result.value).toBe('ABC-1234')
  })

  it('parses vehicle JSON with gate_pass', () => {
    const result = parseQrPayload(JSON.stringify({ gate_pass: 'GP-999' }))
    expect(result.kind).toBe('vehicle')
    expect(result.value).toBe('GP-999')
  })

  it('parses visit URL path', () => {
    const result = parseQrPayload('https://example.com/visit/visit-123')
    expect(result.kind).toBe('visit')
    expect(result.value).toBe('visit-123')
  })

  it('returns unknown for plain text', () => {
    const result = parseQrPayload('hello world')
    expect(result.kind).toBe('unknown')
    expect(result.value).toBe('hello world')
  })

  it('returns unknown for empty string', () => {
    const result = parseQrPayload('')
    expect(result.kind).toBe('unknown')
    expect(result.value).toBe('')
  })
})
