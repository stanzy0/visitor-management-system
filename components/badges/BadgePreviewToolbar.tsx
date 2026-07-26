'use client'

import { useState, useEffect } from 'react'
import { Palette, LayoutTemplate, Clock } from 'lucide-react'
import type { BadgeTemplateOption } from '@/lib/types/badge-preview'

interface BadgePreviewToolbarProps {
  templates: BadgeTemplateOption[]
  selectedTemplate: BadgeTemplateOption | null
  orientation: 'portrait' | 'landscape'
  expiryDate: string
  expiryTime: string
  primaryColor: string
  secondaryColor: string
  textColor: string
  onTemplateChange: (template: BadgeTemplateOption) => void
  onOrientationChange: (orientation: 'portrait' | 'landscape') => void
  onExpiryDateChange: (date: string) => void
  onExpiryTimeChange: (time: string) => void
  onPrimaryColorChange: (color: string) => void
  onSecondaryColorChange: (color: string) => void
  onTextColorChange: (color: string) => void
}

export default function BadgePreviewToolbar({
  templates,
  selectedTemplate,
  orientation,
  expiryDate,
  expiryTime,
  primaryColor,
  secondaryColor,
  textColor,
  onTemplateChange,
  onOrientationChange,
  onExpiryDateChange,
  onExpiryTimeChange,
  onPrimaryColorChange,
  onSecondaryColorChange,
  onTextColorChange,
}: BadgePreviewToolbarProps) {
  const [showColors, setShowColors] = useState(false)

  useEffect(() => {
    if (selectedTemplate) {
      onPrimaryColorChange(selectedTemplate.primary_color)
      onSecondaryColorChange(selectedTemplate.secondary_color)
      onTextColorChange(selectedTemplate.text_color)
      onOrientationChange(selectedTemplate.orientation as 'portrait' | 'landscape')
    }
  }, [selectedTemplate])

  const presetColors = [
    { name: 'Blue', primary: '#2563eb', secondary: '#1e40af', text: '#1f2937' },
    { name: 'Amber', primary: '#d97706', secondary: '#92400e', text: '#1f2937' },
    { name: 'Purple', primary: '#7c3aed', secondary: '#5b21b6', text: '#1f2937' },
    { name: 'Green', primary: '#059669', secondary: '#047857', text: '#1f2937' },
    { name: 'Red', primary: '#dc2626', secondary: '#b91c1c', text: '#1f2937' },
    { name: 'Gray', primary: '#4b5563', secondary: '#374151', text: '#1f2937' },
  ]

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Badge Template</label>
        <select
          value={selectedTemplate?.id || ''}
          onChange={(e) => {
            const template = templates.find(t => t.id === e.target.value)
            if (template) onTemplateChange(template)
          }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Select template</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Orientation</label>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            type="button"
            onClick={() => onOrientationChange('portrait')}
            className={`flex-1 px-4 py-2 text-sm font-medium ${orientation === 'portrait' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            <LayoutTemplate className="h-4 w-4 inline mr-1" />
            Portrait
          </button>
          <button
            type="button"
            onClick={() => onOrientationChange('landscape')}
            className={`flex-1 px-4 py-2 text-sm font-medium ${orientation === 'landscape' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            <LayoutTemplate className="h-4 w-4 inline mr-1 rotate-90" />
            Landscape
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Badge Expiry</label>
        <div className="flex gap-2">
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => onExpiryDateChange(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="time"
            value={expiryTime}
            onChange={(e) => onExpiryTimeChange(e.target.value)}
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowColors(!showColors)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <Palette className="h-4 w-4" />
          Badge Colour Theme
        </button>
        {showColors && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-16">Primary</label>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => onPrimaryColorChange(e.target.value)}
                className="h-8 w-12 rounded cursor-pointer"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => onPrimaryColorChange(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-16">Secondary</label>
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => onSecondaryColorChange(e.target.value)}
                className="h-8 w-12 rounded cursor-pointer"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => onSecondaryColorChange(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-16">Text</label>
              <input
                type="color"
                value={textColor}
                onChange={(e) => onTextColorChange(e.target.value)}
                className="h-8 w-12 rounded cursor-pointer"
              />
              <input
                type="text"
                value={textColor}
                onChange={(e) => onTextColorChange(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {presetColors.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    onPrimaryColorChange(preset.primary)
                    onSecondaryColorChange(preset.secondary)
                    onTextColorChange(preset.text)
                  }}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                >
                  <span
                    className="h-4 w-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: preset.primary }}
                  />
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
