import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { AppNotification } from '../types/notifications'
import { soundService } from '../services/sound/soundService'
import { useSettings } from './SettingsContext'

interface NotificationContextValue {
  notifications: AppNotification[]
  history: AppNotification[]
  notify: (
    notification: Omit<AppNotification, 'id' | 'createdAt'> & { id?: string }
  ) => void
  notifyError: (title: string, message: string, action?: AppNotification['action']) => void
  notifyTip: (title: string, message: string, action?: AppNotification['action']) => void
  notifyFeature: (title: string, message: string, action?: AppNotification['action']) => void
  dismiss: (id: string) => void
  clearHistory: () => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({
  children,
  onNavigate,
}: {
  children: ReactNode
  onNavigate?: (page: 'home' | 'library' | 'history' | 'scan' | 'settings') => void
}) {
  const { settings } = useSettings()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [history, setHistory] = useState<AppNotification[]>([])

  // Keep notification sound settings in sync
  useEffect(() => {
    soundService.setNotificationSoundEnabled(settings?.notificationSoundEnabled ?? true)
  }, [settings?.notificationSoundEnabled])

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const notify = useCallback(
    (item: Omit<AppNotification, 'id' | 'createdAt'> & { id?: string }) => {
      const id = item.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      const newNotification: AppNotification = {
        ...item,
        id,
        createdAt: Date.now(),
        durationMs: item.durationMs !== undefined ? item.durationMs : item.category === 'error' ? 8000 : 7000,
      }

      setNotifications((prev) => {
        // Prevent duplicate notifications with identical title & message
        const duplicateIndex = prev.findIndex(
          (n) => n.title === item.title && n.message === item.message
        )
        if (duplicateIndex >= 0) {
          // Replace with fresh timestamp
          const updated = [...prev]
          updated[duplicateIndex] = newNotification
          return updated
        }
        // Limit active notifications to at most 3 simultaneously to prevent clutter
        const next = [...prev, newNotification]
        return next.slice(-3)
      })

      setHistory((prev) => [newNotification, ...prev.slice(0, 24)])

      // Play soft sound for error notifications
      if (item.category === 'error') {
        soundService.playNotificationError(settings?.notificationVolume ?? 0.35)
      }

      // Auto-dismiss timer if durationMs > 0
      if (newNotification.durationMs && newNotification.durationMs > 0) {
        setTimeout(() => {
          dismiss(id)
        }, newNotification.durationMs)
      }
    },
    [dismiss, settings?.notificationVolume]
  )

  const notifyError = useCallback(
    (title: string, message: string, action?: AppNotification['action']) => {
      notify({ category: 'error', title, message, action })
    },
    [notify]
  )

  const notifyTip = useCallback(
    (title: string, message: string, action?: AppNotification['action']) => {
      notify({ category: 'tip', title, message, action })
    },
    [notify]
  )

  const notifyFeature = useCallback(
    (title: string, message: string, action?: AppNotification['action']) => {
      notify({ category: 'feature', title, message, action })
    },
    [notify]
  )

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  // Check for smart helpful tips on startup
  useEffect(() => {
    const timer = setTimeout(() => {
      // 1. Feature notification on 0.1.0-alpha
      const featureKey = 'playpick_features_seen_0.1.0'
      if (!localStorage.getItem(featureKey)) {
        notifyFeature(
          'Новые режимы выбора',
          'Доступно 5 стилей рулетки: Последовательная, Случайная, Кейсы, Горизонтальная и Вертикальная!',
          onNavigate
            ? {
                label: 'В настройки',
                onClick: () => onNavigate('settings'),
              }
            : undefined
        )
        localStorage.setItem(featureKey, 'true')
      }

      // 2. Helpful tip if RAWG API key is unconfigured
      const tipKey = 'playpick_rawg_tip_seen'
      if (settings && !settings.rawgApiKey && !localStorage.getItem(tipKey)) {
        setTimeout(() => {
          notifyTip(
            'Совет по метаданным',
            'Вы можете подключить бесплатный ключ RAWG в настройках для загрузки описаний редких игр.',
            onNavigate
              ? {
                  label: 'Настройки',
                  onClick: () => onNavigate('settings'),
                }
              : undefined
          )
          localStorage.setItem(tipKey, 'true')
        }, 1500)
      }
    }, 1200)

    return () => clearTimeout(timer)
  }, [settings, notifyFeature, notifyTip, onNavigate])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        history,
        notify,
        notifyError,
        notifyTip,
        notifyFeature,
        dismiss,
        clearHistory,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
