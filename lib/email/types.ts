export type EmailTemplate =
  | 'appointment_created'
  | 'appointment_approved'
  | 'appointment_rejected'
  | 'appointment_cancelled'
  | 'appointment_rescheduled'
  | 'visitor_checked_in'
  | 'visitor_checked_out'
  | 'visitor_arrival'
  | 'qr_badge'
  | 'visitor_reminder'
  | 'host_reminder'
  | 'emergency_broadcast'
  | 'password_reset'
  | 'account_created'
  | 'welcome_user'

export interface EmailPayload {
  to: string
  recipientName?: string
  subject: string
  template: EmailTemplate
  data: Record<string, any>
  relatedType?: string
  relatedId?: string
}

export interface EmailLogRow {
  id?: string
  recipient_email: string
  recipient_name?: string
  subject: string
  template: EmailTemplate
  status: 'pending' | 'sent' | 'failed'
  error_message?: string
  related_type?: string
  related_id?: string
  sent_by?: string
  retry_count: number
  sent_at?: string
  created_at?: string
}
