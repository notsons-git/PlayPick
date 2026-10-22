export type NotificationCategory = 'error' | 'tip' | 'feature'

export interface NotificationAction {
  label: string
  onClick: () => void
}

export interface AppNotification {
  id: string
  category: NotificationCategory
  title: string
  message: string
  action?: NotificationAction
  createdAt: number
  durationMs?: number // 0 means persistent until closed
}
