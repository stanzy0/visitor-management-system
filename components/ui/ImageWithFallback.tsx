'use client'

import { useState } from 'react'
import { ImageIcon } from 'lucide-react'

export default function ImageWithFallback({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className: string
}) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 text-gray-400 ${className}`}
      >
        <ImageIcon className="h-12 w-12" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  )
}