import React from 'react'
import styles from './Toggle.module.css'

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  label?: string
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled = false, label }) => {
  const handleClick = () => {
    if (!disabled) onChange(!checked)
  }

  return (
    <span
      className={`${styles.wrapper}${disabled ? ` ${styles.disabled}` : ''}`}
      onClick={handleClick}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleClick() } }}
    >
      <span className={`${styles.track}${checked ? ` ${styles.checked}` : ''}`}>
        <span className={styles.thumb} />
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </span>
  )
}
