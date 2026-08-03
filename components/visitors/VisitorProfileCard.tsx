'use client'

import { motion } from 'framer-motion'
import { User, Phone, Mail, MapPin, Car, Shield, Users, Calendar } from 'lucide-react'
import type { Visitor } from '@/lib/types/visitor'

interface VisitorProfileCardProps {
  visitor: Visitor
  loading?: boolean
}

export default function VisitorProfileCard({ visitor, loading }: VisitorProfileCardProps) {
  if (loading) {
    return (
      <div className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const fields = [
    { label: 'Full Name', value: visitor.full_name, icon: User },
    { label: 'Email', value: visitor.email, icon: Mail },
    { label: 'Phone', value: visitor.phone, icon: Phone },
    { label: 'Company', value: visitor.visitor_organization, icon: Users },
    { label: 'Address', value: visitor.visitor_address, icon: MapPin },
    { label: 'Nationality', value: visitor.nationality, icon: MapPin },
    { label: 'Gender', value: visitor.gender, icon: User },
    { label: 'ID Type', value: null, icon: Shield },
    { label: 'ID Number', value: null, icon: Shield },
    { label: 'Vehicle Plate', value: visitor.vehicle_plate, icon: Car },
    { label: 'Vehicle Type', value: visitor.vehicle_type, icon: Car },
    { label: 'Emergency Contact', value: visitor.emergency_contact, icon: Shield },
    { label: 'Registered', value: visitor.created_at ? new Date(visitor.created_at).toLocaleDateString() : '—', icon: Calendar },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] border border-gray-200/60 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gray-50 flex-shrink-0">
              <field.icon className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{field.label}</p>
              <p className="text-sm text-gray-900 font-medium mt-0.5">{field.value || '—'}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
