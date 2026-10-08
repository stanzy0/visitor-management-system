'use client'

import { motion } from 'framer-motion'
import { Clock, FileText, Eye, Calendar, XCircle } from 'lucide-react'
import { fadeIn, staggerContainer } from '@/lib/animations/variants'

interface PendingApproval {
  id: string
  full_name: string
  registration_number: string
  created_at: string
  purpose: string
  employee: { full_name: string; department: string } | null
}

interface PendingApprovalsProps {
  approvals: PendingApproval[]
  onApprove: (id: string) => void
  onReject: (id: string) => Promise<void>
  onViewProfile: (id: string) => void
}

const typeConfig: Record<string, { color: string; bg: string }> = {
  'Visit': { color: 'bg-[#4B5320]', bg: 'bg-[#4B5320]/10' },
  'Meeting': { color: 'bg-[#C8A646]', bg: 'bg-[#C8A646]/10' },
  'Tour': { color: 'bg-[#6B8E23]', bg: 'bg-[#6B8E23]/10' },
  'Interview': { color: 'bg-[#556B2F]', bg: 'bg-[#556B2F]/10' },
  'Delivery': { color: 'bg-[#B89635]', bg: 'bg-[#B89635]/10' },
  'Training': { color: 'bg-[#4B5320]', bg: 'bg-[#4B5320]/10' },
  'Conference': { color: 'bg-[#3D5A1E]', bg: 'bg-[#3D5A1E]/10' },
  'default': { color: 'bg-[#6B705A]', bg: 'bg-[#6B705A]/10' },
}

export default function PendingApprovalsTable({
  approvals,
  onApprove,
  onReject,
  onViewProfile,
}: PendingApprovalsProps) {
  if (approvals.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[20px] border border-[rgba(85,107,47,0.35)] bg-[#10150D] p-4 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#F5F5DC]">Pending Approvals</h2>
          <span className="text-xs text-[#9A9F87] font-medium bg-[#4B5320]/10 px-2.5 py-1 rounded-full">0</span>
        </div>
        <div className="p-8 text-center">
          <Clock className="h-12 w-12 mx-auto mb-3 text-[#9A9F87]" />
          <p className="text-sm text-[#F5F5DC]">No pending approvals</p>
          <p className="text-xs text-[#9A9F87] mt-1">Visitor registrations will appear here</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] border border-[rgba(85,107,47,0.35)] bg-[#10150D] shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden"
    >
      <div className="p-4 sm:p-5 border-b border-[rgba(85,107,47,0.25)] flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#F5F5DC]">Pending Approvals</h2>
          <p className="text-sm text-[#9A9F87] mt-0.5">{approvals.length} registration{approvals.length !== 1 ? 's' : ''} awaiting review</p>
        </div>
        <motion.span
          layout
          className="text-xs font-medium text-[#9A9F87] bg-[#4B5320]/10 px-2.5 py-1 rounded-full"
        >
          {approvals.length}
        </motion.span>
      </div>

      <div className="overflow-x-auto">
        <motion.table variants={staggerContainer} initial="hidden" animate="visible" className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[rgba(85,107,47,0.25)] bg-[#4B5320]/5">
              <th className="px-5 py-3 font-semibold text-xs text-[#9A9F87] uppercase tracking-wider">Visitor</th>
              <th className="px-5 py-3 font-semibold text-xs text-[#9A9F87] uppercase tracking-wider">Host</th>
              <th className="px-5 py-3 font-semibold text-xs text-[#9A9F87] uppercase tracking-wider">Time</th>
              <th className="px-5 py-3 font-semibold text-xs text-[#9A9F87] uppercase tracking-wider">Purpose</th>
              <th className="px-5 py-3 font-semibold text-xs text-[#9A9F87] uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(85,107,47,0.25)]">
            {approvals.map((approval) => {
              const config = typeConfig[approval.purpose || ''] || typeConfig.default
              return (
                <motion.tr
                  key={approval.id}
                  variants={fadeIn}
                  className="hover:bg-[#4B5320]/5 transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#4B5320]/20 to-[#556B2F]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-[#C8A646]">
                           {(approval.full_name || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-[#F5F5DC]">{approval.full_name ?? 'Unknown Visitor'}</p>
                        <p className="text-xs text-[#9A9F87] font-mono">{approval.registration_number ?? ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-[#F5F5DC]">{approval.employee?.full_name || '—'}</p>
                    <p className="text-xs text-[#9A9F87]">{approval.employee?.department || '—'}</p>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-[#9A9F87]">
                      <Calendar className="h-3 w-3" />
                       {approval.created_at ? new Date(approval.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.color} ${config.bg}`}>
                      {approval.purpose || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onViewProfile(approval.id)}
                         aria-label={`View profile of ${approval.full_name || 'Unknown Visitor'}`}
                        className="p-1.5 rounded-lg text-[#9A9F87] hover:bg-[#4B5320]/10 hover:text-[#C8A646] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C8A646]/50"
                      >
                        <Eye className="h-4 w-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onApprove(approval.id)}
                         aria-label={`Approve ${approval.full_name || 'Unknown Visitor'}`}
                         className="p-1.5 rounded-lg text-[#6B8E23] hover:bg-[#6B8E23]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B8E23]/50"
                      >
                        <FileText className="h-4 w-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onReject(approval.id)}
                         aria-label={`Reject ${approval.full_name || 'Unknown Visitor'}`}
                         className="p-1.5 rounded-lg text-[#f87171] hover:bg-[#8B3A3A]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#f87171]/50"
                      >
                        <XCircle className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </motion.table>
      </div>
    </motion.div>
  )
}
