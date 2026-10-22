import React from 'react'
import styles from './Modal.module.css'
import { X } from 'lucide-react'

interface ModalProps {
  children: React.ReactNode
  onClose: () => void
  title?: string
  width?: string
}

export const Modal: React.FC<ModalProps> = ({ children, onClose, title, width = '560px' }) => {
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={styles.modal}
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || true) && (
          <div className={styles.header}>
            {title && <h2 className={styles.title}>{title}</h2>}
            <button className={styles.closeBtn} onClick={onClose} type="button" aria-label="Закрыть">
              <X size={18} />
            </button>
          </div>
        )}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
