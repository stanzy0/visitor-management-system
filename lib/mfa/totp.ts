import crypto from 'crypto'

const ISSUER = 'Visitor Management System'
const MFA_SECRET_KEY = process.env.MFA_SECRET_KEY || 'default-dev-key-change-me'

function getKey(): Buffer {
  return crypto.scryptSync(MFA_SECRET_KEY, 'mfa-salt', 32)
}

export function generateSecret(): { secret: string; otpauthUrl: string } {
  const buffer = crypto.randomBytes(20)
  const base32 = base32Encode(buffer)
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(ISSUER)}:${encodeURIComponent('user')}?secret=${base32}&issuer=${encodeURIComponent(ISSUER)}&digits=6&period=30`
  return { secret: base32, otpauthUrl }
}

export function verifyTOTP(secret: string, token: string): boolean {
  const key = base32Decode(secret)
  const now = Math.floor(Date.now() / 30000)
  for (let i = -1; i <= 1; i++) {
    const counter = Buffer.alloc(8)
    counter.writeBigUInt64BE(BigInt(now + i))
    const hmac = crypto.createHmac('sha1', key)
    hmac.update(counter)
    const digest = hmac.digest()
    const offset = digest[digest.length - 1] & 0xf
    const code = ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff)
    const otp = (code % 1000000).toString().padStart(6, '0')
    if (otp === token.replace(/\s/g, '')) return true
  }
  return false
}

export function generateBackupCodes(count: number): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(4)
    const hex = bytes.toString('hex').toUpperCase()
    codes.push(hex.slice(0, 4) + '-' + hex.slice(4, 8))
  }
  return codes
}

export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex')
}

export function encryptSecret(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decryptSecret(ciphertext: string): string {
  const key = getKey()
  const data = Buffer.from(ciphertext, 'base64')
  const iv = data.subarray(0, 16)
  const tag = data.subarray(16, 32)
  const encrypted = data.subarray(32)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8')
}

function base32Encode(buffer: Buffer): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += chars[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += chars[(value << (5 - bits)) & 31]
  }
  return output.padEnd(Math.ceil(buffer.length * 8 / 5), '=')
}

function base32Decode(str: string): Buffer {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const clean = str.replace(/=+$/, '').toUpperCase()
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of clean) {
    const val = chars.indexOf(char)
    if (val === -1) continue
    value = (value << 5) | val
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}
