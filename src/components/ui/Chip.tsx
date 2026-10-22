import React from 'react'
import { X } from 'lucide-react'
import styles from './Chip.module.css'

interface ChipProps {
  label: string
  active?: boolean
  onClick?: () => void
  onRemove?: () => void
  color?: 'accent' | 'default'
}

export const Chip: React.FC<ChipProps> = ({ label, active = false, onClick, onRemove, color = 'default' }) => {
  const classNames = [
    styles.chip,
    onClick ? styles.clickable : '',
    active ? styles.active : '',
    color === 'accent' ? styles.colorAccent : '',
  ].filter(Boolean).join(' ')

  return (
    <span className={classNames} onClick={onClick}>
      {label}
      {onRemove && (
        <button
          className={styles.removeBtn}
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          aria-label={`Удалить ${label}`}
          type="button"
        >
          <X size={10} />
        </button>
      )}
    </span>
  )
}
