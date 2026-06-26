declare module 'qrcode' {
  export interface QRCodeOptions {
    width?: number
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
    margin?: number
    color?: {
      dark?: string
      light?: string
    }
  }

  export function toDataURL(data: string | object, options?: QRCodeOptions): Promise<string>

  export default QRCode
}