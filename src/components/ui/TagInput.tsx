import React, { useState, useRef, useEffect, useMemo } from 'react'
import { X, Plus, ChevronDown } from 'lucide-react'
import styles from './TagInput.module.css'

interface TagInputProps {
  label: string
  placeholder?: string
  value: string[]
  onChange: (items: string[]) => void
  suggestions?: string[]
  maxSuggestions?: number
}

export const TagInput: React.FC<TagInputProps> = ({
  label,
  placeholder = 'Начните вводить или выберите...',
  value,
  onChange,
  suggestions = [],
  maxSuggestions = 8,
}) => {
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter available suggestions (exclude already selected items and filter by search)
  const filteredSuggestions = useMemo(() => {
    const query = inputValue.trim().toLowerCase()
    return suggestions
      .filter((item) => {
        const itemLower = item.toLowerCase()
        const isSelected = value.some((v) => v.toLowerCase() === itemLower)
        if (isSelected) return false
        if (!query) return true
        return itemLower.includes(query)
      })
      .slice(0, maxSuggestions)
  }, [suggestions, value, inputValue, maxSuggestions])

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const addTag = (tagText: string) => {
    const trimmed = tagText.trim().replace(/^,+|,+$/g, '')
    if (!trimmed) return

    // Prevent duplicates (case-insensitive check)
    const exists = value.some((v) => v.toLowerCase() === trimmed.toLowerCase())
    if (!exists) {
      onChange([...value, trimmed])
    }
    setInputValue('')
    setHighlightedIndex(-1)
  }

  const removeTag = (indexToRemove: number) => {
    onChange(value.filter((_, idx) => idx !== indexToRemove))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    // If user enters a comma, treat the preceding text as a tag
    if (val.includes(',')) {
      const parts = val.split(',')
      const newTags = [...value]
      for (const part of parts) {
        const trimmed = part.trim()
        if (trimmed && !newTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
          newTags.push(trimmed)
        }
      }
      onChange(newTags)
      setInputValue('')
      setHighlightedIndex(-1)
    } else {
      setInputValue(val)
      setIsOpen(true)
      setHighlightedIndex(-1)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        addTag(filteredSuggestions[highlightedIndex])
      } else if (inputValue.trim()) {
        addTag(inputValue)
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
      } else {
        setHighlightedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        )
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (isOpen) {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        )
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag on backspace in empty input
      removeTag(value.length - 1)
    }
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <label className={styles.label}>{label}</label>

      <div className={styles.inputWrapper}>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {inputValue && (
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => addTag(inputValue)}
            title="Добавить"
          >
            <Plus size={14} />
          </button>
        )}
        <button
          type="button"
          className={styles.dropdownToggle}
          onClick={() => {
            setIsOpen((prev) => !prev)
            inputRef.current?.focus()
          }}
          tabIndex={-1}
          aria-label="Показать список вариантов"
        >
          <ChevronDown size={14} />
        </button>

        {isOpen && filteredSuggestions.length > 0 && (
          <ul className={styles.dropdown}>
            {filteredSuggestions.map((item, index) => {
              const isHighlighted = index === highlightedIndex
              return (
                <li
                  key={item}
                  className={`${styles.dropdownItem} ${isHighlighted ? styles.highlighted : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault() // prevent input blur
                    addTag(item)
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span>{item}</span>
                  <Plus size={12} className={styles.itemPlus} />
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Selected chips row */}
      {value.length > 0 && (
        <div className={styles.chipsContainer}>
          {value.map((tag, index) => (
            <div key={`${tag}-${index}`} className={styles.chip}>
              <span className={styles.chipText}>{tag}</span>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => removeTag(index)}
                aria-label={`Удалить ${tag}`}
                title={`Удалить ${tag}`}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
