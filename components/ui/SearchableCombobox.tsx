'use client'

import { useState, useEffect, useRef, useCallback, KeyboardEvent, ChangeEvent, FocusEvent } from 'react'
import { Loader2, X, ChevronDown, Check } from 'lucide-react'

interface ComboboxOption {
  value: string
  label: string
  description?: string
}

interface SearchableComboboxProps {
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  noResultsText?: string
  loading?: boolean
  required?: boolean
  disabled?: boolean
  className?: string
  renderOption?: (option: ComboboxOption, isSelected: boolean) => React.ReactNode
  onClear?: () => void
}

export default function SearchableCombobox({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  noResultsText = 'No results found',
  loading = false,
  required = false,
  disabled = false,
  className = '',
  renderOption,
  onClear,
}: SearchableComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxRef = useRef<HTMLUListElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  const filteredOptions = options.filter((opt) => {
    const s = search.toLowerCase()
    return (
      opt.label.toLowerCase().includes(s) ||
      opt.description?.toLowerCase().includes(s) ||
      opt.value.toLowerCase().includes(s)
    )
  })

  const handleOpen = useCallback(() => {
    if (disabled) return
    setIsOpen(true)
    setSearch('')
    setActiveIndex(-1)
  }, [disabled])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setSearch('')
    setActiveIndex(-1)
  }, [])

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue)
      handleClose()
      inputRef.current?.focus()
    },
    [onChange, handleClose]
  )

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange('')
      inputRef.current?.focus()
      onClear?.()
    },
    [onChange, onClear]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        handleOpen()
        return
      }

      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setActiveIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0))
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1))
          break
        case 'Enter':
          e.preventDefault()
          if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
            handleSelect(filteredOptions[activeIndex].value)
          }
          break
        case 'Escape':
          e.preventDefault()
          handleClose()
          break
        case 'Tab':
          handleClose()
          break
      }
    },
    [isOpen, filteredOptions, activeIndex, handleOpen, handleClose, handleSelect]
  )

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setActiveIndex(-1)
  }, [])

  const handleInputFocus = useCallback(() => {
    if (!isOpen) handleOpen()
  }, [isOpen, handleOpen])

  const handleInputBlur = useCallback(() => {
    setTimeout(() => {
      if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
        handleClose()
      }
    }, 150)
  }, [handleClose])

  useEffect(() => {
    if (isOpen && listboxRef.current && activeIndex >= 0) {
      const activeItem = listboxRef.current.children[activeIndex] as HTMLElement
      activeItem?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex, isOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClose])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation()
    },
    []
  )

  return (
    <div ref={containerRef} className={`relative ${className}`} onTouchStart={handleTouchStart}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : selectedOption?.label || ''}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={isOpen ? searchPlaceholder : placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-activedescendant={activeIndex >= 0 ? `option-${activeIndex}` : undefined}
          className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none transition-colors ${
            disabled
              ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
              : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
          }`}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : value && !isOpen ? (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center justify-center h-6 w-6 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear selection"
              tabIndex={-1}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </div>
      </div>

      {isOpen && (
        <ul
          ref={listboxRef}
          role="listbox"
          className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto py-1"
        >
          {loading ? (
            <li className="flex items-center justify-center gap-2 px-3 py-3 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </li>
          ) : filteredOptions.length === 0 ? (
            <li className="px-3 py-3 text-sm text-gray-500 text-center">{noResultsText}</li>
          ) : (
            filteredOptions.map((option, index) => {
              const isSelected = option.value === value
              const isActive = index === activeIndex
              return (
                <li
                  key={option.value}
                  id={`option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  className={`relative cursor-pointer select-none px-3 py-2.5 text-sm transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                  } ${isSelected ? 'font-medium' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelect(option.value)
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault()
                    handleSelect(option.value)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{option.label}</span>
                      {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                    </div>
                    {option.description && (
                      <span className={`text-xs ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                        {option.description}
                      </span>
                    )}
                  </div>
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}