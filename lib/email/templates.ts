import type { EmailTemplate } from './types'

interface TemplateData {
  visitorName?: string
  hostName?: string
  purpose?: string
  date?: string
  time?: string
  arrivalTime?: string
  badgeNumber?: string
  location?: string
  registrationNumber?: string
  reason?: string
  qrCodeUrl?: string
  company?: string
  checkInTime?: string
  checkOutTime?: string
  duration?: string
  officeLocation?: string
  department?: string
  organization?: string
  orgName?: string
  orgEmail?: string
  orgPhone?: string
  orgAddress?: string
  [key: string]: unknown
}

export function getTemplateContent(
  template: EmailTemplate,
  data: TemplateData,
  orgName: string
): string {
  const visitorName = data.visitorName || 'Visitor'
  const hostName = data.hostName || 'Host'
  const purpose = data.purpose || 'Visit'
  const date = data.date || new Date().toLocaleDateString()
  const time = data.time || new Date().toLocaleTimeString()
  const badgeNumber = data.badgeNumber || 'N/A'
  const location = data.location || 'Reception'
  const orgEmail = data.orgEmail || 'support@visitor-management.local'
  const orgPhone = data.orgPhone || ''

  switch (template) {
    case 'registration_submitted':
      return `
        <h2 style="margin-top: 0; color: #2563eb;">Visitor Registration Received</h2>
        <p>Dear ${visitorName},</p>
        <p>Your visitor registration has been submitted successfully and is pending approval.</p>
        <div class="info-box">
          <p><strong>Registration Number:</strong> ${data.registrationNumber || 'N/A'}</p>
          <p><strong>Visit Date:</strong> ${date}</p>
          <p><strong>Arrival Time:</strong> ${data.arrivalTime || 'TBD'}</p>
          <p><strong>Host:</strong> ${hostName}</p>
          <p><strong>Office:</strong> ${location}</p>
          <p><strong>Status:</strong> <span style="color: #d97706; font-weight: bold;">Pending Approval</span></p>
        </div>
        <p>You will receive another email once your registration is approved. Please keep your registration number for future reference.</p>
      `

    case 'registration_approved':
      return `
        <h2 style="margin-top: 0; color: #16a34a;">Registration Approved</h2>
        <p>Dear ${visitorName},</p>
        <p>Great news! Your visitor registration has been approved.</p>
        <div class="info-box">
          <p><strong>Registration Number:</strong> ${data.registrationNumber || 'N/A'}</p>
          <p><strong>Visit Date:</strong> ${date}</p>
          <p><strong>Arrival Time:</strong> ${data.arrivalTime || 'TBD'}</p>
          <p><strong>Host:</strong> ${hostName}</p>
          <p><strong>Office:</strong> ${location}</p>
          <p><strong>Badge Number:</strong> ${badgeNumber}</p>
          <p><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">Approved</span></p>
        </div>
        ${data.qrCodeUrl ? `<div class="qr-container"><img src="${data.qrCodeUrl}" alt="QR Code" class="qr-image" /></div>` : ''}
        <div class="button-container">
          <a href="${data.qrCodeUrl || '#'}" class="button">View Your Badge</a>
        </div>
        <p>Please arrive at the scheduled time and present your QR code at the gate for verification.</p>
      `

    case 'registration_rejected':
      return `
        <h2 style="margin-top: 0; color: #dc2626;">Registration Declined</h2>
        <p>Dear ${visitorName},</p>
        <p>We regret to inform you that your registration could not be approved at this time.</p>
        <div class="danger-box">
          <p><strong>Registration Number:</strong> ${data.registrationNumber || 'N/A'}</p>
          <p><strong>Visit Date:</strong> ${date}</p>
          <p><strong>Host:</strong> ${hostName}</p>
          <p><strong>Reason:</strong> ${data.reason || 'Not specified'}</p>
        </div>
        <p>Please contact us to reschedule or for further assistance.</p>
      `

    case 'visitor_arrival':
      return `
        <h2 style="margin-top: 0; color: #2563eb;">Visitor Has Arrived</h2>
        <p>Dear ${hostName},</p>
        <p>A visitor has arrived to see you.</p>
        <div class="info-box">
          <p><strong>Visitor:</strong> ${visitorName}</p>
          <p><strong>Company:</strong> ${data.company || 'N/A'}</p>
          <p><strong>Purpose:</strong> ${purpose}</p>
          <p><strong>Time:</strong> ${time}</p>
          <p><strong>Location:</strong> ${location}</p>
        </div>
      `

    case 'visitor_checked_in':
      return `
        <h2 style="margin-top: 0; color: #16a34a;">Visitor Checked In</h2>
        <p>Dear ${hostName},</p>
        <p>A visitor has checked in. Here are the details:</p>
        <div class="info-box">
          <p><strong>Visitor:</strong> ${visitorName}</p>
          <p><strong>Check-in Time:</strong> ${time}</p>
          <p><strong>Arrival Time:</strong> ${data.arrivalTime || 'N/A'}</p>
          <p><strong>Purpose:</strong> ${purpose}</p>
          <p><strong>Office Location:</strong> ${data.officeLocation || location}</p>
        </div>
      `

    case 'visitor_checked_out':
      return `
        <h2 style="margin-top: 0; color: #6b7280;">Visitor Checked Out</h2>
        <p>Dear ${hostName},</p>
        <p>A visitor has checked out. Here are the details:</p>
        <div class="info-box">
          <p><strong>Visitor:</strong> ${visitorName}</p>
          <p><strong>Check-in Time:</strong> ${data.checkInTime || 'N/A'}</p>
          <p><strong>Check-out Time:</strong> ${time}</p>
          <p><strong>Duration:</strong> ${data.duration || 'N/A'}</p>
          <p><strong>Purpose:</strong> ${purpose}</p>
        </div>
      `

    case 'qr_badge':
      return `
        <h2 style="margin-top: 0;">Your Visitor Badge</h2>
        <p>Dear ${visitorName},</p>
        <p>Your visitor badge has been generated and is ready. Please present the QR code at the reception.</p>
        <div class="info-box" style="text-align: center;">
          ${data.qrCodeUrl ? `<img src="${data.qrCodeUrl}" alt="QR Badge" class="qr-image" />` : ''}
          <p style="margin-top: 8px;"><strong>Badge Number:</strong> ${badgeNumber}</p>
          <p><strong>Host:</strong> ${hostName}</p>
          <p><strong>Office:</strong> ${location}</p>
        </div>
      `

    default:
      return `<h2 style="margin-top: 0;">${(template as string).replace(/_/g, ' ').toUpperCase()}</h2><p>${data.message || 'Notification from ' + orgName}</p>`
  }
}

export function renderEmailTemplate(
  template: EmailTemplate,
  data: Record<string, string | number | boolean | undefined>
): string {
  const orgName = String(data.orgName || 'Visitor Management System')
  const orgEmail = String(data.orgEmail || 'support@visitor-management.local')
  const orgPhone = String(data.orgPhone || '')
  const orgAddress = String(data.orgAddress || '')
  const year = new Date().getFullYear()

  const baseStyles = `
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 24px; text-align: center; }
      .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
      .content { padding: 32px 24px; }
      .footer { background-color: #f9fafb; padding: 16px 24px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
      .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; }
      .info-box { background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 16px 0; border-radius: 4px; }
      .warning-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 4px; }
      .danger-box { background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0; border-radius: 4px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
      th { background-color: #f9fafb; font-weight: 500; }
      .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
      .status-pending { background-color: #fef3c7; color: #92400e; }
      .status-approved { background-color: #dcfce7; color: #166534; }
      .status-rejected { background-color: #fee2e2; color: #991b1b; }
      .qr-container { text-align: center; margin: 24px 0; }
      .qr-image { max-width: 200px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; }
      .button-container { text-align: center; margin: 24px 0; }
    </style>
  `

  const header = `
    <div class="header">
      <h1>AFCSC Visitor Management System</h1>
      <p style="color: #bfdbfe; margin: 4px 0 0 0; font-size: 14px;">Airport Fire Safety & Security Command</p>
    </div>
  `

  const footer = `
    <div class="footer">
      <p>${orgName} | ${orgAddress}</p>
      <p style="margin-top: 8px;">© ${year} ${orgName}. All rights reserved.</p>
      <p style="margin-top: 4px;">This is an automated email. Please do not reply to this message.</p>
    </div>
  `

  const content = getTemplateContent(template, data as TemplateData, orgName)

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        ${header}
        <div class="content">
          ${content}
        </div>
        ${footer}
      </div>
    </body>
    </html>
  `
}
