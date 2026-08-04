export const BADGE_STATUS = {
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  CHECKED_OUT: 'Checked Out',
  CANCELLED: 'Cancelled',
} as const

export const BADGE_DEFAULT_EXPIRY_HOURS = 24

export const BADGE_QR_SETTINGS = {
  SIZE: 180,
  MARGIN: 2,
  ERROR_CORRECTION_LEVEL: 'H' as const,
  TYPE: 'visitor-pass',
} as const

export const BADGE_PRINT_SETTINGS = {
  WIDTH: 600,
  HEIGHT: 380,
  HEADER_HEIGHT: '2.5rem',
  PHOTO_SIZE: 80,
  QR_SIZE: 120,
  STATUS_BADGE_WIDTH: '6rem',
  STATUS_BADGE_HEIGHT: '4rem',
  POPUP_DELAY: 300,
  PRINT_DELAY: 300,
  CLOSE_DELAY: 100,
} as const

export const BADGE_DATE_FORMAT = {
  YEAR: 'numeric',
  MONTH: 'short',
  DAY: 'numeric',
  HOUR: '2-digit',
  MINUTE: '2-digit',
} as const

export const BADGE_AUDIO_ACTIONS = {
  GENERATED: 'Badge Generated',
  PRINTED: 'Badge Printed',
  REPRINTED: 'Badge Reprinted',
  CANCELLED: 'Badge Cancelled',
} as const

export const BADGE_LAYOUT = {
  MAX_WIDTH: '560px',
  PADDING: '1.5rem',
  BORDER_RADIUS: '0.75rem',
  BORDER_WIDTH: 2,
  PHOTO_SIZE: 80,
  HEADER_HEIGHT: 40,
  STATUS_BADGE_SIZE: 96,
  WATERMARK_OPACITY: 0.15,
  WATERMARK_FONT_SIZE: '3.75rem',
  WATERMARK_ROTATION: -35,
  ASPECT_RATIO: '1.6 / 1',
} as const

export const BADGE_PDF = {
  SCALE: 4,
  BACKGROUND_COLOR: '#ffffff',
  UNIT: 'mm',
  FORMAT: 'a4',
  ORIENTATION: 'portrait' as const,
  MARGIN: 10,
  IMAGE_TIMEOUT: 10000,
} as const
