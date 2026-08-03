import { queueEmail } from '@/lib/email'
import type { EmailTemplate } from '@/lib/email/types'

export async function sendEmail(params: {
  to: string
  recipientName?: string
  subject: string
  template: EmailTemplate
  data: Record<string, string | number | boolean | undefined>
  relatedType?: string
  relatedId?: string
}) {
  await queueEmail(params)
}
