import React from 'react'
import { AlertCircle, Lightbulb, Sparkles, X, ChevronRight } from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext'
import type { NotificationCategory } from '../../types/notifications'
import styles from './NotificationToast.module.css'

function getCategoryIcon(category: NotificationCategory) {
  switch (category) {
    case 'error':
      return <AlertCircle size={16} className={styles.iconError} />
    case 'tip':
      return <Lightbulb size={16} className={styles.iconTip} />
    case 'feature':
      return <Sparkles size={16} className={styles.iconFeature} />
  }
}

export const NotificationToastContainer: React.FC = () => {
  const { notifications, dismiss } = useNotifications()

  if (notifications.length === 0) return null

  return (
    <div className={styles.container} aria-live="polite">
      {notifications.map((item) => (
        <div
          key={item.id}
          className={`${styles.toast} ${styles[item.category]}`}
          role="alert"
        >
          <div className={styles.iconWrapper}>{getCategoryIcon(item.category)}</div>

          <div className={styles.content}>
            <div className={styles.header}>
              <span className={styles.title}>{item.title}</span>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => dismiss(item.id)}
                aria-label="Закрыть уведомление"
              >
                <X size={13} />
              </button>
            </div>

            <p className={styles.message}>{item.message}</p>

            {item.action && (
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => {
                  item.action?.onClick()
                  dismiss(item.id)
                }}
              >
                <span>{item.action.label}</span>
                <ChevronRight size={13} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
