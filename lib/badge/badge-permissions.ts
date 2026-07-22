export const BADGE_PERMISSIONS = {
  GENERATE: 'badges',
  PRINT: 'badges',
  REPRINT: 'badges',
  CANCEL: 'badges',
  VIEW: 'badges',
  EXPORT: 'badges',
} as const

export const BADGE_ROLES = {
  ADMIN: 'Admin',
  RECEPTIONIST: 'Receptionist',
  SECURITY: 'Security',
} as const

export const BADGE_AUTHORIZED_ROLES = [BADGE_ROLES.ADMIN, BADGE_ROLES.RECEPTIONIST] as const

export type BadgePermission = typeof BADGE_PERMISSIONS[keyof typeof BADGE_PERMISSIONS]
export type BadgeRole = typeof BADGE_ROLES[keyof typeof BADGE_ROLES]
